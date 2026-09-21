# Onboarding - PB Card Deck

> A mobile-first, **local-first** web app: 1,729 pickleball "twist" cards + a real scorekeeper. No backend, no login, no database - all state in `localStorage`.

**Live:** https://pb-card-deck.vercel.app · **Repo:** https://github.com/SathishKumarAI/pb-card-deck
**Related docs:** [WORKLOG](WORKLOG.md) · [Bug log](BUG-LOG.md) · [UI layout notes](UI-LAYOUT-NOTES.md) · [Tickets](TICKETS.md)

---

## What is this?

A free pickleball party game fused with a scorekeeper. Tap to draw a card, play the next point under that twist, keep score - phone-first, works offline after first load. **Local-first is a design decision, not a gap:** zero network in the hot path, no signup wall, data never leaves the device. Tradeoff: no cross-device sync (manual Export/Import backup instead).

## What's new (look out for these)

- **Understand & Play (v1)** - onboarding + self-explaining cards for people with zero pickleball knowledge:
  - **Welcome tour** on first open (what it is / a point start to finish / where help lives), replayable from Help.
  - **Tap-to-define jargon** - underlined terms on a card open a plain-language definition (shared `lib/glossary.ts`).
  - **Per-card "?" explainer** - "what this means / how to play it / what kind of card" (plain-language `CATEGORY_INFO`).
  - **Always-shown "What to do"** line + a one-time in-game coaching hint.
  - **Help** in the header on every screen - a searchable manual (`lib/manual.ts`), Glossary sourced from the shared file.
- **Coach / Umpire "Track a match" mode** - home toggle `Play with cards` / `Track a match`; run and record a real match (singles/doubles, two-server rotation, timeouts/faults, side-switch), saved to Match history with a downloadable match sheet.
- **1,729-card deck** with per-card metadata - `rarity` (badge on the card), `intensity`, `tags`, plus both a concise `effect` and a `commentary` string. Full dataset + the "why 1729": [`docs/data/cards.json`](data/cards.json).
- **Commentator voice toggle** (Settings) - switch every card between concise rules and hyped commentator text.
- **In-game pause** - freezes the match clock + blocks play, persists across reload.
- **Match length** setting (single / best of 3 / best of 5) + a **match-complete** screen.
- **Back button** beside Draw, bigger **responsive card**, full **accessibility pass** (focus rings, dialog semantics, reduced-motion), and **custom fonts** (Bricolage Grotesque + Hanken Grotesk).

---

## Quick Start (~3 min)

### Prerequisites
| Tool | Version | Notes |
|------|---------|-------|
| Node.js | **24 LTS** | CI pins 24; repo manages runtimes via `mise` |
| npm | 10+ | ships with Node 24 |
| Vercel CLI | latest | only for deploys - `npm i -g vercel` |

### Setup
```bash
git clone https://github.com/SathishKumarAI/pb-card-deck
cd pickleball-shuffle
bash setup.sh          # installs deps + runs a production build (cd app && npm install && npm run build)
bash run-dev.sh        # → http://localhost:3000  (binds 0.0.0.0 for phone testing)
```
All npm work happens in **`app/`** (the Next.js project root). The helper scripts `cd` there for you.

### Verify it works
- [ ] `http://localhost:3000` loads the landing page (new card+pickleball logo)
- [ ] Pick a deck mode → draw a card → tap a score tile → score changes
- [ ] `http://localhost:3000/cards.json` returns 200 (1,729-card payload)
- [ ] `cd app && npm run build` is clean

---

## Architecture

```
Phone / Browser
      |
      v
[Next.js 16 App Router]  ← 100% client-rendered game
      |
      +→ public/cards.json   (the 1,729 cards, fetched no-store)
      +→ localStorage        (active game, custom decks, history, favorites, feedback backup)
      +→ public/sw.js        (network-first service worker, prod only)
```
No server, no DB, no auth. Deployed as a static/SSR Next app on Vercel (project `rootDirectory = app`). The GitHub Pages landing lives in `docs/`.

### Tech stack
| Layer | Tech | Why |
|-------|------|-----|
| Framework | Next.js 16 (App Router, Turbopack) | routing + build; mostly client components |
| UI | React 19 + TypeScript + Tailwind v4 | typed components, utility CSS |
| Icons | `lucide-react` | consistent icon set, **no emoji** |
| State | React state + `localStorage` | local-first persistence |
| Hosting | Vercel (auto-deploys `main` → prod) | static/SSR, zero infra |

---

## Key Files
| Path | Purpose |
|------|---------|
| `app/app/page.tsx` | **The whole game** - landing, draw, score, resume, panel wiring (~20 KB; largest source file) |
| `app/lib/game.ts` | **Pure** game engine: `addScore`/`sideOut`/`undo`/`checkWin` + active-game persistence |
| `app/lib/cards.ts` | Card types, deck modes, filtering, shuffle |
| `app/lib/client-api.ts` | Local store: custom decks, match history, export/import (**the swap point if a real DB is ever added**) |
| `app/lib/sounds.ts` | Web Audio SFX + haptics |
| `app/components/` | `CardDisplay` (3D flip + "?" explainer), `ScoreKeeper`, `TopBar`, `WinCelebration`, `WelcomeTour` (first-run tour), `GlossaryText` (tap-to-define), `OfficialMatchSetup` + `OfficialControls` ("Track a match"), `TVScore`, `*Panel.tsx`, `icons.tsx` |
| `app/lib/glossary.ts` | Shared pickleball glossary (Rules tab + in-card highlighter) |
| `app/public/cards.json` | The 1,729 cards (source of truth: `data/cards.json`) |
| `app/app/globals.css` | Theme CSS vars + `anim-*` animation utilities |
| `app/app/icon.svg`, `app/public/icons/` | Brand logo + PWA icons (regen via `rsvg-convert`) |
| `setup.sh` / `run-dev.sh` / `run-prod.sh` / `deploy-vercel.sh` | Repo-root helper scripts |

### Conventions
- Game logic = **pure functions** in `lib/game.ts`; UI calls them and stores the returned `GameSession`.
- All persistence routes through `lib/client-api.ts`.
- Theme via CSS vars + `data-theme` on `<html>`; mobile-first (`100dvh`, 16px inputs, safe-area insets).
- Icons from `lucide-react` only - no emoji.

---

## Common Tasks

**Add/edit cards** → the deck is generated, not hand-edited: edit the word banks / templates in `scripts/generate_cards.py`, then run `python3 scripts/generate_cards.py` (it rewrites `app/public/cards.json`, `data/cards.json`, and `docs/data/cards.json` and keeps ids/names unique).
**Add a component** → `app/components/Foo.tsx`, import + wire state in `app/app/page.tsx`.
**Regenerate logo/icons** → edit `app/app/icon.svg`, then `rsvg-convert -w <N> -h <N> app/app/icon.svg -o app/public/icons/icon-<N>.png`.
**Deploy** → `bash deploy-vercel.sh` (runs `vercel --prod` from **repo root** - never from `app/`, or Vercel looks for `app/app` and fails). Pushing `main` also auto-deploys.

---

## Debugging Guide
| Symptom | Likely cause / fix |
|---------|--------------------|
| **"0 cards"** | Service worker served a stale `cards.json`. SW is network-first + prod-only; dev unregisters it. Hard-reload. |
| **Resume lost the card/score** | State is rebuilt from `GameSession.drawnCardIds`; check `lib/game.ts` persistence. |
| **Custom deck resumed as Chaos** | `customName`/`customCards` must persist on `GameSession`. |
| Build fails on icons | `<img>` needs the `@next/next/no-img-element` eslint-disable (see `page.tsx`). |

**Logs:** local = terminal running `run-dev.sh`; production = Vercel dashboard / `vercel logs`.
See [BUG-LOG.md](BUG-LOG.md) for the full history of fixes.

---

## Contributing
- **Branches:** `main` is protected and auto-deploys to prod. Use `feature/*` / `fix/*` branches + PR.
- **CI** (`.github/workflows/ci.yml`, runs in `app/`): `npm run lint` → `npx tsc --noEmit` → `npm test` (64 vitest tests) → `npm audit --audit-level=high` → `npm run build`. All must be green before merge.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `docs:`).
- **Before a PR:** `cd app && npm run lint && npx tsc --noEmit && npm test && npm run build`.

### ⚠️ Dead code - do not extend
An abandoned auth/Supabase experiment left inert stubs: `app/app/api/`, `app/app/login`, `app/app/signup`, `lib/db.ts`, `lib/auth.ts`, `lib/supabase/`, `components/AuthForm.tsx`, `components/UserMenu.tsx`. They are untracked, return HTTP 410 / render `null`, and are **safe to delete** (security-audited clean). The app is intentionally backend-free. See [TICKETS.md](TICKETS.md) T4.

---

## Audience Notes
- **New contributor:** start in `app/app/page.tsx` (the game) and `app/lib/game.ts` (the engine). Those two cover ~80% of behavior.
- **Reviewer/lead:** the architectural bet is *local-first, no backend* - validate any change keeps the hot path network-free and persistence inside `lib/client-api.ts`.
- **Contractor:** scope is the static Next app under `app/`. Don't add servers/DBs without revisiting the local-first decision (root `README.md` → "Why local-first").

<!-- new-tab-links: open every link in a new tab on the GitHub Pages site -->
<script>document.querySelectorAll('a[href]').forEach(function(a){a.target="_blank";a.rel="noopener noreferrer";});</script>
