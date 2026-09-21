# Worklog

## 2026-09-21 16:40 — Premium UI pass + in-app manual, and the .gitignore line that broke Tailwind

**Summary:** Rebuilt the home and game screens around one design-token scale and one primary
action, replaced the Rules panel with a searchable plain-language manual reachable from a Help
button on every screen, and fixed three rendering bugs found by measuring the running app rather
than reading the markup.

**Root cause worth remembering:** the root `.gitignore` had `app/app/` (added to hide a stray
nested npm install). Tailwind v4 automatic source detection honours `.gitignore`, so it skipped
the entire App Router directory and never generated any class used only in `app/app/page.tsx` —
`gap-8`, `justify-start`, `-mb-3`, `z-[70]`, `sr-only`. Measured, not guessed:
`getComputedStyle('.sr-only').position === 'static'`, which is why the screen-reader-only line
"Score: Team 1 0, Team 2 0." was rendering as visible text under the scoreboard, and why the
landing page had no vertical rhythm. Now ignoring the two stray files by exact path. Tailwind
caches the ignore list — the dev server needs a restart after editing `.gitignore`.

**Changes:**
- `fix(build)`: narrow the `.gitignore` rule; verified the five classes now resolve.
- Design tokens in `globals.css`: `--r-chip/-ctl/-panel/-hero` (radius now carries hierarchy),
  `--elev-1..3`, `--accent-ink` (white on `#34d399` vibrates), `.tnum` for scores/clocks/counts,
  `.eyebrow` as the single label treatment.
- Home: one identity ("PB Card Deck", matching the manifest), one sentence, one primary action
  (Start playing, remembering the last deck). The two competing pickers became a hierarchy —
  three level cards, five theme chips — instead of eight equal choices. Killed the duplicated
  count in "All 1,729 cards · 1729 cards".
- Game: six floating words under the top bar became one match strip with hairline dividers; the
  scoreboard is one panel where the numeral is the scoreboard and the team colour is a marker on
  it; removed the second Back button that competed with Draw.
- `components/HelpPanel.tsx` + `lib/manual.ts`: 30 answers in plain language for someone who has
  never played pickleball, with search (every query word must match) and three quick links.
  Replaces `RulesPanel.tsx`; glossary still read from `lib/glossary.ts`. `lib/manual.test.ts`
  covers search. Welcome tour cut to three slides and hands over to the manual.
- Two more measured bugs fixed: a long card title was clipped under the card header with no way
  to scroll to it (`justify-center` on a scroll container centres by overflowing *both* ends —
  now `m-auto`), and every sheet drew a 2px accent focus ring on open because a bare
  `:focus-visible` matched dialog containers focused programmatically with `tabindex="-1"`.

**Verification:** `npm run build` clean, `tsc --noEmit` clean, `npm test` 75 passed (6 new),
`eslint` 0 errors / 14 pre-existing warnings. Home, game, card face, win screen, help panel,
match history and Track-a-match checked in Chrome at 390 px in both themes.

**Follow-ups:**
- [ ] `components/GameSettings.tsx` and `components/DeckModeSelector.tsx` are still orphans
      (nothing imports them) and are the last two files using `bg-green-600 text-white`.
- [ ] The stray `app/app/package.json` + `package-lock.json` still exist; deleting them would
      remove the reason the ignore rule was ever added.

## 2026-07-03 19:42 — Ship: repo+URL rename, deploy, dead-code cleanup, PR

**Summary:** Deployed PB Card Deck to production, renamed repo + live URL to `pb-card-deck`,
removed the dead auth stubs leaking onto the site, and opened the wave-1 PR.

**Changes:**
- Deployed to Vercel prod; **live: https://pb-card-deck.vercel.app** (verified home 200, login 404).
- GitHub repo `pickleball-shuffle` → `pb-card-deck` (+ fixed repo description/homepage); Vercel
  project → `pb-card-deck`; swept `SITE_URL`/`GITHUB_URL`/robots/sitemap/docs to the new URL+slug.
- Disabled Vercel Authentication (was `all_except_custom_domains`) so the new `.vercel.app` domain
  is public — note: preview deploys are now public too.
- Removed the untracked auth-experiment stubs (`app/app/{api,login,signup}`, `lib/{db,auth,supabase}`,
  `AuthForm`/`UserMenu`) → backed up to scratchpad; `/login` `/signup` now 404.
- Removed the old `pickleball-card-games.vercel.app` alias (now 404).
- Updated the profile README (SathishKumarAI/README.md) link.
- Opened PR #4 (feat/wave1-prod-hardening → main, 48 commits).

**Follow-ups:**
- [ ] Review + merge PR #4.
- [ ] (optional) re-enable deployment protection if preview deploys shouldn't be public.

## 2026-07-03 — Final name: "PB Card Deck" (ended the naming churn)

**Summary:** Settled the product name on **PB Card Deck** after cycling through Paddol → Whimzy.
Key reframe: the app is personal-use / not-for-sale, so trademark strength doesn't matter and a
plain descriptive name is the right call. Dropped the two-tier sub-brand (name already says "deck").

**Changes:**
- Swapped branding workspace-wide Paddol → Whimzy → **PB Card Deck** across the same ~24 files
  (manifest, layout, about/privacy/terms, FeedbackPanel, shareImage, icons, generate_cards.py,
  cards.json, READMEs, docs, prompts, dotfiles FEATURES.md).
- Simplified manifest `name`/title (dropped redundant "- Pickleball Cards" suffix); fixed About lede.
- `docs/NAMING.md` — full 6-pass journey now recorded, decision flipped to PB Card Deck with the
  personal-use rationale; coined candidates (Whimzy front-runner) kept for a possible future commercial pivot.

**Decisions:** Descriptive name is fine because there's no business to protect. If it ever goes
commercial, revisit Whimzy (whimzy.com free, no conflicts) + do the clearance homework in NAMING.md.

**Follow-ups:**
- [ ] Commit the Whimzy→PB Card Deck swap (on top of the committed Paddol rename).
- [ ] (only if commercialized) coined name + USPTO/domain clearance.

## 2026-07-02 18:37 — Product rename to "Paddol" + trademark research

**Summary:** Renamed the product from "Pickleball Card Games" to **Paddol** (card deck =
**Paddol Deck**) across the whole workspace, after four rounds of naming + trademark research
ruled out the punny pickleball names in favor of a coined, defensible word.

**Changes:**
- App branding — `manifest.json`, `layout.tsx` (title/OG/Twitter/apple), `about/privacy/terms`
  pages, `FeedbackPanel.tsx`, `shareImage.ts` (watermark/share), `page.tsx` + icon SVGs (`icon.svg`,
  `app-icon.svg`, `logo-mark.svg`) → all now say Paddol / Paddol Deck.
- Deck metadata — `scripts/generate_cards.py` + `docs/data/cards.json` deck title.
- Docs/meta — `README.md` x2, `app/CLAUDE.md`, `CONTRIBUTING.md`, `docs/{index,ONBOARDING,BACKLOG}.md`,
  `prompts/{00-scaffold,README}.md`, and `../dotfiles/docs/features/FEATURES.md`.
- `docs/NAMING.md` — new: full naming journey, legal/trademark research, clearance homework + checklist.

**Decisions:** Rejected **ThirdShot** ("Third Shot Drop" is a registered pickleball brand +
descriptive term) and **DinkDeck** ("Dink Decks" is already a digital pickleball card product).
Pivoted to coined words; ran a web/app-store/Crunchbase clearance pass; chose **Paddol** — the only
survivor that still echoes "paddle" while being arbitrary/defensible. Kept "pickleball" in the tagline
for SEO, out of the brand mark. Live URL + repo dir left unchanged to avoid breaking links/paths.

**Follow-ups:**
- [ ] USPTO TESS search for Paddol + sound-alikes (classes 9/28/41) before any launch/filing.
- [ ] Secure a domain — `paddol.com` is taken; grab `paddol.app`/`.io`/`getpaddol.com` + social handles.
- [ ] Attorney flat-fee clearance (~$300–600) before monetizing; file the TM once cleared.
- [ ] Rename live Vercel URL + (optional) repo dir from `pickleball-shuffle` → paddol.
- [ ] Not committed yet — review + commit the rename.

## 2026-07-02 15:04 — Docs consolidation, ship.sh, deploy-auth blocker

**Summary:** Consolidated all docs into a readable, indexed set; added a one-command deploy
(`ship.sh`) + RUNBOOK deploy steps; diagnosed why the prod deploy can't run from this environment.

**Changes:**
- `docs/SESSION-NOTES.md` (new) — single readable capture of everything built this session and
  earlier, decisions, and gotchas (from git history + WORKLOG).
- `docs/index.md` — links every doc, grouped (start-here / how-the-game-works / state & process).
- `README.md` — Documentation section points to the index + session notes + doubles/scoring/
  validation docs.
- `chmod -R a+r docs` — docs world-readable on disk.
- `ship.sh` (new) — tests + build → push branch → `vercel --prod` (from repo root); `--no-deploy`
  for push-only; friendly auth hints on failure.
- `docs/RUNBOOK.md` — concrete deploy steps (ship.sh + manual), `gh`/`vercel` auth notes, and the
  installed-PWA re-open / SW-cache note.
- Commits: `a6126e9` (docs), `3669774` (ship.sh + RUNBOOK).

**Decisions:**
- Deploy still can't run here. Diagnosed the cause precisely: the user's `gh` token lives in the
  **desktop keyring** (hosts.yml has the username but no token), and this sandbox has no keyring/
  secret-service session (`gh auth token` → "no oauth token found"; only the flatpak D-Bus is
  present). So `git push`/`vercel` must run in the user's own terminal, or a PAT must be written to
  `hosts.yml` / `GH_TOKEN`. Recommended: run `./ship.sh` in a real terminal.

**Follow-ups:**
- [ ] Owner: run `./ship.sh` in a desktop terminal (keyring accessible) to push + deploy prod, then
      re-open the installed PWA.

## 2026-07-02 — Serving WON/LOST buttons + glossary popover portal

**Summary:** Removed the confusing "tap the opponent to advance your own server" in official
doubles, and fixed the tap-to-define popover getting clipped by the card.

**Changes:**
- `components/ScoreKeeper.tsx` — in official side-out mode, score tiles become **read-only** and
  you act on the serving side with two buttons: **"{team} won" (+1)** and **"{team} lost"**
  (→ 2nd server / → side out, relabels itself). Rally mode keeps both tiles tappable. Fixed WON
  button colour (`--green` didn't exist → `--accent`).
- `components/OfficialControls.tsx` — dropped the now-redundant serve button + `onSideOut` prop
  (WON/LOST handles it); kept the serving status card + timeouts/faults/download.
- `app/page.tsx` — dropped `onSideOut` from the OfficialControls call.
- `components/GlossaryText.tsx` — definition popover now **portalled to `<body>`** and anchored to
  the viewport bottom-center, so the card's `overflow-hidden` and 3D flip transform (which traps
  `position:fixed`) can no longer clip or mis-place it. Removed the now-moot `onLight` prop.
- `components/RulesPanel.tsx` + `docs/DOUBLES-SCORING.md` — updated the doubles guidance to the
  WON/LOST flow.

**Decisions:**
- "Why tap the other team to move to the 2nd server?" was a real UX flaw. Research (Dropshot etc.)
  uses tap-who-won, but for side-out that means tapping the opponent on a fault, which feels wrong.
  Fix: act on the **serving side's outcome** (WON/LOST) — clearest for coaches/umpires, never touch
  the opponent tile.
- Glossary popover: a portal is the only robust fix — a transformed ancestor makes `position:fixed`
  behave like `absolute`, so CSS alone couldn't escape the card.

**Validation:** 69 tests, clean build, 0 lint errors. Live browser: WON adds a point, LOST advances
server 1→2 then side-outs (score unchanged, narration correct), tiles read-only; glossary popover
now `parentElement === body`, bottom-anchored, fully visible.

## 2026-07-01 — Server clarity on TV + PWA scroll fix

**Summary:** Mirrored the 1st/2nd-server indicator onto the big-score/TV display, and fixed
a standalone-PWA scroll bug where the tall Track-a-match setup form couldn't scroll.

**Changes:**
- `components/OfficialControls.tsx` — serving status card with explicit `1ST SERVER`/`2ND SERVER`
  pills (current highlighted) + "<n> server up · Fault → <next>" hint.
- `components/ScoreKeeper.tsx` — visible "1st/2nd server" chip on the serving tile; server badge
  shown only in official doubles (hidden in casual doubles where it never rotates).
- `components/TVScore.tsx` — serving team shows a "1st/2nd server" chip (official doubles); added
  `min-h-0 overflow-y-auto` guard so the fixed view can't clip on short/landscape screens.
- `app/layout.tsx` — **PWA scroll fix**: removed `h-full` from `<html>` (was pinning it to
  height:100%, clipping overflow in standalone), body → `min-h-dvh`. Document now scrolls naturally.

**Decisions:**
- Server badge gated to official doubles so casual play never shows a misleading static "server 1".
- Root cause of "scroll not working": `<html class=h-full>` — invisible in-browser (address bar
  masks it) but clips in the installed PWA. Verified html height now grows to content (1337px vs
  927px viewport) and the page scrolls.

**Validation:** 69 tests, clean build; browser-checked server chips on scoreboard + TV, and the
Track form scroll (Start button reachable).

## 2026-07-01 14:31 — Beginner-first score UI (research-backed redesign)

**Summary:** Researched how top pickleball apps keep score for beginners, saved the findings,
and implemented the recommendations so non-IT users can score doubles without knowing side-out
rules. Reframed the score UI from "add a point" to "who won the rally" + plain narration.

**Changes:**
- `docs/SCORING-UX-RESEARCH.md` (new) — app survey (Dropshot/Referee/Side Out/Score Counter/
  Calculator), rally-vs-side-out 2026 context, options weighed, decision, sources.
- `lib/game.ts` — pure `outcomeMessage(prev,next)` narration helper; `config.announceScore`.
- `lib/sounds.ts` — `speak()` via Web Speech API (guarded, opt-in).
- `components/ScoreKeeper.tsx` — "Who won the rally?" prompt; tiles relabelled "won the rally";
  serve badge (ball + server-1/2 dots for doubles); consequence narration banner (+voice when
  enabled); NET divider (court-side framing) in official mode.
- `components/SettingsSheet.tsx` — "Announce score aloud" toggle (off by default).
- `components/OfficialControls.tsx` / `OfficialMatchSetup.tsx` — dynamic serve button + Side-out/
  Rally choice (from the prior doubles-clarity commit).
- `lib/game.test.ts` — 5 `outcomeMessage` tests.

**Decisions:**
- Adopted the pattern every top-reviewed app converged on — **tap who won the rally, app applies
  the rules** — because it needs zero rules knowledge and our engine already routes taps that way,
  so it's a framing + feedback change with no behaviour change.
- Narration is essential: on a side-out the score doesn't move, so a plain banner ("Eagles — 2nd
  server serves") explains *why* — this is the real fix for "I can only score one team."
- Voice + rally kept opt-in; side-out stays default (MLP reverted rally→side-out in 2026).

**Validation:** 69 tests pass, clean build, 0 lint errors in changed files. Live browser (doubles,
official): who-won prompt, relabeled tiles, serve badge reflecting server 1→2, narration for
point / side-out / 2nd-server, dynamic serve button, voice toggle present (off).

**Follow-ups:**
- [ ] Push + production deploy (owner GitHub/Vercel auth).

## 2026-07-01 14:09 — Track-a-match scroll fix + full UI validation

**Summary:** Fixed the "scroll not working" report on the Track-a-match setup and
validated every setting/control in that flow live in-browser (390px). No prod deploy
yet — still owner-gated on GitHub/Vercel auth.

**Changes:**
- `app/page.tsx` (`65689fc`) — home `main` now `justify-start` on the Track tab
  (`justify-center` kept for the card home).

**Decisions:**
- Root cause was the `justify-center` centering a form taller than the viewport, so its
  top/bottom went out of reach on short screens / with the keyboard open — not a scroll
  lock (confirmed no body-lock or touch/wheel `preventDefault` in the code). Top-aligning
  the tall tab is the minimal, low-risk fix; the card home stays visually centered.
- Validation caveat recorded: scripted *synchronous* clicks batch into one React render
  and misreport control state; validated with awaits between interactions instead.

**Validated (live):** mode toggle; format Singles/Doubles (+ Teams↔Players label); name +
event inputs; points 11/15/21; match length; cards switch; Start match; official resume;
and doc-scroll reaches Start. Cards tab still centered; Track tab top-aligned.

**Follow-ups:**
- [ ] Push + deploy (v1 + coach mode + this fix) — `gh auth login` then push, or `./deploy-vercel.sh`.

## 2026-07-01 04:30 — Coach / Umpire "Track a match" mode (T11)

**Summary:** Added a coach/umpire match-recording mode on top of the card game.
A home segmented toggle `Play with cards` / `Track a match` (switchable any time —
this answers "can the mode change after selecting?": yes, one tap) leads to an
official-match setup and a proper officiating flow. Engine + client-api unit-tested
(64 tests green), validated live in-browser.

**Changes:**
- `components/OfficialMatchSetup.tsx` (new) — setup: singles/doubles, player/team
  names, event/round label, points-to-win (11/15/21), match length, cards on/off.
- `components/OfficialControls.tsx` (new) — in-match: serving indicator + server
  number, per-team timeout/fault buttons, side-out, one-tap match-sheet download.
- `lib/game.ts` — `officialMode`/`cardsEnabled`/`eventLabel` config, `matchLog`,
  `serverLabel`/`recordTimeout`/`recordFault`/`logCount`, and real two-server doubles
  rotation in `sideOut` (gated by `officialMode`, so casual play is unchanged).
- `lib/client-api.ts` — official fields on `SavedMatch`/`addMatch`; `matchSheet()`
  plain-text export (teams, game-by-game, timeouts/faults, duration).
- `app/page.tsx` — home toggle, `startOfficialMatch`, `downloadMatchSheet`,
  official controls wiring, card UI hidden when cards are off.
- Tests — `lib/game.test.ts` (+rotation, +log), `lib/client-api.test.ts` (new;
  addMatch official fields + matchSheet).
- Docs — README "Coach / Umpire mode" table, ONBOARDING, TICKETS T11 → shipped,
  spec Phase 2 → shipped (with the toggle refinement), app/CLAUDE.md structure.

**Decisions:**
- Top-level choice became a **home segmented toggle**, not a separate screen — makes
  the mode switchable in one tap (the explicit ask) and keeps casual play default.
- Advanced rotation is **gated behind `config.officialMode`** so existing/casual and
  singles behaviour is byte-for-byte unchanged (proven by the casual rotation test).
- Tracked-match **format locks once underway** (rotation math); change at setup/New Match.
- Browser batching note: driving a full 11-point win via scripted synchronous clicks
  hits one React state snapshot (net +1), so the win→history→sheet path was locked with
  unit tests instead; rotation/controls/logging/card-hiding verified live.

**Follow-ups:**
- [ ] Production deploy (both this + v1) — Vercel CLI/login still owner-run via `./deploy-vercel.sh`.

## 2026-07-01 01:20 — Understand & Play v1 (onboarding + self-explaining cards)

**Summary:** Shipped a zero-knowledge-user layer so a first-timer with no pickleball
background can open the app and play immediately — first-run welcome tour, tap-to-define
jargon, per-card "?" explainer, always-shown "What to do", an in-game hint, and a
"Why & how" help tab. Brainstormed → spec'd → built → browser-validated → committed
(`f17cd1e`). Also scoped a Coach/Umpire match-recording mode as planned Phase 2.

**Changes:**
- `components/WelcomeTour.tsx` (new) — 4-slide first-run carousel (what/why, how-to,
  navigation, start), localStorage-gated (`pb-welcome-tour-seen`), replayable from Rules.
- `components/GlossaryText.tsx` (new) — highlights known pickleball terms in card text,
  tap opens a definition popover.
- `lib/glossary.ts` (new) — shared glossary (17 terms + aliases); RulesPanel glossary tab
  now sources from it so tab + in-card defs never drift.
- `lib/cards.ts` — `CATEGORY_INFO` plain-language description per category.
- `components/CardDisplay.tsx` — "?" explainer sheet (what it means / how to play / what
  kind of card), always-shown "What to do" line, GlossaryText on rule + detail.
- `components/RulesPanel.tsx` — new default "Why & how" tab (benefits + navigation) +
  "Replay welcome tour" button.
- `app/page.tsx` — tour + one-time in-game hint wiring (`pb-game-hint-seen`).
- Docs — README "Learn & understand" group; ONBOARDING new-features + fixed stale
  "200"→"1,729"; TICKETS shipped entry + planned coach mode T11; app/CLAUDE.md structure;
  spec `docs/superpowers/specs/2026-06-30-understand-and-play-design.md` (persona journey
  + Phase 2 coach-mode design).

**Decisions:**
- Extracted the glossary to a shared module (single source for the Rules tab and the
  in-card highlighter) instead of duplicating term lists.
- Made the "?" the primary explainer; tap-to-define stays inline — they complement.
- Coach/Umpire mode kept as **pending** (per owner) — documented + task-broken (#7–#10),
  not built in v1. Chosen shape: top-level choice screen after the tour, scorekeeper +
  optional cards, singles/doubles + server rotation + side-switch + timeouts/faults,
  saves to Match history + exportable match sheet.
- Caught during browser validation: WelcomeTour was first placed in the game-screen
  return, never the home (early) return — moved into `if (!game)` branch; verified the
  tour, hint, explainer, and tap-to-define all render live at 390px.

**Follow-ups:**
- [ ] Production deploy — Vercel CLI not installed + no saved auth (interactive `vercel login`).
      Owner to run `./deploy-vercel.sh` (installs CLI, logs in, `vercel --prod` from repo root).
- [ ] Build Coach/Umpire mode (tasks #7–#10 / ticket T11).

## 2026-06-24 — feature shortlist build-out + continuous deploys

**Summary:** Built and shipped the full approved feature shortlist on branch
`feat/wave1-prod-hardening` (now pushed), deploying to production after each wave.
81 backlog items done total.

**Shipped this session:**
- Browse/search all 1,729 cards + rarity-distribution chart (F549/F048/F050)
- Share/import custom decks by code + clone (F042/F043/F040)
- Shareable match-result PNG via canvas + Web Share (F092)
- Daily challenge: date-seeded deck-of-the-day, no backend (F018)
- Switch-sides reminder (F062), replay how-to from Settings (F139)
- Dark/light/auto theme, persisted + follows system (F201/F159)
- Pickleball glossary tab in Rules & help (F138)
- Big-score TV/courtside display mode (F072)
- Achievements/badges from local stat counters (F121)
- Resume multiple in-progress games (keyed store + migration) (F085)
- Earlier in the run: manual score correction, SR announcements, wake-lock,
  delete-all-data, focus-trap, toasts, dependabot/gitleaks/audit/runbook,
  axe/RTL tests, game/match-point banner.

**Decisions / notes:**
- Prod deployed directly from the local branch via `vercel --prod` after each
  wave (smoke-checked); branch also pushed to origin for a PR + CI.
- Verified key flows live in the browser (Chrome DevTools MCP), incl. the
  multi-game resume refactor end-to-end.

**Follow-ups:**
- [ ] Open the PR for `feat/wave1-prod-hardening` (branch pushed; CI runs on it).
- [ ] Remaining P0s are blocked/parked: Sentry (DSN), accounts/roster/backend,
      Playwright E2E, doubles server-1/2 (needs a rules decision).

## 2026-06-23 — 557-feature backlog + autonomous prod/UX/onboarding build loop

**Summary:** Built a 557-item prioritized feature backlog across all categories, two
reusable prompts, then ran an autonomous build loop shipping verified P0 items on
branch `feat/wave1-prod-hardening`: security headers + SEO, vitest harness (44
tests), offline/SW-update banner, privacy/terms/about pages, focus rings, richer
card content (commentary + detail + intensity meter), and Beginner/Intermediate/
Advanced skill levels with a beginner how-to-play intro and bigger, mobile-readable
card text. All verified live in the browser (Chrome DevTools MCP), incl. mobile width.

**Changes:**
- `docs/BACKLOG.md` — 550 features (A gameplay · B UX/a11y · C infra/quality · D growth · E card content), P0/P1/P2 + S/M/L + status + build-order waves; 23 marked done.
- `prompts/feature-backlog-and-loop.md`, `prompts/feature-prompt-template.md` — reusable prompts for backlog generation + per-feature work.
- `app/next.config.ts` — security headers + baseline CSP on every route (F327/F328).
- `app/app/layout.tsx` — metadataBase, OpenGraph/Twitter, canonical (F482/F492/F493); mounts NetworkStatus.
- `app/app/robots.ts`, `app/app/sitemap.ts` — SEO routes (F483).
- `app/vitest.config.ts` + `lib/game.test.ts`, `lib/cards.test.ts`, `lib/cards-data.test.ts` — vitest harness, 38 tests; wired `npm test` into CI (F251/F253/F268/F541/F542).
- `app/components/NetworkStatus.tsx` — offline banner + SW update prompt (F228/F345).
- `app/app/(info)/` privacy/terms/about pages + AppMenu link (F243-F246).
- `app/app/globals.css` — keyboard focus rings (F142) + info-page prose styles.
- `scripts/generate_cards.py` + regenerated `cards.json` ×3 — real commentator voice on originals (no more effect dupes), new `detail` description + intensity meter per card (F501-F504); `lib/cards.ts` Card gains `detail`; `CardDisplay.tsx` shows detail + intensity dots (F521/F522).

**Decisions:**
- Hybrid local-first chosen, but **no account/login built yet** (per user) and the dead auth/supabase stubs left **parked** (app/CLAUDE.md flags them dead).
- Refocused the loop on hardening the **existing** card-game + scorekeeper rather than building the new roster/rotation product implied by some P0 backlog items.
- Every iteration verified: lint + tsc + tests + build, and key UI confirmed live in the browser via Chrome DevTools MCP (dev server on :3001).

**Follow-ups:**
- [ ] Branch `feat/wave1-prod-hardening` not pushed / no PR yet (awaiting user).
- [ ] Remaining P0s needing decisions: error tracking DSN (F291), GDPR specifics, doubles server-1/2 rotation (F063, behavior-changing).
- [ ] Continue loop: onboarding (F126/F131), more a11y (F143/F144/F150/F232), perf (F310).

## 2026-06-15 16:55 - Docs overhaul: full README, CONTRIBUTING, in-app discovery

**Summary:** Documented every feature for end users and contributors, added a contribution guide + a tasteful star/issues ask, and surfaced the new features in-app.

**Changes:**
- `README.md` - new grouped **Features** section (Cards & decks, Playing & scoring, Your data, Feel & accessibility), a **Contributing** section, expanded **Documentation** links, and an "Enjoying it?" footer (value-first, low-pressure star + issues ask). Repo-layout tree updated (`scripts/`, `docs/data/`).
- `CONTRIBUTING.md` (new) - dev setup, CI gates, PR guidelines, how to add cards via the generator, local-first ground rules.
- `app/README.md` + `docs/ONBOARDING.md` - "What's new" callouts.
- `RulesPanel` - new FAQ entries (Pause a game, Card text styles, Card rarity & the 1,729 deck) so new players discover the toggle/pause/rarity in-app.

**Decisions:** Star ask placed only at the README bottom, framed as optional with a discoverability reason (per the project owner's guidance) - no nagging, value first. Docs split by audience: README = players, ONBOARDING/CONTRIBUTING = contributors, app/README = architecture, docs/data = raw dataset.

## 2026-06-15 16:30 - Grow deck to 1729 cards with commentator voice + metadata

**Summary:** Expanded the deck from 200 to exactly **1,729** unique cards (the Ramanujan taxicab number), each in playful sports-commentator voice with rich metadata, and surfaced that metadata in the app.

**Changes:**
- `scripts/generate_cards.py` - deterministic generator: keeps the original 200 (now `rarity: signature`), appends 1,529 combinatorial twist cards in commentator voice, round-robin across 10 categories. Uniqueness enforced like a primary key on `name` (asserts unique ids + names, exactly 1729).
- Card schema enriched: `callout`, `intensity` (1-5), `rarity` (signature/common/uncommon/rare/legendary), `tags`. `lib/cards.ts` adds the `Rarity` type + `RARITY_STYLE`.
- `CardDisplay` shows a **rarity badge** + the **commentator callout** on the card face (replay/collect appeal).
- `docs/data/cards.json` (new): full documented dataset - `{ meta: { why_1729, philosophy, schema, categories, rarities, intensity_distribution }, cards: [...] }`.
- Easter-egg mark on the landing footer explaining why 1729 (taxicab number, 1³+12³ = 9³+10³). Copy updated 200 -> 1,729 in `manifest`, `layout`, `page.tsx`, `RulesPanel`, READMEs, `CLAUDE.md`.

**Decisions:** Commentator voice (rotating hooks/stingers) makes reading a card half the fun; rarity gives a collect-them-all pull; intensity/tags set up future themed/tunable modes. Original 200 kept verbatim. `cards.json` grew 39K -> 687K (fine for a one-time fetch).

**Verification:** generator asserts pass (1729 unique ids+names); tsc clean; build green; `/cards.json` serves 1729; landing shows the mark.

## 2026-06-15 16:05 - In-game pause (T3) + new-tab doc links + dash normalize

**Summary:** Shipped the in-game pause feature, normalized long dashes to hyphens repo-wide, and made the GitHub Pages landing links open in a new tab.

**Changes:**
- T3 pause: `lib/game.ts` adds `pausedAt`/`pausedMs` to `GameSession` + `pauseGame`/`resumePlay`/`isPaused`/`elapsedMs`; `page.tsx` freezes the elapsed clock via `elapsedMs`, adds a full-screen "Paused" overlay (blocks scoring/drawing, autofocus Resume); `TopBar` gets a Pause/Resume quick-action. Pause persists in `GameSession` so a break survives reload; `startNewGame`/`newMatch` reset it.
- Dashes: replaced all em/en dashes with `-` across source + docs (255 occurrences, 38 files).
- Links: `docs/index.md` converted to explicit `target="_blank"` HTML anchors; new-tab script kept on the docs pages. (README on github.com can't be forced - GitHub sanitizes `target`/scripts; only the Pages site + the Vercel app obey it.)

**Verification:** tsc clean, build green (14 routes).

## 2026-06-15 15:45 - Close audit tickets T8/T9/T10

**Summary:** Completed the three follow-up tickets opened by the frontend audit.

**Changes:**
- T8 - tap targets ≥44px: TopBar Undo/Reset/lock/edit, and enlarged card favorite/skip hit areas.
- T9 - match length is now configurable: `GameConfig.bestOf` (1/3/5) + "Match length" chips in `SettingsSheet`; `matchWinner` derives the target via new `gamesToWinMatch(config)` (back-compat `?? 3`).
- T10 - `AppMenu` import success/error now show a glass in-app toast (`role="status"`, auto-dismiss) instead of native `alert()`.

**Verification:** tsc clean, build green (14 routes).

## 2026-06-15 15:38 - Frontend gap audit fixes + best-of-3 match screen

**Summary:** Ran a 3-agent frontend audit, then applied four fix batches (accessibility, reduced-motion correctness, design-system consistency, custom typography) plus a new best-of-3 match-complete screen. tsc clean, build green, fonts load.

**Changes:**
- `globals.css` - global `:focus-visible` ring; `--text-muted` contrast bumped (dark `#5c5c63`→`#7e7e87`, light `#a6a6ae`→`#6f6f78`); reduced-motion now kills infinite loops (mesh/float/glow/ring); `.font-display` utility; body font → `var(--font-body)`.
- `layout.tsx` - removed zoom lock (`maximumScale`/`userScalable`, WCAG 1.4.4); added `next/font` **Bricolage Grotesque** (display) + **Hanken Grotesk** (body) as CSS vars.
- `HistoryPanel.tsx` (shared `Sheet`) - `role="dialog"`, `aria-modal`, `aria-label`, Escape-to-close, focus trap + focus-return; fixes 5 panels at once.
- `SettingsSheet.tsx` - refactored onto the shared `Sheet` (was a divergent shell: no glass/X, `z-40`, `vh`); toggles `role="switch"`/`aria-checked`, chips `aria-pressed`.
- `TopBar.tsx`, `CardDisplay.tsx`, `ScoreKeeper.tsx`, `AppMenu.tsx` - aria-labels on icon-only buttons, `aria-expanded`/menu semantics, score-button labels + serving announcement; reduced-motion card-flip timing; display font on scores/card title.
- `WinCelebration.tsx` - confetti skipped under reduced-motion; dialog semantics + autofocus; **match-complete variant**.
- `FeedbackPanel.tsx` - wrapped in `<form>`, email validation, softened false-success copy.
- `FavoritesPanel.tsx` - emoji ☆ → lucide `Star`.
- `manifest.json` - theme/background color `#030712`→`#0e0e11` (match app); added `id`/`scope`/`lang`/`dir`.
- `lib/game.ts` - `GAMES_TO_WIN_MATCH`, `seriesTally`, `matchWinner`, `newMatch`; `page.tsx` wires the match-over screen + 0-cards-flash fix + resume-card press feedback.

**Decisions:** Applied frontend-design craft *within* the existing emerald/glass system rather than a clashing redesign. Chose Bricolage Grotesque + Hanken Grotesk over the overused Inter/Space Grotesk. Best-of-3 is fixed (no new setting) - additive, never surprises single-game players (only fires at 2 games won). Left the dead auth stubs and `logo-mark.svg` orphan untracked (deletion needs explicit OK).

**Follow-ups:**
- [ ] In-game pause (ticket T3) - design approved, not yet built.
- [ ] Feedback → Google Form (T1) may supersede the mailto flow.
- [ ] Optional: make best-of-N a Settings option; tap-target sizes on a few quick-actions still <44px.

## 2026-06-10 - Rename Vercel project + URL to match the brand

**Summary:** Renamed the Vercel project `pickleball-shuffle` → `pickleball-card-games` so the live URL matches the new name.

- Renamed the project (Vercel API), added `pb-card-deck.vercel.app`, and removed the old `pickleball-shuffle.vercel.app` domain.
- New canonical URL: **https://pb-card-deck.vercel.app** (HTTP 200); old URL now 404s.
- Updated the live link in `README.md`, `app/README.md`, `app/CLAUDE.md`, and synced `app/.vercel/project.json` (projectId unchanged, so CLI/Git deploys are unaffected).

**Unchanged:** the GitHub repo path (`SathishKumarAI/pb-card-deck`) and all localStorage keys - renaming those would break links/data for no benefit.

## 2026-06-09 18:35 - CI gate, project consolidation, legacy cleanup

**Summary:** Consolidated to a single Vercel project, added a CI workflow, and removed the legacy prototypes that caused the deploy mis-detection.

**Vercel:** relinked the CLI to the `pickleball-shuffle` project and **deleted the redundant `app` project** - one project, one URL (https://pickleball-shuffle.vercel.app), one deploy log.

**CI:** added `.github/workflows/ci.yml` - lint + `tsc --noEmit` + build on push/PR to `main` (Node 24, npm cache). First run: **success**.
- Fixed `react-hooks/static-components` properly via a stable `CategoryIcon` component (was deriving an icon component during render in `CardDisplay`).
- Downgraded `react-hooks/set-state-in-effect` to a warning - loading localStorage into state inside mount/open effects is the SSR-safe pattern (reading during render → hydration mismatch).

**Cleanup:** `git rm`'d `backend/` (FastAPI) and `frontend/` (Vite stub) - unused, and the reason Vercel auto-detected the framework as `fastapi`.

**Verification:** CI success · Vercel deploy READY · live HTTP 200 · GitHub commit status green.

**Note:** CI currently *reports* but does not *block* - Vercel auto-deploys `main` on push. To make it a true gate, enable branch protection on `main` (require the CI check) and work via PRs.

## 2026-06-09 18:16 - Fix failing GitHub→Vercel deploys + meaningful URL

**Summary:** GitHub-triggered Vercel deploys were failing on every push. Root-caused and fixed via project settings; also switched the canonical URL to a meaningful one.

**Root cause:** There are two Vercel projects for this repo. CLI deploys target an `app` project (succeed). The **GitHub-connected `pickleball-shuffle` project** had `rootDirectory: None` (built from the repo root) and framework auto-detected as **`fastapi`** (because of the legacy root `backend/main.py`). So every push tried to build a FastAPI app from the root → **ERROR**.

**Fix (via Vercel API, non-destructive):**
- `PATCH /v9/projects/pickleball-shuffle` → `rootDirectory: "app"`, `framework: "nextjs"`.
- This makes git pushes build the Next.js app in `app/` and deploy successfully.

**Meaningful URL:** the fixed project serves at **https://pickleball-shuffle.vercel.app** (replaces the `app-delta-ten-94` alias). Updated the live link in `README.md`, `app/README.md`, `app/CLAUDE.md`.

**How to avoid in future:** when the app lives in a subdirectory, set the Vercel project's **Root Directory** to that subdir and pin the **Framework Preset** (don't let a sibling `backend/` mislead auto-detection). Ideally keep **one** Vercel project per repo.

**Verification:** pushed to `main` to trigger a build; confirmed the deployment reaches READY and the live URL serves 200 + 200 cards, and the GitHub commit status is green.

## 2026-06-09 17:52 - Icon-overlap fix, readable menu, reset button, skip/favorites, docs

**Summary:** Fixed an icon-overlap bug and several smaller issues surfaced during testing, added a discoverable score Reset and a Favorites view, made skip auto-advance, and documented all findings.

**Fixes (full list in `docs/BUG-LOG.md`):**
- **Icon overlap** - global `svg.lucide { flex-shrink: 0 }`; TopBar `shrink-0`/`min-w-0`/`flex-wrap` guards; card category pill `truncate`. Root cause + prevention rules in `docs/UI-LAYOUT-NOTES.md`.
- **Menu (☰)** - moved to the far right; dropdown switched from translucent `glass` to a solid `var(--bg-card)` surface with `var(--text)` labels (was unreadable in both themes).
- **Card too big** - responsive height `50dvh`→`38dvh`, capped 22rem; back glyph 72→56px.
- **Score reset** - added a TopBar **Reset** quick-action with inline confirm (was buried in Settings).

**Features:**
- **Skip** now auto-advances to the next card (still filters future draws).
- **Favorites** are now persistent (`pb-favorites`) with a **Favorite cards** panel in the menu; included in export/import.

**Files:** `app/globals.css`, `components/TopBar.tsx`, `components/AppMenu.tsx`, `components/CardDisplay.tsx`, `components/FavoritesPanel.tsx` (new), `lib/client-api.ts`, `app/page.tsx`.

**Docs added:** `docs/UI-LAYOUT-NOTES.md` (icon/layout rules), `docs/BUG-LOG.md` (all findings + fixes).

**Clarification (not a bug):** scoring is independent of the card flip - tap a team tile to score; with side-out scoring on, only the serving team scores on tap.

**Verification:** `npm run build` clean.

## 2026-06-09 17:15 - Fix: resumed game lost the current card

**Summary:** Fixed a bug where going Back then resuming (or refreshing mid-game) dropped the visible card and recent-draws list. Also fixed custom-deck resume.

**Root causes:**
1. `currentCard` / recent history were component state only - `resumeGame` reset them to empty, never using the saved `drawnCardIds`.
2. `CardDisplay` always mounted with `flipped=false`, so a restored card showed the back face.
3. Custom games stored mode as `"chaos"` and dropped the custom cards on resume → wrong pool, card not found.

**Changes:**
- `app/page.tsx` - `resumeGame` reconstructs current card + last-3 history from `drawnCardIds` against the game's own pool; restores `customCards`/`customName`; resume banner shows the custom deck name.
- `components/CardDisplay.tsx` - `flipped` initializes to `!!card` so a resumed card shows its face.
- `lib/game.ts` - `GameSession` gains optional `customName`/`customCards` so custom decks survive save/resume.

**Verification:** `npm run build` clean; redeployed to https://app-delta-ten-94.vercel.app (HTTP 200).

## 2026-06-09 16:59 - Resume, feedback, mobile hardening, Vercel deploy + docs

**Summary:** Added resume-last-game and an in-app feedback flow, hardened the app for iOS/Android/browser use, calmed the palette to reduce eye strain, deployed to Vercel production, and rewrote the docs with the live link + a deep architecture explanation.

**Live:** https://app-delta-ten-94.vercel.app (HTTP 200, 200 cards verified)

**Changes:**
- `app/page.tsx` - Resume banner on landing (Back now keeps the game instead of clearing); finished matches saved to local history; landing restructured into header + scrollable `<main>` (no overlap on short screens); dynamic `theme-color` meta tracking dark/light; feedback panel wired into both menus.
- `components/FeedbackPanel.tsx` (new) - star rating + message → `mailto` (local backup in `pb-feedback`).
- `components/AppMenu.tsx` - added "Send feedback".
- `components/CardDisplay.tsx` - responsive card via `clamp()`/`dvh` so it fits any phone.
- `components/TopBar.tsx`, `HistoryPanel.tsx` - safe-area insets; sheets use `dvh`.
- `app/globals.css` - softened dark/light palettes (no pure black/white), calmer/slower motion, reduced glow; `100dvh` body, 16px form inputs (no iOS zoom), `touch-action: manipulation`, `overflow-x: hidden`, safe-area helper classes, `hover`-gated lifts.
- `app/layout.tsx` - `theme-color` updated to new bg.
- Docs: `README.md` rewritten (live link, local-first rationale, architecture deep-dive: data flow, scoring engine, localStorage schema, animation, SW strategy, mobile hardening); `CLAUDE.md` updated; this WORKLOG entry.

**Decisions:**
- **Resume UX:** Back no longer discards the match - it returns to the landing with a one-tap Resume banner; only End Match / explicit discard clears. Auto-resume on refresh replaced by explicit choice.
- **Feedback delivery:** local-first app has no backend, so feedback uses `mailto` (+ local copy). Swap to Formspree/serverless later if volume warrants.
- **Eye strain:** moved off pure `#0a0a0b`/`#fafafa`, slowed mesh drift (26s), replaced infinite hard glow with a soft shadow pulse.

**Follow-ups:**
- [ ] Run the dead-file cleanup `rm` (see CLAUDE.md list).
- [ ] Optional: set `NEXT_PUBLIC_FEEDBACK_EMAIL` in Vercel env to override the feedback recipient.

## 2026-06-09 16:45 - Local-first decks/history, lucide icons, SaaS pivot+revert

**Summary:** Explored turning the app into a SaaS (auth + DB), then deliberately reverted to **local-first, no login** after deciding cross-device sync wasn't needed. Added custom decks + match history + export/import in localStorage, replaced all emoji with lucide-react icons, and trimmed in-game history to the last 3 draws.

**Decisions (and why):**
- **No login.** The core loop is local + ephemeral; custom decks & history work fine in localStorage. Login only buys cross-device sync/sharing, which there's no concrete need for yet. Auth would add friction, a DB dependency, cost, and a two-path codebase for little gain. Supabase code can be reintroduced later if a sync/sharing need appears.
- Iterated through SQLite+custom-auth → Supabase Auth → local-first. Each pivot was the user's call; final state is local-first.
- **lucide-react** for icons (consistent, non-emoji) - `MODE_ICONS`/`CATEGORY_ICONS` maps in `components/icons.tsx`.

**Changes:**
- `lib/client-api.ts` - now a localStorage store: custom decks, match history (cap 200), export/import, `deckToCards`.
- `components/AppMenu.tsx` (new) - menu: Match history, Custom decks, Export/Import backup.
- `components/icons.tsx` (new) - lucide icon maps for modes + categories.
- `components/HistoryPanel.tsx`, `DecksPanel.tsx` - read/write the local store (decks CRUD, match list + clear).
- `app/page.tsx` - lucide icons, AppMenu, history/decks panels, custom-deck play, saves finished matches to local history, history shows last 3.
- `TopBar`, `CardDisplay`, `ScoreKeeper`, `WinCelebration`, `CardHistory`, `PlayerNames` - emoji → lucide icons; theme-var styling.
- `package.json` - added `lucide-react`; removed `better-sqlite3`/`@supabase/*`.

**Dead code (neutralized to keep build green; `rm` is deny-listed - delete manually):**
- `app/api/` (auth/games/settings/decks), `app/login`, `app/signup`
- `lib/db.ts`, `lib/auth.ts`, `lib/supabase/`, `components/AuthForm.tsx`, `components/UserMenu.tsx`
- Pre-existing orphans: `components/GameSettings.tsx`, `components/DeckModeSelector.tsx`
- Unused `AUTH_SECRET` line in `.env.local`

**Verification:** `npm run build` clean (13 routes); dev server serves `/` and `/cards.json` at HTTP 200.

**Follow-ups:**
- [ ] Run the cleanup `rm` for the dead files listed above.
- [ ] Manual QA: create a custom deck → play it; finish a match → check history; export/import a backup.

## 2026-06-09 16:16 - Interactive & stylish UI pass

**Summary:** Reworked the web UI to feel alive - animated mesh backdrop, true 3D card flips, spring micro-interactions, and a richer win celebration - while keeping the existing dark/light theming.

**Changes:**
- `app/globals.css` - added mesh-gradient backdrop (`.mesh-bg`), a keyframe library (`floatY`, `fadeUp`, `popIn`, `scoreBump`, `pulseGlow`, `shimmer`, `confettiFall`, `ringPulse`) exposed as `anim-*` utilities, 3D-flip primitives, `.glass` glassmorphism, `.shine` sweep, `.pressable` spring affordance, staggered-entrance helper, custom scrollbar, and a `prefers-reduced-motion` guard.
- `app/page.tsx` - landing page: floating glowing logo, accent title, glass mode tiles that stagger in with hover emoji scale/rotate + sliding arrow; mesh backdrop on both landing and game screens; confirm dialog pops in.
- `components/CardDisplay.tsx` - replaced fake scale-swap with a real perspective flip; pulsing-glow back face, shine sweep on reveal, "Draw Again ↻" label.
- `components/ScoreKeeper.tsx` - score tiles bump on change, serving team gets a pulsing ring, gradient fills with colored drop shadows.
- `components/WinCelebration.tsx` - proper falling confetti (dots + ribbons) replacing the bounce, glass pop-in modal, themed buttons.
- `components/TopBar.tsx` - sticky glass bar, pill mode toggle with rotating chevron, animated dropdown with selected-state glow.
- `components/CardHistory.tsx` - staggered entry animation.

**Decisions:** Drove most of the styling/motion through CSS utility classes (theme-var aware) rather than a motion library, to avoid new deps and keep the static-site build. Added a reduced-motion guard so animations degrade gracefully. Verified with `npm run build` (clean) and a running dev server (HTTP 200).

**Follow-ups:**
- [ ] Visually QA on a real phone (haptics, 3D flip, confetti perf).
- [ ] Consider applying the same glass/pressable styling to `SettingsSheet`, `GameSettings`, and `PlayerNames` for full consistency.

## 2026-06-15 15:10 - New logo, security audit, prod deploy

**Summary:** Replaced the "PB" text tile with a real brand mark (tilted playing card overlapping a holed pickleball on the emerald gradient), ran a security audit on the untracked auth experiment (clean), and shipped the logo to production. Opened a tickets list for the remaining requests.

**Changes:**
- `app/icon.svg` (new) - full-tile master mark; Next App Router serves it as the SVG favicon.
- `public/icons/app-icon.svg` (new) - same mark for the landing `<img>`.
- `app/page.tsx` - landing hero swaps the gradient `PB` span for `<img src="/icons/app-icon.svg">` (keeps rounded-3xl + float + glow).
- `favicon.ico`, `public/icons/{icon-192,icon-512,apple-touch-icon}.png` - regenerated from the SVG via `rsvg-convert`; `favicon.ico` rebuilt as a 64×64 PNG-in-ICO with stdlib `struct` (no Pillow/ImageMagick available).
- `docs/TICKETS.md` (new) - pending task list; linked from `docs/index.md`.

**Security audit (untracked auth experiment):** Every file is an inert stub - auth/api routes return HTTP 410, `lib/*` are `export {}`, `AuthForm`/`UserMenu` render `null`, login/signup `redirect("/")`. `.vercel/.env.production.local` is gitignored and uncommitted. **No vulnerabilities; no patch needed** - only the dead-code deletion (T4).

**Verification:** `npm run build` clean (14 routes, `/icon.svg` emitted); local `:3000` serves the new logo + favicon at HTTP 200; production verified - `app-icon.svg`/`icon.svg` return 200 and the landing references the new mark. Deployed `03fa40c` → prod READY (https://pb-card-deck.vercel.app).

**Follow-ups:** see [`TICKETS.md`](TICKETS.md) - feedback→Form (T1), how-to-use button (T2), in-game pause (T3), dead-stub deletion (T4).

<!-- new-tab-links: open every link in a new tab on the GitHub Pages site -->
<script>document.querySelectorAll('a[href]').forEach(function(a){a.target="_blank";a.rel="noopener noreferrer";});</script>
