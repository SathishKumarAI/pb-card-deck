# Session notes & change history

A single, readable capture of what has been built in this project, why, and the non-obvious
lessons learned — so anyone (human or agent) can get up to speed fast. Newest first. Exact
code lives in git; this is the narrative and the decisions. See also the dated
[WORKLOG](WORKLOG.md) and the [VALIDATION-REPORT](VALIDATION-REPORT.md).

**Live app:** https://pb-card-deck.vercel.app
**Repo:** https://github.com/SathishKumarAI/pb-card-deck
**Stack:** Next.js 16.2.6 · React 19.2.4 · TypeScript · Tailwind v4 · lucide-react (no emoji in UI) ·
local-first (no backend/login/DB; all state in `localStorage`). 1,729 cards · 10 categories ·
5 deck modes. 69 vitest tests.

---

## This session (branch `feat/wave1-prod-hardening`, 2026-06-30 → 07-02)

Theme: make the app usable by people with **zero pickleball knowledge**, add a **coach/umpire**
match recorder, and fix the UX/scroll issues that surfaced while testing on a phone/PWA.

### 1. Understand & Play v1 — onboarding + self-explaining cards
Goal: a first-timer opens the app and plays in under a minute.
- **WelcomeTour** — first-run swipeable carousel (what it is / how to play / how to navigate),
  replayable from Rules & help. Gated by `localStorage` `pb-welcome-tour-seen`.
- **Tap-to-define jargon** (`GlossaryText`) — glossary terms on a card are underlined; tap → a
  definition popover. One shared source `lib/glossary.ts` powers this and the Rules glossary tab.
- **Per-card "?" explainer** — *what this means / how to play it / what kind of card* (plain-language
  `CATEGORY_INFO` in `lib/cards.ts`).
- **Always-shown "What to do"** line + a one-time in-game coaching hint.
- **Rules & help** — new default **"Why & how"** tab (benefits + navigation).
- *Bug caught in review:* the tour was first mounted in the game-screen return, never the home
  (early) return — moved into the `if (!game)` branch.

### 2. Coach / Umpire "Track a match" mode (ticket T11)
A real match recorder alongside the party game.
- **Home segmented toggle** `Play with cards` / `Track a match` — switchable any time, one tap.
- **OfficialMatchSetup** — singles/doubles, player/team names, event/round label, points-to-win
  (11/15/21), match length, **Side-out vs Rally** scoring, cards on/off (off by default).
- **OfficialControls** — serving status card (who's up + server 1/2 + what a fault does), per-team
  **timeouts + faults**, one-tap **match-sheet** download.
- **Engine** (`lib/game.ts`, pure + tested): `officialMode`/`cardsEnabled`/`eventLabel` config,
  `matchLog`, `serverLabel`/`recordTimeout`/`recordFault`/`logCount`, real **two-server doubles
  rotation** in `sideOut` (gated by `officialMode`, so casual play is byte-for-byte unchanged).
- **Persistence** — official fields on `SavedMatch`/`addMatch`; `matchSheet()` text export. Still
  local-first.

### 3. Beginner-first score UI (research-backed)
Complaint: "I can only score one team / why tap the opponent to move to the 2nd server?"
- Researched the top pickleball apps (see [SCORING-UX-RESEARCH](SCORING-UX-RESEARCH.md)). They all
  converge on **"tap who won the rally, app applies the rules."**
- Reframed the tiles from "add a point" to **"who won the rally"** + a plain **narration** banner
  ("Point Eagles 4-2" / "Side out — Hawks serves") — `outcomeMessage()` (pure, tested). Optional
  **voice announce** (`config.announceScore`, Web Speech API, off by default).
- **Serve indicator** made unmistakable: a **1st/2nd-server chip** on the serving tile, a serving
  status card, and the same chip on the **TV/courtside** display. Shown only in official doubles
  (where it rotates) to avoid a misleading static indicator in casual play.
- **Final fix — serving WON/LOST buttons.** In official side-out mode the score tiles are
  **read-only**; you act on the serving side's result: **"{team} won" (+1)** and **"{team} lost"**
  (→ 2nd server, then → side out — the button relabels itself). You never tap the opponent.
  Rally mode keeps both tiles tappable. See [DOUBLES-SCORING](DOUBLES-SCORING.md).

### 4. Fixes found while testing
- **Track-form scroll (in-browser):** home `main` used `justify-center`, which centred the tall
  setup form; switched to `justify-start` on the Track tab.
- **PWA scroll (the real one):** `<html class="h-full">` pinned html to the viewport height, so
  content taller than the screen was clipped with no scroll — invisible in-browser (address bar
  masks it), but broke the **installed PWA**. Fixed: html natural auto height, body `min-h-dvh`.
- **Glossary popover clipped:** the popover lived inside the card, which has `overflow-hidden` **and**
  a 3D-flip `transform` (a transform makes `position:fixed` behave like `absolute`). CSS alone can't
  escape that — **portalled it to `<body>`** and anchored to the viewport bottom-center.
- **Latent colour bug:** the WON button used `var(--green)`, which doesn't exist in the theme →
  switched to the emerald `--accent`.

### 5. Documentation audit (3 review agents) + new docs
Cross-checked every doc vs code and fixed drift: removed a non-existent `backend/` dir from README;
replaced badly stale per-category (`20`) and deck-mode (`80/100/60/60`) counts in `app/README.md`
with real numbers (Family 686 / Party 862 / Drill 504 / Tournament 545 / Chaos 1,729); added the
missing `npm test` step to CI/pre-PR lists; fixed the card-generation workflow; completed the
component/lib inventories; flipped shipped backlog/ticket items to done. New docs:
[DOUBLES-SCORING](DOUBLES-SCORING.md), [SCORING-UX-RESEARCH](SCORING-UX-RESEARCH.md),
[VALIDATION-REPORT](VALIDATION-REPORT.md), and this file.

### Lessons / gotchas worth remembering
- **React state batching in scripted tests:** driving the UI with synchronous `.click()`s hits one
  render — misreports intermediate state. Validate with awaits between clicks, or unit-test the pure
  logic instead. The engine is pure by design precisely so it's testable.
- **`position:fixed` is trapped by any ancestor `transform`.** For overlays inside animated/3D
  elements, portal to `<body>`.
- **`html { height:100% }` + standalone PWA = clipped, unscrollable content.** Prefer `min-height`
  / natural flow so the document scrolls.
- **Gate "realistic" complexity behind a mode.** The two-server rotation and server indicators live
  behind `officialMode` so the casual card game stays light.

### Deploy status (open)
Everything is committed on `feat/wave1-prod-hardening`. **Production deploy is owner-gated** — this
environment has no valid GitHub/Vercel credentials (invalid `gh` token, no git HTTPS creds, no SSH
key, no Vercel CLI/token). To ship once authed (`gh auth login` + `vercel login`), run **`./ship.sh`**
from the repo root (tests + build → push branch → `vercel --prod`); `./ship.sh --no-deploy` pushes only
for a preview build. After deploying, **re-open / re-install the PWA** so it picks up the new build.
Full steps + auth notes in the [RUNBOOK](RUNBOOK.md).

---

## Earlier sessions (highlights from git history)

Local-first Next.js PWA built backlog-driven. Notable shipped work before this session:

- **1,729-card deck** (the Ramanujan taxicab number) via `scripts/generate_cards.py`, with per-card
  `rarity`/`intensity`/`tags` + concise `effect` and `commentary`; **Commentator voice** toggle.
- **Scorekeeper** — side-out scoring, win-by-2, serving indicator, undo, score-lock, manual −1
  correction; **in-game pause** (clock freeze, survives reload); **best-of-1/3/5** match flow with a
  match-complete celebration.
- **Skill levels** (Beginner / Intermediate / Advanced) and **5 themed deck modes**.
- **Resume multiple in-progress games**; **match history** + lifetime **win-loss records** + **CSV
  export**; **export/import backup**.
- **Custom decks** — build, favourite, **share/import by code**, clone; **browse + search** all 1,729
  cards; **rarity-distribution chart**; **pickleball glossary**.
- **Daily challenge** (seeded deck-of-the-day); **achievements/badges** from local stats;
  **big-score TV / courtside** display; **shareable match-result image**.
- **Platform/polish:** dark/light/auto theme (persisted, follows system); PWA + **offline banner** +
  SW update prompt; **wake-lock** during a game; full **accessibility** pass (focus rings, dialog
  semantics + focus-trap, screen-reader announcements, 44px targets, reduced-motion); privacy/terms/
  about pages; **CI** (lint → type-check → tests → `npm audit` → build) + secret scanning + dependabot
  + rollback runbook; **axe a11y + RTL** component tests.

For the blow-by-blow, see [WORKLOG](WORKLOG.md) and `git log`.

---

## Where to read more
- Run it / architecture → [ONBOARDING](ONBOARDING.md)
- Contribute / CI gates → [CONTRIBUTING](../CONTRIBUTING.md)
- Doubles rules + which button → [DOUBLES-SCORING](DOUBLES-SCORING.md)
- Why the score UI is shaped this way → [SCORING-UX-RESEARCH](SCORING-UX-RESEARCH.md)
- What was tested → [VALIDATION-REPORT](VALIDATION-REPORT.md)
- Open work → [TICKETS](TICKETS.md) · [BACKLOG](BACKLOG.md)
- Deploy / rollback / secrets → [RUNBOOK](RUNBOOK.md)
