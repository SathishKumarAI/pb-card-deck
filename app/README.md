# 🏓 PB Card Deck

**Draw twist cards mid-match. Shake up the game.**

A free, **mobile-first, local-first** web app with 1,729 pickleball twist cards across 10 categories. Tap to draw, read the rule, play the next point under that twist - then keep score with a real pickleball scoring engine.

### ▶︎ Live app: **https://pb-card-deck.vercel.app**

No login. No install. Open the link at the court and play.

> **What's new:** the whole shipped history, newest first and with the reasoning,
> now lives in **[`../CHANGELOG.md`](../CHANGELOG.md)**. The last big arrivals:
> **tournaments** (five formats, a live bracket tree, standings, exports, an
> audit log), coach/umpire **Track a match** with a downloadable match sheet, a
> **searchable manual** plus tap-to-define jargon, **share cards** as PNGs,
> **light as the default theme** with a measured WCAG palette, and a rulebook
> **scoring audit**. Product-level guides: [running an
> event](../docs/TOURNAMENTS.md) · [recording a
> match](../docs/RECORDING-A-MATCH.md). Full card dataset with the design
> rationale: [`../docs/data/cards.json`](../docs/data/cards.json).

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

## Design philosophy: local-first, with an optional account

The default has **no backend and no login**, and that is a design decision rather
than a missing feature. Phase 2a added an **optional** account beside it: with no
`NEXT_PUBLIC_SUPABASE_*` env vars the cloud code is never downloaded and this whole
section describes the app exactly. The reasoning for the default:

| Concern | Why local-first wins here |
|---|---|
| **Friction** | Players open the link mid-game. A signup wall is the fastest way to lose a casual user. |
| **Latency** | Drawing a card and scoring must feel instant. No network in the hot path = zero latency. |
| **Offline** | Courts have bad signal. A static site + service worker keeps working once loaded. |
| **Cost & ops** | No database, no auth provider, no secrets to rotate, no per-user billing. |
| **Privacy** | Your games, decks, and settings never leave your device. |

The tradeoff the default accepts: **no cross-device sync.** An account lifts it for
people who want one - see `lib/sync/README.md` and `../docs/SUPABASE-SETUP.md` - and
the local store stays authoritative for play either way.

Historical note: the sentence below used to end "an optional auth + database layer
can be added *without* changing the core - the local store is already isolated behind
one module". That turned out to be true: `lib/client-api.ts` became a façade over
`lib/store/*`, the sync queue hooked in behind it, and **no screen changed**.

The tradeoff, as it was written before any of that existed: **no cross-device sync.** Custom decks and match history live in `localStorage`, so they're per-device. To move data between devices we provide a manual **Export / Import** backup (a JSON file). If a real sync/sharing need appears later, an optional auth + database layer can be added *without* changing the core - the local store is already isolated behind one module (`lib/client-api.ts`).

## Feature overview

### Cards & decks
- **1,729 cards** across 10 categories, each with a name + effect.
- **5 deck modes** - Family, Party, Drill, Tournament, Chaos - each a category filter.
- **Custom decks** - build your own twist cards (name + effect + category), save them locally, play them, and hand one to a friend as a **share code** (`encodeDeck` / `importDeckCode`, no upload).
- **True 3D card flip** - perspective flip with a shine sweep on reveal.
- **Recent draws** - the last 3 cards stay visible below the deck.
- **Favorite / skip** - star cards you love; skip excludes a card from future draws this game.
- **Full-deck browser** - search and filter all 1,729 cards by text, category and rarity (`CardBrowserPanel`, results capped at 120 with a count of what is hidden).
- **Daily challenge** - a deck seeded from the date with a `mulberry32` PRNG, so it is identical for everyone that day with no server keeping the seed.

### Scoring & game engine
- **Tap-to-score** scorekeeper with full game logic.
- **Side-out scoring** - only the serving team can score (real pickleball rules); off-team taps trigger a side-out.
- **Rally scoring** as an alternative - the rally winner scores *and* serves next.
- **TV / courtside score** - a huge-score, minimal-chrome view for a phone or tablet propped at the side of the court.
- **Screen wake lock** - the screen stays awake while a game is live and re-acquires when the tab returns to the foreground.
- **Win detection** - first to 11 (configurable 7/11/15/21), **win by 2**.
- **Serving indicator** - pulsing ring shows who serves; tap to switch.
- **Undo stack** - reverses the last action completely (fixes wrong-team taps).
- **Score lock** - prevents accidental taps.
- **Confirm mode** - optional "Team 1 scores? Yes/No".
- **Best-of-3 tracking** + per-game results.
- **Resume last game** - leave to the menu and a *Resume* banner brings the in-progress match back, score intact.

### Match data (local)
- **Match history** - every finished match is saved locally with score, mode, winner, per-game results and **played** duration (pause time excluded), after the app asks for consent.
- **Win streaks and lifetime records** - per-name current run, best run, win rate and recent results (`lib/streaks.ts`, `playerRecords`).
- **Achievements** - local milestones computed from your own counters (`pb-stats`): first draw, 100 and 500 draws, a legendary, a custom deck, 10 and 50 matches, daily challenges. No accounts, no leaderboard.
- **CSV export** - match history as `date, mode, team1, score1, team2, score2, winner, games, minutes`.
- **Export / Import backup** - download all decks + history + events as JSON; restore on any device.
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

**Stack, with the versions in `package.json`:** Next.js `16.2.6` (App Router,
Turbopack) · React `19.2.4` · TypeScript `^5` · Tailwind CSS `^4` ·
lucide-react `^1.17.0` · Vitest `^4.1.9` + Testing Library + jsdom +
`vitest-axe` · Node `24` in CI, matching the Vercel runtime. **Four runtime
dependencies in total** (`next`, `react`, `react-dom`, `lucide-react`) - no state
library, no component library, no backend. The app ships as a single
client-rendered route; there is no server-side data path in production.

**Gates:** `npm run lint` · `npx tsc --noEmit` · `npm test` (**262 tests in 23
files**) · `npm run contrast` · `npm run build`. Touching `../supabase/` also means
`bash ../scripts/verify-rls-local.sh`. CI runs all of them plus
`npm audit` and a gitleaks secret scan.

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
| `pb-sync-outbox`, `pb-sync-cursors`, `pb-sync-idmap`, `pb-sync-logsent`, `pb-sync-claimed` | sync bookkeeping; all cleared on sign-out | - |
| `pickleball-shuffle-game` | the active `GameSession` (for resume) | 1 |
| `pickleball-shuffle-games` | saved in-progress games | - |
| `pb-custom-decks` | user-authored decks `{ id, name, description, cards[] }` | - |
| `pb-match-history` | finished matches `{ teams, score, winner, mode, duration, official fields }` | 200 |
| `pb-tournaments` | events, including their change log | - |
| `pb-favorites` | starred card ids | - |
| `pb-stats` | counters behind achievements (draws, legendaries, dailies) | - |
| `pb-save-history` | the save-to-device answer (`ask` / `always` / `never`) | 1 |
| `pb-theme`, `pb-last-deck` | theme choice, last deck mode | 1 each |
| `pb-welcome-tour-seen`, `pb-beginner-intro-seen` | one-time gates | 1 each |
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
│   ├── page.tsx              # Session state only (~470 lines): draw, score, storage, resume
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
│   ├── HomeScreen.tsx          # The landing screen (no game state of its own)
│   ├── GameScreen.tsx          # The game screen + its overlays
│   ├── AppPanels.tsx           # Every menu sheet, rendered by both screens
│   ├── SaveMatchPrompt.tsx     # "Save this match?" - consent before storage
│   ├── PauseOverlay.tsx        # Paused dialog (owns its focus trap)
│   ├── BeginnerIntro.tsx       # First-run how-to-play
│   ├── Why1729.tsx             # The number, explained where it is asked
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
│   ├── manual.ts                # The in-app manual: answers as POINTS + QUICK_LINKS
│   ├── historyConsent.ts        # Save-to-device preference (ask/always/never)
│   ├── useTheme.ts              # Theme choice, data-theme, theme-color, storage
│   ├── usePanels.ts             # Which menu sheet is open
│   ├── useOnce.ts               # One-time gates (tour, intro, hint)
│   ├── useWakeLock.ts           # Keep the screen awake during a game
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

## Scoring, and how it was audited

`lib/game.ts` is a pure engine; `lib/game.test.ts` covers it and
`lib/scoring-audit.test.ts` holds the findings of a rulebook audit - one test
per defect, each written before its fix and named for what a player would see.

| Rule | Where |
|---|---|
| Only the serving team scores; a receiving win is a side out | `addScore` |
| Rally scoring: the rally winner scores **and serves next** | `addScore` |
| Doubles two-server rotation | `sideOut` |
| The opening side of a game gets ONE service turn (USAP 4.B.7) | `initialServerNumber` |
| Reset returns the game to how it **started**, serve included | `resetScore` + `firstServingTeam` |
| Target, win-by-two, best-of-N | `checkWin`, `matchWinner` |
| Game point only for a side that can actually score it | `pointStatus` |
| A locked score is locked on every path | `addScore`, `adjustScore` |
| Every transition is undoable, side-outs included | `ScoreEvent.serveBefore`, `undoLast` |

The player-facing version of this table is in the app: Help → Keeping score →
"The scoring rules, in full", written as points rather than prose.

## Service worker

`public/sw.js` is network-first: fresh when online, cached copy when not. It
deliberately does **not** cache cross-origin requests or `/_next/static/*` -
those filenames already carry a content hash, the browser's own HTTP cache
handles them, and copying them in grew the cache by a full set of chunks on
every deploy for ever, because `activate` only clears *other* cache versions.

## Asking before saving

A finished match used to be written to history the instant the game ended.
`lib/historyConsent.ts` now holds a three-way preference (`ask` by default,
`always`, `never`) and `components/SaveMatchPrompt.tsx` is the dialog. The data
never leaves the device either way - but "stays on your phone" is still a
promise about the phone, so the first save asks. Dismissing the dialog counts as
*not this time*, never as consent.

`shouldAskToSave(pref, answeredThisMatch)` is the whole decision, and it is
pure so it can be tested. The answer covers the **match**, not the game: a best
of 3 finishes three games, and three dialogs for one match is nobody's idea of
consent.

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

> `app/page.tsx` used to head this list at 1,010 lines. It is now ~470 and owns
> session state only; layout lives in `HomeScreen`, `GameScreen` and
> `AppPanels`. The debt is paid - see [`../CHANGELOG.md`](../CHANGELOG.md).

## Contributing

Ideas, cards, bug reports and PRs are all welcome - see
[`../CONTRIBUTING.md`](../CONTRIBUTING.md) for the four CI gates, the card
generator, and the traps that have cost real time here. Two ground rules: keep it
local-first, keep the build green.

## License

[MIT](../LICENSE)
