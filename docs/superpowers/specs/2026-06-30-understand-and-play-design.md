# v1 "Understand & Play" — onboarding + self-explaining cards

**Date:** 2026-06-30
**Branch:** feat/wave1-prod-hardening
**Goal:** Let a person with zero pickleball knowledge — from any domain — open the app and immediately understand *why* to use it, *how* to navigate it, and *what a drawn card is asking them to do*, without first learning the app or the sport's jargon.

## The user we design for

**Persona — "Priya, the accidental player."** A data analyst at a barbecue. Someone hands her a phone with this app open and says "you're on my team." She has:

- **No pickleball knowledge.** Never held a paddle. Doesn't know scoring (side-out, win-by-2, who serves), doesn't know shots (dink, kitchen, erne, lob, volley).
- **No app knowledge.** Doesn't know what "deck mode", "rarity", "Back", "Side out", or "draw" mean here.
- **No patience for a manual.** She's mid-party; she will not read a FAQ. Help has to arrive *at the moment of confusion*, on the thing she's looking at.

Her success = she can take a turn and have fun in under 60 seconds, learning just enough per card.

### Priya's journey today (friction points → what fixes it)

| Moment | Priya thinks | Friction | Fix |
|---|---|---|---|
| Opens app | "What even is this?" | No first-run explanation of the benefit | **WelcomeTour** slide 1 (what it is + why) |
| Sees home screen | "What do I press?" | Menu icons unlabeled to a newcomer | **WelcomeTour** navigation slide + **Rules → Why & navigation** |
| Starts a game | "Now what?" | No in-context nudge | **First-game coach hint** on Draw + score |
| Draws "Dinks Only" | "What's a dink??" | Jargon unexplained on the card | **Tap-to-define** underlined terms |
| Reads the rule | "OK but what do I actually *do*?" | Rule states the constraint, not the action | **Always-show "What to do"** (card `detail`) |
| Still unsure | "Is this a punishment? a game? " | No framing of the card type | **Per-card "?" explainer** (what it means / how to play / card type) |
| Someone scores | "How do points work?" | Scoring assumes pickleball literacy | Beginner hint + plain scorekeeper wording (existing) |

The through-line: **help is embedded where the confusion happens**, never behind a menu she won't open.

## Design

Builds on existing infra: `RulesPanel` (How to play / Using the app / Glossary / FAQ), the beginner-mode intro dialog, `Sheet` overlay, `useFocusTrap`, `CATEGORY_COLORS`, `CategoryIcon`, and per-card fields (`effect`, `detail`, `vibe`, `callout`, `category`, `rarity`, `intensity`).

### Part 1 — Onboarding (why + navigation)

1. **`components/WelcomeTour.tsx`** — first-run swipeable carousel, 4 slides, gated by localStorage `pb-welcome-tour-seen`, re-openable from the "How to use" button (which also opens Rules). Slides:
   - **What & why** — "Draw twist cards mid-match. No signup, works offline, makes any game more fun."
   - **How to play** — draw → play the point under the twist → tap a team's score. First to 11, win by 2.
   - **Navigate** — labels the menu (decks, history, favorites, feedback, rules), Settings, Draw/Back.
   - **Start** — "Pick a mode below and tap the card."
   Focus-trapped, dismissible, dot pager + Back/Next, Skip.
2. **First-game coach hint** — a one-time dismissible bubble shown on the game screen pointing at Draw + the score, gated by `pb-game-hint-seen`. Lightweight (no spotlight library).
3. **`RulesPanel` → new "Why & navigation" tab** — benefits table + one line per menu destination.

### Part 2 — Cards explain themselves

4. **`lib/glossary.ts`** — single source of pickleball terms `{ term, aliases[], def }`, consumed by both `RulesPanel` glossary tab and the card highlighter. (Moves the inline GLOSSARY out of RulesPanel.)
5. **`components/GlossaryText.tsx`** — takes a string, finds known glossary terms/aliases (word-boundary, case-insensitive, first occurrence each), renders them as underlined tappable spans → small popover with the definition. Used on the card `effect`/`detail` and in the `?` explainer.
6. **Always-show "What to do"** — in `CardDisplay`, render `card.detail` consistently under the rule with a subtle "What to do" affordance so a beginner reads the concrete action, not just the constraint.
7. **Per-card "?" explainer** — a `?` button on the card face opens a `Sheet`:
   - *What this means* — `effect` (with GlossaryText).
   - *How to play it* — `detail` / `vibe` (with GlossaryText).
   - *What kind of card* — plain-language category description from new `CATEGORY_INFO` map in `lib/cards.ts` (one friendly sentence per category, e.g. Penalty = "A setback card — one team gives up a small advantage. It's meant to be playful, not mean.").

Tap-to-define stays inline; the `?` is the primary explainer. They complement.

## Files

- **New:** `components/WelcomeTour.tsx`, `components/GlossaryText.tsx`, `lib/glossary.ts`.
- **Edit:** `lib/cards.ts` (`CATEGORY_INFO`), `app/page.tsx` (tour + hint wiring, first-run gate), `components/CardDisplay.tsx` (`?` button, detail line, GlossaryText), `components/RulesPanel.tsx` (import shared glossary, add Why & navigation tab).

## Data flow

- First-run gate in `page.tsx`: on mount, if `!localStorage['pb-welcome-tour-seen']` show tour; "How to use" button always re-opens it.
- Card explainer state is local to `CardDisplay` (`explainerOpen`).
- Glossary popover state local to `GlossaryText` (one open term at a time).
- No new persistence beyond two boolean localStorage flags. No backend, stays local-first.

## Error / edge handling

- Cards missing `detail`: hide the "What to do" line and that explainer section (graceful).
- GlossaryText with no matches: renders plain text unchanged.
- localStorage unavailable (private mode): wrap in try/catch; tour just shows every load (acceptable).
- Reduced motion: carousel transitions respect `prefers-reduced-motion`.
- Popover/sheet: focus-trapped, Escape closes, tap-scrim closes; stop propagation so opening `?` doesn't trigger a card draw.

## Testing / validation

- `npm run build` + lint clean.
- Browser smoke-check (chrome-devtools, mobile viewport 390px): tour shows first load → dismiss → doesn't return; draw a card → "What to do" visible → tap a jargon term → definition popover → `?` opens explainer with category description; Rules → Why & navigation renders.
- Then `vercel --prod` from repo root.

## Out of scope (v1)

- Per-card hand-authored beginner rewrites for all 1,729 cards (uses existing `detail`).
- Full spotlight/coach-mark library.
- i18n of glossary.

---

## Phase 2 (SHIPPED 2026-07-01) — Coach / Umpire match-recording mode

**Status:** shipped (tasks #7–#10, ticket T11). Engine + client-api unit-tested; validated live in-browser.

**Refinement made during build:** the "top-level choice screen" became a **segmented toggle on the home screen** (`Play with cards` / `Track a match`) instead of a separate screen — it's switchable with one tap any time, which directly answers "can the mode be changed after selecting?" (yes). Tracked-match **format is locked once the match is underway** (rotation math), changeable at setup / New Match; **cards toggle** and deck mode stay changeable.

**Goal:** Give a coach or umpire a way to run and record a *real* pickleball match — proper scoring, rotation, and an exportable result — while keeping the fun card game as the default experience.

**Entry point.** After the WelcomeTour, a **top-level choice screen**:
`Play with cards` (today's deck-mode flow) vs `Track a match (coach/umpire)`. The card modes (Family/Party/Drill/Tournament/Chaos) live under the first branch.

**What it is.** A **scorekeeper with optional cards** — twist cards are OFF by default in this mode; the ref can enable them. Focus is accurate scoring + a clean record.

**Rules tracked.**
- **Singles + doubles** formats (doubles adds the two-server rotation).
- **Server number (1/2) + rotation** — correct server shown, rotates on side-outs.
- **Side switch** prompt at the halfway score (6 in an 11-point game / at game point per format).
- **Timeouts + faults** — buttons that append entries to a per-match log.

**Output for the official.**
- **Saved to Match history** (reuses existing local history): player/team names, event/round label, final + game-by-game scores, duration.
- **Exportable match sheet** — download a CSV/text sheet as shareable proof of result (via `lib/client-api.ts`).
- **Player/team + event labels** captured at match start.

**Implementation notes.**
- Extend the pure engine in `lib/game.ts` with server/rotation/side-switch/fault state — keep it pure + unit-testable. UI reads the returned `GameSession`.
- New config flags on `GameConfig` (`format: "singles" | "doubles"`, `officialMode`, `cardsEnabled`, `eventLabel`).
- Persist via existing `lib/client-api.ts` (still local-first, no backend).

**Design principle preserved:** local-first, no login, no database — the coach/umpire mode is another client-side flow, not a server feature.
