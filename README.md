# PB Card Deck

**Draw twist cards mid-match. Shake up the game. Keep score for real.**

A free, open-source, **mobile-first, local-first** web app: 1,729 pickleball
twist cards fused with a real pickleball scorekeeper, a coach/umpire match
recorder, and a tournament engine that will run an event for 4 people or 50.
No login, no backend, works at a court with no signal.

### ▶︎ Live app: **<https://pb-card-deck.vercel.app>**

[![CI](https://github.com/SathishKumarAI/pb-card-deck/actions/workflows/ci.yml/badge.svg)](https://github.com/SathishKumarAI/pb-card-deck/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
![Tests](https://img.shields.io/badge/tests-164%20passing-brightgreen)
![PWA](https://img.shields.io/badge/PWA-installable%20%C2%B7%20offline-blue)
![No backend](https://img.shields.io/badge/backend-none%20by%20design-lightgrey)

---

## Contents

- [The story](#the-story)
- [What makes it different](#what-makes-it-different)
- [Three ways to use it](#three-ways-to-use-it)
- [Everything it does](#everything-it-does)
- [Recording your gameplay](#recording-your-gameplay)
- [Running a tournament](#running-a-tournament)
- [Tech stack and versions](#tech-stack-and-versions)
- [How it is built](#how-it-is-built)
- [What has changed so far](#what-has-changed-so-far)
- [The plan](#the-plan)
- [Contributing, and ideas wanted](#contributing-and-ideas-wanted)
- [Docs](#docs)
- [License and credits](#license-and-credits)

---

## The story

It started on a court in May 2026 with one annoyance: **casual pickleball games
get repetitive, and casual scorekeeping gets argued about.** Both problems are
solved by paper - a deck of dare cards, a scoresheet on a clipboard - and paper
is exactly what nobody brings to a court.

So the first version was 200 twist cards and a tap-to-score board, shipped in a
weekend. Then real use kept asking for more, and each answer became a feature:

| Somebody said | What it became |
|---|---|
| "Same cards again." | The deck grew to **1,729 unique cards** - the Ramanujan taxicab number, because if you must pick a big number, pick one with a story. |
| "I don't know what a dink is." | **Tap-to-define jargon**, a per-card *what this means · how to play it* explainer, and a manual written for someone who has never played. |
| "Who's serving?" | A **real** scorekeeper: side-out or rally scoring, the doubles two-server rotation, win-by-2, undo on every transition - audited against the USA Pickleball rulebook, one test per defect. |
| "Can you just keep score, no cards?" | **Track a match** - coach/umpire mode with timeouts, faults, side-switch reminders and a downloadable match sheet. |
| "We're running a club night for 24 people." | A **tournament engine**: five formats, courts, pools, brackets, standings, exports, and an audit log for every corrected score. |
| "Send me the result." | **Share cards** - the win, the streak or the champion as a PNG at Instagram and WhatsApp sizes. |

Four months, 44 commits, ~11,000 lines of app code and ~1,900 lines of tests
later, it is a single static site that never phones home. **It is open source
because the next good idea probably is not mine** - see
[Contributing](#contributing-and-ideas-wanted).

## What makes it different

Plenty of apps keep a pickleball score. A few sell twist-card decks. The
interesting part is what falls out of doing both, locally, on a phone:

| | Why it is not the obvious approach |
|---|---|
| **A card deck *inside* the scoreboard** | The twist applies to the *next point*, so the card and the score have to share one state machine. Card games and score apps are normally two apps and a house rule. |
| **Zero backend, on purpose** | No login, no database, no per-user cost, nothing to leak. A court has bad signal; a static site plus a service worker does not care. The whole store sits behind one module, so it stays honest. |
| **A tournament engine where a match holds two *slots*, not two teams** | A slot says where its team comes from: a seed, the winner of a match, the loser of a match, or a bye. One function fills in whatever is now knowable - and that single pass advances a bracket, awards a bye nobody plays, builds the playoff the moment pools finish, and decides a double-elimination reset is not needed. **Adding a format is wiring, not new advance logic.** |
| **Colour that is measured, not eyeballed** | `npm run contrast` prints a WCAG table for both themes and fails the build below threshold. Two light-mode pairs failed the first time it ran - a button label at 3.77:1 and the serve marker at 2.84:1 - and the palette was darkened until they passed. |
| **Rules verified against the rulebook, not vibes** | `lib/scoring-audit.test.ts` is a rulebook audit: one test per defect, written before the fix, named for what a player would see. It caught the single opening service turn (USAP 4.B.7) and reset not restoring the first server. |
| **1,729 cards, unique like a primary key** | The deck is *generated* (`scripts/generate_cards.py`) and uniqueness is enforced on the name, so it cannot quietly grow duplicates. Every card carries rarity, intensity, tags, a callout and two text voices. |
| **It asks before it keeps anything** | A finished match asks before being written to your device, and remembers your answer. Nothing is uploaded either way - but "it stays on your phone" is still a promise about your phone. |
| **A demo event that is real** | One tap loads a half-played 12-team day, built by playing a real event through the real engine. No fixture JSON that drifts from the code. |

## Three ways to use it

Open the link, and pick the one you need. All three write to the same local
match history.

| | For | Starts at |
|---|---|---|
| 🃏 **Play with cards** | A casual or social game that needs shaking up | Home → pick a deck mode → Start |
| 🏓 **Track a match** | A coach, umpire or parent who just wants an accurate record | Home → `Track a match` toggle |
| 🏆 **Run an event** | A club night, ladder or tournament, 4 players or 50 | Home → Tournaments → New event (or **Load demo**) |

## Everything it does

### 🃏 Cards and decks
| Feature | What it does |
|---|---|
| **1,729 unique cards** | Every card is one of a kind. The count is the Ramanujan taxicab number - tap the note on the home screen for why. |
| **10 categories** | Shot Restriction, Body & Movement, Wild Card / Swap, Penalty, Bonus / Reward, Social & Party, Strategy / Skill, Wacky / Chaos, Court / Environment, Meta & Game-Flow. |
| **5 deck modes** | Family, Party, Drill, Tournament, Chaos - each filters the deck to fit the crowd. |
| **Rarity and intensity** | Common → Uncommon → Rare → Legendary, plus the original Signature set. Most draws are common; a legendary is a moment. |
| **Two text styles** | Concise rules by default, or **Commentator voice** in Settings for hyped courtside phrasing. Both are stored on every card. |
| **Custom decks** | Build your own deck, play it, and hand it to a friend as a **share code** - no account, no upload. |
| **Browse the whole deck** | A searchable, filterable explorer for all 1,729 cards, not just what you happen to draw. |
| **Favorites** | Star the cards you love and find them again later. |
| **Daily challenge** | A seeded deck that is identical for everyone that day, generated on-device, with no server keeping the seed. |

### 🏓 Playing and scoring
| Feature | What it does |
|---|---|
| **A real scorekeeper** | Side-out **or** rally scoring, configurable target (7/11/15/21), win-by-2, live serving indicator, one-tap undo, and a score lock against mis-taps. |
| **Doubles done properly** | The two-server rotation (Server 1 → Server 2 → side-out), including the single service turn the side that opens a game gets (USAP 4.B.7). |
| **Draw twists** | Tap the card to draw a twist for the next rally, with a **Back** button right beside Draw for a quick exit. |
| **In-game pause** | Freezes the match clock and blocks scoring behind a Paused screen. Survives closing the app - and paused time is not billed as playing time. |
| **Match length** | Single game, best of 3 or best of 5, with a match-complete celebration when a team takes the series. |
| **TV / courtside score** | A huge-score view for a phone or tablet propped at the side of the court. |
| **Screen stays awake** | A wake lock while a game is live, so a propped phone does not dim mid-match. |
| **Resume last game** | Leave mid-match and a one-tap banner brings it back - card, score and serve intact. |

### 📋 Recording and your data (100% local)
| Feature | What it does |
|---|---|
| **Match history** | Finished matches are saved on your device with score, mode, winner, game-by-game results and duration. |
| **Coach / umpire match sheet** | A one-tap text sheet - teams, game-by-game, timeouts, faults, duration - as proof of result. |
| **Win streaks** | Per-name current run, best-ever run, win rate, and recent results as dots. |
| **Achievements** | Local milestones from your own stats (first twist, 100 draws, a legendary, 50 matches…). No accounts, no leaderboard. |
| **Share cards** | Any win, streak or tournament result rendered to a PNG in three shapes - square (feed), story (1080×1920) and tall (4:5) - handed to your phone's share sheet with a caption to paste. |
| **CSV export** | Match history as CSV for a spreadsheet. |
| **Export / Import backup** | Move decks, history and events between devices as a JSON file. No account, no upload. |
| **Offline** | A service worker keeps the whole thing working at a court with bad signal. |

Full detail: **[`docs/RECORDING-A-MATCH.md`](docs/RECORDING-A-MATCH.md)**.

### 🧭 Learn the game while you play
| Feature | What it does |
|---|---|
| **Welcome tour** | On first open, three short slides: what this is, how a point works, where help lives. Replayable from Help. |
| **Tap-to-define jargon** | Terms on a card (dink, kitchen, erne, side-out…) are underlined - tap for a plain-language definition from one shared glossary. |
| **Per-card "?" explainer** | *What this means · how to play it · what kind of card it is*, in beginner words. |
| **"What to do" line** | Every card shows a concrete action for the point, not just the constraint. |
| **Searchable manual** | **Help** sits in the header on every screen: 30 plain-language answers from "Start here" to "Your data", with search and quick links. Written as bullet points, because people read them standing on a court. |

### 🏆 Tournaments
Summarised in [Running a tournament](#running-a-tournament); the full guide is
**[`docs/TOURNAMENTS.md`](docs/TOURNAMENTS.md)**.

### 🎨 Feel and accessibility
| Feature | What it does |
|---|---|
| **Light by default, dark on request** | The app opens light, because it is used in daylight far more than at night. The header cycles light → dark → auto, and the choice sticks. |
| **Measured colour** | Every text/surface pair in both themes is checked against WCAG AA by `npm run contrast`, which also runs as a test. |
| **Native-app feel** | iOS-style glass materials (thin / regular / thick), bottom sheets with a grabber, a pickleball-court backdrop, and hover states on pointer devices only. Scales from a phone to a two-column desktop layout. |
| **Polished motion** | A true 3D card flip, glassy panels, win confetti - all collapse under `prefers-reduced-motion`. |
| **Accessible** | Keyboard focus rings, dialog semantics and Escape on every panel, focus traps, screen-reader labels, 44px tap targets, pinch-zoom left on. |
| **Sound and haptics** | On score and draw, both toggleable. |
| **Installable PWA** | "Add to Home Screen" and it runs like a native app. |

> Want the raw data? The full card set with all metadata and the design
> rationale lives in **[`docs/data/cards.json`](docs/data/cards.json)**.

## Recording your gameplay

Three levels of record, depending on how serious the game is. Nothing is
uploaded at any level.

| Level | How | What you get |
|---|---|---|
| **Casual** | Just play. When a game ends, the app asks whether to save it | Score, mode, winner, per-game results, duration, in Match history - plus streaks and achievements |
| **Officiated** | Home → **Track a match** | Everything above **plus** an event/round label, singles/doubles format, per-team timeouts and faults, the halfway side-switch, and a downloadable **match sheet** |
| **Event** | Home → **Tournaments** | Every match of the event, standings, the bracket, and a **change log** of every result, correction and clear, with the time and the old score - exportable as CSV, Markdown, JSON or text |

Getting a record out:

- **Match sheet** - one tap in Track a match; plain text, readable by anyone.
- **Share card** - a PNG for a group chat, in three shapes, with a caption.
- **CSV** - match history for a spreadsheet.
- **Event export** - CSV / Markdown / JSON / plain text, each with results,
  standings and the change log.
- **Full backup** - one JSON file with decks, history and events, importable on
  any device.

The details, including what is stored under which key: **[`docs/RECORDING-A-MATCH.md`](docs/RECORDING-A-MATCH.md)**.

## Running a tournament

An event for 4 people or 50, on a phone, with no signal. Setup is one paste.

| Feature | What it does |
|---|---|
| **Five formats** | Round robin · pools → playoff bracket · single elimination · double elimination (losers bracket and a grand-final reset) · **rotating partners**, where players enter alone, change partner every round, and the score follows the *person*. |
| **Setup in one paste** | One entry per line. A line is a player (`Sam`) or an existing pair (`Sam & Priya`); the rest are paired as listed, at random, or strongest-with-weakest. 50 names in, a full schedule out. |
| **Courts** | Say how many courts you have. Exactly that many matches go on court, numbered, and the queue moves up as results land. |
| **Two ways to score** | Type the final score at the desk, or hand the match to the full scorekeeper (serve tracking, undo, timeouts) and it writes the result back. |
| **Standings that hold up** | Wins, then head-to-head for a straight two-way tie, then point difference. (Head-to-head only breaks a *two-way* tie - with three teams level it is usually circular.) Pool tables show the qualifying line. |
| **Live bracket tree** | Rounds as columns, matches centred between the two that feed them, byes resolved, connectors turning green as results land. Tap a match to enter or edit its score. It scrolls sideways on a phone, because the shape is the information. |
| **Fix mistakes safely** | Undo any result and everything downstream is undone with it - a playoff re-seeds itself if a pool result changes. |
| **A change log** | Every result, correction and clear is logged with the time and the old score, shown in a **Changes** tab and carried into every export. |
| **Divisions** | Open, men's, women's or mixed. A mixed draw pairs one of each from names marked `Sam (m)` / `Priya (f)`, and says up front how many pairs will be same-sex if the numbers do not balance. |
| **Any number of courts or pools** | Counts are typed, not picked from a fixed list. |
| **Export** | CSV (Excel / Numbers / Sheets), Markdown, JSON or plain text. |
| **Demo event** | One tap loads a half-played 12-team day - a real event played through the real engine - so you can see the whole thing working before running your own. |

Guide: **[`docs/TOURNAMENTS.md`](docs/TOURNAMENTS.md)** · engine:
**[`app/lib/tournament/README.md`](app/lib/tournament/README.md)** · screens:
**[`app/components/tournament/README.md`](app/components/tournament/README.md)**.

## Tech stack and versions

Small on purpose. Four runtime dependencies, no state library, no component
library, no backend.

| Layer | Choice | Version | Why this one |
|---|---|---|---|
| Framework | [Next.js](https://nextjs.org) App Router + Turbopack | `16.2.6` | Static export-friendly, good PWA story, one route |
| UI | [React](https://react.dev) | `19.2.4` | - |
| Language | TypeScript | `^5` | The engine is pure functions; types are the cheapest test |
| Styling | [Tailwind CSS](https://tailwindcss.com) v4 + CSS custom properties | `^4` | Utilities for layout, **tokens** for colour/radius/elevation |
| Icons | [lucide-react](https://lucide.dev) | `^1.17.0` | One consistent set; **no emoji in the UI** |
| Tests | [Vitest](https://vitest.dev) + Testing Library + jsdom + `vitest-axe` | `^4.1.9` | Fast, and the a11y assertions live in the same run |
| Card generator | Python 3 (stdlib only) | `3.x` | `scripts/generate_cards.py`; no deps to install |
| Node | Node LTS | `24` (CI) | Matches the Vercel runtime |
| Hosting | [Vercel](https://vercel.com) | - | Static site, global CDN, free tier |
| Storage | `localStorage` behind `lib/client-api.ts` | - | The entire persistence layer, swappable in one module |
| Offline | Service worker, network-first | `pb-shuffle-v2` | Fresh when online, last good copy when not |

**Runtime dependencies in full:** `next`, `react`, `react-dom`,
`lucide-react`. That is the list.

## How it is built

### Run it locally

```bash
git clone https://github.com/SathishKumarAI/pb-card-deck
cd pb-card-deck/app
npm install
npm run dev        # http://localhost:3000, and your LAN IP for phone testing
```

Open it on your phone over the same Wi-Fi (`http://192.168.1.x:3000`) to feel
the haptics and the flip - the phone *is* the target device.

### The gates, and what each one catches

```bash
cd app
npm run lint       # eslint (next config)
npx tsc --noEmit   # types
npm test           # 164 tests in 14 files
npm run contrast   # WCAG table for both themes (also runs as a test)
npm run build      # production build
```

| Suite | Catches |
|---|---|
| `game.test.ts`, `scoring-audit.test.ts` | Scoring, serve rotation, undo, win/series logic - audited against the rulebook |
| `tournament/*.test.ts` | Scheduling, bracket wiring, byes, tiebreaks, exports |
| `bugs-round2.test.ts` | Every bug found by hand, kept as a test so it cannot come back |
| `streaks.test.ts`, `cards*.test.ts`, `client-api.test.ts`, `manual.test.ts` | Streak maths, deck integrity and uniqueness, the local store, manual content |
| `a11y.test.tsx`, `scoreboard-view.test.tsx` | Axe violations and what the board actually renders |
| `contrast.test.ts` | A palette edit that drops a pair below WCAG AA |

**CI** (`.github/workflows/ci.yml`) runs lint → type-check → tests →
`npm audit` → build on every push and PR, plus a **gitleaks** secret scan.

### Deploying

`main` does **not** auto-deploy to production - the Git integration only builds
Previews. Deploy with the script, which deploys with `--scope`, moves the
domain alias, then curls the domain to verify:

```bash
./deploy-vercel.sh        # from the repo root
```

> The trap this script exists for: `vercel --prod` can succeed for months while
> the domain stays pinned to an old deployment. `pb-card-deck.vercel.app` was
> once found pointing at a build **81 days old**. **Verify the domain, never the
> deployment URL.**

### Regenerating the deck

```bash
python3 scripts/generate_cards.py
```

It keeps the original hand-written 200 cards (ids 1-200) as canonical, appends
combinatorial cards in commentator voice until the deck is exactly **1,729**,
balanced across the 10 categories, and enforces uniqueness on the card name like
a primary key. It writes `app/public/cards.json`, `data/cards.json` and
`docs/data/cards.json`.

### Making a change - start from the change, not the code

| I want to change… | Open |
|---|---|
| Anything visual - colour, spacing, radius, glass | `app/app/globals.css` (tokens at the top) |
| The home screen | `app/components/HomeScreen.tsx` |
| The game screen | `app/components/GameScreen.tsx` |
| Session state, storage, what starts a game | `app/app/page.tsx` (no layout here) |
| Any sheet reachable from the menu | `app/components/AppPanels.tsx` |
| What a card looks like | `app/components/CardDisplay.tsx` |
| Scoring rules, serve rotation, undo | `app/lib/game.ts` (pure, tested) |
| Tournament formats, brackets, standings | `app/lib/tournament/` (see its README) |
| Tournament screens | `app/components/tournament/` (see its README) |
| Help text and the Help shortcuts | `app/lib/manual.ts` |
| Pickleball definitions | `app/lib/glossary.ts` |
| Share images | `app/lib/shareImage.ts` |
| Anything saved to the device | `app/lib/client-api.ts` |

Two rules this project learned the hard way:

1. **Measure, do not infer.** Every UI bug in the last few passes looked correct
   in the markup - a missing Tailwind class, a clipped card title, a focus ring
   on every sheet, a page scrolling behind a dialog, a column 64px off centre.
   `getComputedStyle`, a scripted scroll, and `npm run contrast` found them in
   seconds.
2. **Never put a directory under `app/` in a `.gitignore`.** Tailwind v4 honours
   `.gitignore` for source detection, so ignoring `app/app/` silently stopped it
   generating every class used only in `page.tsx` - no error, just a page
   missing half its layout. Full note in `app/CLAUDE.md` → Traps.

### Repository layout

```
pb-card-deck/
├── app/               # ← the application (Next.js 16 + TypeScript + Tailwind v4)
│   ├── app/           #   route, layout, global styles + design tokens
│   ├── components/    #   screens, panels, card, scoreboard, tournament/
│   ├── lib/           #   cards, pure game engine, tournament engine, local store
│   └── public/        #   cards.json, manifest, service worker, icons
├── docs/              # the reasoning: changelog-adjacent notes, guides, worklog
│   └── data/          #   cards.json - the full documented dataset
├── scripts/           # generate_cards.py - rebuilds the 1,729-card deck
├── prompts/           # the prompt library the features were built from
├── frontend/          # legacy Vite stub, kept for reference, not deployed
├── CHANGELOG.md       # everything that shipped, and why
└── *.sh               # dev / prod / deploy helpers
```

Architecture deep-dive (data flow, the engine, the storage schema, animation,
service-worker strategy, mobile hardening): **[`app/README.md`](app/README.md)**.

## What has changed so far

The full history with the reasoning is in **[`CHANGELOG.md`](CHANGELOG.md)**.
The short version:

| When | Milestone |
|---|---|
| **2026-05-27** | First release: 200 cards, a working scorekeeper, PWA, 3D flip |
| **2026-06-09** | Local-first for real - one storage module, favorites, backup; the abandoned auth/Supabase backend deleted; CI gate added |
| **2026-06-15** | The deck grew to **1,729 cards** with rarity/intensity/tags and a commentator voice; Understand & Play onboarding; in-game pause; match length |
| **2026-09-21** | **Tournaments** (five formats, brackets, standings, exports), coach/umpire **Track a match**, searchable manual, share cards, streaks, the glass app shell, an accessibility pass |
| **2026-09-21** | **Light by default** and a palette darkened until it measured AA; `npm run contrast` as a test |
| **2026-09-21** | Deploy fixed - the domain had been pinned to an 81-day-old build; `page.tsx` split 1,010 → ~470 lines; a rulebook **scoring audit**; three centring bugs |
| **2026-09-22** | Desktop vertical space; named form fields; pause no longer billed as play; save asked once per match |
| **2026-09-29** | This documentation pass: the story, the changelog, the MIT `LICENSE` file, tournament + recording guides, issue templates, and stale numbers corrected |

## The plan

Nothing below is started. It is the honest list of what the current shape makes
possible, and the reason each one is still absent. **Anything here is a good
place to jump in** - say so in an issue and it is yours.

### Next up (most likely to happen)
| Idea | Where it stands |
|---|---|
| **Share codes / QR handoff** for an event or a custom deck | The strongest reason to add any server at all - and a peer-to-peer version needs none. Deck share codes already exist; events do not. |
| **Consolation / plate draws and a third-place play-off** | The slot model already supports it. This is wiring, not engine work - a genuinely good first contribution. |
| **Per-card analytics** (most drawn, most skipped, most favourited) | The counters already exist in `lib/client-api.ts`; nothing reads them yet. |
| **Rotating partners that never repeats a pairing** | Today it ranks, groups and pairs, which keeps games close but can repeat a pairing late in a small field. |

### Later
| Idea | Why it is not here yet |
|---|---|
| **Seeding and pairing by rating** | Seeds are the order you type names in. A rating needs match history aggregated per player over time - the data is kept, nothing aggregates it. |
| **Timed rounds and scheduled starts** | The queue is ordered, not clocked. Real events often run to a clock. |
| **A spectator link** | A read-only view of a running event on another phone. Needs the sync question answered first. |
| **More languages** | All copy sits in `lib/manual.ts`, `lib/glossary.ts` and the components; none of it is extracted for translation. |

### Deliberately not doing
| Not doing | Because |
|---|---|
| **Accounts and cross-device sync** | The local-first design exists to avoid them. The realistic version is a share code or QR handoff between two phones, not a backend. |
| **Ads, paywalls, or selling anything** | It is a for-fun project. MIT, free, no tracking. |
| **Emoji in the UI** | One icon set (lucide), everywhere. |

## Contributing, and ideas wanted

**This is an open-source project and contributions are genuinely welcome** -
code, cards, bug reports, or just an opinion about how a screen should work. No
CLA, no red tape. Two ground rules: keep it **local-first** (no backend, no
login) and keep the **build green**.

### The easiest ways to help (no code needed)

- **Tell me what broke.** [Open an issue](https://github.com/SathishKumarAI/pb-card-deck/issues/new/choose) -
  even a one-liner helps. For layout bugs, the device + browser and a screenshot
  are gold.
- **Send a card idea.** A name, what it does, and roughly which of the 10
  categories it belongs in. There is an issue template for exactly this.
- **Say what is confusing.** The manual and the glossary exist because people
  said "I don't know what that means". If a screen confused you, that is a bug.
- **Tell me how you actually run your club night.** The tournament formats came
  from real events; the next format will too.
- **Star the repo** if you enjoyed it - it is the cheapest way to help other
  players find the app. Optional, no pressure.

### Good first code contributions

| Task | Why it is a good start |
|---|---|
| A third-place play-off, or a consolation draw | Pure wiring in `lib/tournament/elimination.ts`; the slot model does the rest, and the tests show the pattern |
| Read the existing per-card counters into a "most drawn" panel | The data is already collected; this is one panel and one selector |
| A new card category or a batch of cards | `scripts/generate_cards.py`, stdlib Python, one command to regenerate |
| Extract UI copy for translation | Mechanical, high value, and well-bounded |
| Any open row in [The plan](#the-plan) | Each says exactly why it is not there yet |

### Sending a pull request

```bash
git clone https://github.com/SathishKumarAI/pb-card-deck
cd pb-card-deck/app && npm install && npm run dev

# before pushing - the same four things CI runs
npm run lint && npx tsc --noEmit && npm test && npm run build
```

1. Branch off `main` (`feat/...`, `fix/...`, `docs/...`).
2. Keep it to one thing, and explain the **why** in the description.
3. A change to scoring, tournaments or streaks needs a test that **fails before
   the fix**. Every bug fixed in this repo has one, and the commit message says
   what the failure was.
4. A change to `globals.css` must keep `npm run contrast` green.
5. Conventional-commit titles appreciated (`feat:`, `fix:`, `docs:`).
6. Update the docs the change invalidates, in the same commit.

Full guide: **[`CONTRIBUTING.md`](CONTRIBUTING.md)**. New to the codebase?
**[`docs/ONBOARDING.md`](docs/ONBOARDING.md)** is a 3-minute setup plus a map.

## Docs

Full index: **[`docs/index.md`](docs/index.md)**.

| Doc | What is in it |
|---|---|
| [`CHANGELOG.md`](CHANGELOG.md) | Everything that shipped, newest first, with the why |
| [`docs/TOURNAMENTS.md`](docs/TOURNAMENTS.md) | Running a real event, start to finish |
| [`docs/RECORDING-A-MATCH.md`](docs/RECORDING-A-MATCH.md) | Every way to record and export gameplay |
| [`app/README.md`](app/README.md) | Architecture deep-dive: data flow, engine, storage schema, PWA, mobile hardening |
| [`docs/ONBOARDING.md`](docs/ONBOARDING.md) | 3-minute setup and a codebase map |
| [`docs/DOUBLES-SCORING.md`](docs/DOUBLES-SCORING.md) | The doubles rules model and which button to press |
| [`docs/SCORING-UX-RESEARCH.md`](docs/SCORING-UX-RESEARCH.md) | How other pickleball apps keep score, and our decisions |
| [`docs/SESSION-NOTES.md`](docs/SESSION-NOTES.md) | What was built and why, session by session |
| [`docs/VALIDATION-REPORT.md`](docs/VALIDATION-REPORT.md) | What was tested, and how |
| [`docs/RUNBOOK.md`](docs/RUNBOOK.md) | Deploy, CI, rollback |
| [`docs/BUG-LOG.md`](docs/BUG-LOG.md) · [`docs/UI-LAYOUT-NOTES.md`](docs/UI-LAYOUT-NOTES.md) | Bugs found, and the layout rules that came out of them |
| [`docs/TICKETS.md`](docs/TICKETS.md) · [`docs/BACKLOG.md`](docs/BACKLOG.md) | The board, and 557 catalogued feature ideas |
| [`docs/NAMING.md`](docs/NAMING.md) | The naming journey and the trademark research |
| [`docs/data/cards.json`](docs/data/cards.json) | The complete 1,729-card dataset with metadata and the "why 1729" notes |
| [`STATUS.md`](STATUS.md) | Where work stopped, the next action, and the traps |

## License and credits

**[MIT](LICENSE)** - free to use, learn from, and build on.

**Inspiration and game rules**
- [Pickleball Shuffle](https://www.pickleballshuffle.com/) - inspiration for the twist-card concept.
- [Deal and Dink](https://www.dealanddink.com/) - pickleball card game; inspiration for card-driven play.
- [USA Pickleball Official Rulebook](https://usapickleball.org/what-is-pickleball/official-rules/) - the scoring model (side-out serving, games to 11, win-by-2, the opening service turn) follows the official rules.
- [USA Pickleball - How to Play](https://usapickleball.org/what-is-pickleball/how-to-play/) - terminology and basics.

**Built with** [Next.js](https://nextjs.org/docs) · [React](https://react.dev) ·
[Tailwind CSS](https://tailwindcss.com/docs) · [Lucide](https://lucide.dev) ·
[Vitest](https://vitest.dev) · hosted on [Vercel](https://vercel.com/docs) ·
`localStorage` / Service Worker / PWA patterns from [MDN](https://developer.mozilla.org).

> The 1,729 twist cards are original content written for this app. The rules
> above informed the scorekeeper, not the card ideas.

---

### Enjoying it?

If you played a game and had fun, a ⭐ on
[GitHub](https://github.com/SathishKumarAI/pb-card-deck) is the easiest way to
say thanks - and it genuinely helps other players find the app.

Hit a bug, or have a card idea, or a better way to run a club night?
[Open an issue](https://github.com/SathishKumarAI/pb-card-deck/issues/new/choose).
Made just for fun. See you on the court. 🏓
