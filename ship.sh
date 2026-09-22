#!/bin/bash
# Ship the current branch: run the CI gates, push, then deploy to production.
# One command instead of remembering the sequence. Run from anywhere.
#
#   ./ship.sh              # gates -> push branch -> vercel --prod
#   ./ship.sh --no-deploy  # gates -> push only (let Vercel Git integration build)
#
# Auth needed once per machine:
#   gh auth login          # for the git push
#   vercel login           # for the production deploy
#
# NOTE: Vercel deploys from the REPO ROOT (project rootDirectory is already "app").
set -uo pipefail
cd "$(dirname "$0")"

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
echo "▶ Ship branch: $BRANCH"

# 1) CI gates that are guaranteed-meaningful (mirror CI's tests + build).
echo "▶ Tests + production build…"
if ! ( cd app && npm test && npm run build ); then
  echo "✗ Gates failed — not shipping. Fix the above first."
  exit 1
fi

# 2) Push the branch. Needs GitHub auth.
echo "▶ Pushing $BRANCH to origin…"
if ! git push -u origin "$BRANCH"; then
  echo "✗ Push failed. Authenticate GitHub first:  gh auth login  (then re-run ./ship.sh)"
  exit 1
fi

if [ "${1:-}" = "--no-deploy" ]; then
  echo "✅ Pushed. Vercel will build a preview for $BRANCH; merge to main for production."
  exit 0
fi

# 3) Deploy to production. Needs Vercel CLI + login.
if ! command -v vercel &>/dev/null; then
  echo "▶ Installing Vercel CLI (npm i -g vercel)…"
  npm i -g vercel || { echo "✗ Could not install vercel CLI."; exit 1; }
fi
echo "▶ Deploying to production (vercel --prod)…"
if ! vercel --prod; then
  echo "✗ Deploy failed. If it's auth:  vercel login  (then re-run ./ship.sh)"
  exit 1
fi

echo "✅ Shipped to production."
echo "   → On your phone, re-open (or remove + re-add) the installed PWA so it picks up the new build."
