#  PB Card Deck

**Draw twist cards mid-match. Shake up the game.**

A free, **mobile-first, local-first** web app: 1,729 pickleball twist cards across 10 categories, fused with a real pickleball scorekeeper. Tap to draw a card, play the next point under that twist, and keep score - all on your phone, no login, no signal required after first load.

### ▶︎ Live app: **https://pb-card-deck.vercel.app**

---

## Why local-first

This app deliberately has **no backend and no login** - a design decision, not a gap.

| Concern | Why local-first wins here |
|---|---|
| **Friction** | Players open the link mid-game; a signup wall loses them. |
| **Latency** | Drawing and scoring feel instant - no network in the hot path. |
| **Offline** | Courts have bad signal; a static site + service worker keeps working. |
| **Privacy & cost** | Your data never leaves the device; no DB, no auth, no per-user billing. |

Tradeoff: no cross-device sync. Custom decks and history live in `localStorage`, with a manual **Export / Import** backup to move data between devices.

## Highlights

- **1,729 unique cards** (the Ramanujan taxicab number), 10 categories, **5 deck modes** (Family → Chaos), plus **custom decks** you build yourself.
- **Card metadata** - every card has a **rarity** badge (common → legendary), an intensity rating, and tags. Most draws are common; a legendary is a moment.
- **Two text styles** - concise rules by default, or flip on **Commentator voice** in Settings for hyped courtside-caller flavour (both stored per card).
- **Real scorekeeper** - side-out scoring, win-by-2, serving indicator, undo, plus **in-game pause** (freezes the clock, survives reload).
- **Match length** - single game, best of 3, or best of 5, with a **match-complete celebration** when a team takes the series.
- **Resume last game**, **Match history**, **export/import backup** - all local, no account.
- **Mobile-tuned** - `100dvh`, safe-area insets, no iOS input zoom, a big **responsive card** with a Back button beside Draw, dark/light, sound + haptics, installable PWA.

## Features

Everything the app does, grouped so you can find it fast.

### 🃏 Cards & decks
| Feature | What it does |
|---|---|
| **1,729 unique cards** | Every card is one-of-a-kind (unique like a database key). The count is the Ramanujan "taxicab" number - tap the note on the home screen to see why. |
| **10 categories** | Shot Restriction, Body & Movement, Wild Card / Swap, Penalty, Bonus / Reward, Social & Party, Strategy / Skill, Wacky / Chaos, Court / Environment, Meta & Game-Flow. |
| **5 deck modes** | Family, Party, Drill, Tournament, Chaos - each filters the deck to fit the crowd. |
| **Rarity** | Each card has a badge: Common → Uncommon → Rare → Legendary (plus the original "Signature" set). Legendaries (Golden Zone, Overtime, big multipliers) are special moments. |
| **Two text styles** | Concise rules by default, or flip **Commentator voice** in Settings for hyped courtside-caller phrasing. Both are stored on every card. |
| **Custom decks** | Build and play your own deck of cards from the menu. |
| **Favorites** | Star cards you love and find them again under Favorite cards. |

### 🏓 Playing & scoring
| Feature | What it does |
|---|---|
| **Real scorekeeper** | Side-out scoring, configurable points-to-win, win-by-2, serving indicator, one-tap undo, and a score lock to stop mis-taps. |
| **Draw twists** | Tap the card to draw a random twist for the next rally; a **Back** button sits right beside Draw for a quick exit. |
| **In-game pause** | Freeze the match clock and put scoring on hold; a Paused screen covers the board until you Resume. Survives closing the app. |
| **Match length** | Single game, best of 3, or best of 5 - with a **match-complete** celebration when a team takes the series. |
| **Resume last game** | Leave mid-match and a one-tap banner brings it back, card and score intact. |

### 💾 Your data (100% local)
| Feature | What it does |
|---|---|
| **Match history** | Finished matches are saved automatically, on your device. |
| **Export / Import backup** | Move decks + history between devices via a JSON file - no account, no upload. |
| **Offline** | A service worker keeps it working at courts with bad signal. |

### 🧭 Learn & understand (no pickleball knowledge needed)
| Feature | What it does |
|---|---|
| **Welcome tour** | On first open, three short slides: what the app is, how a point works, and where help lives. Hands over to the manual, and is replayable from **Help**. |
| **Tap-to-define jargon** | Terms on a card (dink, kitchen, erne, side-out…) are underlined - tap one for a plain-language definition. One shared glossary powers this and the manual. |
| **Per-card "?" explainer** | Every card has a **?** that opens *what this means · how to play it · what kind of card* in beginner-friendly words. |
| **"What to do" line** | The card always shows a concrete "what to do this point", not just the constraint - plus a one-time in-game hint. |
| **Searchable manual** | **Help** sits in the header on every screen: 30 plain-language answers grouped from "Start here" to "Your data", with a search box and three quick links. Written for someone who has never played pickleball. |

### 🏆 Tournaments - run an event for 4 people or 50
| Feature | What it does |
|---|---|
| **Five formats** | Round robin, pools → playoff bracket, single elimination, double elimination (with a losers bracket and a grand-final reset), and rotating partners, where players enter alone, change partner every round and the score follows the **person**. |
| **Setup in one paste** | Paste your list, one entry per line. A line can be a player (`Sam`) or an existing pair (`Sam & Priya`); the rest are paired as listed, at random, or strongest-with-weakest. 50 names in, full schedule out. |
| **Courts** | Say how many courts you have. The app puts exactly that many matches on court, numbers them, and moves the queue up as results land. |
| **Two ways to score** | Type the final score at the desk, or hand the match to the full scorekeeper (serve tracking, undo, timeouts) and it writes the result back. |
| **Standings that hold up** | Wins, then head-to-head for a straight two-way tie, then point difference. Pool tables show the qualifying line. |
| **Bracket view** | Rounds as columns, byes resolved, labelled Quarter-final / Semi-final / Final; scrolls sideways on a phone because the shape is the information. |
| **Fix mistakes** | Undo any result and everything downstream is undone with it - a playoff re-seeds itself if a pool result changes. |
| **Divisions** | Open, men's, women's or mixed. A mixed draw pairs one of each from names marked `Sam (m)` / `Priya (f)`, and says how many pairs will be same-sex if the numbers do not balance. |
| **Live bracket tree** | Rounds as columns, matches centred between the two that feed them, connectors that turn green as results land. Tap a match to enter or edit its score. |
| **Editable scores + change log** | Fix a wrong score any time. Every result, correction and clear is logged with the time and the old score, shown in a **Changes** tab and carried into exports. |
| **Export** | CSV (Excel/Numbers/Sheets), Markdown, JSON or plain text - each with results, standings and the change log. |
| **Any number of courts or pools** | Counts are typed, not picked from a fixed list. |
| **Demo event** | One tap loads a half-played 12-team day so you can see the whole thing working before running your own. |
| **Share** | Copy the standings and the winner as plain text into any group chat. |

### 🏓 Coach / Umpire mode - "Track a match"
| Feature | What it does |
|---|---|
| **One-tap mode switch** | Home has a `Play with cards` / `Track a match` toggle - switch the whole flow any time, one tap. |
| **Match setup** | Singles or doubles, player/team names, an event/round label, points-to-win (11/15/21), match length, and cards on/off (off by default). |
| **Real server rotation** | Doubles uses the two-server rotation (Server 1 → 2 → side-out); the serving side + server number are shown live. Singles passes serve straight over. |
| **Officiating controls** | Per-team timeout and fault buttons, a side-out button, and the halfway side-switch reminder. |
| **Match sheet** | Saves to Match history with the event label + format; download a one-tap text **match sheet** (teams, game-by-game, timeouts, faults, duration) as proof of result. |

### 🎨 Feel & accessibility
| Feature | What it does |
|---|---|
| **Native-app feel** | iOS-style glass materials (thin / regular / thick), bottom sheets with a grabber, a pickleball-court backdrop, and hover states on pointer devices only. Scales from a phone to a two-column desktop layout. |
| **Polished motion** | 3D card flip, glassy panels, win confetti - all respect `prefers-reduced-motion`. |
| **Accessible** | Keyboard focus rings, dialog semantics + Escape on every panel, screen-reader labels, 44px tap targets, and pinch-zoom left on. |
| **Themes & feedback** | Dark / light themes, sound effects, and haptics - all toggleable. |
| **Installable PWA** | "Add to Home Screen" and it runs like a native app. |

> Want the raw data? The full card set with all metadata and the design rationale lives in **[`docs/data/cards.json`](docs/data/cards.json)**.

## Repository layout

```
pickleball-shuffle/
├── app/            # ← the application (Next.js 16 + TypeScript + Tailwind)
│   ├── app/        #   routes, layout, global styles
│   ├── components/ #   CardDisplay, ScoreKeeper, TopBar, panels, icons…
│   ├── lib/        #   cards, pure game engine, local store, sounds
│   └── public/     #   cards.json, manifest, service worker
├── docs/           # WORKLOG, onboarding, tickets, and docs/data/cards.json (full dataset)
├── scripts/        # generate_cards.py — rebuilds the 1,729-card deck
├── frontend/       # legacy Vite stub (unused)
└── *.sh            # dev / prod / deploy helper scripts
```

> The live app is entirely in **`app/`**. The `frontend/` directory is an early prototype kept for reference and is not part of the deployed product. See **[`app/README.md`](app/README.md)** for the full architecture deep-dive.

## Quick start

```bash
cd app
npm install
npm run dev          # http://localhost:3000  (binds 0.0.0.0 for phone testing)
```

Build & serve production:

```bash
npm run build
npm start
```

## Deploy

```bash
cd app && vercel --prod      # or: ./deploy-vercel.sh from the repo root
```

Current production alias: **https://pb-card-deck.vercel.app**

## Documentation

Full docs index: **[`docs/index.md`](docs/index.md)**.

- **[`docs/SESSION-NOTES.md`](docs/SESSION-NOTES.md)** - what's been built and why, this session and earlier, with the lessons learned. Best single read to get up to speed.
- **[`docs/ONBOARDING.md`](docs/ONBOARDING.md)** - start here: 3-minute setup, codebase map, and what's new.
- **[`docs/DOUBLES-SCORING.md`](docs/DOUBLES-SCORING.md)** - doubles rules model, which button to press, and the design reasoning.
- **[`docs/SCORING-UX-RESEARCH.md`](docs/SCORING-UX-RESEARCH.md)** - how the top pickleball apps keep score for beginners; our decisions.
- **[`docs/VALIDATION-REPORT.md`](docs/VALIDATION-REPORT.md)** - what was tested and how (the what/why/how).
- **[`CONTRIBUTING.md`](CONTRIBUTING.md)** - how to report bugs, send PRs, and add cards.
- **[`app/README.md`](app/README.md)** - full architecture deep-dive (data flow, scoring engine, localStorage schema, animation, service-worker strategy, mobile hardening).
- **[`docs/data/cards.json`](docs/data/cards.json)** - the complete 1,729-card dataset with metadata + the "why 1729" design notes.
- **[`docs/TICKETS.md`](docs/TICKETS.md)** - status board + the future-feature backlog.
- **[`docs/BUG-LOG.md`](docs/BUG-LOG.md)** - issues found and how each was fixed.
- **[`docs/UI-LAYOUT-NOTES.md`](docs/UI-LAYOUT-NOTES.md)** - icon-overlap root cause + rules to avoid layout bugs.
- **[`docs/WORKLOG.md`](docs/WORKLOG.md)** - dated change log.

## Contributing

Contributions are genuinely welcome - whether it's a bug fix, a new card idea, or a feature.

- **Found a bug or have an idea?** [Open an issue](https://github.com/SathishKumarAI/pb-card-deck/issues/new) - even a one-liner helps. Screenshots and the device/browser are gold for layout bugs.
- **Want to send a change?**
  1. Fork the repo and create a branch (`feature/...` or `fix/...`).
  2. `cd app && npm install`, then `npm run dev` to develop.
  3. Before pushing: `npm run lint && npx tsc --noEmit && npm run build` (these are the CI gates).
  4. Open a PR describing the *why*. Keep it focused; conventional-commit titles (`feat:`, `fix:`, `docs:`) appreciated.
- **Adding cards?** Edit `scripts/generate_cards.py` and re-run it (`python3 scripts/generate_cards.py`) so the deck stays unique and the metadata/dataset regenerate consistently.
- **New here?** Start with **[`docs/ONBOARDING.md`](docs/ONBOARDING.md)** for a 3-minute setup and a map of the codebase.

There's no CLA and no red tape - just keep it local-first (no backend/login) and the build green.

## License

MIT - free to use, learn from, and build on.

## References & credits

The standards, rules, and tools this project is built on:

**Inspiration & game rules**
- [Pickleball Shuffle](https://www.pickleballshuffle.com/) - inspiration for the twist-card gameplay concept.
- [Deal and Dink](https://www.dealanddink.com/) - pickleball card game; inspiration for card-driven play.
- [USA Pickleball - Official Rulebook](https://usapickleball.org/what-is-pickleball/official-rules/) - the scoring model (side-out serving, games to 11, win-by-2) follows the official rules.
- [USA Pickleball - How to Play](https://usapickleball.org/what-is-pickleball/how-to-play/) - terminology and gameplay basics.

**Framework & libraries**
- [Next.js](https://nextjs.org/docs) - App Router framework.
- [React](https://react.dev) - UI library.
- [Tailwind CSS](https://tailwindcss.com/docs) - styling.
- [Lucide](https://lucide.dev) - icon set.

**Platform**
- [Vercel](https://vercel.com/docs) - hosting & CI/CD.
- [MDN Web Docs](https://developer.mozilla.org) - `localStorage`, Service Worker, and PWA references used for the offline + mobile work.

> The 1,729 twist cards are original content curated for this app; the rules above
> only informed the scorekeeper, not the card ideas.

---

### Enjoying it?

If you played a game and had fun, a ⭐ on [GitHub](https://github.com/SathishKumarAI/pb-card-deck) is the easiest way to say thanks - and it genuinely helps other players discover the app. Totally optional, no pressure.

Hit a bug or have a card idea? [Open an issue](https://github.com/SathishKumarAI/pb-card-deck/issues/new) - feedback makes the next version better.

Made just for fun. See you on the court. 🏓
