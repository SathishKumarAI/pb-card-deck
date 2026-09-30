#!/usr/bin/env bash
# Verify the migrations and the row-level-security policies on a THROWAWAY
# Postgres in Docker. No Supabase project, no account, no credentials.
#
#   bash scripts/verify-rls-local.sh
#
# It starts a container on a spare port, installs a minimal `auth` schema shim
# (supabase/tests/local-shim.sql), applies every migration in order, runs the
# adversarial suite (supabase/tests/rls.local.sql), and removes the container -
# whatever the outcome. It never touches a Postgres you already run: the port and
# the container name are its own.
#
# Exit code is the verdict: 0 means every attack failed to get in.
set -euo pipefail

CONTAINER=pbcd-rls-verify
PORT=${PORT:-55433}
PGPASSWORD=verify-only-throwaway
IMAGE=${IMAGE:-postgres:17-alpine}
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cleanup() {
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "==> starting $IMAGE as $CONTAINER on :$PORT"
cleanup
docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD="$PGPASSWORD" -p "$PORT:5432" "$IMAGE" >/dev/null

echo "==> waiting for it to accept connections"
for _ in $(seq 1 60); do
  if docker exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec "$CONTAINER" pg_isready -U postgres >/dev/null

run_sql_file() {
  # Feed the file on stdin so no host psql client is needed.
  docker exec -i -e PGPASSWORD="$PGPASSWORD" "$CONTAINER" \
    psql -v ON_ERROR_STOP=1 -U postgres -d postgres -f - < "$1"
}

echo "==> auth shim (test fixture: Supabase provides these for real)"
run_sql_file "$ROOT/supabase/tests/local-shim.sql" >/dev/null

for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "==> $(basename "$f")"
  run_sql_file "$f" >/dev/null
done

echo "==> adversarial suite"
run_sql_file "$ROOT/supabase/tests/rls.local.sql"

echo ""
echo "All migrations applied and every attack refused."
echo "This verifies the POLICIES. The HTTP surface and real sign-in still need"
echo "'npm run test:rls' against a Supabase project - see docs/SUPABASE-SETUP.md."
