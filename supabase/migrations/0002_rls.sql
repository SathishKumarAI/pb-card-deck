-- 0002_rls.sql — row-level security. This file IS the security model.
--
-- The app talks to Postgres directly from the browser with a publishable key, so
-- there is no server-side code deciding who may read what. These policies are
-- the only thing standing between two accounts, which is why:
--
--   * every table has RLS enabled, and a policy per operation (no blanket
--     `for all` - an explicit insert `with check` is what stops a client writing
--     a row it does not own);
--   * policies are scoped `to authenticated`, and `anon` is revoked outright,
--     so the unauthenticated key cannot read a single row;
--   * event_log gets SELECT and INSERT and nothing else. No update policy and no
--     delete policy means an audit trail cannot be rewritten, by anyone, ever;
--   * child rows are checked through their parent as well as their own owner
--     column, so a forged tournament_id cannot attach a match to another
--     person's event.
--
-- Verified by supabase/tests/rls.test.mjs, which tries each of these as a second
-- user and must fail. Run it after any change here.

-- ───────────────────────── revoke the anon surface ─────────────────────────
-- Supabase grants `anon` and `authenticated` table privileges by default. RLS
-- would filter anon to nothing anyway; revoking is the second lock, and it makes
-- the intent explicit to the next reader.

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;

-- ...and grant `authenticated` exactly what the app needs, explicitly. Supabase's
-- default privileges would grant this anyway; spelling it out means the migration
-- is self-contained, works on a plain Postgres (see tests/local-shim.sql), and
-- does not silently depend on a dashboard default that could change.

grant select, insert, update, delete on
  public.decks, public.matches, public.tournaments,
  public.tournament_matches, public.prefs
  to authenticated;

-- Append-only, at the privilege level as well as in policy. The revoke is not
-- redundant: Supabase's default privileges (and the local shim's) grant ALL on
-- new tables to `authenticated`, so without this line an UPDATE reaches the
-- policy layer and is stopped only by the absence of a policy. Verified - the
-- local suite reported "0 refused at privilege level" until this was added.
grant select, insert on public.event_log to authenticated;
revoke update, delete, truncate on public.event_log from authenticated;

-- A profile is created by the signup trigger, so no insert here.
grant select, update on public.profiles to authenticated;

alter table public.profiles            enable row level security;
alter table public.decks               enable row level security;
alter table public.matches             enable row level security;
alter table public.tournaments         enable row level security;
alter table public.tournament_matches  enable row level security;
alter table public.event_log           enable row level security;
alter table public.prefs               enable row level security;

-- NOT using `force row level security`, deliberately, and this is worth knowing:
-- FORCE subjects the table OWNER to the policies too. Every policy here is scoped
-- `to authenticated`, and the owner is `postgres` - so with FORCE on, the signup
-- trigger could not insert a profile and `delete_my_account()` would delete zero
-- rows while reporting success. Owner bypass is exactly what those two functions
-- need; the accounts are separated from each other by the policies below, which
-- apply to every client role.

-- ──────────────────────────────── profiles ────────────────────────────────
-- No insert policy: a profile is created by the signup trigger, not by a client.

create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ───────────────────────────────── decks ─────────────────────────────────

create policy "decks: read own" on public.decks
  for select to authenticated using (user_id = (select auth.uid()));
create policy "decks: insert own" on public.decks
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "decks: update own" on public.decks
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "decks: delete own" on public.decks
  for delete to authenticated using (user_id = (select auth.uid()));

-- ──────────────────────────────── matches ────────────────────────────────

create policy "matches: read own" on public.matches
  for select to authenticated using (user_id = (select auth.uid()));
create policy "matches: insert own" on public.matches
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "matches: update own" on public.matches
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "matches: delete own" on public.matches
  for delete to authenticated using (user_id = (select auth.uid()));

-- ────────────────────────────── tournaments ──────────────────────────────

create policy "tournaments: read own" on public.tournaments
  for select to authenticated using (user_id = (select auth.uid()));
create policy "tournaments: insert own" on public.tournaments
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "tournaments: update own" on public.tournaments
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "tournaments: delete own" on public.tournaments
  for delete to authenticated using (user_id = (select auth.uid()));

-- ────────────────────────── tournament_matches ───────────────────────────
-- Own the row AND own its event. The parent check is what a forged
-- tournament_id runs into.

create policy "event matches: read own" on public.tournament_matches
  for select to authenticated using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and t.user_id = (select auth.uid())
    )
  );
create policy "event matches: insert own" on public.tournament_matches
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and t.user_id = (select auth.uid())
    )
  );
create policy "event matches: update own" on public.tournament_matches
  for update to authenticated using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and t.user_id = (select auth.uid())
    )
  ) with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and t.user_id = (select auth.uid())
    )
  );
create policy "event matches: delete own" on public.tournament_matches
  for delete to authenticated using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and t.user_id = (select auth.uid())
    )
  );

-- ──────────────────────────────── event_log ──────────────────────────────
-- SELECT and INSERT only. The absence of an update and a delete policy is the
-- feature: with RLS enabled, no policy means no permission. Correcting a score
-- appends a new line saying what it used to be; it never edits a line.

create policy "event log: read own events" on public.event_log
  for select to authenticated using (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and t.user_id = (select auth.uid())
    )
  );
create policy "event log: append to own events" on public.event_log
  for insert to authenticated with check (
    actor_user_id = (select auth.uid())
    and exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and t.user_id = (select auth.uid())
    )
  );

-- ────────────────────────────────── prefs ────────────────────────────────

create policy "prefs: read own" on public.prefs
  for select to authenticated using (user_id = (select auth.uid()));
create policy "prefs: insert own" on public.prefs
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "prefs: update own" on public.prefs
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "prefs: delete own" on public.prefs
  for delete to authenticated using (user_id = (select auth.uid()));
