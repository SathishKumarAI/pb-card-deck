# Changelog

Every change that shipped, newest first. Dates are merge dates; `(#n)` is the
pull request. The repo has no version tags - the live app is whatever `main` was
last deployed from, so the releases here are dated milestones, not semver
numbers.

The shape is loosely [Keep a Changelog](https://keepachangelog.com/en/1.1.0/):
**Added / Changed / Fixed / Docs**. Every entry says *why*, because a list of
diffs is not a history.

---

## Unreleased - phase 2a: an optional account (2026-09-29)

An account is now **optional and additive**. The no-account mode is untouched and
still the default: with no Supabase project configured, the cloud code is never even
downloaded and the app is byte-for-byte what it was.

### Added
- **Sign in with Google, or with a link emailed to you.** No passwords anywhere in
  this app - which means none to leak, reset, or rate-limit beyond the link itself.
  A magic link reaches any mailbox, including Yahoo, which is not a Supabase
  provider (#19).
- **Cloud sync for what you made:** matches, custom decks, tournaments with their
  change log, favourite cards and achievement counters. They survive a cleared
  browser and appear on your other devices (#20, #21).
- **A tap still never waits on the network.** A local write goes to `localStorage`
  and appends to a queue; the queue drains in the background, coalescing per row,
  backing off on failure, and giving up **visibly** rather than claiming to sync
  for ever. The chip says `Synced` / `3 to save` / `Offline` / `Not synced` (#20).
- **The first sign-in asks before uploading anything**, names real counts from your
  device ("40 matches, 3 decks, 2 events"), and defaults to yes. Declining deletes
  nothing (#20, #21).
- **Delete my account** removes every row it owns in one database operation, behind
  a typed confirmation (#19).
- **The database enforces privacy, not app code.** Row-level security on every
  table, a policy per operation, `anon` revoked, and a tournament's audit log with
  no update or delete policy **at all** - a corrected score appends a line saying
  what it used to be (#18).
- **An adversarial security suite that can actually fail.** A second account tries
  to read, edit, delete, forge and rewrite the first one's data, and every attempt
  must be refused. `bash scripts/verify-rls-local.sh` runs it on a throwaway
  Postgres in Docker with no Supabase account at all; `npm run test:rls` runs it
  over HTTP against a real project (#18).

### Changed
- `lib/client-api.ts` is now a façade over `lib/store/*`, one file per concern, so
  sync hooks in without a single screen knowing it exists (#17).
- **`connect-src` was `https:`** - every host on the internet. It is now `'self'`
  plus exactly the configured Supabase origin (#19).
- The privacy page now describes both modes: what an account stores, where, who can
  read it, the names an organiser types for other people, and how to delete all of
  it (#22).

### Fixed
- **"Delete all local data" left three things behind.** Tournaments, in-progress
  games and the local copy of submitted feedback survived it, because the erase
  path listed keys by hand and three had been added later. It now enumerates a
  catalogue, so a new entity cannot be missed (#17).
- **A write landing while its own row was being pushed could be lost silently.**
  Queue bookkeeping matched on `(entity, id)` and deleted the brand-new entry as
  "sent"; keying on the timestamp collided in the same millisecond. Entries now
  carry a sequence number (#20).
- `force row level security` would have made account deletion delete **zero rows
  while reporting success**, because every policy is scoped to `authenticated`
  while the table owner is `postgres`. Caught by running the migrations, not by
  reading them (#18).
- The `event_log` table was append-only in policy but not in privilege: Supabase's
  default grants let an UPDATE reach the policy layer. Now revoked explicitly (#18).

### Not here yet
- **Sharing an event.** An account is private to you today. Phase 2b is a revocable
  read-only link for spectators; phase 2c is invited signed-in co-organisers who can
  enter results - which is why event matches are stored as rows, not as a blob.

---

## Documentation pass (2026-09-29)

### Docs
- **A README that tells the story**, not just a feature list: why the app
  exists, what is genuinely new in it, the three ways to use it (draw cards,
  track a match, run an event), the stack with real version numbers, how it is
  built and verified, the plan, and how to bring an idea.
- **This changelog** - the first time the whole history sits in one file.
- **`LICENSE`** - MIT was claimed in the README since June and the file was
  missing. Fixed.
- **`docs/TOURNAMENTS.md`** - how to run a real event for 4 people or 50, from
  pasting names to exporting results.
- **`docs/RECORDING-A-MATCH.md`** - the whole "record the gameplay" path:
  casual history, coach/umpire tracking, the match sheet, CSV, tournament
  change logs, share cards.
- **Issue and PR templates** - a bug report, a card idea and a feature idea, so
  "open an issue" is a prompt rather than a blank box.
- **Corrected stale facts** in `README.md`, `app/README.md` and
  `CONTRIBUTING.md`: the suite is **164 tests in 14 files** (documented as 144,
  and as 64 in one place); `main` does **not** auto-deploy to production (the CI
  comment and CONTRIBUTING both said it did - see #11 for what that cost); the
  clone path is `pb-card-deck/`, not `pickleball-shuffle/`; and the `page.tsx`
  split is done, not pending.
- Wrote down features that shipped and were never documented: achievements, the
  full-deck browser, TV / courtside score, the daily challenge, the screen wake
  lock, deck share codes, and match-history CSV export.

---

## 2026-09-22 - Desktop layout, and honest bookkeeping

### Fixed
- **Desktop uses its vertical space** instead of leaving a dead third at the
  bottom (#14).
- **Every form field has a `name`**, so browser autofill and password managers
  stop guessing (#13).
- **A paused match no longer bills pause time as play** - the elapsed clock
  freezes, so durations in history are playing time (#13).
- **"Save this match?" asks once per match, not once per game** - a best of 3
  asked three times, which is nobody's idea of consent (#13).

## 2026-09-21 - The page.tsx split, three centring bugs, a scoring audit

### Added
- **`lib/scoring-audit.test.ts`** - a rulebook audit of the engine, one test per
  defect, each written before its fix and named for what a player would see. It
  caught the single opening service turn (USAP 4.B.7), reset not restoring the
  first server, and game point shown to a side that could not score it (#12).

### Changed
- **`app/page.tsx` went from 1,010 lines to ~470** and now owns session state
  only. Layout moved into `components/HomeScreen.tsx`, `GameScreen.tsx` and
  `AppPanels.tsx` - the 500-line debt is paid (#12).

### Fixed
- **Three separate causes of "the page is off centre"**, all found by measuring
  boxes in the browser rather than reading markup: a per-tab column width (a
  64px jump), a missing `scrollbar-gutter` (4px), and a top bar 544px narrower
  than the content beneath it (#12).
- **The production deploy now actually moves the domain** (#11). `vercel --prod`
  had been succeeding for months while `pb-card-deck.vercel.app` stayed pinned
  to a deployment **81 days old** - months of shipped work was live nowhere.
  `deploy-vercel.sh` deploys with `--scope`, aliases the domain, then curls the
  domain to check. Verify the DOMAIN, never the deployment URL.

## 2026-09-21 - Light by default, and colour that is measured

### Added
- **`npm run contrast`** - prints a WCAG table for both themes and exits
  non-zero below threshold. It also runs as a test (`lib/contrast.test.ts`), so
  a palette edit that breaks contrast fails CI instead of someone's eyes in
  sunlight (#10).

### Changed
- **Light is the default theme.** The header cycles light, dark, auto and the
  choice sticks. The app is used in daylight far more than at night (#10).
- **The palette was darkened until it passed AA.** Two light-mode pairs failed
  when the audit was first written: white on `#059669` at 3.77:1 (a button label
  wants 4.5) and the serve marker at 2.84:1 on the page. Same hues, measured
  numbers, recorded in comments beside the tokens (#10).

## 2026-09-21 - Tournaments, a searchable manual, and the glass app shell (#5)

### Added
- **Tournament mode, five formats**: round robin, pools into a playoff bracket,
  single elimination, double elimination (losers bracket and a grand-final
  reset), and rotating partners, where players enter alone, change partner every
  round, and the score follows the *person*. All of it runs on one idea - **a
  match holds two slots, not two teams** - and one function resolves them.
- **Run-an-event tooling**: paste 50 names or pairs into one box; typed court and
  pool counts; divisions (open, men's, women's, mixed from `(m)` / `(f)`
  markers); standings with head-to-head then point difference; a live bracket
  tree whose connectors turn green as results land; editable scores with a change
  log that keeps what a score used to be; CSV / Markdown / JSON / text export;
  and a one-tap demo event that is a real event played through the real engine.
- **Coach / umpire "Track a match"**: singles or doubles, an event label, the
  real two-server doubles rotation, timeouts, faults, the halfway side-switch
  reminder, and a downloadable text **match sheet** as proof of result.
- **A searchable manual** (`Help`, on every screen): 30 plain-language answers
  written as points rather than paragraphs, because people read them standing on
  a court - plus **tap-to-define** jargon from one shared glossary.
- **Share cards**: wins, streaks and champions drawn to PNG at three sizes
  (square, story 1080x1920, 4:5) and handed to the phone's share sheet. The
  canvas preview *is* the file, so it cannot drift from the export.
- **Win streaks** per name: current run, best run, win rate, recent results.
- **Consent before storage** - a finished match asks before being written to the
  device, and can remember the answer (`ask` / `always` / `never`).
- **Achievements**, a **full-deck browser** with search, a **TV / courtside
  score** view, a **daily challenge** deck (seeded, identical for everyone that
  day, with no backend), **deck share codes**, **match-history CSV**, and a
  **screen wake lock** so a propped phone does not dim mid-match.
- **The glass app shell**: iOS-style materials (thin / regular / thick), bottom
  sheets with a grabber, a pickleball-court backdrop, hover states on pointer
  devices only, and a two-column desktop layout.
- **An accessibility pass**: focus rings, dialog semantics and Escape on every
  panel, focus traps, scroll lock behind sheets, 44px targets, pinch-zoom left
  on, `prefers-reduced-motion` honoured - and `lib/a11y.test.tsx` to keep it
  that way.

## 2026-06-15 - 1,729 cards, commentator voice, and understanding the game

### Added
- **The deck grew from 200 to 1,729 unique cards** (the Ramanujan taxicab
  number), each with rarity, intensity, tags and a callout. Generated by
  `scripts/generate_cards.py`, which enforces uniqueness like a primary key.
- **Two text styles** - concise rules, or **Commentator voice** for hyped
  courtside phrasing. Both are stored on every card.
- **Understand & Play**: a first-run welcome tour (replayable), a per-card **?**
  explainer, an always-shown "what to do this point" line, and a one-time
  in-game hint - so a newcomer needs no pickleball knowledge at all.
- **In-game pause** that freezes the clock and survives a reload.
- **Configurable match length** (single, best of 3, best of 5) with a
  match-complete celebration.
- **Rules & help panel**, a new logo (a tilted card over a holed pickleball),
  and a GitHub Pages docs landing.

### Fixed
- Accessibility, reduced-motion and design-consistency gaps in four batches;
  bigger tap targets; a toast on import; and emoji replaced by lucide icons
  everywhere in the UI.

## 2026-06-09 - Local-first, for real

### Added
- **`lib/client-api.ts`** - one module owning every write to the device: custom
  decks, match history (capped at 200), favorites, export / import backup.
- **Favorites**, skip-a-card, a clean-slate reset, and the app menu.
- **A CI gate** (GitHub Actions): lint, type-check, tests, build - plus a
  dependency audit and a gitleaks secret scan.

### Removed
- The abandoned backend: auth routes, Supabase, SQLite. Local-first is the
  product decision, and that dead code was the last thing arguing with it.

## 2026-05-27 - First release

### Added
- The original idea, working: 200 twist cards, deck modes, a real pickleball
  scorekeeper with side-out scoring and win-by-2, undo, dark and light themes,
  sound and haptics, a full PWA with offline support, and a 3D card flip.
