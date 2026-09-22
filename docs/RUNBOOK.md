# Operations Runbook

Small app, no backend - operations are mostly "deploy" and "roll back". (Backlog F280.)

## Deploy

- `main` auto-deploys to production on Vercel. Keep `main` green (CI gates lint + type-check + tests + build).
- Preview: every PR / pushed branch gets a Vercel preview URL automatically (F274).

### One command: `./ship.sh`
From the repo root. Runs tests + production build, pushes the current branch, then deploys prod.

```bash
./ship.sh              # gates → push branch → vercel --prod
./ship.sh --no-deploy  # gates → push only (let Vercel Git integration build the preview)
```

### Manual steps (same thing, by hand)
```bash
cd ~/coding/pickleball-shuffle
( cd app && npm test && npm run build )        # gates
git push -u origin <branch>                    # → Vercel preview build
vercel --prod                                  # → production, from the REPO ROOT
# (or ./deploy-vercel.sh, which installs the CLI then runs vercel --prod)
```
`vercel --prod` MUST run from the **repo root** — the project's `rootDirectory` is already `app`, so
running inside `app/` makes Vercel look for `app/app` and fail.

### Auth (once per machine)
The deploy needs credentials that aren't baked into the repo:
```bash
gh auth login      # for `git push` (GitHub). Fixes "could not read Username" / invalid token.
vercel login       # for `vercel --prod` (Vercel).
```
If `./ship.sh` stops at the push or deploy step, it's almost always one of these two not being logged in.

### After deploying — the installed PWA
The standalone/installed PWA is pinned to the **deployed** URL, not localhost, and a service worker
may cache the old build. After a prod deploy, on the phone **re-open the PWA** (or remove + re-add to
home screen) so it fetches the new version. To preview local changes on a phone without deploying,
open `http://<your-LAN-ip>:3000` in the phone **browser** on the same WiFi (dev unregisters the SW).

## Roll back production (fastest first)

1. **Vercel dashboard (seconds, recommended):** Project → Deployments → pick the last known-good deployment → **Promote to Production** (Instant Rollback). No rebuild.
2. **Vercel CLI:** `vercel rollback <deployment-url>` (or `vercel ls` to find the prior prod deployment, then `vercel promote <url>`).
3. **Git revert (when the code itself is bad):** `git revert <bad-sha>` → push to `main` → CI + auto-deploy ship the revert. Use for a clean history; slower than instant rollback.

## After a rollback

- Open an issue with the symptom, the bad deployment URL, and the SHA.
- Reproduce locally (`npm run dev`), add a failing test if logic-related, fix, PR.

## Health checks

- Smoke: load `/`, draw a card, score a point, refresh (resume works), go offline (banner shows, app still works).
- Routes that must 200: `/`, `/about`, `/privacy`, `/terms`, `/robots.txt`, `/sitemap.xml`.

## Secrets & env vars (F334, F286)

- The app ships **no secrets**: it is local-first with no backend, no API keys, no
  auth. The only `NEXT_PUBLIC_*` value is a public GitHub URL. So nothing sensitive
  can leak into the client bundle, and gitleaks (CI) guards against accidental
  commits.
- If a future feature needs config, manage it with `vercel env add/pull` and keep
  real secrets out of `NEXT_PUBLIC_*` (those are inlined into the client).

## Branch protection (one-time, GitHub repo settings - needs admin)

- Settings → Branches → protect `main`: require the **CI** checks (build + secret-scan) to pass before merge (F275).
