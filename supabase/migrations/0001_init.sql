-- 0001_init.sql — phase 2a schema: the tables an optional account syncs.
--
-- Shapes mirror lib/store/* so lib/sync/rows.ts is a field-for-field mapping and
-- nothing has to be invented at sync time.
--
-- Three rules this file encodes:
--   1. Ids are client-generated UUIDs, so a row created offline has a stable
--      identity and every push is an idempotent upsert on the primary key. The
--      pre-account local id (time+random, not a UUID) is kept in `client_id`
--      and is unique per user, so the first upload can map without duplicating.
--   2. `updated_at` is set by a trigger, never by the client. A device with a
--      wrong clock must not be able to win a conflict by lying about the time.
--   3. `user_id` is forced to auth.uid() by a trigger on insert AND update, so a
--      client cannot create a row it does not own, or hand one to someone else.
--      Row-level security (0002) is the fence; these triggers are the belt.
--
-- Soft delete: a delete sets `deleted_at` so the tombstone can reach another
-- device. The local store purges the row once it applies one.

-- ─────────────────────────────── helpers ───────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Server owns the clock for sync ordering. Never trust a client timestamp.';

create or replace function public.force_owner()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.user_id := auth.uid();
  return new;
end;
$$;

comment on function public.force_owner() is
  'Ownership is assigned, not submitted. Runs on insert and update so a row cannot be transferred.';

-- ─────────────────────────────── profiles ───────────────────────────────
-- Deliberately does NOT copy the email: auth.users already holds it, and one
-- copy is one place to delete.

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 60),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ──────────────────────────────── decks ────────────────────────────────

create table if not exists public.decks (
  id          uuid primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  client_id   text check (char_length(client_id) <= 64),
  name        text not null check (char_length(name) between 1 and 80),
  description text check (char_length(description) <= 300),
  cards       jsonb not null default '[]'::jsonb
                check (jsonb_typeof(cards) = 'array' and pg_column_size(cards) <= 200000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  unique (user_id, client_id)
);

create trigger decks_owner before insert or update on public.decks
  for each row execute function public.force_owner();
create trigger decks_updated_at before update on public.decks
  for each row execute function public.set_updated_at();
create index if not exists decks_pull_idx on public.decks (user_id, updated_at);

-- ─────────────────────────────── matches ───────────────────────────────

create table if not exists public.matches (
  id          uuid primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  client_id   text check (char_length(client_id) <= 64),
  mode        text not null check (char_length(mode) <= 40),
  team1_name  text not null default '' check (char_length(team1_name) <= 80),
  team2_name  text not null default '' check (char_length(team2_name) <= 80),
  score_team1 integer not null default 0 check (score_team1 between 0 and 999),
  score_team2 integer not null default 0 check (score_team2 between 0 and 999),
  winner      smallint check (winner in (1, 2)),
  game_number integer not null default 1 check (game_number between 1 and 99),
  duration_ms bigint not null default 0 check (duration_ms >= 0),
  results     jsonb not null default '[]'::jsonb
                check (jsonb_typeof(results) = 'array' and pg_column_size(results) <= 20000),
  official    boolean not null default false,
  event_label text check (char_length(event_label) <= 120),
  game_type   text check (game_type in ('singles', 'doubles', 'mixed-doubles')),
  timeouts    jsonb,
  faults      jsonb,
  played_at   timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  unique (user_id, client_id)
);

create trigger matches_owner before insert or update on public.matches
  for each row execute function public.force_owner();
create trigger matches_updated_at before update on public.matches
  for each row execute function public.set_updated_at();
create index if not exists matches_pull_idx on public.matches (user_id, updated_at);

-- ───────────────────────────── tournaments ─────────────────────────────
-- The event header. Its matches are rows in their own table, not a blob inside
-- this one, because phase 2c needs two people writing different matches of one
-- event without clobbering each other.

create table if not exists public.tournaments (
  id           uuid primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  client_id    text check (char_length(client_id) <= 64),
  name         text not null check (char_length(name) between 1 and 120),
  format       text not null check (format in
                 ('round-robin', 'single-elim', 'double-elim', 'pools-bracket', 'rotating')),
  entry_mode   text not null default 'teams' check (entry_mode in ('teams', 'rotating')),
  team_size    smallint not null default 2 check (team_size in (1, 2)),
  status       text not null default 'setup' check (status in ('setup', 'running', 'complete')),
  champion_team_id text check (char_length(champion_team_id) <= 64),
  config       jsonb not null default '{}'::jsonb
                 check (jsonb_typeof(config) = 'object' and pg_column_size(config) <= 20000),
  players      jsonb not null default '[]'::jsonb
                 check (jsonb_typeof(players) = 'array' and pg_column_size(players) <= 200000),
  teams        jsonb not null default '[]'::jsonb
                 check (jsonb_typeof(teams) = 'array' and pg_column_size(teams) <= 200000),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  unique (user_id, client_id)
);

create trigger tournaments_owner before insert or update on public.tournaments
  for each row execute function public.force_owner();
create trigger tournaments_updated_at before update on public.tournaments
  for each row execute function public.set_updated_at();
create index if not exists tournaments_pull_idx on public.tournaments (user_id, updated_at);

-- ────────────────────────── tournament_matches ─────────────────────────
-- `user_id` is denormalised from the parent event. Both are checked in the RLS
-- policy: the row must be yours AND its event must be yours, so a forged
-- tournament_id cannot attach a match to someone else's draw.

create table if not exists public.tournament_matches (
  id            uuid primary key,
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  client_id     text check (char_length(client_id) <= 64),
  bracket       text not null check (bracket in ('rr', 'pool', 'winners', 'losers', 'final')),
  round         integer not null default 1 check (round between 1 and 999),
  pool          text check (char_length(pool) <= 8),
  slot_a        jsonb not null default '{}'::jsonb check (jsonb_typeof(slot_a) = 'object'),
  slot_b        jsonb not null default '{}'::jsonb check (jsonb_typeof(slot_b) = 'object'),
  team_a        text check (char_length(team_a) <= 64),
  team_b        text check (char_length(team_b) <= 64),
  score_a       integer check (score_a between 0 and 999),
  score_b       integer check (score_b between 0 and 999),
  winner        text check (char_length(winner) <= 64),
  court         integer check (court between 1 and 64),
  label         text check (char_length(label) <= 40),
  played_in_app boolean not null default false,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  unique (tournament_id, client_id)
);

create trigger tournament_matches_owner before insert or update on public.tournament_matches
  for each row execute function public.force_owner();
create trigger tournament_matches_updated_at before update on public.tournament_matches
  for each row execute function public.set_updated_at();
create index if not exists tournament_matches_event_idx
  on public.tournament_matches (tournament_id, round);
create index if not exists tournament_matches_pull_idx
  on public.tournament_matches (user_id, updated_at);

-- ─────────────────────────────── event_log ─────────────────────────────
-- The audit trail: every result, correction and clear. Append-only by design -
-- 0002 gives it no update and no delete policy at all. An audit trail somebody
-- can quietly rewrite is not an audit trail.

create table if not exists public.event_log (
  id             uuid primary key,
  tournament_id  uuid not null references public.tournaments (id) on delete cascade,
  actor_user_id  uuid not null references auth.users (id) on delete cascade,
  kind           text not null check (kind in ('created', 'result', 'edit', 'undo', 'round', 'note')),
  match_id       uuid,
  text           text not null check (char_length(text) <= 500),
  at             timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

create index if not exists event_log_event_idx on public.event_log (tournament_id, at);

-- ──────────────────────────────── prefs ───────────────────────────────
-- Favorites, achievement counters and settings. One small row per user: never
-- collaborative, so there is nothing to gain from splitting it into columns.

create table if not exists public.prefs (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb
               check (jsonb_typeof(data) = 'object' and pg_column_size(data) <= 100000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger prefs_updated_at before update on public.prefs
  for each row execute function public.set_updated_at();

create trigger prefs_owner before insert or update on public.prefs
  for each row execute function public.force_owner();

-- event_log names its owner `actor_user_id`, so it needs its own forcing
-- trigger. Insert only: an append-only table is never updated.
create or replace function public.force_actor()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.actor_user_id := auth.uid();
  return new;
end;
$$;

create trigger event_log_actor before insert on public.event_log
  for each row execute function public.force_actor();
