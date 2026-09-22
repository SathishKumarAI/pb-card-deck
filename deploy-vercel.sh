#!/bin/bash
# Deploy to Vercel production, and make the public domain actually serve it.
#
# Two things bit us on 2026-09-22 and are handled here:
#
#   1. `vercel --prod` with no --scope failed with "Not authorized", because the
#      project belongs to the TEAM, not the personal account the CLI is logged
#      in as. The scope is not optional.
#   2. A successful production deploy does NOT move pb-card-deck.vercel.app.
#      That domain had been pinned to a deployment from 81 DAYS earlier, so
#      every "deployed" change since was live nowhere. The alias step below is
#      the part that actually ships.
#
# First time: vercel login
set -euo pipefail

cd "$(dirname "$0")"

SCOPE="sathish-s-pickleball-cards"
DOMAIN="pb-card-deck.vercel.app"

if ! command -v vercel &>/dev/null; then
    echo "Installing Vercel CLI..."
    npm i -g vercel
fi

# NOTE: deploy from the REPO ROOT. The Vercel project's rootDirectory is
# already "app", so running from app/ makes Vercel look for app/app and fail.
echo "==> Deploying to production (scope: $SCOPE)"
URL=$(vercel --prod --yes --scope "$SCOPE" 2>/dev/null | grep -oE 'https://pb-card-deck-[a-z0-9]+-[a-z0-9-]+\.vercel\.app' | tail -1)

if [[ -z "${URL:-}" ]]; then
    echo "!! Could not read a deployment URL back. Run 'vercel ls --scope $SCOPE' and alias by hand."
    exit 1
fi
echo "==> Deployed: $URL"

echo "==> Pointing $DOMAIN at it"
vercel alias set "$URL" "$DOMAIN" --scope "$SCOPE"

# Verify, because "deployed" and "live" turned out to be different things.
echo "==> Verifying the live domain"
sleep 3
LIVE_THEME=$(curl -fsS "https://$DOMAIN/?cb=$RANDOM" | grep -oE 'data-theme="[a-z]+"' | head -1 || true)
echo "    $DOMAIN reports $LIVE_THEME (expect data-theme=\"light\")"
echo "    Compare with the deployment itself if they differ: $URL"
