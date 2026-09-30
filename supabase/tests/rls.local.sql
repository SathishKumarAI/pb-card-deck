-- rls.local.sql — the adversarial policy suite, in SQL, runnable on a plain
-- Postgres with no Supabase project (see local-shim.sql and ../../scripts/verify-rls-local.sh).
--
-- Same seven groups as tests/rls.test.mjs, one layer lower: that one attacks the
-- HTTP surface with two real sessions, this one attacks the policies directly by
-- switching role and setting the JWT claim PostgREST would set. Every case must
-- FAIL to break in; a case that succeeds raises and the script exits non-zero.
--
-- Run it after any change to 0001/0002/0003.

\set ON_ERROR_STOP on

-- Two accounts. Fixed uuids so failures are readable.
insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@example.test', '{"full_name":"Ada"}'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@example.test', '{"full_name":"Bo"}');

create or replace function public._as(who text)
returns void language plpgsql as $$
begin
  -- `set role` plus the claim PostgREST sets: this IS how a request arrives.
  if who = 'anon' then
    perform set_config('request.jwt.claims', '', true);
    execute 'set local role anon';
  else
    perform set_config('request.jwt.claims', json_build_object('sub', who)::text, true);
    execute 'set local role authenticated';
  end if;
end $$;

create or replace function public._fail(msg text)
returns void language plpgsql as $$
begin
  raise exception 'SECURITY GATE FAILED: %', msg;
end $$;

\echo ''
\echo 'seeding A'
begin;
select public._as('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

insert into public.decks (id, user_id, name, cards)
  values ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'A''s deck', '[]');
insert into public.matches (id, user_id, mode, team1_name, team2_name, score_team1, score_team2, winner)
  values ('22222222-2222-4222-8222-222222222222', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'chaos', 'A1', 'A2', 11, 6, 1);
insert into public.tournaments (id, user_id, name, format)
  values ('33333333-3333-4333-8333-333333333333', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'A''s event', 'round-robin');
insert into public.tournament_matches (id, tournament_id, user_id, bracket, round)
  values ('44444444-4444-4444-8444-444444444444', '33333333-3333-4333-8333-333333333333',
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'rr', 1);
insert into public.event_log (id, tournament_id, actor_user_id, kind, text)
  values ('55555555-5555-4555-8555-555555555555', '33333333-3333-4333-8333-333333333333',
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'result', 'A recorded 11-6');
insert into public.prefs (user_id, data)
  values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '{"favorites":[1,2,3]}');
commit;

-- ─── 1. a second account reads nothing of A's ───
\echo '1. cross-account reads'
begin;
select public._as('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
do $$
declare n int;
begin
  select count(*) into n from public.decks;               if n > 0 then perform public._fail('B can read decks'); end if;
  select count(*) into n from public.matches;             if n > 0 then perform public._fail('B can read matches'); end if;
  select count(*) into n from public.tournaments;         if n > 0 then perform public._fail('B can read tournaments'); end if;
  select count(*) into n from public.tournament_matches;  if n > 0 then perform public._fail('B can read event matches'); end if;
  select count(*) into n from public.event_log;           if n > 0 then perform public._fail('B can read the audit log'); end if;
  select count(*) into n from public.prefs;               if n > 0 then perform public._fail('B can read prefs'); end if;
  raise notice '  pass  B reads nothing of A''s, in six tables';
end $$;
commit;

-- ─── 2. the anonymous role reads nothing at all ───
\echo '2. anonymous reads'
begin;
select public._as('anon');
do $$
declare denied boolean := false;
begin
  begin
    perform count(*) from public.decks;
  exception when insufficient_privilege then
    denied := true;
  end;
  if not denied then
    -- A grant survived the revoke; RLS must still have filtered to zero.
    if (select count(*) from public.decks) > 0 then perform public._fail('anon can READ decks'); end if;
    raise notice '  pass  anon is granted but RLS-filtered to nothing (revoke did not apply)';
  else
    raise notice '  pass  anon is refused outright';
  end if;
end $$;
commit;

-- ─── 3. a second account cannot write to A's rows ───
\echo '3. cross-account writes'
begin;
select public._as('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
do $$
declare n int;
begin
  update public.decks set name = 'owned by B now' where id = '11111111-1111-4111-8111-111111111111';
  get diagnostics n = row_count;
  if n > 0 then perform public._fail('B updated A''s deck'); end if;

  delete from public.matches where id = '22222222-2222-4222-8222-222222222222';
  get diagnostics n = row_count;
  if n > 0 then perform public._fail('B deleted A''s match'); end if;

  begin
    insert into public.tournament_matches (id, tournament_id, user_id, bracket, round)
      values ('66666666-6666-4666-8666-666666666666', '33333333-3333-4333-8333-333333333333',
              'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'rr', 9);
    perform public._fail('B attached a match to A''s event');
  exception when insufficient_privilege then
    raise notice '  pass  B cannot update, delete or attach to A''s data';
  end;
end $$;
commit;

-- ─── 4. ownership cannot be forged or transferred ───
\echo '4. ownership'
begin;
select public._as('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
do $$
declare owner uuid;
begin
  insert into public.decks (id, user_id, name, cards)
    values ('77777777-7777-4777-8777-777777777777', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'claims to be A''s', '[]');
  select user_id into owner from public.decks where id = '77777777-7777-4777-8777-777777777777';
  if owner is distinct from 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid then
    perform public._fail(format('a forged user_id was stored: %s', owner));
  end if;
  raise notice '  pass  a row claiming another user_id is stored as the caller''s';
end $$;
commit;

begin;
select public._as('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
do $$
declare owner uuid;
begin
  update public.decks set user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    where id = '11111111-1111-4111-8111-111111111111';
  select user_id into owner from public.decks where id = '11111111-1111-4111-8111-111111111111';
  if owner is distinct from 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid then
    perform public._fail('an owner transferred a row to another account');
  end if;
  raise notice '  pass  an owner cannot hand a row to another account';
end $$;
commit;

-- ─── 5. the audit trail is append-only, even for its owner ───
\echo '5. audit trail'
begin;
select public._as('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
do $$
declare blocked int := 0;
begin
  begin
    update public.event_log set text = 'never happened' where id = '55555555-5555-4555-8555-555555555555';
    if (select text from public.event_log where id = '55555555-5555-4555-8555-555555555555') <> 'A recorded 11-6'
      then perform public._fail('the owner rewrote an audit line'); end if;
  exception when insufficient_privilege then blocked := blocked + 1;
  end;
  begin
    delete from public.event_log where id = '55555555-5555-4555-8555-555555555555';
    if (select count(*) from public.event_log where id = '55555555-5555-4555-8555-555555555555') = 0
      then perform public._fail('the owner deleted an audit line'); end if;
  exception when insufficient_privilege then blocked := blocked + 1;
  end;
  raise notice '  pass  audit lines cannot be edited or deleted (% refused at privilege level)', blocked;
end $$;
commit;

-- ─── 6. the server owns the clock ───
\echo '6. timestamps'
begin;
select public._as('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
do $$
declare ts timestamptz;
begin
  update public.decks set description = 'touched', updated_at = '2000-01-01'
    where id = '11111111-1111-4111-8111-111111111111';
  select updated_at into ts from public.decks where id = '11111111-1111-4111-8111-111111111111';
  if extract(year from ts) < 2020 then
    perform public._fail('a client set updated_at, so it could win a sync conflict by lying');
  end if;
  raise notice '  pass  updated_at comes from the server, whatever the client sends';
end $$;
commit;

-- ─── 7. delete_my_account deletes exactly one account ───
\echo '7. account deletion'
begin;
select public._as('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
insert into public.decks (id, user_id, name, cards)
  values ('88888888-8888-4888-8888-888888888888', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'B''s deck', '[]');
commit;

begin;
select public._as('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select public.delete_my_account();
commit;

do $$
declare a_rows int; b_rows int; a_user int;
begin
  -- As the superuser: look at the whole table, not a filtered view.
  select count(*) into a_rows from public.decks where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  select count(*) into b_rows from public.decks where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  select count(*) into a_user from auth.users where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  if a_rows > 0 then perform public._fail(format('%s of A''s rows survived deletion', a_rows)); end if;
  if a_user > 0 then perform public._fail('A''s auth.users row survived deletion'); end if;
  if b_rows = 0 then perform public._fail('deleting A''s account removed B''s data'); end if;
  raise notice '  pass  A is gone entirely, B is untouched';
end $$;

begin;
select public._as('anon');
do $$
begin
  begin
    perform public.delete_my_account();
    perform public._fail('anon executed delete_my_account');
  exception when insufficient_privilege then
    raise notice '  pass  anon cannot call delete_my_account';
  when others then
    -- Any refusal is acceptable; succeeding is not.
    raise notice '  pass  anon cannot call delete_my_account (%)', sqlerrm;
  end;
end $$;
commit;

\echo ''
\echo 'Security gate passed: no cross-account read, write, forge, transfer or rewrite.'
\echo ''
