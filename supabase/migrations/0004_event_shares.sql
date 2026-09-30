-- 0004_event_shares.sql — phase 2b: a read-only link to one event.
--
-- The problem this file solves: a spectator is NOT authenticated, so `auth.uid()` is
-- null and no row-level policy can say "this anonymous person may read exactly this
-- event". Granting `anon` table access would grant it to the whole internet.
--
-- So the viewer never touches a table. ONE definer function is the entire anonymous
-- surface, authorised by a token rather than by a session:
--
--     get_shared_event(p_token) -> jsonb
--
-- Everything else here exists to make that safe:
--   * only the SHA-256 HASH of a token is stored, so a database dump yields no
--     working links. Hashing happens in here, not in the browser, because
--     `crypto.subtle` is unavailable in a plain-http LAN dev session;
--   * the payload is hand-picked columns, never rows, so account ids and device ids
--     cannot ride along;
--   * a bad, expired and revoked token are indistinguishable - all three return
--     null, so probing learns nothing about which events exist;
--   * nobody can UPDATE a share row. Revoking goes through a function, so the
--     history of links is append-then-revoke rather than editable.
--
-- Verified by the new cases in supabase/tests/rls.local.sql and rls.test.mjs.

create table if not exists public.event_shares (
  id            uuid primary key,
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  -- sha256 hex of the token. The token itself is never stored, anywhere.
  token_hash    text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  -- One legal value today. Phase 2c adds 'writer' as a check change, not a new table.
  role          text not null default 'viewer' check (role in ('viewer')),
  label         text check (char_length(label) <= 60),
  expires_at    timestamptz,
  revoked_at    timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists event_shares_lookup_idx on public.event_shares (token_hash);
create index if not exists event_shares_event_idx on public.event_shares (tournament_id, created_at);

alter table public.event_shares enable row level security;

revoke all on public.event_shares from anon;
-- The owner can see and delete their own links. No INSERT policy and no UPDATE
-- policy on purpose: creating and revoking go through the functions below, which is
-- what stops a client forging a hash or rewriting a share's history.
grant select, delete on public.event_shares to authenticated;
-- ...and the same at the privilege level, not only in policy. Supabase's default
-- privileges grant ALL on a new table to `authenticated`, so without this an UPDATE
-- reaches the policy layer and is stopped only by the absence of a policy. The local
-- suite reported "0 refused at privilege level" until these two lines existed - the
-- same gap event_log had in 0002.
revoke insert, update, truncate on public.event_shares from authenticated;

create policy "event shares: owner reads own" on public.event_shares
  for select to authenticated using (owner_user_id = (select auth.uid()));
create policy "event shares: owner deletes own" on public.event_shares
  for delete to authenticated using (owner_user_id = (select auth.uid()));

-- ───────────────────────── create a link ─────────────────────────

create or replace function public.create_event_share(
  p_tournament_id uuid,
  p_token text,
  p_expires_at timestamptz default null,
  p_label text default null
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
  -- A short token is a guessable token. 43 base64url characters is 256 bits.
  if p_token is null or char_length(p_token) < 32 then
    raise exception 'create_event_share: token too short';
  end if;
  -- Ownership is checked here, not trusted from the caller.
  if not exists (
    select 1 from public.tournaments t
    where t.id = p_tournament_id and t.user_id = uid and t.deleted_at is null
  ) then
    raise exception 'create_event_share: not your event';
  end if;

  insert into public.event_shares (id, tournament_id, owner_user_id, token_hash, expires_at, label)
  values (
    share_id,
    p_tournament_id,
    uid,
    encode(sha256(convert_to(p_token, 'UTF8')), 'hex'),
    p_expires_at,
    left(p_label, 60)
  );
  return share_id;
end;
$$;

-- ───────────────────────── revoke a link ─────────────────────────

create or replace function public.revoke_event_share(p_share_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'revoke_event_share: not authenticated';
  end if;
  -- Idempotent, and silent about shares that are not yours: a caller learns nothing
  -- about links they do not own.
  update public.event_shares
     set revoked_at = now()
   where id = p_share_id and owner_user_id = uid and revoked_at is null;
end;
$$;

-- ───────────────────── list an event's links ─────────────────────
-- Never returns the hash. There is nothing a client can do with it except attack it
-- offline.

create or replace function public.list_event_shares(p_tournament_id uuid)
returns table (
  id uuid,
  created_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  label text
)
language sql
security definer
set search_path = ''
as $$
  select s.id, s.created_at, s.expires_at, s.revoked_at, s.label
    from public.event_shares s
    join public.tournaments t on t.id = s.tournament_id
   where s.tournament_id = p_tournament_id
     and t.user_id = auth.uid()
     and s.owner_user_id = auth.uid()
   order by s.created_at desc;
$$;

-- ─────────────────── the whole anonymous surface ───────────────────
-- Hand-picked columns, never rows. Adding a column to a table must never widen what
-- a spectator can see, which is why this is a list and not `select *`.

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
     and s.revoked_at is null
     and (s.expires_at is null or s.expires_at > now())
     and t.deleted_at is null
   limit 1;

  -- Not found, revoked and expired all land here, indistinguishably.
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

revoke all on function public.create_event_share(uuid, text, timestamptz, text) from public, anon;
revoke all on function public.revoke_event_share(uuid) from public, anon;
revoke all on function public.list_event_shares(uuid) from public, anon;
revoke all on function public.get_shared_event(text) from public;

grant execute on function public.create_event_share(uuid, text, timestamptz, text) to authenticated;
grant execute on function public.revoke_event_share(uuid) to authenticated;
grant execute on function public.list_event_shares(uuid) to authenticated;
-- The one thing an unauthenticated visitor may call, authorised by the token alone.
grant execute on function public.get_shared_event(text) to anon, authenticated;

comment on function public.get_shared_event(text) is
  'The entire anonymous read surface. Hand-picked columns only: no user ids, no client ids, no emails. Bad, expired and revoked tokens are indistinguishable.';
