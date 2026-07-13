-- Tenant isolation smoke test: a gym_owner must only ever see and be
-- able to write their own gym's `members` rows, never another gym's.
-- This is the core security boundary of the whole app (every table is
-- scoped by gym_id under RLS) and had zero regression coverage before
-- this file — RLS bugs here were only ever caught by users hitting them
-- in production. Covers only the tables tracked in
-- 20260418062400_initial_schema.sql; the several tables added to the
-- live schema outside of any tracked migration (see the "Recovered vs
-- live schema" note in Development guide.md) aren't covered here yet.

begin;
select plan(3);

-- Fixtures: two gyms, one owner + one member each
insert into gyms (id, gym_code, name, owner_name, email) values
  ('11111111-1111-1111-1111-111111111111', 'GYM_TESTA', 'Test Gym A', 'Owner A', 'ownera@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'GYM_TESTB', 'Test Gym B', 'Owner B', 'ownerb@test.local');

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ownera@test.local'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ownerb@test.local');

insert into profiles (id, gym_id, full_name, role) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Owner A', 'gym_owner'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Owner B', 'gym_owner');

insert into members (id, gym_id, member_code, full_name) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'M-A-1', 'Member A1'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'M-B-1', 'Member B1');

-- Impersonate Owner A (gym_owner of gym A) the way PostgREST would:
-- a JWT claims GUC plus the `authenticated` role.
select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'role', 'authenticated')::text,
  true
);
set local role authenticated;

select is(
  (select count(*)::int from members),
  1,
  'gym_owner A sees exactly one member (their own gym''s), not gym B''s'
);

select is(
  (select full_name from members limit 1),
  'Member A1',
  'the member visible to Owner A is gym A''s member, not gym B''s'
);

-- Attempt a cross-tenant write. RLS makes this a silent 0-row update,
-- not an error — assert the target row is actually unchanged.
update members set full_name = 'hacked-by-A' where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

reset role;
select is(
  (select full_name from members where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  'Member B1',
  'gym B''s member is unchanged after gym_owner A attempted a cross-tenant update'
);

select * from finish();
rollback;
