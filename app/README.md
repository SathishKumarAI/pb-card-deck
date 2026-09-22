# 🏓 PB Card Deck

**Draw twist cards mid-match. Shake up the game.**

A free, **mobile-first, local-first** web app with 1,729 pickleball twist cards across 10 categories. Tap to draw, read the rule, play the next point under that twist - then keep score with a real pickleball scoring engine.

### ▶︎ Live app: **https://pb-card-deck.vercel.app**

No login. No install. Open the link at the court and play.

> **What's new:** **Understand & Play (v1)** - a first-run **welcome tour** (replayable from Rules & help), **tap-to-define** jargon, a per-card **"?" explainer**, an always-shown **"What to do"** line, and a **"Why & how"** Rules tab, so newcomers need zero pickleball knowledge. Plus a **Coach / Umpire "Track a match"** mode (home `Play with cards` / `Track a match` toggle) that runs and records a real match - singles/doubles, two-server rotation, timeouts/faults, side-switch, saved to history with a downloadable match sheet. Also: a **1,729-card deck** (the Ramanujan taxicab number) with per-card **rarity / intensity / tags**; a **Commentator voice** toggle (concise vs hyped card text); **in-game pause**; configurable **match length** + match-complete screen; a **Back** button beside Draw and a bigger responsive card; plus a full accessibility pass and custom fonts. Full card dataset with the design rationale: [`../docs/data/cards.json`](../docs/data/cards.json).

---

## Table of contents

- [What it does](#what-it-does)
- [Design philosophy: local-first](#design-philosophy-local-first)
- [Feature overview](#feature-overview)
- [Architecture (deep dive)](#architecture-deep-dive)
  - [Data flow](#data-flow)
  - [The scoring engine](#the-scoring-engine)
  - [Local persistence model](#local-persistence-model)
  - [Rendering & animation](#rendering--animation)
  - [PWA & service worker](#pwa--service-worker)
  - [Mobile hardening](#mobile-hardening)
- [Project structure](#project-structure)
- [Quick start](#quick-start)
- [Deploying](#deploying)
- [Data & privacy](#data--privacy)
- [Reference tables](#reference-tables)
- [Roadmap](#roadmap)

---

## What it does

You're mid-game on a pickleball court. Between points, someone taps the big card. It flips over: **"Dinks Only - every shot this point must be a dink."** You play the point under that constraint, tap the score, and draw again. The app is two things fused together:

1. **A twist-card deck** - 1,729 cards in 10 categories, filtered into 5 themed modes (Family → Chaos).
2. **A pickleball scorekeeper** - side-out scoring, win-by-2, serving indicator, undo, best-of-3 tracking.

Everything runs on the device. There is no account and no server round-trip during play.

## Design philosophy: local-first

This app deliberately has **no backend and no login.** That is a design decision, not a missing feature. The reasoning:

| Concern | Why local-first wins here |
|---|---|
| **Friction** | Players open the link mid-game. A signup wall is the fastest way to lose a casual user. |
| **Latency** | Drawing a card and scoring must feel instant. No network in the hot path = zero latency. |
| **Offline** | Courts have bad signal. A static site + service worker keeps working once loaded. |
| **Cost & ops** | No database, no auth provider, no secrets to rotate, no per-user billing. |
| **Privacy** | Your games, decks, and settings never leave your device. |

The tradeoff we accept: **no cross-device sync.** Custom decks and match history live in `localStorage`, so they're per-device. To move data between devices we provide a manual **Export / Import** backup (a JSON file). If a real sync/sharing need appears later, an optional auth + database layer can be added *without* changing the core - the local store is already isolated behind one module (`lib/client-api.ts`).

## Feature overview

### Cards & decks
- **1,729 cards** across 10 categories, each with a name + effect.
- **5 deck modes** - Family, Party, Drill, Tournament, Chaos - each a category filter.
- **Custom decks** - build your own twist cards (name + effect + category), save them locally, and play them.
- **True 3D card flip** - perspective flip with a shine sweep on reveal.
- **Recent draws** - the last 3 cards stay visible below the deck.
- **Favorite / skip** - star cards you love; skip excludes a card from future draws this game.

### Scoring & game engine
- **Tap-to-score** scorekeeper with full game logic.
- **Side-out scoring** - only the serving team can score (real pickleball rules); off-team taps trigger a side-out.
- **Win detection** - first to 11 (configurable 7/11/15/21), **win by 2**.
- **Serving indicator** - pulsing ring shows who serves; tap to switch.
- **Undo stack** - reverses the last action completely (fixes wrong-team taps).
- **Score lock** - prevents accidental taps.
- **Confirm mode** - optional "Team 1 scores? Yes/No".
- **Best-of-3 tracking** + per-game results.
- **Resume last game** - leave to the menu and a *Resume* banner brings the in-progress match back, score intact.

### Match data (local)
- **Match history** - every finished match is saved locally with score, mode, winner, and duration.
- **Export / Import backup** - download all decks + history as JSON; restore on any device.
- **In-app feedback** - star rating + message that opens a prefilled email to the maintainer (and keeps a local copy).

### Experience
- **Lucide icon set** throughout (no emoji) for a clean, consistent look.
- **Dark / light mode** with the browser chrome (`theme-color`) tracking the toggle.
- **Calm, low-strain palette** - softened off-black/off-white, gentle motion, `prefers-reduced-motion` respected.
- **Sound + haptics** on score and draw.
- **Responsive** - the card and layout scale to the device with `clamp()`/`dvh` so nothing overflows on small phones.
- **PWA** - installable, full-screen, safe-area aware, works offline after first load.

### Learn & understand (no pickleball knowledge needed)
- **Welcome tour** - on first open, three slides (what this is / a point start to finish / where help lives); hands over to the manual, replayable any time from **Help**.
- **Tap-to-define jargon** - terms on a card (dink, kitchen, erne, side-out…) are underlined; tap one for a plain-language definition, powered by the shared `lib/glossary.ts`.
- **Per-card "?" explainer** - every card has a **?** that opens *what this means · how to play it · what kind of card* in beginner words (from `CATEGORY_INFO`).
- **"What to do" line** - the card always shows a concrete action for the point, not just the constraint, plus a one-time in-game hint.
- **Searchable manual** - `Help` in the header on every screen opens `components/HelpPanel.tsx`: 30 answers from `lib/manual.ts` in plain language, with search (every query word must match) and three quick links.

### Coach / Umpire mode - "Track a match"
- **One-tap mode switch** - home has a `Play with cards` / `Track a match` toggle that swaps the whole flow.
- **Match setup** - singles or doubles, player/team names, an event/round label, points-to-win (11/15/21), match length, and cards on/off (off by default).
- **Real server rotation** - doubles uses the two-server rotation (Server 1 → 2 → side-out) with the serving side + server number shown live; singles passes serve straight over.
- **Officiating controls** - per-team timeout and fault buttons, a side-out button, and the halfway side-switch reminder.
- **Match sheet** - saves to Match history with the event label + format and downloads a one-tap text **match sheet** (teams, game-by-game, timeouts, faults, duration).

## Architecture (deep dive)

**Stack:** Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS v4 · lucide-react. The app ships as a single client-rendered route - there is no server-side data path in production.

### Data flow

```
public/cards.json ──fetch(no-store)──▶ allCards (state)
                                          │
              deck mode / custom deck ────┤
                                          ▼
                              getFilteredCards() ──shuffle──▶ deck (state)
                                          │  drawCard()
                                          ▼
                                   currentCard ──▶ CardDisplay (3D flip)
                                          │
                                          └──▶ cardHistory (last 3)

ScoreKeeper taps ──▶ lib/game.ts (pure reducers) ──▶ GameSession (state)
                                          │ saveGame()              │ winner set
                                          ▼                         ▼
                              localStorage(active game)    lib/client-api addMatch()
```

The 1,729 cards are static JSON served from `public/`. All game logic is a set of **pure functions** in `lib/game.ts` (`addScore`, `sideOut`, `undoLast`, `checkWin`, …) that take a `GameSession` and return a new one - easy to reason about and trivially testable. React state in `app/page.tsx` is the single source of truth for the live game; everything else is derived.

### The scoring engine

`lib/game.ts` models a `GameSession` (score, serving team, history, config, card sets) and exposes immutable transitions:

- **`addScore(game, team)`** - if side-out scoring is on and the scoring team isn't serving, it routes to `sideOut()` instead of adding a point (authentic rules). Otherwise it appends a timestamped `ScoreEvent` and recomputes the winner.
- **`checkWin(score, config)`** - first to `pointsToWin`, enforcing win-by-2 when enabled.
- **`undoLast`** - pops the last event and restores `scoreBefore`, clearing any winner.
- **`startNewGame`** - rolls the current score into `gameResults`, increments game number, alternates the first server (best-of-N flow).

Because transitions are pure, the UI just calls them and stores the result; undo is "use the previous snapshot," not ad-hoc reversal logic.

### Local persistence model

All persistence is `localStorage`, isolated behind **`lib/client-api.ts`** so the storage backend can be swapped without touching components.

| Key | Holds | Cap |
|---|---|---|
| `pickleball-shuffle-game` | the active `GameSession` (for resume) | 1 |
| `pb-custom-decks` | user-authored decks `{ id, name, description, cards[] }` | - |
| `pb-match-history` | finished matches `{ teams, score, winner, mode, duration }` | 200 |
| `pb-feedback` | local backup of submitted feedback | 50 |

`exportData()` serializes decks + history to a JSON blob (downloaded via an object URL); `importData()` restores them. Custom-deck cards are mapped to playable `Card`s with **negative ids** (`deckToCards`) so they never collide with the built-in 1-1729 id space.

### Rendering & animation

- **3D flip** - `.card-3d` sets `perspective`; an inner `preserve-3d` layer rotates `rotateY(180deg)` with `backface-visibility: hidden` on both faces. Draw logic flips to the back, swaps the card on the next frame (`requestAnimationFrame`), then flips to the face - so you never see the next card through the flip.
- **Mesh backdrop** - a fixed, GPU-cheap radial-gradient layer that drifts slowly (`meshDrift`, 26s).
- **Micro-interactions** - a small utility-class system in `globals.css` (`anim-pop`, `anim-fade-up`, `.pressable`, `.stagger`, `.shine`). Hover lifts are gated behind `@media (hover: hover)` so touch devices don't get stuck hover states.
- All motion collapses under `prefers-reduced-motion: reduce`.

### PWA & service worker

`public/sw.js` is **network-first with a cache fallback** (`pb-shuffle-v2`): online users always get fresh data; offline users get the last cached copy. The SW is **only registered in production** - in development the app actively unregisters any existing worker and clears caches, which avoids the classic "stale service worker serves old `cards.json`" trap during local dev.

### Mobile hardening

The primary use case is a phone at a court, so the app is tuned for it:

- **`100dvh`** layout (not `100vh`) so the mobile URL bar never clips content.
- **16px form fonts** - prevents iOS from auto-zooming on input focus.
- **`touch-action: manipulation`** on interactive elements - kills the 300ms tap delay and double-tap zoom.
- **Safe-area insets** (`env(safe-area-inset-*)`) on the header, sticky top bar, and bottom sheets for notches and home indicators.
- **`overflow-x: hidden`** + responsive `clamp()` card sizing so nothing overflows or side-scrolls on small screens.
- Header + scrollable `<main>` layout (no absolute-positioned controls) so nothing overlaps on short devices.

## Project structure

```
app/
├── app/
│   ├── page.tsx              # The whole game: state, draw, score, panels, resume
│   ├── layout.tsx            # Root layout, viewport, PWA metadata
│   └── globals.css           # Theme tokens, animation utilities, mobile hardening
├── components/
│   ├── CardDisplay.tsx          # 3D flip card + per-card "?" explainer
│   ├── ScoreKeeper.tsx          # Side-out scoring, serving ring, score bump
│   ├── TopBar.tsx               # In-game bar: back, mode, menu, settings, theme
│   ├── CardHistory.tsx          # Last 3 draws
│   ├── WinCelebration.tsx       # Confetti + trophy modal
│   ├── PlayerNames.tsx          # Inline team-name editor
│   ├── SettingsSheet.tsx        # Points-to-win, scoring rules, sound
│   ├── AppMenu.tsx              # History / Decks / Export-Import / Feedback
│   ├── HistoryPanel.tsx         # Match history sheet (+ reusable Sheet)
│   ├── DecksPanel.tsx           # Custom deck list + editor
│   ├── FeedbackPanel.tsx        # Rating + message → mailto
│   ├── HelpPanel.tsx            # Searchable manual (content in lib/manual.ts) + glossary
│   ├── WelcomeTour.tsx          # First-run tour, three slides (replayable)
│   ├── GlossaryText.tsx         # Tap-to-define jargon highlighter
│   ├── OfficialMatchSetup.tsx   # "Track a match" setup (singles/doubles, etc.)
│   ├── OfficialControls.tsx     # Coach/umpire controls: server, timeouts, faults
│   ├── TVScore.tsx              # Big-score courtside / TV display
│   ├── AchievementsPanel.tsx    # Badges / achievements from local stats
│   ├── FavoritesPanel.tsx       # Starred cards list
│   ├── CardBrowserPanel.tsx     # Browse / search the full deck
│   ├── NetworkStatus.tsx        # Offline indicator
│   ├── Toast.tsx                # In-app toast (import status, etc.)
│   ├── SharePanel.tsx           # Share sheet: shape, live canvas preview, caption
│   ├── icons.tsx                # lucide icon maps + the drawn pickleball mark
│   └── tournament/              # The event screens - see its README
│       ├── TournamentHome.tsx   #   list / setup / running event, and storage
│       ├── TournamentSetup.tsx  #   create: names, format, division, counts
│       ├── TournamentScreen.tsx #   the dashboard: tabs, rail, export, log
│       ├── BracketView.tsx      #   the draw as a tree, SVG connectors
│       ├── MatchCard.tsx        #   one match: enter, edit or play its score
│       └── StandingsTable.tsx   #   the table, full and compact
├── lib/
│   ├── cards.ts                 # Card types, deck modes, filtering, shuffle
│   ├── game.ts                  # Pure game engine (+ official mode) + active game
│   ├── client-api.ts            # Local store: decks, history, export/import, match sheet
│   ├── glossary.ts              # Shared pickleball glossary (Rules + in-card)
│   ├── manual.ts                # The in-app manual: every help answer, as data
│   ├── streaks.ts               # Win streaks from saved matches (pure)
│   ├── useFocusTrap.ts          # Focus-trap hook for dialogs/sheets
│   ├── useScrollLock.ts         # Freeze the page behind an open sheet
│   ├── shareImage.ts            # Share cards on canvas: result/streak/champion
│   ├── sounds.ts                # Web Audio sound effects + haptics
│   └── tournament/              # The event engine - see its README
│       ├── types.ts             #   shapes: Tournament, Match, Slot, Division
│       ├── engine.ts            #   create, resolveSlots, record, courts, log
│       ├── roundRobin.ts        #   circle-method scheduling
│       ├── elimination.ts       #   single + double bracket wiring, seeding
│       ├── standings.ts         #   tables, tiebreaks, per-player scoring
│       ├── export.ts            #   CSV / Markdown / JSON / text
│       └── demo.ts              #   a worked example, played through the engine
├── scripts/
│   └── contrast-audit.mjs    # WCAG table for both themes (npm run contrast)
└── public/
    ├── cards.json            # All 1,729 cards
    ├── manifest.json         # PWA manifest
    └── sw.js                 # Network-first service worker
```

> Note: `app/api/`, `app/login`, `app/signup`, and a few `lib/*` files are inert stubs left from an abandoned auth experiment and are safe to delete.

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000  (binds 0.0.0.0 for phone testing)
```

Open it on your phone over the same Wi-Fi using your machine's LAN IP (e.g. `http://192.168.1.x:3000`) to feel the haptics and flip.

```bash
npm run build        # production build
npm start            # serve the production build
```

## Deploying

The app is linked to Vercel and deploys with:

```bash
vercel --prod        # from the app/ directory
# or
./deploy-vercel.sh   # from the repo root
```

Current production alias: **https://pb-card-deck.vercel.app**

## Data & privacy

Everything you create - games, custom decks, match history, settings - is stored **only in your browser's `localStorage`**. Nothing is transmitted to any server. Clearing site data (or using a different device/browser) starts you fresh; use **Menu → Export backup** to save a JSON copy you can re-import anywhere.

## Reference tables

### Card categories

| Category | Cards | Description |
|---|---|---|
| Shot Restriction | 182 | Limits what shots you can hit |
| Body & Movement | 140 | Physical challenges and restrictions |
| Wild Card / Swap | 164 | Partner swaps, paddle trades, side switches |
| Penalty | 152 | Bad-luck draws - lose a serve, sit out |
| Bonus / Reward | 182 | Free points, double serves, advantages |
| Social & Party | 182 | Selfies, compliments, trash talk |
| Strategy / Skill | 182 | Erne bounties, ATP bonuses, coach's choice |
| Wacky / Chaos | 182 | Pirate voice, animal sounds, blindfolds |
| Court / Environment | 182 | Shrunken courts, giant kitchens, zone rules |
| Meta & Game-Flow | 181 | Draw two, skip draws, reverse scoring |

### Deck modes

| Mode | Description | Card count |
|---|---|---|
| Family | Fun for all ages | 686 |
| Party | Laughs, dares & drinks | 862 |
| Drill | Sharpen your game | 504 |
| Tournament | Competitive twists | 545 |
| Chaos | All 1,729 cards, anything goes | 1,729 |

## Colour & theming

Light is the default theme. Dark and "auto" are one tap away in the header and
the choice persists in `localStorage`.

- Tokens live at the top of `app/globals.css`. `:root` carries the **light**
  palette; `[data-theme="dark"]` overrides it. Radius (`--r-chip` → `--r-hero`),
  elevation (`--elev-1..3`), glass materials (`--mat-thin/regular/thick`) and
  `--accent-ink` are all tokens - nothing is eyeballed per component.
- `npm run contrast` prints a WCAG table for both themes and exits non-zero if a
  pair drops below its threshold. It also runs as a test
  (`lib/contrast.test.ts`), so a palette edit that breaks contrast fails CI
  rather than someone's eyes in sunlight.
- When it was first written, two light-mode pairs failed: white on `#059669`
  came to 3.77:1 (AA wants 4.5 for a button label) and the `#d97706` serve
  marker sat at 2.84:1 on the page. The palette was darkened - same hues - until
  both passed. The numbers are in the comments beside the tokens.

## Tournaments

`lib/tournament/` is a pure engine and `components/tournament/` is its UI; both
carry a change-to-file README. Five formats - round robin, pools → playoff,
single and double elimination, rotating partners - run on one idea:

**A match holds two SLOTS, not two teams.** A slot says where its team comes
from: a seed, the winner of another match, the loser of another match, or a bye.

```ts
type Slot =
  | { from: "team"; teamId: string }
  | { from: "winner"; matchId: string }
  | { from: "loser"; matchId: string }
  | { from: "bye" };
```

One function, `resolveSlots`, fills in whatever is now knowable. That single
pass advances a bracket, awards a bye nobody plays, builds the playoff the
moment pools finish, and drops a double-elimination reset when the
winners-bracket team takes the grand final. **Adding a format means writing
wiring, not advance logic.**

Around it: a live bracket tree (SVG connectors, geometry computed from one slot
constant), editable scores with an audit log that records what a score used to
be, CSV/Markdown/JSON/text export, divisions including mixed pairing from
`(m)`/`(f)` markers, typed court and pool counts, and a demo event built by
playing one through the real engine.

A tournament match can be typed at a desk or played on the scorekeeper; in the
second case the game carries `GameSession.tournamentRef` and **team 1 is always
the match's team A**, which is the invariant that makes the write-back safe.

## Sharing

`lib/streaks.ts` computes per-name streaks from saved matches - current run,
best run, win rate, recent results. `lib/shareImage.ts` draws three card kinds
(result, streak, champion) at three sizes (square 1080², story 1080×1920, 4:5
1080×1350) on a canvas, and `components/SharePanel.tsx` previews and hands them
to the phone's share sheet. The preview *is* the file: the canvas renders at
full 1080 and is scaled by CSS, so it cannot drift from the export.

## Roadmap

Nothing below is started. It is the honest list of what the current shape makes
possible, with the reason each one is still absent.

| Idea | Note |
|---|---|
| Share codes / QR handoff for an event or a custom deck | The strongest reason to add any server at all. A read-only spectator link is the same problem. |
| Seeding and pairing by rating | Match history holds the data per player; nothing aggregates it into a rating yet. |
| Consolation and plate draws, third-place play-off | The slot model already supports it - it is wiring, not new engine code. |
| Timed rounds, scheduled starts | The queue is ordered, not clocked; real events often run to a clock. |
| Rotating partners that never repeats a pairing | Currently ranks, groups and pairs: close games, but a pairing can repeat late in a small field. |
| Per-card analytics (most drawn, most skipped) | The counters exist in `lib/client-api.ts`; nothing reads them yet. |
| Translation | All copy sits in `lib/manual.ts`, `lib/glossary.ts` and components - none of it extracted. |
| Splitting `app/page.tsx` | Past the 500-line ceiling. Tournament code was kept out of it deliberately; the game screen is the next split. |

## License

MIT
