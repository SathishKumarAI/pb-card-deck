-- 0003_functions.sql — the only privileged code in the system.
--
-- Two functions, both `security definer`, because both must do something the
-- caller's own permissions cannot: create a profile row for a brand-new user,
-- and delete an account including its `auth.users` record.
--
-- Every definer function here follows the same three rules, and they are not
-- optional:
--   1. `set search_path = ''` and every identifier schema-qualified. Without it,
--      a caller who can create objects can shadow a table name and have the
--      function operate on theirs instead - the classic Postgres definer
--      escalation.
--   2. Execute is revoked from `public` and `anon`, then granted only to
--      `authenticated`. A definer function granted to public is an open door.
--   3. It derives the account from `auth.uid()` and never takes a user id as an
--      argument. A function that deletes "the user you name" is a function that
--      deletes anybody.

-- ─────────────────── a profile row for a new signup ───────────────────
-- Runs as the trigger owner so it can insert before the user has a session.
-- Copies a display name only if the identity provider gave one - no email is
-- copied, because auth.users already holds it and one copy is one place to
-- delete.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(left(coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      ''
    ), 60), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── delete my account ─────────────────────────
-- The whole promise of "delete my account" in one transaction. Deleting the
-- auth.users row would cascade all of these anyway; they are listed explicitly
-- so that the intent is reviewable and so a future table added WITHOUT an
-- `on delete cascade` still gets removed here.
--
-- No arguments on purpose - see rule 3 above.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'delete_my_account: no authenticated user';
  end if;

  delete from public.event_log          where actor_user_id = uid;
  delete from public.tournament_matches where user_id = uid;
  delete from public.tournaments        where user_id = uid;
  delete from public.matches            where user_id = uid;
  delete from public.decks              where user_id = uid;
  delete from public.prefs              where user_id = uid;
  delete from public.profiles           where id = uid;

  -- Last, because it cascades: after this the session's JWT refers to nobody.
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.handle_new_user() from public, anon;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

comment on function public.delete_my_account() is
  'Deletes the CALLING user and every row they own. Takes no arguments by design.';
