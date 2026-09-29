# Contributing to PB Card Deck

Thanks for being here. This is a small, friendly, **open-source, local-first**
project (no backend, no login) and contributions of every size are welcome - a
bug report, one card idea, a typo, or a whole tournament format.

**No CLA, no red tape.** Two ground rules: keep it **local-first** and keep the
**build green**.

## Ways to help, easiest first

- **Report a bug** - [open an issue](https://github.com/SathishKumarAI/pb-card-deck/issues/new/choose).
  What you did, what you expected, and for layout bugs the device + browser and a
  screenshot. Screenshots of layout bugs are gold.
- **Send a card idea** - a name, what it does, and roughly which of the 10
  categories it fits. There is a template for it.
- **Tell us what confused you** - the manual and the glossary exist because
  people said "I don't know what that means". If a screen confused you, that is
  a bug in the screen, not in you.
- **Tell us how you run your club night** - the tournament formats came out of
  real events; the next one will too.
- **Suggest a feature** - see [the plan](README.md#the-plan) for what is already
  considered and why it is not there yet, and
  [`docs/BACKLOG.md`](docs/BACKLOG.md) for 557 catalogued ideas.
- **Write code** - see below.
- **Star the repo** if you like it. It helps other players find the app.
  Optional, no pressure.

## Good first code contributions

| Task | Why it is a good start |
|---|---|
| A third-place play-off, or a consolation / plate draw | Pure slot wiring in `app/lib/tournament/elimination.ts`; the existing tests show the pattern |
| A "most drawn / most skipped cards" panel | The counters are already collected in `lib/client-api.ts`; nothing reads them yet |
| A new card category, or a batch of cards | `scripts/generate_cards.py`, stdlib Python, one command to regenerate |
| Extracting UI copy for translation | Mechanical, well-bounded, high value |
| Any open row in [the plan](README.md#the-plan) | Each row says exactly why it is not there yet |

## Dev setup (~3 minutes)

```bash
git clone https://github.com/SathishKumarAI/pb-card-deck
cd pb-card-deck/app
npm install
npm run dev          # http://localhost:3000 (binds 0.0.0.0 for phone testing)
```

Test on a phone over the same Wi-Fi (`http://192.168.1.x:3000`) - the phone is
the target device, and layout bugs mostly live there.

New to the codebase? [`docs/ONBOARDING.md`](docs/ONBOARDING.md) maps the key
files; the README has a [change → file table](README.md#making-a-change---start-from-the-change-not-the-code).

## Checks before you open a PR

All four, from `app/`. These are exactly what CI runs:

```bash
npm run lint       # 0 errors expected (some pre-existing warnings)
npx tsc --noEmit
npm test           # 164 tests in 14 files
npm run build
```

Plus, if you touched colour:

```bash
npm run contrast   # WCAG table for both themes; also runs as a test
```

CI (`.github/workflows/ci.yml`) runs lint → type-check → tests → `npm audit` →
build, plus a gitleaks secret scan.

> **`main` does not auto-deploy to production.** The Vercel Git integration only
> builds Previews. Production moves when someone runs `./deploy-vercel.sh`,
> which deploys with `--scope`, aliases the domain, then curls the domain to
> check. Verify the **domain**, never the deployment URL - it was once found
> pinned to a build 81 days old.

## What a good PR looks like

1. Branch off `main`: `feat/...`, `fix/...`, `docs/...`, `refactor/...`.
2. One thing per PR, and the description says the **why**.
3. **A change to scoring, tournaments or streaks needs a test that fails before
   the fix.** Every bug fixed in this repo has one, and the commit message says
   what the failure was. Tests are named for the failure they catch, not
   numbered.
4. A change to `app/app/globals.css` must keep `npm run contrast` green.
5. Match the existing style: TypeScript, Tailwind utilities for layout, CSS
   custom properties for anything themed, `lucide-react` icons - **no emoji in
   the UI**.
6. Conventional-commit titles appreciated: `feat:`, `fix:`, `docs:`, `refactor:`,
   `chore:`.
7. Update the docs your change invalidates, in the same commit. A stale map costs
   more than no map.
8. Measured claims beat asserted ones. "Verified by reading the computed style /
   the test output" is what a reviewer can trust.

## Adding or editing cards

The deck is **generated**, not hand-edited, so it stays unique and its metadata
stays consistent:

1. Edit the word banks / templates in
   [`scripts/generate_cards.py`](scripts/generate_cards.py).
2. Regenerate: `python3 scripts/generate_cards.py` (stdlib only, no install).
3. It keeps the canonical hand-written 200 (ids 1-200), enforces uniqueness on
   the card name like a primary key, and rewrites `app/public/cards.json`,
   `data/cards.json` and `docs/data/cards.json`.

The deck holds exactly **1,729** cards (the Ramanujan taxicab number). Keep it
there unless you are deliberately changing the target in the script.

## Code layout rules this repo follows

- **One concern per file**, named after the concern. ~300 lines is the target,
  500 the ceiling.
- **Directories with more than a few files carry a README whose first section is
  a `change → file` table** - read the table instead of the code
  (`app/lib/tournament/`, `app/components/tournament/`).
- **Constants and design tokens live in one place**, never as a literal in a leaf
  file. Colour, radius, elevation and glass are tokens at the top of
  `app/app/globals.css`.
- **Pure logic stays pure.** `lib/game.ts` and `lib/tournament/*` have no React,
  no DOM and no storage - which is why they are cheap to test.

## Traps that have cost real time here

1. **Never put a directory under `app/` in a `.gitignore`.** Tailwind v4 honours
   `.gitignore` for source detection, so ignoring `app/app/` silently stops it
   generating every class used only in `page.tsx` - no error, just a page missing
   half its layout.
2. **Turbopack can serve a stale `globals.css`.** If a rule "does nothing",
   fetch the stylesheet the page actually loaded and grep it before debugging the
   rule.
3. **Measure, do not infer.** Every UI bug fixed here looked correct in the
   markup. `getComputedStyle`, a scripted scroll and `npm run contrast` find them
   in seconds.

More, with the details: [`app/CLAUDE.md`](app/CLAUDE.md) → Traps, and
[`STATUS.md`](STATUS.md).

## Ground rules

- **Stay local-first** - no servers, databases or login. State lives in
  `localStorage` behind `lib/client-api.ts`.
- **Keep the bundle lean** - four runtime dependencies today; a new one needs a
  reason a few lines cannot cover.
- **Be kind** in issues and reviews. This is a for-fun project.

## License

By contributing you agree your contributions are licensed under the project's
**[MIT](LICENSE)** license.
