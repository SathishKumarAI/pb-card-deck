# Phase 2a implementation plan — accounts and own-data sync

_Written 2026-09-29. The design it implements:
[`../superpowers/specs/2026-09-29-supabase-accounts-and-sync-design.md`](../superpowers/specs/2026-09-29-supabase-accounts-and-sync-design.md)._

Five stages, each its own branch and PR, each with its docs and a dated
`WORKLOG.md` entry in the same commit. A stage is done only when its gates are
run and the output pasted into the PR.

Gates, every stage, from `app/`:
`npm run lint` · `npx tsc --noEmit` · `npm test` · `npm run contrast` · `npm run build`.

---

## Stage 1 — split the local store `refactor/store-split` — **DONE** (PR #17)

**Why first:** `client-api.ts` is ~320 lines and stage 4 adds an enqueue call to
every writer. Splitting before that keeps each file under the repo's 300-line
target and keeps stage 4's diff readable.

- [x] `lib/store/keys.ts` — every `localStorage` key, and the `read`/`write`/`uid` helpers
- [x] `lib/store/decks.ts` — decks CRUD, share-code encode/decode, `deckToCards`
- [x] `lib/store/matches.ts` — history, `addMatch`, `matchSheet`, CSV, `playerRecords`
- [x] `lib/store/tournaments.ts` — event CRUD
- [x] `lib/store/prefs.ts` — favorites, stats, export/import, `clearAllData`
- [x] `lib/client-api.ts` — façade, re-exports the same names, nothing else
- [x] `lib/store/README.md` — `change → file` table

**Proof:** the existing 164 tests pass untouched. No component edited — verified
with `git diff --stat` showing no `components/` changes.

## Stage 2 — the database `feat/supabase-schema` — **DONE** (this PR)

- [x] `supabase/migrations/0001_init.sql` — the seven tables, `updated_at` and
      `user_id` triggers, `profiles` row on signup
- [x] `supabase/migrations/0002_rls.sql` — enable RLS, per-table policies,
      `revoke all from anon`, grants to `authenticated`, no update/delete policy
      on `event_log`
- [x] `supabase/migrations/0003_functions.sql` — `delete_my_account()`,
      `SECURITY DEFINER`, `set search_path = ''`, schema-qualified
- [x] `supabase/tests/rls.test.mjs` — the six adversarial cases from the spec;
      **exits non-zero when credentials are absent**, with the reason, so it can
      never read as a silent pass
- [x] `docs/SUPABASE-SETUP.md` — the one-time owner runbook, including the
      redirect allowlist and which key is safe in the client
- [x] `npm run test:rls` script wired, documented as needing a project
- [x] **Added beyond the plan:** `scripts/verify-rls-local.sh` +
      `supabase/tests/{local-shim,rls.local}.sql` — the same attacks in SQL against
      a throwaway Postgres in Docker, so the policies are verifiable with no
      Supabase account at all. Mutation-tested: disabling RLS on one table makes
      it exit non-zero.

**Proof:** the suite run against a real project, output pasted into the PR. No
app code in this stage, so the app gates prove only that nothing regressed.

## Stage 3 — auth `feat/accounts` — **DONE** (this PR)

- [x] `lib/supabase/client.ts` — dynamic import, PKCE explicit, publishable key
      preferred with the legacy `anon` name accepted, `null` when unconfigured
- [x] `lib/auth.ts` — `useSession`, `signInWithGoogle`, `sendMagicLink`,
      `signOut`, `deleteAccount`; pure state machine, testable with a fake client
- [x] `components/AccountPanel.tsx` — sheet: signed-out (Google button, email
      field), signed-in (email, sync state, sign out, delete account with a typed
      confirmation)
- [x] Menu entry + the account state in `AppMenu`
- [x] `next.config.ts` — `connect-src` narrowed to the Supabase host
- [x] Root `.gitignore` — `.env*` rule; delete the dead `AUTH_SECRET` from
      `app/.env.local`
- [x] Tests: auth state machine, "no env means `supabase-js` is never imported",
      a11y of the new sheet

**Proof:** with no env vars the app is byte-for-byte today's behaviour (asserted
by a test); with env vars, sign in with Google and a magic link on a real project.

## Stage 4a — sync for decks, matches and prefs `feat/sync-engine` — **DONE** (this PR)

> **Split from the planned single stage 4, deliberately.** Events are stored locally
> as one JSON blob and in the schema as a header row + one row per match + an
> append-only log, so that mapping is larger than everything else in the stage put
> together. Shipping it in the same PR would have made the sync rules unreviewable.
> Stage 4b is events, on its own.

- [x] `lib/sync/outbox.ts` — append, coalesce by `(entity, id)`, cap 2,000,
      `tries`, backoff schedule, dead-letter at 8
- [x] `lib/sync/rows.ts` — local ⇄ row mapping, both directions, one place
- [x] `lib/sync/engine.ts` — push, pull by cursor, LWW on server `updated_at`
      with server winning an exact tie, tombstones, status
- [x] `lib/store/*` — enqueue after each successful local write
- [x] `components/SyncStatus.tsx` — `synced` / `pending n` / `offline` / `error`
- [x] First-sign-in dialog, counts read from the store, defaults to upload
- [x] Sign-out clears the synced copy, keeps never-uploaded local data
- [x] `lib/sync/README.md`
- [x] Tests: outbox, engine (incl. tie and retry idempotency), rows round-trip,
      dialog counts match what is enqueued

**Proof (code):** 47 sync tests against a fake transport, including the conflict
rule, tombstones, cursor monotonicity, prefs merging, dead-lettering and the
mid-sync write race. **Proof (real):** two browsers on one account is an owner step
once a project exists — it needs credentials this repo does not have.

## Stage 4b — events sync `feat/sync-events`

- [ ] Map one local `Tournament` blob → `tournaments` header + `tournament_matches`
      rows + `event_log` appends, and reassemble on pull
- [ ] Append-only log handling: never re-send a line, never expect to edit one
- [ ] Tests: a 12-team event round-trips with every result and correction intact

## Stage 5 — the docs catch up `docs/two-modes`

- [ ] `README.md` — two modes, what syncs, what does not, the security model,
      the accepted `localStorage`-session risk
- [ ] `CONTRIBUTING.md` — the ground rule becomes "local-first **default**, cloud
      optional"; how to run without a project
- [ ] `app/app/(info)/privacy/page.tsx` — what is stored, the region, third-party
      names an organiser types, deletion, no tracking
- [ ] `CHANGELOG.md`, `STATUS.md`, `docs/index.md`, `app/README.md`

**Proof:** every relative link resolved; gates green.

---

## Risks, and the decision if each bites

| Risk | Decision |
|---|---|
| Supabase free project pauses after 7 days idle | Surface it as a sync error with the reason; do not retry forever |
| The owner's project is not created before stage 3 is ready | Stages merge anyway — unconfigured is a supported state |
| RLS suite cannot run without a database | It exits non-zero rather than skipping green; stage 2 cannot be called done until its output is in the PR |
| Scope creep into sharing | 2b and 2c are separate specs; a share token appears in no stage here |
