# Phase 2 — optional accounts and cloud sync (Supabase)

_Design spec. Written 2026-09-29. Status: approved for build (phase 2a)._

Decided with the owner, in this order:

| Decision | Chosen |
|---|---|
| What the cloud is for | Shared events — eventually others can see and enter results |
| Who the other people are | **Public read link** for viewers · **signed-in, invited writers** |
| Source of truth | **Local first**, background sync, works offline |
| Sign-in methods | **Google** + **email magic link** (no passwords) |
| Existing local data on first sign-in | **Ask once, default to uploading it** |
| Wiring | **Client-only `supabase-js` + RLS + `SECURITY DEFINER` RPC**, plus an explicit adversarial security review gate |

## Why this exists, and what stays true

The app is local-first and that is a product decision, not a gap. Phase 2 does
not reverse it; it adds a **second mode beside it**:

| Mode | Storage | What it needs |
|---|---|---|
| **No account** (default, unchanged) | `localStorage` only | Nothing. No network, no Supabase code downloaded |
| **Signed in** | `localStorage` **and** Supabase, local authoritative for play | An account, and a configured Supabase project |

Two invariants that everything below serves:

1. **A tap never waits on the network.** Scoring writes locally and returns. Sync
   is a background drain.
2. **With no Supabase env vars, the build is today's app.** `supabase-js` sits
   behind a dynamic `import()`, so an anonymous player downloads none of it, and
   a fork with no project configured works exactly as it does now.

## Phasing

Shared events are three subsystems. One spec cannot hold them, and the security
work compounds, so they ship in order. **This spec covers 2a in full** and fixes
the schema so 2b and 2c are additive.

| Phase | Scope | Ships when |
|---|---|---|
| **2a** | Accounts (Google + magic link), own-data sync, RLS, adversarial tests, setup runbook | This spec |
| **2b** | A revocable **public read link** to one event | Its own spec, on top of 2a |
| **2c** | **Invited signed-in writers** entering results into someone else's event | Its own spec, after 2b |

Non-goals for 2a, stated so they are not smuggled in: no sharing, no invites, no
realtime subscriptions, no passwords, no rating system, no server runtime, no
service-role key anywhere near the client.

---

## 1. Architecture

The app keeps calling **one** module. `lib/client-api.ts` already owns every
write to the device, so it stays the only door components touch and no screen
learns about auth or sync.

```
components/*  ──▶  lib/client-api.ts  (local write, instant, same API as today)
                          │
                          └─▶ lib/sync/outbox.ts      append mutation, return
                                        │
                                  lib/sync/engine.ts  push, then pull by cursor
                                        │             last-write-wins
                                  lib/supabase/client.ts   dynamic import, PKCE
                                        │
                                   Supabase (RLS enforces ownership)
```

| File | Owns | Does not |
|---|---|---|
| `lib/supabase/client.ts` | Creating the client **only** if the env vars exist; PKCE; the singleton | Know any table |
| `lib/auth.ts` | Session state, Google sign-in, magic link, sign out, delete account | Touch game data |
| `lib/sync/outbox.ts` | An append-only queue `{id, entity, op, row, updated_at, tries}`, coalescing, cap | Network |
| `lib/sync/engine.ts` | Push the outbox, pull by cursor, resolve conflicts, expose `synced / pending / offline / error` | Decide UI policy |
| `lib/sync/rows.ts` | The single mapping local shape ↔ table row, both directions | Anything else |
| `components/AccountPanel.tsx` | Sign-in / account sheet, the first-sign-in "bring your data?" dialog, sync state | Sync mechanics |

**`client-api.ts` splits first.** It is ~320 lines and gains enqueue calls, past
the repo's 300-line target. Its internals move to
`lib/store/{decks,matches,tournaments,prefs,keys}.ts`; `client-api.ts` becomes a
façade re-exporting the same names, so **no component changes and its existing
tests are the proof**. That is stage 1, landed on its own.

`lib/sync/README.md` carries the `change → file` table, per the repo rule.

---

## 2. Data model

Client-generated UUIDs (`crypto.randomUUID`) so a row created offline has a
stable identity and every push is an idempotent upsert on the primary key.
Existing local ids (`mfj3k-ab12cd`) are not UUIDs, so they are carried in
`client_id`, unique per user, and used only to map during the first upload.

Every table: `user_id uuid not null references auth.users on delete cascade`,
`updated_at timestamptz not null default now()`, `deleted_at timestamptz`.

| Table | Holds | Notes |
|---|---|---|
| `profiles` | `id` (= auth user), `display_name`, timestamps | Created by trigger on signup. No email copy — `auth.users` already has it |
| `decks` | name, description, `cards jsonb` | |
| `matches` | mode, team names, scores, winner, `results jsonb`, duration, official fields, `played_at` | |
| `tournaments` | name, format, entry mode, team size, `config/players/teams jsonb`, status, champion | Event header only |
| `tournament_matches` | one row per match: round, bracket, pool, `slot_a/slot_b jsonb`, resolved teams, scores, winner, court, label, `completed_at` | **Per row, not a blob** — 2c needs two writers on one event without clobbering |
| `event_log` | `tournament_id`, `actor_user_id`, kind, `match_id`, text, `at` | **Append-only.** No update or delete policy at all |
| `prefs` | `user_id` primary key, `data jsonb` | Favorites, stats, settings. Never collaborative, so one small row is right |

Reserved for 2b/2c, not created now: `event_shares` (token **hash**, role,
`expires_at`, `revoked_at`) and `event_members` (`tournament_id`, `user_id`,
role, `invited_by`). Naming them here is what stops a schema rewrite later.

**Soft delete, not hard.** A delete must propagate to other devices, so it sets
`deleted_at`; the local store purges the row once the tombstone is applied.

**Two triggers per table**, belt and braces with RLS:

- `before update` → `updated_at = now()`. The server owns the clock; a device
  with a wrong clock can never win a conflict by lying.
- `before insert` → `user_id = auth.uid()`. A client cannot write a row it does
  not own even if it tries.

---

## 3. Security

This is the part the owner asked not to skimp on. Controls, and what each one
stops:

| Control | Stops |
|---|---|
| **RLS enabled on every table**, `using (user_id = auth.uid())` and the same as `with check` on write | Reading or writing another account's rows |
| `tournament_matches` / `event_log` policies check ownership **through the parent** `tournaments` row *and* the denormalised `user_id` | A forged `tournament_id` attaching rows to someone else's event |
| `revoke all` from `anon`; grants to `authenticated` only | The unauthenticated key reading anything |
| `event_log` has **no** update or delete policy | Rewriting an audit trail |
| `SECURITY DEFINER` functions with `set search_path = ''` and schema-qualified names | Search-path hijacking, the classic Postgres definer bug |
| Only three privileged RPCs exist: `delete_my_account()`, and (2b/2c) `mint_share_token()`, `accept_invite()` | A broad definer surface |
| **Publishable key only** in the client (`sb_publishable_*`; the legacy `anon` key still works and is deprecated by end of 2026). The secret / `service_role` key is never in the app, never in CI, never in `.env` under `app/` | Total compromise from one leaked file |
| Redirect URL **allowlist** in Supabase, exact origins only | Token exfiltration via an attacker-controlled redirect |
| PKCE flow, set explicitly | Authorization-code interception |
| Short access-token lifetime (1h) with refresh rotation; `signOut({scope})` on account deletion | A stolen token staying useful |
| Email confirmation required; Supabase's built-in email rate limits; OTP expiry ≤ 15 min | Magic-link spam and stale links |
| CSP `connect-src` **narrowed from `https:` to the Supabase host** | A compromised dependency phoning home |
| No `innerHTML`, no `dangerouslySetInnerHTML`, no `eval` — verified zero today | The XSS that would steal a `localStorage` session |
| `.env*` ignored at the **repo root** as well as in `app/` (root `.gitignore` has no rule today), and the dead `AUTH_SECRET` deleted from `app/.env.local` | Committing a credential |
| gitleaks already in CI | The same, on someone else's machine |

**The accepted risk, stated plainly.** The session lives in `localStorage`, so an
XSS bug is a session theft. httpOnly cookies would need every call proxied
through a server, which is incompatible with a background sync queue that has to
work with no signal. The compensating controls are the row above: no HTML sinks,
a tightened CSP, four runtime dependencies, and secret scanning.

**Third-party PII.** An organiser types other people's names. So: the privacy
page must say what is stored and where, `delete_my_account()` must remove every
row, and the first-sign-in dialog must name what it is about to upload.

### The security gate

Nothing ships until an adversarial suite passes, written as tests that **try to
break in** and must fail to:

1. User B selects / updates / deletes A's rows — every table, expect 0 rows or a
   policy error.
2. The `anon` role selects from every table — expect refused.
3. A client inserts a row with `user_id` set to another user — expect the trigger
   to overwrite it, or the check to reject.
4. `event_log` update and delete — expect refused.
5. `tournament_matches` insert against a `tournament_id` the caller does not own
   — expect refused.
6. `delete_my_account()` as A — expect A's rows gone, B's untouched.

**These need a real Postgres**, so they run against a local Supabase or a staging
project, not in CI-without-credentials. When credentials are absent the suite
**fails as skipped-with-reason**, never silently green — a skipped security test
that reads as a pass is exactly the trap this repo has been burned by.

---

## 4. Sync mechanics

**Push.** Every local write appends to the outbox and returns. The engine drains
when online and signed in: coalesce by `(entity, id)` keeping the latest, upsert
in batches, drop the entry on success. Failures back off exponentially
(1s → 2s → 4s … capped at 5 min) and after 8 tries move to a visible error state
with the entity named. The outbox is capped at 2,000 entries; coalescing means
that is thousands of real edits.

**Pull.** Per-entity cursor = the highest server `updated_at` already applied.
`select * where updated_at > cursor order by updated_at limit 500`, loop until
short page. Cursors are stored locally beside the data.

**Conflicts: last-write-wins on the server's `updated_at`, and on an exact tie
the server row wins.** Deterministic, and no device's clock can win by drifting.
This is the right trade for one person on several devices; 2c will need
per-match ownership rules, which is why matches are rows and not a blob.

**Idempotency.** Upsert on the primary key, so a retry after a half-finished push
is safe.

**First sign-in.** A dialog naming real counts from the store — "bring your 40
matches, 3 decks and 2 events into this account?" — defaulting to yes. Yes maps
every local row to a UUID, records `client_id`, and enqueues it. No leaves local
data untouched and starts the account empty. Nothing is deleted on either path.

**Sign-out.** The synced copy is cleared from the device (it is in the cloud), and
the pre-account local data that was never uploaded is kept. On a shared tablet
that means signing out leaves nothing of the account behind.

**Visible state, always.** A chip shows `synced` / `pending n` / `offline` /
`error`. The app never claims a thing is safe in the cloud when it is sitting in
an outbox.

### Failure modes and what happens

| Failure | Behaviour |
|---|---|
| No signal | Play continues; outbox grows; chip says `offline` |
| Token expired mid-sync | Refresh once, retry; if refresh fails, chip says signed out and local play continues |
| Supabase free project paused (7 days idle) | Push fails, retries back off, chip says `error` with the reason |
| `localStorage` full | The local write is what fails, and it already surfaces a toast today; the outbox trims oldest coalesced entries first |
| Clock skew on the device | Cannot affect conflicts — only server `updated_at` is compared |
| Account deleted on another device | Next call 401s → treated as signed out, local data kept |
| Partial upload | Idempotent upsert on retry |

---

## 5. Testing

| Layer | Runs in CI now | What it catches |
|---|---|---|
| Outbox unit | yes | Coalescing, cap, backoff schedule, dead-letter after 8 tries |
| Engine unit (fake transport) | yes | LWW including the exact tie, cursor advance, tombstone apply, idempotent retry |
| `rows.ts` round-trip | yes | A field silently dropped between local shape and row |
| Auth module (fake client) | yes | State machine: signed out → link sent → signed in → deleted |
| "No env = no Supabase" | yes | The dynamic import never loads for an anonymous player |
| First-sign-in dialog | yes | The counts shown are the counts uploaded |
| **Adversarial RLS** | **no — needs a database** | Everything in the security gate; skipped-with-reason without credentials |

Existing 164 tests must stay green throughout; the store split is verified by
them rather than by new tests.

---

## 6. Stages, each its own branch and PR

| Stage | Contents | Independently useful because |
|---|---|---|
| **1** | `lib/store/*` split, `client-api.ts` façade | A readable store, no behaviour change, 164 tests prove it |
| **2** | `supabase/migrations/*.sql`: schema, RLS, triggers, `delete_my_account()`, the adversarial suite, `docs/SUPABASE-SETUP.md` | The backend exists and its security is reviewable on its own, before any app code can touch it |
| **3** | `lib/supabase/client.ts`, `lib/auth.ts`, `AccountPanel`, CSP narrowing, env hygiene | Sign in, sign out, delete the account — usable without sync |
| **4** | `lib/sync/*`, enqueue calls, status chip, first-sign-in dialog | The payoff: data appears on a second device |
| **5** | README / CONTRIBUTING / privacy page / CHANGELOG / STATUS, and the two-mode story | The docs stop contradicting the product |

Docs for each stage land **in that stage's PR**, and `docs/WORKLOG.md` gets a
dated entry per stage.

## 7. What the owner has to do once

Building cannot create the project or hold its keys. One-time, documented in
`docs/SUPABASE-SETUP.md`:

1. Create a Supabase project; note the region (it is where the data lives, and
   the privacy page must say so).
2. Run the migration in `supabase/migrations/`.
3. Enable the **Google** provider (client id + secret) and **email magic link**;
   set the redirect allowlist to the production origin and `http://localhost:3000`.
4. Put `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   (legacy `..._ANON_KEY` also accepted) in `app/.env.local` and in Vercel.
5. Run the adversarial suite against the project and paste the output into the
   stage-2 PR.

Until step 4 is done the app builds and runs exactly as it does today, which is
what makes every stage mergeable before the project exists.
