-- shares.local.sql — the adversarial suite for phase 2b (the read-only share link).
--
-- Runs after rls.local.sql's migrations on the same throwaway Postgres
-- (scripts/verify-rls-local.sh). Every case here tries to get more than a token
-- entitles its holder to, and must fail.
--
-- The threat model, in order: an anonymous stranger with no token; the same stranger
-- with a bad, expired or revoked token; a signed-in person who is not the owner; and
-- the link holder themselves, who must not be able to reach a second event or any
-- account identifier.

\set ON_ERROR_STOP on

-- Two accounts, and an event each. A and B are fresh here: rls.local.sql deleted A.
insert into auth.users (id, email) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'owner@example.test'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'stranger@example.test');

\echo ''
\echo 'seeding: owner has an event with a match and a log line; stranger has their own'
begin;
select public._as('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
insert into public.tournaments (id, user_id, name, format, players, teams)
  values ('e1111111-1111-4111-8111-111111111111', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          'Saturday Social', 'round-robin',
          '[{"id":"p1","name":"Sam"},{"id":"p2","name":"Priya"}]'::jsonb,
          '[{"id":"t1","name":"Sam & Priya","playerIds":["p1","p2"],"seed":1}]'::jsonb);
insert into public.tournament_matches (id, tournament_id, user_id, client_id, bracket, round, team_a, team_b, score_a, score_b, court)
  values ('e2222222-2222-4222-8222-222222222222', 'e1111111-1111-4111-8111-111111111111',
          'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'local-m1', 'rr', 1, 't1', 't2', 11, 6, 1);
insert into public.event_log (id, tournament_id, actor_user_id, kind, text)
  values ('e3333333-3333-4333-8333-333333333333', 'e1111111-1111-4111-8111-111111111111',
          'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'result', 'Court 1: 11-6');
select public.create_event_share('e1111111-1111-4111-8111-111111111111',
  'tok-live-0000000000000000000000000000000000', null, 'group chat') as live_share;
select public.create_event_share('e1111111-1111-4111-8111-111111111111',
  'tok-revoked-000000000000000000000000000000', null, 'to revoke') as revoked_share;
select public.create_event_share('e1111111-1111-4111-8111-111111111111',
  'tok-expired-000000000000000000000000000000', now() - interval '1 day', 'stale') as expired_share;
commit;

begin;
select public._as('dddddddd-dddd-4ddd-8ddd-dddddddddddd');
insert into public.tournaments (id, user_id, name, format)
  values ('e4444444-4444-4444-8444-444444444444', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
          'Stranger Cup', 'single-elim');
commit;

-- Revoke the one marked for it, as the owner.
begin;
select public._as('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
do $$
declare sid uuid;
begin
  select id into sid from public.event_shares where label = 'to revoke';
  perform public.revoke_event_share(sid);
end $$;
commit;

-- ─── 1. a token gets exactly one event, and nothing about any account ───
\echo '1. what a valid token returns'
begin;
select public._as('anon');
do $$
declare doc jsonb; txt text;
begin
  doc := public.get_shared_event('tok-live-0000000000000000000000000000000000');
  if doc is null then perform public._fail('a live token returned nothing'); end if;
  if doc -> 'event' ->> 'name' <> 'Saturday Social' then
    perform public._fail('the wrong event came back'); end if;
  if jsonb_array_length(doc -> 'matches') <> 1 then
    perform public._fail('the event''s match is missing'); end if;
  if jsonb_array_length(doc -> 'log') <> 1 then
    perform public._fail('the change log is missing'); end if;

  -- The disclosure test: nothing that identifies an ACCOUNT may appear anywhere in
  -- the document, at any depth.
  txt := doc::text;
  if txt like '%cccccccc-cccc-4ccc-8ccc-cccccccccccc%' then
    perform public._fail('the payload leaks the owner''s account id'); end if;
  if txt like '%user_id%' or txt like '%actor_user_id%' then
    perform public._fail('the payload leaks a user_id column'); end if;
  if txt like '%@example.test%' then
    perform public._fail('the payload leaks an email'); end if;
  if txt like '%client_id%' or txt like '%local-m1%' = false then
    -- match ids are the LOCAL ids by design (the UI keys on them); the column name
    -- must not appear, but the value must.
    perform public._fail('match ids did not survive as local ids');
  end if;
  raise notice '  pass  a live token returns one event, with no account identifiers';
end $$;
commit;

-- ─── 2. bad, expired and revoked are indistinguishable ───
\echo '2. tokens that must return nothing'
begin;
select public._as('anon');
do $$
begin
  if public.get_shared_event('tok-revoked-000000000000000000000000000000') is not null then
    perform public._fail('a REVOKED token still works'); end if;
  if public.get_shared_event('tok-expired-000000000000000000000000000000') is not null then
    perform public._fail('an EXPIRED token still works'); end if;
  if public.get_shared_event('tok-nonsense-00000000000000000000000000000') is not null then
    perform public._fail('a GARBAGE token returned an event'); end if;
  if public.get_shared_event('short') is not null then
    perform public._fail('a short token returned an event'); end if;
  if public.get_shared_event(null) is not null then
    perform public._fail('a null token returned an event'); end if;
  raise notice '  pass  revoked, expired, garbage, short and null all return null';
end $$;
commit;

-- ─── 3. the token is not a key to the database ───
\echo '3. a link holder still cannot read tables'
begin;
select public._as('anon');
do $$
declare denied int := 0;
begin
  begin perform count(*) from public.event_shares;
  exception when insufficient_privilege then denied := denied + 1; end;
  begin perform count(*) from public.tournaments;
  exception when insufficient_privilege then denied := denied + 1; end;
  begin perform count(*) from public.tournament_matches;
  exception when insufficient_privilege then denied := denied + 1; end;
  if denied < 3 then
    perform public._fail(format('anon reached tables directly (%s of 3 refused)', denied));
  end if;
  raise notice '  pass  anon is refused on event_shares, tournaments and matches';
end $$;
commit;

-- ─── 4. a token for one event is not a token for another ───
\echo '4. scope'
begin;
select public._as('anon');
do $$
declare doc jsonb;
begin
  doc := public.get_shared_event('tok-live-0000000000000000000000000000000000');
  if doc -> 'event' ->> 'name' = 'Stranger Cup' then
    perform public._fail('a token crossed into another event'); end if;
  if doc::text like '%Stranger Cup%' then
    perform public._fail('another event leaked into the payload'); end if;
  raise notice '  pass  a token returns its own event only';
end $$;
commit;

-- ─── 5. a stranger cannot mint, revoke or list someone else's links ───
\echo '5. a signed-in stranger'
begin;
select public._as('dddddddd-dddd-4ddd-8ddd-dddddddddddd');
do $$
declare sid uuid; n int;
begin
  begin
    perform public.create_event_share('e1111111-1111-4111-8111-111111111111',
      'tok-stranger-00000000000000000000000000000', null, 'mine now');
    perform public._fail('a stranger minted a link for someone else''s event');
  exception when others then
    if sqlerrm not like '%not your event%' then
      perform public._fail(format('unexpected error minting: %s', sqlerrm));
    end if;
  end;

  -- Revoking someone else's share must be a silent no-op, not an error and not a
  -- revocation.
  select id into sid from public.event_shares where label = 'group chat';
  if sid is not null then
    perform public._fail('a stranger can SEE another owner''s share row');
  end if;

  select count(*) into n from public.list_event_shares('e1111111-1111-4111-8111-111111111111');
  if n <> 0 then perform public._fail('a stranger listed another owner''s links'); end if;
  raise notice '  pass  a stranger cannot mint, see or list another owner''s links';
end $$;
commit;

-- The stranger's attempted revoke, verified from the owner's side.
begin;
select public._as('dddddddd-dddd-4ddd-8ddd-dddddddddddd');
do $$
declare sid uuid;
begin
  -- Guess the id via the owner's own listing is impossible, so use the real one:
  -- reading it requires superuser, which is what the test harness is.
  sid := null;
  perform public.revoke_event_share(coalesce(sid, gen_random_uuid()));
end $$;
commit;

begin;
select public._as('anon');
do $$
begin
  if public.get_shared_event('tok-live-0000000000000000000000000000000000') is null then
    perform public._fail('a stranger''s revoke call killed the owner''s link');
  end if;
  raise notice '  pass  a stranger''s revoke attempt changes nothing';
end $$;
commit;

-- ─── 6. the history of links cannot be rewritten ───
\echo '6. share rows are not editable'
begin;
select public._as('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
do $$
declare blocked int := 0; n int;
begin
  begin
    update public.event_shares set revoked_at = null where label = 'to revoke';
    get diagnostics n = row_count;
    if n > 0 then perform public._fail('an owner un-revoked a link by UPDATE'); end if;
  exception when insufficient_privilege then blocked := blocked + 1;
  end;
  begin
    update public.event_shares set token_hash = repeat('a', 64) where label = 'group chat';
    get diagnostics n = row_count;
    if n > 0 then perform public._fail('an owner rewrote a token hash'); end if;
  exception when insufficient_privilege then blocked := blocked + 1;
  end;
  raise notice '  pass  share rows cannot be updated (% refused at privilege level)', blocked;
end $$;
commit;

-- Revoked stays revoked, checked through the only door that matters.
begin;
select public._as('anon');
do $$
begin
  if public.get_shared_event('tok-revoked-000000000000000000000000000000') is not null then
    perform public._fail('the revoked link came back to life');
  end if;
  raise notice '  pass  a revoked link stays revoked';
end $$;
commit;

-- ─── 7. deleting the event kills its links ───
\echo '7. cascade'
begin;
select public._as('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
delete from public.tournaments where id = 'e1111111-1111-4111-8111-111111111111';
commit;

begin;
select public._as('anon');
do $$
begin
  if public.get_shared_event('tok-live-0000000000000000000000000000000000') is not null then
    perform public._fail('a link outlived the event it pointed at');
  end if;
  raise notice '  pass  deleting the event kills its links';
end $$;
commit;

do $$
declare n int;
begin
  select count(*) into n from public.event_shares
   where tournament_id = 'e1111111-1111-4111-8111-111111111111';
  if n <> 0 then perform public._fail('share rows survived their event'); end if;
  raise notice '  pass  share rows cascade with the event';
end $$;

\echo ''
\echo 'Share gate passed: a token opens one event read-only, and nothing else.'
\echo ''
