# Contributing to PB Card Deck

Thanks for considering a contribution! This is a small, friendly, **local-first**
project (no backend, no login) - bug fixes, card ideas, and features are all welcome.

## Ways to help

- **Report a bug** - [open an issue](https://github.com/SathishKumarAI/pb-card-deck/issues/new).
  Include what you did, what you expected, and (for layout bugs) the device + browser and a screenshot.
- **Suggest a feature or a card** - issues are great for this; see [`docs/TICKETS.md`](docs/TICKETS.md)
  for the running backlog (there's a "Future feature ideas" list at the bottom).
- **Send a pull request** - see below.
- **Star the repo** if you like it - it helps others find the app. Optional, no pressure.

## Dev setup (~3 minutes)

```bash
git clone https://github.com/SathishKumarAI/pb-card-deck
cd pickleball-shuffle/app
npm install
npm run dev          # http://localhost:3000 (binds 0.0.0.0 for phone testing)
```

New to the codebase? Read [`docs/ONBOARDING.md`](docs/ONBOARDING.md) - it maps the
key files and explains the architecture.

## Before you open a PR

Run the same checks CI runs (all from `app/`):

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

All four must pass - CI gates on them (lint → type-check → the 64 vitest tests → build)
and `main` auto-deploys to production.

## Pull request guidelines

1. Branch off `main` (`feature/...` or `fix/...`).
2. Keep PRs focused on one thing; explain the **why** in the description.
3. Match the existing code style (TypeScript, Tailwind utility classes, CSS vars
   for theming, `lucide-react` icons - **no emoji in UI**).
4. Conventional-commit titles are appreciated: `feat:`, `fix:`, `docs:`, `chore:`.
5. Update docs when behaviour changes (`README.md`, `docs/`).

## Adding or editing cards

The deck is generated, not hand-edited, so it stays unique and metadata-consistent:

1. Edit the word banks / templates in [`scripts/generate_cards.py`](scripts/generate_cards.py).
2. Regenerate: `python3 scripts/generate_cards.py`.
3. The script enforces uniqueness like a primary key (unique `id` + `name`) and
   rewrites `app/public/cards.json`, `data/cards.json`, and `docs/data/cards.json`.

The deck holds exactly **1,729** cards (the Ramanujan taxicab number) - keep it there
unless you're intentionally changing the target in the script.

## Ground rules

- **Stay local-first** - no servers, databases, or login. State lives in `localStorage`.
- **Keep the build green** and the bundle lean (avoid heavy dependencies).
- Be kind in issues and reviews. This is a for-fun project.

## License

By contributing you agree your contributions are licensed under the project's **MIT** license.
