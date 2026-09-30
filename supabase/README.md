# `supabase/` — the optional cloud side

Nothing here runs unless the owner has created a project and set two env vars.
The app is local-first by default and works with this directory absent; see
[`../docs/SUPABASE-SETUP.md`](../docs/SUPABASE-SETUP.md) for the one-time setup and
[the design spec](../docs/superpowers/specs/2026-09-29-supabase-accounts-and-sync-design.md)
for why any of it exists.

## Change → file

| Change | File |
|---|---|
| A column, a table, a check constraint, an index | `migrations/0001_init.sql` |
| Who may read or write a table | `migrations/0002_rls.sql` |
| A privileged operation (definer function, RPC) | `migrations/0003_functions.sql` |
| What "try to break in" means | `tests/rls.test.mjs` |
| The owner's setup steps, keys, provider config | `../docs/SUPABASE-SETUP.md` |

Migrations are additive and numbered. A schema change is a new file
(`0004_…`), never an edit to one that has already run on the project.

## Rules that must survive every future change

- **RLS is the only thing between two accounts.** The browser talks to Postgres
  directly, so there is no server-side code to fall back on. A new table without
  `enable row level security` and a policy per operation is a public table.
- **A policy per operation, not `for all`.** An explicit `insert … with check` is
  what stops a client writing a row it does not own.
- **`event_log` has no update and no delete policy, on purpose.** With RLS on, no
  policy means no permission. Correcting a score appends a line saying what the
  score used to be; it never edits one. Adding an update policy here would quietly
  turn the audit trail into a rumour.
- **`security definer` functions carry `set search_path = ''`** and
  schema-qualify every name, are revoked from `public` and `anon`, and derive the
  account from `auth.uid()` rather than an argument. A definer function that
  deletes "the user you name" deletes anybody.
- **No `force row level security`.** It subjects the table owner to the policies
  too, and every policy here is scoped `to authenticated` — so with FORCE on, the
  signup trigger could not insert a profile and `delete_my_account()` would delete
  zero rows while reporting success. The comment in `0002_rls.sql` says so at the
  line where someone would add it.
- **The client never sets `updated_at` or `user_id`.** Triggers overwrite both, so
  a device cannot win a sync conflict by lying about the time, or create a row in
  someone else's name.
- **Change anything here and run the gate.** `npm run test:rls` from `app/`, output
  into the PR. It exits non-zero when it cannot run, so "it passed" always means
  it ran.
