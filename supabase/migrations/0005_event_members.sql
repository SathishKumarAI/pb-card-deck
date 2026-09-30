-- 0005_event_members.sql — phase 2c: invited co-organisers who can enter results.
--
-- This migration contains a BEHAVIOUR CHANGE, not just new objects, so read the first
-- section before changing anything here.
--
-- In 0001, `tournament_matches.user_id` meant "the account that owns this row", and a
-- trigger forced it to auth.uid() on insert AND update. That was correct while only an
-- owner could write. It becomes wrong the moment a helper writes: their update would
-- silently re-stamp the row as theirs, and the row would leave the owner's event.
--
-- So `user_id` now means "the account that owns the EVENT", derived from the parent,
-- and a new `updated_by` column records who wrote last. `event_log.actor_user_id`
-- keeps meaning the ACTOR - that is the entire point of an audit trail.
--
-- Invites reuse `event_shares` (2b) with role = 'writer', rather than a second table
-- with the same shape and a second set of policies to get wrong. Two rules keep the
-- roles from blurring:
--   * `get_shared_event` accepts ONLY a 'viewer' token - a writer invite is not a view
--     link, and grants nothing until an account accepts it;
--   * accepting creates a row in `event_members`, so revoking an invite stops new
--     people joining while removing a member stops that person writing. Different
--     actions, both needed.

-- ───────────────── ownership means the EVENT's owner ─────────────────

alter table public.tournament_matches
  add column if not exists updated_by uuid references auth.users (id) on delete set null;

create or replace function public.force_event_owner()
returns trigger
language plpgsql
security definer   -- reads the parent event, which the writer may not select directly
set search_path = ''
as $$
declare
  owner uuid;
begin
  select t.user_id into owner from public.tournaments t where t.id = new.tournament_id;
  if owner is null then
    raise exception 'force_event_owner: no such event';
  end if;
  -- The row belongs to the event, whoever is holding the pen.
  new.user_id := owner;
  new.updated_by := auth.uid();
  return new;
end;
$$;

comment on function public.force_event_owner() is
  'tournament_matches.user_id is the EVENT owner, not the writer. A helper''s update must not move the row out of the owner''s event (phase 2c).';

drop trigger if exists tournament_matches_owner on public.tournament_matches;
create trigger tournament_matches_owner
  before insert or update on public.tournament_matches
  for each row execute function public.force_event_owner();

-- ─────────────────────────── membership ───────────────────────────

create table if not exists public.event_members (
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  role          text not null default 'writer' check (role in ('writer')),
  invited_by    uuid not null references auth.users (id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (tournament_id, user_id)
);

create index if not exists event_members_user_idx on public.event_members (user_id);

alter table public.event_members enable row level security;
revoke all on public.event_members from anon;
-- Read only, and only about yourself or your own events. Joining and removing go
-- through functions, so a client cannot grant itself write access to an event.
grant select on public.event_members to authenticated;
revoke insert, update, delete, truncate on public.event_members from authenticated;

create policy "event members: see your own membership" on public.event_members
  for select to authenticated using (user_id = (select auth.uid()));
create policy "event members: owner sees their event's members" on public.event_members
  for select to authenticated using (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and t.user_id = (select auth.uid())
    )
  );

-- A writer invite is a share row with a different role.
alter table public.event_shares drop constraint if exists event_shares_role_check;
alter table public.event_shares
  add constraint event_shares_role_check check (role in ('viewer', 'writer'));

-- ─────────────── policies: a writer may score, not reshape ───────────────
-- Helper kept SECURITY DEFINER because a writer cannot select the parent event row
-- through their own privileges until the tournaments policy below is in place, and a
-- policy that depends on a policy is how recursion bugs start.

create or replace function public.is_event_writer(p_tournament_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.event_members m
    where m.tournament_id = p_tournament_id
      and m.user_id = auth.uid()
      and m.role = 'writer'
  );
$$;

revoke all on function public.is_event_writer(uuid) from public, anon;
grant execute on function public.is_event_writer(uuid) to authenticated;

-- The event header: a writer READS it (they need the draw to render) and never writes
-- it. Rename, format, re-draw and delete stay with the owner.
drop policy if exists "tournaments: read own" on public.tournaments;
create policy "tournaments: read own or invited" on public.tournaments
  for select to authenticated using (
    user_id = (select auth.uid()) or public.is_event_writer(id)
  );

-- Matches: a writer may read and UPDATE (enter or correct a score). Insert and delete
-- stay with the owner - the schedule is the engine's output, and a helper who could
-- insert rows could invent matches no format produced.
drop policy if exists "event matches: read own" on public.tournament_matches;
create policy "event matches: read own or invited" on public.tournament_matches
  for select to authenticated using (
    user_id = (select auth.uid()) or public.is_event_writer(tournament_id)
  );

drop policy if exists "event matches: update own" on public.tournament_matches;
create policy "event matches: update own or invited" on public.tournament_matches
  for update to authenticated using (
    user_id = (select auth.uid()) or public.is_event_writer(tournament_id)
  ) with check (
    user_id = (select auth.uid()) or public.is_event_writer(tournament_id)
  );

-- The audit trail: a writer appends AS THEMSELVES, which is the point. Still no update
-- and no delete policy, for anyone.
drop policy if exists "event log: read own events" on public.event_log;
create policy "event log: read own or invited events" on public.event_log
  for select to authenticated using (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and t.user_id = (select auth.uid())
    )
    or public.is_event_writer(tournament_id)
  );

drop policy if exists "event log: append to own events" on public.event_log;
create policy "event log: append to own or invited events" on public.event_log
  for insert to authenticated with check (
    actor_user_id = (select auth.uid())
    and (
      exists (
        select 1 from public.tournaments t
        where t.id = tournament_id and t.user_id = (select auth.uid())
      )
      or public.is_event_writer(tournament_id)
    )
  );

-- ──────────────────── create an invite ────────────────────
-- `create_event_share` gains a role, defaulting to 'viewer' so every 2b caller is
-- untouched.

create or replace function public.create_event_share(
  p_tournament_id uuid,
  p_token text,
  p_expires_at timestamptz default null,
  p_label text default null,
  p_role text default 'viewer'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid      uuid := auth.uid();
  share_id uuid := gen_random_uuid();
begin
  if uid is null then
    raise exception 'create_event_share: not authenticated';
  end if;
  if p_token is null or char_length(p_token) < 32 then
    raise exception 'create_event_share: token too short';
  end if;
  if p_role not in ('viewer', 'writer') then
    raise exception 'create_event_share: unknown role';
  end if;
  -- Only the OWNER invites. A writer cannot bring more writers.
  if not exists (
    select 1 from public.tournaments t
    where t.id = p_tournament_id and t.user_id = uid and t.deleted_at is null
  ) then
    raise exception 'create_event_share: not your event';
  end if;

  insert into public.event_shares (id, tournament_id, owner_user_id, token_hash, expires_at, label, role)
  values (
    share_id, p_tournament_id, uid,
    encode(sha256(convert_to(p_token, 'UTF8')), 'hex'),
    p_expires_at, left(p_label, 60), p_role
  );
  return share_id;
end;
$$;

-- ──────────────────── accept an invite ────────────────────
-- Idempotent, and deliberately accepts the same link from several people: a desk
-- running eight courts sends one link to three helpers, and access is still per
-- account and removable per account.

create or replace function public.accept_event_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid   uuid := auth.uid();
  s     public.event_shares;
begin
  if uid is null then
    raise exception 'accept_event_invite: not authenticated';
  end if;
  if p_token is null or char_length(p_token) < 32 then
    raise exception 'accept_event_invite: invalid invite';
  end if;

  select * into s
    from public.event_shares
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
     and role = 'writer'            -- a VIEWER link is not an invite
     and revoked_at is null
     and (expires_at is null or expires_at > now())
   limit 1;

  -- Unknown, expired, revoked and "that is a view link" are one message on purpose.
  if s.id is null then
    raise exception 'accept_event_invite: invalid invite';
  end if;

  -- The owner accepting their own invite is a no-op, not an error.
  if exists (select 1 from public.tournaments t where t.id = s.tournament_id and t.user_id = uid) then
    return s.tournament_id;
  end if;

  insert into public.event_members (tournament_id, user_id, role, invited_by)
  values (s.tournament_id, uid, 'writer', s.owner_user_id)
  on conflict (tournament_id, user_id) do nothing;

  return s.tournament_id;
end;
$$;

-- ──────────────────── manage the helpers ────────────────────

create or replace function public.list_event_members(p_tournament_id uuid)
returns table (user_id uuid, display_name text, email text, role text, created_at timestamptz)
language sql
security definer
set search_path = ''
as $$
  select m.user_id,
         p.display_name,
         -- The owner invited these people, so the owner may see who accepted. Nobody
         -- else can call this: the join below is the authorisation.
         u.email::text,
         m.role,
         m.created_at
    from public.event_members m
    join public.tournaments t on t.id = m.tournament_id
    left join public.profiles p on p.id = m.user_id
    left join auth.users u on u.id = m.user_id
   where m.tournament_id = p_tournament_id
     and t.user_id = auth.uid()
   order by m.created_at;
$$;

create or replace function public.remove_event_member(p_tournament_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'remove_event_member: not authenticated';
  end if;
  -- Owner only, and silent about events that are not theirs.
  delete from public.event_members m
   where m.tournament_id = p_tournament_id
     and m.user_id = p_user_id
     and exists (
       select 1 from public.tournaments t
       where t.id = p_tournament_id and t.user_id = uid
     );
  -- Their log lines stay. Removing a person is not rewriting history.
end;
$$;

create or replace function public.leave_event(p_tournament_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'leave_event: not authenticated';
  end if;
  delete from public.event_members
   where tournament_id = p_tournament_id and user_id = auth.uid();
end;
$$;

-- ─────────── a viewer link stays a viewer link ───────────
-- Re-created so a 'writer' invite cannot be used as a read link. Identical to 0004
-- except for the role condition.

create or replace function public.get_shared_event(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  hashed text;
  ev     public.tournaments;
  result jsonb;
begin
  if p_token is null or char_length(p_token) < 32 then
    return null;
  end if;
  hashed := encode(sha256(convert_to(p_token, 'UTF8')), 'hex');

  select t.* into ev
    from public.event_shares s
    join public.tournaments t on t.id = s.tournament_id
   where s.token_hash = hashed
     and s.role = 'viewer'          -- phase 2c: an invite is not a view link
     and s.revoked_at is null
     and (s.expires_at is null or s.expires_at > now())
     and t.deleted_at is null
   limit 1;

  if ev.id is null then
    return null;
  end if;

  select jsonb_build_object(
    'event', jsonb_build_object(
      'name',   ev.name,
      'format', ev.format,
      'entryMode', ev.entry_mode,
      'teamSize', ev.team_size,
      'status', ev.status,
      'championTeamId', ev.champion_team_id,
      'createdAt', ev.created_at,
      'config', ev.config,
      'players', ev.players,
      'teams', ev.teams
    ),
    'matches', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.client_id,
        'bracket', m.bracket,
        'round', m.round,
        'pool', m.pool,
        'a', m.slot_a,
        'b', m.slot_b,
        'teamA', m.team_a,
        'teamB', m.team_b,
        'scoreA', m.score_a,
        'scoreB', m.score_b,
        'winner', m.winner,
        'court', m.court,
        'label', m.label,
        'completedAt', m.completed_at
      ) order by m.round, m.court nulls last)
      from public.tournament_matches m
      where m.tournament_id = ev.id and m.deleted_at is null
    ), '[]'::jsonb),
    'log', coalesce((
      select jsonb_agg(jsonb_build_object(
        'at', l.at,
        'kind', l.kind,
        'text', l.text
      ) order by l.at)
      from public.event_log l
      where l.tournament_id = ev.id
    ), '[]'::jsonb),
    'fetchedAt', to_jsonb(now())
  ) into result;

  return result;
end;
$$;

-- ───────────────────────────── grants ─────────────────────────────

revoke all on function public.create_event_share(uuid, text, timestamptz, text, text) from public, anon;
revoke all on function public.accept_event_invite(text) from public, anon;
revoke all on function public.list_event_members(uuid) from public, anon;
revoke all on function public.remove_event_member(uuid, uuid) from public, anon;
revoke all on function public.leave_event(uuid) from public, anon;

grant execute on function public.create_event_share(uuid, text, timestamptz, text, text) to authenticated;
grant execute on function public.accept_event_invite(text) to authenticated;
grant execute on function public.list_event_members(uuid) to authenticated;
grant execute on function public.remove_event_member(uuid, uuid) to authenticated;
grant execute on function public.leave_event(uuid) to authenticated;

-- 0004's four-argument version is superseded; dropping it keeps one code path.
drop function if exists public.create_event_share(uuid, text, timestamptz, text);
