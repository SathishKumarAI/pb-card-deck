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
app/page.tsx          - SESSION STATE ONLY: cards, deck, live game, storage, handlers.
                        No layout lives here. It was 1,010 lines and is now ~470.
components/HomeScreen - the landing screen (pitch, Play/Track/Tournament, decks)
components/GameScreen - the game screen (top bar, board, card, its overlays)
components/AppPanels  - every menu sheet, in one place (both screens render it)
components/           - CardDisplay (3D flip + "?" explainer), ScoreKeeper, TopBar,
                        CardHistory, WinCelebration, PlayerNames, SettingsSheet, AppMenu,
                        HistoryPanel, DecksPanel, FeedbackPanel, HelpPanel, icons.tsx,
                        WelcomeTour (first-run onboarding), GlossaryText (tap-to-define),
                        OfficialMatchSetup + OfficialControls (coach/umpire "Track a match"),
                        AchievementsPanel, CardBrowserPanel, FavoritesPanel, TVScore
                        (courtside display), Toast, NetworkStatus (offline indicator)
lib/tournament/       - the event engine: formats, brackets, standings, courts,
                        divisions, the audit log and export. PURE, tested, no
                        storage. See its README for the slot model.
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
lib/streaks.ts        - win streaks from saved matches (pure, tested)
lib/shareImage.ts     - share cards on canvas: result / streak / tournament, in
                        square / story / 4:5. Owns PIXELS only; SharePanel owns
                        choosing and sharing. Lay out inside `box(h)`, never at
                        fixed offsets from the centre - that collided with the
                        footer on the square card.
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
- **A per-screen column width reads as the page sliding off centre.** The event
  tab used to get `.app-col--event` (72rem) while every other tab got
  `.app-col--wide` (64rem), so tapping Play -> Tournament moved every pixel 64px
  sideways (measured: column x=130 vs x=66). There is now ONE desktop width.
- **Reserve the scrollbar.** `scrollbar-gutter: stable` on `html`. Without it
  the whole layout shifts 4px the moment content grows past one screen, which
  is indistinguishable from a bug in the centring.
- **A bar and the content under it must share a width class.** `TopBar` used
  bare `.app-col` (30rem) while the game content used `.app-col--wide` (64rem):
  at 1440 the Back button and clock floated in mid-air over a column 544px
  wider than they were. Same modifier on both, always.
- **Check tap targets with the rendered box, not by eye.** The superscript "?"
  on the home screen measured 5x14px; the footer link 23px tall; the side-out
  control 25px. Anything a thumb must hit is >=30px in both axes - expand with
  padding, or an absolutely-positioned `::before` when the glyph must stay small.

## Conventions
- Game logic = pure functions in `lib/game.ts`; UI calls them and stores the returned `GameSession`.
- All persistence goes through `lib/client-api.ts` (swap point if a real DB is ever added),
  tournaments included - the engine never reads or writes storage itself.
- A tournament match played on the scorekeeper carries `GameSession.tournamentRef`,
  and team 1 is ALWAYS the match's team A. That is what lets the final score be
  written straight back; swap the sides and results land on the wrong team.
- Theme via CSS vars + `data-theme` on `<html>`; animation utilities live in `globals.css`.
- **Light is the DEFAULT theme.** `:root` carries the light palette and
  `[data-theme="dark"]` overrides it - not the other way round. The app is used
  in daylight far more than at night, and a first-time visitor should not be
  handed a dark interface before choosing one.
- **Colour is measured, never eyeballed.** `npm run contrast` prints a WCAG
  table for both themes and fails below threshold; `lib/contrast.test.ts` runs
  it in CI. When the light palette was first written, white on `#059669` was
  3.77:1 (AA wants 4.5 on a button label) and the `#d97706` serve marker 2.84:1
  on the page - both invisible to a dark-first eye. Change a colour, run it.
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
- **Every control someone types into needs an accessible name.** Nine fields
  shipped without one - the whole tournament setup form, both official-match
  name boxes, the event label, the team-name editor and the hidden import
  picker - because the visible label sits in a sibling `<span>`, which names
  nothing. `lib/a11y.test.tsx` now fails if a field in those forms has no
  accessible name; `NumberField` takes a `label` prop for exactly this.
- **Durations come from `elapsedMs`, never `Date.now() - startTime`.** The
  second form bills a pause as play: a game paused for a coffee break recorded
  the break. Both `addMatch` and `matchSheet` had it.
- **Saving a finished match asks first.** `lib/historyConsent.ts` holds the
  preference (`ask` / `always` / `never`) and `SaveMatchPrompt` is the dialog.
  Nothing writes to match history without an answer; dismissing the dialog
  counts as "not this time", never as consent. The answer covers the whole
  MATCH, not one game - `shouldAskToSave` is the decision, and a best of 3
  used to raise three dialogs for a single match.
- **Help answers are POINTS, not paragraphs.** `ManualEntry.points` renders as
  bullets and `steps` as a numbered list - use `steps` only for a real
  sequence. `QUICK_LINKS` lives in `lib/manual.ts` beside the text it names,
  and a test fails if a shortcut no longer matches an entry.
- **A confirmation must render where the button is.** The reset confirm used to
  appear in the content column, ~700px below the top-bar button that opened it,
  which reads as "the button is broken". Prefer act-then-offer-undo (a toast with
  an Undo action) over a confirm strip that lands off screen.
- **An action with no visible effect is a dead button.** Undo changed one numeral
  silently and was reported as broken twice. Anything whose result is small or
  off-screen says what it did.
- **Every state transition goes on the undo stack, not just the ones that change
  a number.** A side-out changes no score and was therefore un-undoable; the
  engine now logs it with a serve snapshot. See `ScoreEvent.serveBefore`.
- **The serve rules are the rulebook's, not a simplification.** Official doubles
  gives the team serving FIRST in a game a single service turn
  (`initialServerNumber` returns 2 - "starting second server", USA Pickleball
  4.B.7). Starting at 1 gave that team an extra serve and put every later
  rotation out by one. Winning a rally never advances the server number; only
  losing one does. Singles and casual play keep server 1 because they do not
  model two servers.
- **The rules audited in `lib/scoring-audit.test.ts` are the rules.** Five
  defects were found by checking the engine against the rulebook rather than
  against itself, and each has a test named for the behaviour a player sees:
  reset went back to *team 1, server 1* instead of to how the game started
  (wrong team's serve, plus an extra service turn all game); rally scoring
  never moved the serve, so the board claimed the opening team was serving
  forever; `adjustScore` ignored `scoreLocked` while `addScore` honoured it;
  and "game point" was announced over a receiving team that cannot score from
  there. `GameSession.firstServingTeam` exists so reset can restore the serve.
- **State that is correct but surprising must explain itself.** "2nd server" at
  0-0 is right, and read as a bug until the board said why. If a display needs a
  rulebook, print the sentence.
- Mobile-first: `100dvh`, 16px inputs, `touch-action: manipulation`, safe-area insets, responsive `clamp()` card.

## Dead code (inert stubs from an abandoned auth experiment - safe to delete)
`app/api/`, `app/login`, `app/signup`, `lib/db.ts`, `lib/auth.ts`, `lib/supabase/`,
`components/AuthForm.tsx`, `components/UserMenu.tsx`. Also pre-existing orphans
`components/GameSettings.tsx`, `components/DeckModeSelector.tsx`.
