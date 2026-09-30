# STATUS — PB Card Deck

_Last written 2026-09-29. Read this when you come back._

## Where things stand

**Phases 2a and 2b are built and merged**: an **optional** Supabase account beside the
local-first default, and a **read-only live link** an organiser can hand to
spectators. Seven PRs, #16 through #23, each with its own docs and a dated
`WORKLOG.md` entry.

| | |
|---|---|
| Live | https://pb-card-deck.vercel.app |
| Tests | **279 in 24 files** (engine, scoring audit, two bug hunts, tournaments, streaks, contrast, a11y, board rendering, store erase, auth, account sheet, sync: outbox / engine / rows / events / claim) |
| Gates | `npm test` · `npm run lint` · `npx tsc --noEmit` · `npm run contrast` · `npm run build` |
| Security gate | `bash scripts/verify-rls-local.sh` — two suites (accounts + share links), 19 groups, Docker, no Supabase account needed |
| Default theme | **light**; dark and auto are one tap away and persist |

## The one thing that needs YOU

**Nothing about the account works until a Supabase project exists**, and only the
owner can create one. Until then the app is byte-for-byte the local-first one: with
no `NEXT_PUBLIC_SUPABASE_*` env vars the cloud code is never downloaded and the
account menu item is absent. That is a supported, tested state, not a broken one.

Six steps, all in **[`docs/SUPABASE-SETUP.md`](docs/SUPABASE-SETUP.md)**:

1. Create the project (**choose the region deliberately** — the privacy page names it).
2. Run `supabase/migrations/0001` → `0002` → `0003` → `0004`, in order.
3. Enable **Google** and **email magic link**; set the redirect allowlist to the
   production origin and `http://localhost:3000` — exact entries, no wildcard.
4. Put `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in
   `app/.env.local` **and** in Vercel.
5. Run `npm run test:rls` against the project and keep the output.
6. Deploy with `./deploy-vercel.sh` and verify the **domain**, never the deployment
   URL.

The secret key belongs on your machine only, for step 5. Never in the app, never in
Vercel, never in CI.

## What the app does now

- **Cards + scorekeeper** — 1,729 twist cards, side-out or rally scoring, real
  doubles serve rotation, pause, undo, match lengths, TV score.
- **Track a match** — coach/umpire mode: timeouts, faults, a downloadable match
  sheet.
- **Tournaments** — five formats, a live bracket tree, editable scores with an audit
  log, exports in four formats, divisions including mixed pairing, and a demo event.
- **Optional account** — Google or an email link, sync for matches / decks / events /
  favourites / counters, a status chip that never lies, and one-operation account
  deletion.
- **A live link for spectators** — read-only, revocable, expiring in seven days by
  default; only a hash of it is stored, and it shows nothing but that one event.
- **Help** — a searchable manual, plus tap-to-define pickleball terms.
- **Sharing** — win / streak / champion cards as PNGs at Instagram and WhatsApp
  sizes.

## Next action

Phase 2a is done. Two things are queued and neither is started:

1. **The owner setup above.** Without it, phase 2a is inert in production.
2. **Phase 2c — invited signed-in writers.** The one still open. A writer needs to
   update an event they do not own, which means `tournament_matches.user_id` must mean
   "the event's owner" rather than "whoever wrote last" — today a trigger forces it to
   `auth.uid()`, so that trigger and the policies change together, with adversarial
   cases for "a writer cannot touch the header, another event, or the log's history".

Or pick from **The plan** in `README.md` — each row says why that idea is not there
yet.

## Traps that cost time here

1. **Never put a directory under `app/` in a `.gitignore`.** Tailwind v4 honours
   `.gitignore` for source detection, so `app/app/` silently stopped every class used
   only in `page.tsx` from being generated — no error, just a page missing half its
   layout. Restart the dev server after editing `.gitignore`; Tailwind caches the
   list.
2. **Turbopack can serve a stale `globals.css`.** When a rule "does nothing", fetch
   the stylesheet the page actually loaded and grep it before debugging the rule.
3. **`.app-col` beats `lg:max-w-*`** — both are single-class selectors and the custom
   class is defined after the utilities. Widen with `.app-col--wide` or
   `.app-col--event`.
4. **Measure, don't infer.** Every UI bug fixed here looked correct in the markup.
   `getComputedStyle`, a scripted scroll, and `npm run contrast` found them. The
   contrast script itself once had a bug that made both themes report identical
   numbers — check the tool as carefully as the thing it measures.
5. **Windows phantom file modes** are silenced with `core.fileMode=false` (already
   set locally).
6. **On Windows the checkout has no `node_modules/.bin`** until `npm install` runs
   inside `app/`.
7. **"Deployed" is not "live".** `main` does **not** auto-deploy to production — the
   Git integration only builds Previews. And a successful `vercel --prod` does not
   move `pb-card-deck.vercel.app`: that domain was once found pinned to a deployment
   **81 days old**. Use `./deploy-vercel.sh` and verify the DOMAIN.
8. **`force row level security` breaks the definer functions.** It subjects the table
   owner to the policies, and every policy is scoped `to authenticated` while the
   owner is `postgres` — so the signup trigger cannot insert a profile and
   `delete_my_account()` deletes **zero rows while reporting success**. The comment in
   `0002_rls.sql` sits at the line where someone would add it back.
9. **Supabase's default grants are wider than the policies.** `event_log` was
   append-only in policy but not in privilege, so an UPDATE reached the policy layer
   instead of being refused outright. Revoked explicitly; the suite reports
   `(2 refused at privilege level)`.
10. **A skipped security test must fail, not pass.** `npm run test:rls` exits
    non-zero when credentials are missing, and the whole suite is mutation-tested —
    disable RLS on one table and it says `SECURITY GATE FAILED: B can read decks`.
11. **A free Supabase project pauses after 7 days idle.** The app surfaces that as a
    sync error with the reason rather than retrying for ever.

## The rules the code now encodes

Recorded properly in `app/CLAUDE.md`; the short version:

- Surfaces are glass materials (`.mat-thin/regular/thick`), radius carries hierarchy,
  elevation is three tokens, `--accent-ink` for text on accent, `.tnum` for anything
  that counts.
- Light is the default palette on `:root`; dark overrides it. Colour is measured —
  `npm run contrast` fails below WCAG threshold.
- One scroll container per page; inner scrollers use `.scroll-area`; every dialog
  calls `useScrollLock`.
- Hover only inside `@media (hover: hover) and (pointer: fine)`.
- One primary action per screen; a confirmation renders where its button is.
- Every state transition goes on the undo stack, not just the ones that change a
  number. Serve rules follow the rulebook, including the single first service turn.
- **A storage key is a constant in `lib/store/keys.ts`**, and the erase path
  enumerates `USER_DATA_KEYS`. Hand-written lists are how three entities survived
  "delete all my data" for months.
- **Unconfigured is a first-class state.** Every cloud path starts with
  `isCloudConfigured()`, and `supabase-js` is behind a dynamic `import()` so an
  anonymous player downloads none of it (asserted by a test).
- **`lib/store/*` enqueues; components never do**, and `applyRemote*` never enqueues
  — that would push a pulled row straight back for ever.
- **The sync conflict rule is the queue, not a clock**: a row with a pending outbox
  entry wins, otherwise the server wins. Prefs are the exception and merge.
- **Signing out keeps this device's data.** It clears the queue, cursors and id map
  only. "Delete all data" is the explicit wipe.
