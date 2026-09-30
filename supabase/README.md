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
| Share links: the table, or any of the four share functions | `migrations/0004_event_shares.sql` |
| Who may write to an event they do not own | `migrations/0005_event_members.sql` |
| What "the owner of a match row" means | `migrations/0005_event_members.sql` (`force_event_owner`) |
| What a SPECTATOR may see | `migrations/0004_event_shares.sql` (`get_shared_event`) |
| What "try to break in" means | `tests/rls.test.mjs` (accounts), `tests/shares.local.sql` (share links), `tests/writers.local.sql` (invited writers) |
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
- **A spectator never touches a table.** `get_shared_event` is the entire anonymous
  surface, and it returns **hand-picked columns, never rows** - so adding a column to a
  table can never widen what a link holder sees. Never grant `anon` a table.
- **A share token is stored only as a SHA-256 hash**, and a bad, expired or revoked
  token must stay indistinguishable: all three return null, so probing cannot discover
  which events exist.
- **`tournament_matches.user_id` is the EVENT's owner, never the writer.** A trigger
  derives it from the parent, and `updated_by` records who wrote last. Setting it to
  `auth.uid()` (as 0001 did, correctly, when only owners could write) makes a helper's
  score entry quietly move the row out of the owner's event - invisible, because the
  score looks right. `tests/writers.local.sql` fails if that returns.
- **A writer may UPDATE a match and APPEND to the log. Nothing else.** No insert or
  delete of matches (the schedule is the engine's output), no header change, no
  inviting. `event_log` stays append-only for everyone, owner included.
- **An invite is not a view link.** `get_shared_event` accepts only `role = 'viewer'`,
  and a `'writer'` token grants nothing until an account accepts it - which creates a
  membership row, so revoking the invite and removing a member are different actions.
- **Change anything here and run the gate.** `bash scripts/verify-rls-local.sh` runs
  both suites offline; `npm run test:rls` from `app/` covers the HTTP surface. Output
  into the PR. They exit non-zero when they cannot run, so "it passed" always means
  they ran.
