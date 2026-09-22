# Tickets / Pending Task List

Open work, newest intent first. Closed items move to [`WORKLOG.md`](WORKLOG.md).
Status: 🔴 not started · 🟡 in progress / blocked on input · ⏸️ deferred (kept for future, intentionally not actioned) · ✅ done.

> **2026-06-15:** Per owner decision, all open items below are **kept / deferred** - nothing deleted, revisit later. See the [Future feature ideas](#future-feature-ideas) backlog at the bottom.

| # | Status | Ticket | Notes / what's needed |
|---|--------|--------|------------------------|
| T1 | ⏸️ | **Feedback → Google Form → Sheet** | Design approved (silent background POST from `FeedbackPanel`, no auth, stays local-first). Deferred - revisit when you have a Google Form ID + the 3 `entry.NNN` field IDs (rating / message / contact). Until then the mailto flow stays. |
| T2 | ✅ | **"How to use" button on landing** | Done - chip beside the hero title, opens `RulesPanel`. |
| T3 | ✅ | **In-game pause** | Pause/Resume in TopBar + full-screen "Paused" overlay; freezes the clock, blocks play, persists across reload. |
| T4 | ⏸️ | **Dead auth stubs** | Kept on purpose. `app/api/`, `app/login`, `app/signup`, `lib/{db,auth}.ts`, `lib/supabase/`, `components/{AuthForm,UserMenu}.tsx`, nested `app/app/package.json`+lock. Security-audited inert (no vulns). Delete later if/when desired. |
| T5 | ⏸️ | **Multi-size favicon.ico** | Current `favicon.ico` is a 64×64 PNG-in-ICO - fine on modern browsers. Regenerate at 16/32/48 with a real ICO tool for legacy support. Low priority. |
| T6 | ⏸️ | **Orphan `public/icons/logo-mark.svg`** | Unused leftover from the logo work; harmless. Delete later. |
| T7 | ⏸️ | **`vercel dev` on :3001** | Not a real bug - collides with `next dev` on :3000. Working dev server is :3000; `kill 211370` first if you want `vercel dev`. |
| T11 | ✅ | **Coach / Umpire match-recording mode** | Shipped. Home segmented toggle *Play with cards* / *Track a match* (switchable any time). Setup: singles/doubles, players, event label, points-to-win, match length, cards on/off. In-match: two-server doubles rotation, server indicator, per-team timeouts + faults, side-out, side-switch reminder, one-tap match-sheet download; saves to Match history with official fields. Engine + client-api unit-tested. |

## Recently shipped
- ✅ **Coach / Umpire "Track a match" mode (T11)** - see WORKLOG 2026-07-01. New: `components/OfficialMatchSetup.tsx`, `components/OfficialControls.tsx`; engine `serverLabel`/`recordTimeout`/`recordFault`/`logCount` + official two-server rotation in `sideOut`; `matchSheet` export + official fields in `addMatch`.
- ✅ **Understand & Play (v1)** - onboarding + self-explaining cards for zero-knowledge users: first-run **welcome tour** (replayable), **tap-to-define** jargon (shared `lib/glossary.ts`), per-card **"?" explainer** (plain-language `CATEGORY_INFO`), always-shown **"What to do"** line, one-time in-game hint, and a **"Why & how"** tab in Rules & help. New: `components/WelcomeTour.tsx`, `components/GlossaryText.tsx`, `lib/glossary.ts`. See spec + WORKLOG 2026-07-01.
- ✅ **1,729-card deck + metadata + commentator voice** - grew 200 → 1,729 unique cards (Ramanujan taxicab number), each with `callout`/`intensity`/`rarity`/`tags`; rarity badge + callout shown on the card face; full documented dataset at [`docs/data/cards.json`](data/cards.json); "why 1729" mark on the landing. Generator: `scripts/generate_cards.py`.
- ✅ **In-game pause (T3)** - Pause/Resume + "Paused" overlay, clock freeze, persists across reload.
- ✅ **Frontend gap fixes (4 batches)** - accessibility (focus-visible, zoom unlock, aria-labels, dialog semantics + Escape/focus-trap on shared Sheet, switch/chip roles, contrast), reduced-motion correctness (card flip, confetti, infinite loops), design-system consistency (SettingsSheet onto shared Sheet, emoji→lucide, manifest color), and custom fonts (Bricolage Grotesque + Hanken Grotesk). See WORKLOG 2026-06-15.
- ✅ **Best-of-3 match-complete screen** - `WinCelebration` now shows a series-winner state ("wins the match", games tally, New Match) when a team reaches 2 games. Engine: `matchWinner`/`seriesTally`/`newMatch` in `lib/game.ts`.
- ✅ **"How to use" chip** on landing (T2).
- ✅ **New pickleball + card logo** - landing hero, favicon, `icon.svg`, PWA icons. Live: https://pb-card-deck.vercel.app
- ✅ **Security audit** - all untracked auth files are inert stubs; secret file gitignored; **no vulnerabilities** (see T4 for cleanup).

## From the frontend audit
| # | Status | Ticket | Notes |
|---|--------|--------|-------|
| T8 | ✅ | Tap targets <44px | TopBar Undo/Reset/lock/edit now ≥44px; card favorite/skip hit areas enlarged (`p-2.5 -m-2.5`). |
| T9 | ✅ | Best-of-N a Settings option | `config.bestOf` (1/3/5) + "Match length" chips in Settings; `matchWinner` derives target via `gamesToWinMatch`. |
| T10 | ✅ | Replace `alert()` in AppMenu import | Import success/error now show a glass in-app toast (`role="status"`, auto-dismiss). |

## Future feature ideas

A backlog of possible additions to look at later. Nothing committed - pick what
fits. Kept aligned with the app's **local-first, no-backend** principle unless a
note says otherwise. Rough effort: S (hours), M (a day), L (multi-day).

### Gameplay
- **F1 - Game timer / match clock controls** (S). Build on the new pause work: show per-game vs total-match time, optional countdown timer per point, time-cap mode.
- **F2 - Tournament / bracket mode** (L). Track multiple teams across rounds, auto-advance winners, standings table.
- **F3 - Rally / streak tracking** (M). Longest streak, comeback detector, "served N in a row" callouts in the win screen.
- **F4 - Per-team server rotation UI** (M). Visualize server 1/2 and side switches for doubles, not just the serving pill.
- **F5 - Handicap / spread scoring** (S). Start a team at +N for casual mixed-skill games.

### Cards & decks
- **F6 - Card difficulty / intensity filter** (S). Tag cards easy→spicy; filter a deck by intensity.
- **F7 - Deck sharing via link/QR** (M, needs care). Encode a custom deck into a URL/QR so friends can import without a backend (data stays in the link).
- **F8 - "Card of the day" / daily challenge** (S). Deterministic daily card from the date seed.
- **F9 - Per-card stats** (M). How often a card was drawn / skipped / favorited (local only).
- **F10 - Image or emoji-free illustrations on cards** (M). Lightweight inline SVG art per category.

### UX & polish
- **F11 - Sound pack / volume control** (S). Mute toggle exists; add volume + alt sound themes.
- **F12 - Haptic intensity setting** (S).
- ✅ **F13 - Onboarding tour / first-run coach marks** (M). **Shipped** as `components/WelcomeTour.tsx` - a first-run swipeable welcome tour (what it is / how to play / how to navigate), replayable from Rules & help.
- **F14 - Per-theme accent picker** (S). Let users choose accent hue beyond emerald.
- **F15 - Larger-text / high-contrast accessibility mode** (S). Builds on the a11y pass already done.

### Data & platform
- **F16 - Cross-device sync (opt-in)** (L, breaks local-first). Would need a real backend/account - revisit only if sync is genuinely wanted; see T1 for the lightest-touch precedent.
- **F17 - Match stats export to CSV** (S). Extend the existing JSON export.
- ✅ **F18 - Shareable match result card (image)** (M). **Shipped** as `lib/shareImage.ts` - renders a shareable match/win image.
- **F19 - Install prompt / richer PWA** (S). Custom "Add to home screen" nudge; offline indicator.
- **F20 - i18n / multi-language** (L). Externalize copy + card text; start with one extra language.

### Engineering / housekeeping
- ✅ **F21 - Component/unit tests** (M). **Shipped** - vitest suite (64 tests, `npm test`, gated in CI): `lib/game.test.ts`, `cards.test.ts`, `cards-data.test.ts`, `client-api.test.ts`, `a11y.test.tsx`.
- **F22 - Storybook for the panel/Sheet components** (M).
- **F23 - Lighthouse/CI perf budget** (S). Add a Lighthouse check to CI.
- **F24 - Resolve the deferred T-series** (S). Delete dead auth stubs (T4), orphan svg (T6), multi-size favicon (T5) when convenient.

<!-- new-tab-links: open every link in a new tab on the GitHub Pages site -->
<script>document.querySelectorAll('a[href]').forEach(function(a){a.target="_blank";a.rel="noopener noreferrer";});</script>
