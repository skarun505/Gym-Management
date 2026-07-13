-- Regression lock for the RLS recursion outage (2026-04-18).
--
-- get_my_gym_id/get_my_role/is_super_admin are called from inside RLS
-- policies on `profiles`. Without SECURITY DEFINER they run under the
-- caller's own RLS-restricted view of `profiles`, which re-triggers the
-- same policies they're being used to evaluate — infinite recursion,
-- "stack depth limit exceeded", full login outage. See
-- 20260418063600_fix_rls_recursion.sql. This test exists so that fix
-- can never be silently reverted (e.g. by a future `create or replace
-- function` that drops the SECURITY DEFINER clause).

begin;
select plan(3);

select ok(
  (select prosecdef from pg_proc where proname = 'get_my_gym_id' and pronamespace = 'public'::regnamespace),
  'get_my_gym_id() must be SECURITY DEFINER'
);

select ok(
  (select prosecdef from pg_proc where proname = 'get_my_role' and pronamespace = 'public'::regnamespace),
  'get_my_role() must be SECURITY DEFINER'
);

select ok(
  (select prosecdef from pg_proc where proname = 'is_super_admin' and pronamespace = 'public'::regnamespace),
  'is_super_admin() must be SECURITY DEFINER'
);

select * from finish();
rollback;
