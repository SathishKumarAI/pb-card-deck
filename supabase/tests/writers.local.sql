-- writers.local.sql — the adversarial suite for phase 2c (invited co-organisers).
--
-- Runs last in scripts/verify-rls-local.sh, on the same throwaway Postgres.
--
-- The threat model here is narrower and nastier than 2b's: the attacker is somebody
-- the owner DELIBERATELY let in. A writer is supposed to change scores, so every case
-- below is about the line between "enter a result" and "take over the event".
--
-- The case that matters most is 3: a writer's update must not re-stamp the row's owner.
-- That is the regression the trigger change in 0005 exists to prevent, and it would be
-- invisible - the score would look right while the event quietly left the owner's app.

\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'organiser@example.test'),
  ('22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'helper@example.test'),
  ('33333333-cccc-4ccc-8ccc-cccccccccccc', 'outsider@example.test');

\echo ''
\echo 'seeding: the organiser has two events; a writer invite exists for the first'
begin;
select public._as('11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
insert into public.tournaments (id, user_id, name, format)
  values ('c1111111-1111-4111-8111-111111111111', '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Club Night', 'round-robin'),
         ('c2222222-2222-4222-8222-222222222222', '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Private Ladder', 'round-robin');
insert into public.tournament_matches (id, tournament_id, user_id, client_id, bracket, round, team_a, team_b)
  values ('aa111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111',
          '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'm1', 'rr', 1, 't1', 't2'),
         ('aa222222-2222-4222-8222-222222222222', 'c2222222-2222-4222-8222-222222222222',
          '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'm9', 'rr', 1, 't3', 't4');
insert into public.event_log (id, tournament_id, actor_user_id, kind, text)
  values ('bb111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111',
          '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'created', 'Event created');
select public.create_event_share('c1111111-1111-4111-8111-111111111111',
  'invite-writer-0000000000000000000000000000', null, 'helpers', 'writer');
select public.create_event_share('c1111111-1111-4111-8111-111111111111',
  'view-only-000000000000000000000000000000000', null, 'spectators', 'viewer');
select public.create_event_share('c1111111-1111-4111-8111-111111111111',
  'invite-revoked-00000000000000000000000000', null, 'old helpers', 'writer');
commit;

begin;
select public._as('11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
do $$
declare sid uuid;
begin
  select id into sid from public.event_shares where label = 'old helpers';
  perform public.revoke_event_share(sid);
end $$;
commit;

-- ─── 8 (first, because it gates the rest). A viewer link is not an invite ───
\echo '1. a viewer link cannot be accepted as an invite'
begin;
select public._as('22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
do $$
begin
  begin
    perform public.accept_event_invite('view-only-000000000000000000000000000000000');
    perform public._fail('a VIEWER link was accepted as a writer invite');
  exception when others then
    if sqlerrm not like '%invalid invite%' then
      perform public._fail(format('unexpected error: %s', sqlerrm));
    end if;
  end;
  begin
    perform public.accept_event_invite('invite-revoked-00000000000000000000000000');
    perform public._fail('a REVOKED invite was accepted');
  exception when others then
    if sqlerrm not like '%invalid invite%' then
      perform public._fail(format('unexpected error: %s', sqlerrm));
    end if;
  end;
  begin
    perform public.accept_event_invite('nonsense-000000000000000000000000000000000');
    perform public._fail('a GARBAGE invite was accepted');
  exception when others then null;
  end;
  raise notice '  pass  viewer, revoked and garbage links are all refused as invites';
end $$;
commit;

-- ─── a writer token is not a read link either ───
\echo '2. a writer token returns nothing from the public read function'
begin;
select public._as('anon');
do $$
begin
  if public.get_shared_event('invite-writer-0000000000000000000000000000') is not null then
    perform public._fail('a WRITER invite worked as an anonymous view link');
  end if;
  if public.get_shared_event('view-only-000000000000000000000000000000000') is null then
    perform public._fail('the viewer link stopped working');
  end if;
  raise notice '  pass  invites are not view links, and view links still work';
end $$;
commit;

-- ─── accept, twice ───
\echo '3. accepting is idempotent'
begin;
select public._as('22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
do $$
declare first_id uuid; second_id uuid; n int;
begin
  first_id := public.accept_event_invite('invite-writer-0000000000000000000000000000');
  second_id := public.accept_event_invite('invite-writer-0000000000000000000000000000');
  if first_id is distinct from second_id then
    perform public._fail('accepting twice returned two different events'); end if;
  select count(*) into n from public.event_members
   where tournament_id = 'c1111111-1111-4111-8111-111111111111'
     and user_id = '22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  if n <> 1 then perform public._fail(format('accepting twice created %s memberships', n)); end if;
  raise notice '  pass  accepting twice leaves exactly one membership';
end $$;
commit;

-- ─── what a writer CAN do ───
\echo '4. a writer can enter a score, and the row stays the owner''s'
begin;
select public._as('22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
do $$
declare n int; owner uuid; wrote uuid;
begin
  update public.tournament_matches
     set score_a = 11, score_b = 6, winner = 't1'
   where id = 'aa111111-1111-4111-8111-111111111111';
  get diagnostics n = row_count;
  if n <> 1 then perform public._fail('a writer could NOT enter a score'); end if;

  select user_id, updated_by into owner, wrote
    from public.tournament_matches where id = 'aa111111-1111-4111-8111-111111111111';

  -- THE case this migration exists for.
  if owner <> '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa' then
    perform public._fail(format('a writer''s update re-stamped the row owner as %s', owner));
  end if;
  if wrote <> '22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb' then
    perform public._fail(format('updated_by did not record the writer (%s)', wrote));
  end if;
  raise notice '  pass  a writer scores; the row still belongs to the event''s owner, and updated_by names the writer';
end $$;
commit;

\echo '5. a writer can append to the audit trail, as themselves'
begin;
select public._as('22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
do $$
declare actor uuid;
begin
  insert into public.event_log (id, tournament_id, actor_user_id, kind, text)
    values ('bb222222-2222-4222-8222-222222222222', 'c1111111-1111-4111-8111-111111111111',
            '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa',  -- claims to be the owner
            'result', 'Court 1: 11-6');
  select actor_user_id into actor from public.event_log where id = 'bb222222-2222-4222-8222-222222222222';
  if actor <> '22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb' then
    perform public._fail('a writer''s log line was attributed to somebody else');
  end if;
  raise notice '  pass  a writer''s log line names the writer, whatever they claim';
end $$;
commit;

-- ─── what a writer must NOT do ───
\echo '6. a writer cannot reshape or take over the event'
begin;
select public._as('22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
do $$
declare n int; blocked int := 0;
begin
  -- rename / re-draw / complete the event
  update public.tournaments set name = 'Helper''s Night', status = 'complete'
   where id = 'c1111111-1111-4111-8111-111111111111';
  get diagnostics n = row_count;
  if n > 0 then perform public._fail('a writer renamed the event'); end if;

  -- delete it
  delete from public.tournaments where id = 'c1111111-1111-4111-8111-111111111111';
  get diagnostics n = row_count;
  if n > 0 then perform public._fail('a writer DELETED the event'); end if;

  -- invent a match
  begin
    insert into public.tournament_matches (id, tournament_id, user_id, client_id, bracket, round)
      values ('aa333333-3333-4333-8333-333333333333', 'c1111111-1111-4111-8111-111111111111',
              '22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'invented', 'rr', 99);
    perform public._fail('a writer inserted a match the format never produced');
  exception when insufficient_privilege then blocked := blocked + 1;
  end;

  -- delete a match
  delete from public.tournament_matches where id = 'aa111111-1111-4111-8111-111111111111';
  get diagnostics n = row_count;
  if n > 0 then perform public._fail('a writer deleted a match'); end if;

  -- rewrite the audit trail. 0002 revokes UPDATE on event_log from `authenticated`
  -- outright, so this is refused at the privilege layer rather than returning 0 rows -
  -- which is the stronger of the two answers, and has to be accepted as a pass.
  begin
    update public.event_log set text = 'never happened'
     where id = 'bb111111-1111-4111-8111-111111111111';
    get diagnostics n = row_count;
    if n > 0 then perform public._fail('a writer edited an audit line'); end if;
  exception when insufficient_privilege then blocked := blocked + 1;
  end;

  raise notice '  pass  a writer cannot rename, delete, invent a match, delete a match or edit the log (% refused at privilege level)', blocked;
end $$;
commit;

\echo '7. a writer is confined to the event they joined'
begin;
select public._as('22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
do $$
declare n int;
begin
  -- The owner's OTHER event, which they were not invited to.
  select count(*) into n from public.tournaments where id = 'c2222222-2222-4222-8222-222222222222';
  if n > 0 then perform public._fail('a writer can see an event they were not invited to'); end if;

  update public.tournament_matches set score_a = 11
   where id = 'aa222222-2222-4222-8222-222222222222';
  get diagnostics n = row_count;
  if n > 0 then perform public._fail('a writer scored a match in an event they never joined'); end if;
  raise notice '  pass  a writer sees and touches one event, not the owner''s others';
end $$;
commit;

\echo '8. a writer cannot invite, list or remove anybody'
begin;
select public._as('22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
do $$
declare n int;
begin
  begin
    perform public.create_event_share('c1111111-1111-4111-8111-111111111111',
      'writer-made-invite-000000000000000000000', null, 'more helpers', 'writer');
    perform public._fail('a writer invited another writer');
  exception when others then
    if sqlerrm not like '%not your event%' then
      perform public._fail(format('unexpected error: %s', sqlerrm)); end if;
  end;

  select count(*) into n from public.list_event_members('c1111111-1111-4111-8111-111111111111');
  if n > 0 then perform public._fail('a writer listed the event''s members'); end if;

  perform public.remove_event_member('c1111111-1111-4111-8111-111111111111',
                                     '22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  raise notice '  pass  a writer cannot invite or list members';
end $$;
commit;

-- Did that self-removal actually do nothing? Only the owner may remove.
do $$
declare n int;
begin
  select count(*) into n from public.event_members
   where tournament_id = 'c1111111-1111-4111-8111-111111111111'
     and user_id = '22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  if n <> 1 then
    perform public._fail('remove_event_member worked for a non-owner');
  end if;
  raise notice '  pass  remove_event_member is owner-only';
end $$;

\echo '9. an outsider gets nothing at all'
begin;
select public._as('33333333-cccc-4ccc-8ccc-cccccccccccc');
do $$
declare n int;
begin
  select count(*) into n from public.tournaments;
  if n > 0 then perform public._fail('an outsider sees somebody else''s events'); end if;
  select count(*) into n from public.tournament_matches;
  if n > 0 then perform public._fail('an outsider sees somebody else''s matches'); end if;
  select count(*) into n from public.event_members;
  if n > 0 then perform public._fail('an outsider sees who joined an event'); end if;
  update public.tournament_matches set score_a = 3
   where id = 'aa111111-1111-4111-8111-111111111111';
  get diagnostics n = row_count;
  if n > 0 then perform public._fail('an outsider scored a match'); end if;
  raise notice '  pass  an outsider sees nothing and writes nothing';
end $$;
commit;

\echo '10. the owner sees who joined, and can remove them'
begin;
select public._as('11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
do $$
declare n int; who text;
begin
  select count(*) into n from public.list_event_members('c1111111-1111-4111-8111-111111111111');
  if n <> 1 then perform public._fail(format('the owner sees %s members, expected 1', n)); end if;
  select email into who from public.list_event_members('c1111111-1111-4111-8111-111111111111') limit 1;
  if who <> 'helper@example.test' then
    perform public._fail(format('the owner sees the wrong member: %s', who)); end if;

  perform public.remove_event_member('c1111111-1111-4111-8111-111111111111',
                                     '22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  select count(*) into n from public.event_members
   where tournament_id = 'c1111111-1111-4111-8111-111111111111';
  if n <> 0 then perform public._fail('removing a member did nothing'); end if;
  raise notice '  pass  the owner lists members by email and can remove one';
end $$;
commit;

\echo '11. a removed helper stops writing immediately, and their history survives'
begin;
select public._as('22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
do $$
declare n int;
begin
  update public.tournament_matches set score_a = 21, score_b = 0
   where id = 'aa111111-1111-4111-8111-111111111111';
  get diagnostics n = row_count;
  if n > 0 then perform public._fail('a REMOVED helper could still enter a score'); end if;

  select count(*) into n from public.tournaments where id = 'c1111111-1111-4111-8111-111111111111';
  if n > 0 then perform public._fail('a removed helper can still see the event'); end if;
  raise notice '  pass  a removed helper writes nothing and sees nothing';
end $$;
commit;

do $$
declare n int; score int;
begin
  -- Their line in the audit trail stays: removing a person is not rewriting history.
  select count(*) into n from public.event_log
   where actor_user_id = '22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  if n <> 1 then perform public._fail('a removed helper''s audit lines were destroyed'); end if;
  -- And the score they legitimately entered is still there.
  select score_a into score from public.tournament_matches
   where id = 'aa111111-1111-4111-8111-111111111111';
  if score <> 11 then perform public._fail(format('the helper''s legitimate score was lost (%s)', score)); end if;
  raise notice '  pass  their entered score and their audit lines survive their removal';
end $$;

\echo ''
\echo 'Writer gate passed: a helper scores matches in one event and can do nothing else.'
\echo ''
