# PB Card Deck

Next.js card game + pickleball scorekeeper. 1,729 twist cards across 10 categories, 5 deck modes.
**Local-first: no backend, no login, no database.** All state lives in `localStorage`.

Live: https://pb-card-deck.vercel.app

## Stack
- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript + Tailwind v4
- lucide-react for all icons (no emoji)
- Cards loaded from `public/cards.json`; everything else is client state + localStorage
- Deployed on Vercel - run `vercel --prod` from the **repo root** (not this dir; project rootDirectory is already `app`), or use `../deploy-vercel.sh`

## Commands
```bash
npm run dev      # http://localhost:3000 (binds 0.0.0.0 for phone testing)
npm run build    # production build
npm start        # serve production build
vercel --prod    # deploy - run from REPO ROOT, not app/
```

## Structure
```
app/page.tsx          - the whole game: state, draw, score, resume, panels
components/           - CardDisplay (3D flip + "?" explainer), ScoreKeeper, TopBar,
                        CardHistory, WinCelebration, PlayerNames, SettingsSheet, AppMenu,
                        HistoryPanel, DecksPanel, FeedbackPanel, HelpPanel, icons.tsx,
                        WelcomeTour (first-run onboarding), GlossaryText (tap-to-define),
                        OfficialMatchSetup + OfficialControls (coach/umpire "Track a match"),
                        AchievementsPanel, CardBrowserPanel, FavoritesPanel, TVScore
                        (courtside display), Toast, NetworkStatus (offline indicator)
lib/tournament/       - the event engine: formats, brackets, standings, courts.
                        PURE, tested, no storage. See its README for the slot model.
components/tournament/- the event screens (list, setup, dashboard, bracket).
                        Only TournamentHome touches storage. See its README.
lib/cards.ts          - card types, deck modes, filtering, shuffle, CATEGORY_INFO
lib/glossary.ts       - shared pickleball glossary (Help panel + in-card highlighter)
lib/manual.ts         - the in-app manual: every help answer as plain data (no JSX), searched
                        by HelpPanel; lib/manual.test.ts guards the search
lib/game.ts           - PURE game engine (addScore/sideOut/undo/checkWin) + active-game
                        localStorage; official mode: serverLabel/recordTimeout/recordFault/
                        logCount + two-server doubles rotation (behind config.officialMode)
lib/client-api.ts     - local store: custom decks, match history, export/import;
                        matchSheet() export + official fields on SavedMatch/addMatch
lib/useFocusTrap.ts   - focus-trap hook for dialogs / sheets
lib/shareImage.ts     - render a shareable match / win image
lib/sounds.ts         - Web Audio SFX + haptics
public/cards.json     - 1,729 cards
public/sw.js          - network-first service worker (prod only; dev unregisters it)
```

## Traps

- **Never add a directory under `app/` to a `.gitignore`.** Tailwind v4's automatic
  source detection honours `.gitignore`, so an ignored directory silently stops
  producing classes - utilities used only in that file are never generated and the
  page renders with half its layout missing, with no error anywhere. A root rule
  `app/app/` (meant for a stray nested npm install) did exactly this: `sr-only`
  was never emitted, so a screen-reader-only line rendered as visible text.
  Check a suspicious class with `getComputedStyle`, not by reading the markup.
- Tailwind caches its ignore list: after changing `.gitignore`, restart `npm run dev`.

## Conventions
- Game logic = pure functions in `lib/game.ts`; UI calls them and stores the returned `GameSession`.
- All persistence goes through `lib/client-api.ts` (swap point if a real DB is ever added),
  tournaments included - the engine never reads or writes storage itself.
- A tournament match played on the scorekeeper carries `GameSession.tournamentRef`,
  and team 1 is ALWAYS the match's team A. That is what lets the final score be
  written straight back; swap the sides and results land on the wrong team.
- Theme via CSS vars + `data-theme` on `<html>`; animation utilities live in `globals.css`.
- **Surfaces are glass materials, not divs with a background.** `.mat-thin`
  (chips, rows, tiles) / `.mat-regular` (bars, inline panels) / `.mat-thick`
  (sheets and dialogs). Each is a tint + blur + saturation + hairline
  `--mat-edge` + a 1px top sheen; dropping any one is what makes web glass look
  like a grey box. Never hand-roll `backdrop-filter`.
- **Scrolling rules.** The page has exactly ONE scroll container. Never put
  `overflow-x: hidden` on html/body (it silently makes both scrollers - use
  `clip`). Any inner scroller gets `.scroll-area`. Any dialog or sheet calls
  `useScrollLock`, or the page scrolls behind it.
- **`.app-col` is the app width** (30rem) at every breakpoint; only the home and
  game screens widen, via `.app-col--wide` + `lg:grid`. Specificity trap: a
  Tailwind `lg:max-w-*` will NOT beat `.app-col`, both are one class and
  `.app-col` is defined after the utilities.
- **Hover is not optional on desktop, and must not leak to touch.** Use
  `.hoverable` / `.hover-tint` / `.hover-pop`; they live inside
  `@media (hover: hover) and (pointer: fine)`.
- **Radius, elevation and ink are tokens, not eyeballed.** `--r-chip` (pills) /
  `--r-ctl` (buttons, inputs, rows) / `--r-panel` (cards, sheets) / `--r-hero`
  (the playing card only); `--elev-1..3` instead of ad-hoc `box-shadow`;
  `--accent-ink` for text on an accent fill (never `#fff` - it vibrates on mint).
  Anything that counts - scores, clocks, card totals - gets `.tnum`.
- One primary action per screen. If a second button competes with it, cut it.
- Mobile-first: `100dvh`, 16px inputs, `touch-action: manipulation`, safe-area insets, responsive `clamp()` card.

## Dead code (inert stubs from an abandoned auth experiment - safe to delete)
`app/api/`, `app/login`, `app/signup`, `lib/db.ts`, `lib/auth.ts`, `lib/supabase/`,
`components/AuthForm.tsx`, `components/UserMenu.tsx`. Also pre-existing orphans
`components/GameSettings.tsx`, `components/DeckModeSelector.tsx`.
