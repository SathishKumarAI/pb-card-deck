# Supabase setup — the one-time owner runbook

Everything the optional account needs, once. Until step 5 is done the app builds
and runs exactly as it does today: with no env vars, the Supabase client is never
imported and the app is the local-first one.

> **Who needs this:** whoever owns the deployment. A contributor does **not** need
> a Supabase project to work on this repo — see [Working without a project](#working-without-a-project).

---

## 1. Create the project

1. <https://supabase.com/dashboard> → **New project**.
2. **Pick the region deliberately** — it is where other people's names and match
   results physically live, and the privacy page has to state it. Choose the one
   closest to the players.
3. Save the database password somewhere real. It is not used by the app, but it
   is how you recover the project.

## 2. Run the migrations

Order matters: tables, then the security that protects them, then the privileged
functions.

| File | What it does |
|---|---|
| `supabase/migrations/0001_init.sql` | The seven tables, the `updated_at` and ownership triggers |
| `supabase/migrations/0002_rls.sql` | Enables RLS, one policy per operation, revokes `anon` |
| `supabase/migrations/0003_functions.sql` | `handle_new_user()`, `delete_my_account()` |
| `supabase/migrations/0004_event_shares.sql` | Phase 2b: the `event_shares` table and the four share functions, including `get_shared_event` - the only thing an unauthenticated visitor may call |
| `supabase/migrations/0005_event_members.sql` | Phase 2c: invited writers. **Contains a behaviour change** - `tournament_matches.user_id` comes to mean the EVENT's owner rather than whoever wrote the row, plus an `updated_by` column. Run it after 0004 |

Either paste each into the dashboard's **SQL editor** in that order, or, with the
[Supabase CLI](https://supabase.com/docs/guides/local-development):

```bash
supabase link --project-ref <your-ref>
supabase db push
```

**Check it took:** in the dashboard, Table editor → every table shows the
"RLS enabled" badge. A table without it is readable by anyone with the
publishable key, which is in the shipped JavaScript.

## 3. Configure auth

**Providers** (Authentication → Providers):

| Provider | Setup |
|---|---|
| **Email** | Enable. Turn **Confirm email** on. Magic link is the flow the app uses — there are no passwords in this app, so nothing to reset, leak or rate-limit beyond the link itself. |
| **Google** | Enable, then paste a client id + secret from a Google Cloud OAuth consent screen. Authorised redirect URI is the one Supabase shows you (`https://<ref>.supabase.co/auth/v1/callback`). |

> **Yahoo:** not a built-in Supabase provider. A Yahoo mailbox signs in fine with
> the **magic link** — Yahoo just is not the identity provider. If a Yahoo button
> is genuinely wanted later it needs a custom OIDC provider (Supabase allows
> three per project) plus an app registration with Yahoo.

**URL configuration** (Authentication → URL Configuration):

- **Site URL:** `https://pb-card-deck.vercel.app`
- **Redirect allowlist**, exact entries only — a wildcard here is how tokens get
  stolen:
  - `https://pb-card-deck.vercel.app/**`
  - `http://localhost:3000/**`

**Sessions** (Authentication → Sessions / JWT):

- Access token (JWT) expiry: **3600** seconds.
- Refresh token rotation: **on**.
- Email OTP / magic link expiry: **≤ 900** seconds.

## 4. Find the right keys

| Key | Looks like | Where it may appear |
|---|---|---|
| **Publishable** | `sb_publishable_…` | The browser. This is the one the app ships. Safe by design: it carries no privileges of its own, RLS still decides everything |
| **Secret** | `sb_secret_…` | **Your machine only**, and only to run the RLS suite. Never in the app, never in Vercel, never in CI, never in a commit |

The older `anon` / `service_role` keys still work and map to the same two roles;
Supabase is retiring them by the end of 2026, so prefer the new names.

## 5. Give the app the env vars

`app/.env.local` (git-ignored). The repo ships this file with the two placeholders in
it, so filling it in is a two-line edit:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

**Nothing else belongs in that file.** The Google client secret goes in the Supabase
dashboard, and the secret key goes in `.env.rls.local` (step 6) - never in a file the
app loads.

Then the same two in Vercel → Project → Settings → Environment Variables, for
Production and Preview. Redeploy with `./deploy-vercel.sh` — and verify the
**domain**, not the deployment URL.

`NEXT_PUBLIC_` means these are in the shipped bundle. That is correct for both of
them and correct for nothing else: **any variable holding a secret must not carry
that prefix.**

## 6. Run the security gate

This is not optional, and it is the step that proves the rest.

Fill in **`.env.rls.local`** at the repo root - git-ignored, and deliberately separate
from `app/.env.local` so nothing the app loads can reach a secret key. The repo ships
it with placeholders:

```bash
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
SUPABASE_RLS_TEST=i-understand-this-creates-and-deletes-users
```

Then, from `app/`:

```bash
npm run test:rls
```

Passing the values in the environment instead still works and takes precedence. A
left-in `<paste ...>` placeholder counts as **unset**, so the suite tells you what is
missing rather than failing against a nonsense URL.

It creates two throwaway users, has the second one try to read, edit, delete,
forge and rewrite the first one's data, then deletes them. **Point it at a
development project** — it creates and deletes users.

What it asserts, in one sentence each:

1. A second account reads **nothing** of yours, in any of the seven tables.
2. The anonymous key reads nothing at all.
3. A second account cannot update or delete your rows, or attach a match to your
   event.
4. A row claiming somebody else's `user_id` is stored as the caller's, and an
   owner cannot hand a row to another account.
5. The audit trail cannot be edited or deleted — **not even by its owner**.
6. A client cannot set `updated_at`, so no device can win a sync conflict by
   lying about the time.
7. `delete_my_account()` removes exactly one account, leaves the other intact,
   and cannot be called anonymously.

**Missing credentials make it exit non-zero with the reason.** It never reports a
skip as a pass — a green security test that did not run is worse than no test.

Paste the output into the PR that changes anything under `supabase/`.

## Verifying the policies without a project

The policies can be proved **offline, with no Supabase account**, on a throwaway
Postgres in Docker:

```bash
bash scripts/verify-rls-local.sh      # from the repo root
```

It starts `postgres:17-alpine` on a spare port under its own container name (it
never touches a Postgres you already run), installs a minimal `auth` schema shim,
applies every migration in order, runs the same seven groups of attacks as SQL,
and removes the container whatever happens. Exit code is the verdict.

Expected output ends:

```
  pass  B reads nothing of A's, in six tables
  pass  anon is refused outright
  pass  B cannot update, delete or attach to A's data
  pass  a row claiming another user_id is stored as the caller's
  pass  an owner cannot hand a row to another account
  pass  audit lines cannot be edited or deleted (2 refused at privilege level)
  pass  updated_at comes from the server, whatever the client sends
  pass  A is gone entirely, B is untouched
  pass  anon cannot call delete_my_account
Security gate passed: no cross-account read, write, forge, transfer or rewrite.
  pass  a live token returns one event, with no account identifiers
  pass  revoked, expired, garbage, short and null all return null
  pass  anon is refused on event_shares, tournaments and matches
  pass  a token returns its own event only
  pass  a stranger cannot mint, see or list another owner's links
  pass  a stranger's revoke attempt changes nothing
  pass  share rows cannot be updated (2 refused at privilege level)
  pass  a revoked link stays revoked
  pass  deleting the event kills its links
  pass  share rows cascade with the event
Share gate passed: a token opens one event read-only, and nothing else.
  pass  viewer, revoked and garbage links are all refused as invites
  pass  invites are not view links, and view links still work
  pass  accepting twice leaves exactly one membership
  pass  a writer scores; the row still belongs to the event's owner, and updated_by names the writer
  pass  a writer's log line names the writer, whatever they claim
  pass  a writer cannot rename, delete, invent a match, delete a match or edit the log (2 refused at privilege level)
  pass  a writer sees and touches one event, not the owner's others
  pass  a writer cannot invite or list members
  pass  remove_event_member is owner-only
  pass  an outsider sees nothing and writes nothing
  pass  the owner lists members by email and can remove one
  pass  a removed helper writes nothing and sees nothing
  pass  their entered score and their audit lines survive their removal
Writer gate passed: a helper scores matches in one event and can do nothing else.
```

**Both suites have been mutation-tested**, because a security test that cannot fail
is decoration:

- disabling RLS on one table makes the account suite exit non-zero with
  `SECURITY GATE FAILED: B can read decks`;
- removing the `revoked_at is null` check from `get_shared_event` makes the share
  suite exit non-zero with `SECURITY GATE FAILED: a REVOKED token still works`;
- reverting the 2c trigger to the old `user_id := auth.uid()` makes the writer suite
  exit non-zero with `SECURITY GATE FAILED: a writer's update re-stamped the row
  owner` - the exact regression that migration exists to prevent.

What this does **not** cover, and why `npm run test:rls` against a real project is
still required: the HTTP surface (PostgREST parsing, headers, the publishable key),
real sign-in and JWT issuing, and the redirect allowlist.

## Working without a project

Nothing above is needed to develop the app:

```bash
cd app && npm install && npm run dev
```

With no `NEXT_PUBLIC_SUPABASE_*` vars the account UI is absent, the Supabase
client is never imported, and every test except `test:rls` runs. `npm run test:rls`
will (correctly) exit non-zero, saying it needs a project.

## If something is wrong

| Symptom | Cause worth checking first |
|---|---|
| Sign-in redirects to the site root and nothing happens | The redirect URL is not on the allowlist, exactly |
| `permission denied for table …` as a signed-in user | A migration ran out of order — 0002 revokes `anon` and grants nothing new; re-run 0001 first |
| Everything reads as empty although rows exist | RLS is on and the policies did not apply — check the row's `user_id` is the signed-in user |
| Sync errors after a quiet week | A free project **pauses after 7 days idle**. Resume it in the dashboard; the app surfaces this as a sync error with the reason rather than retrying forever |
| The RLS suite cannot create users | The secret key is wrong, or signups are disabled for the project |
