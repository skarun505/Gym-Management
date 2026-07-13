-- ============================================================
-- Wipe all gym/member/staff DATA and start clean.
--
-- Keeps: the Supabase project, schema, RLS policies, edge
-- functions, env vars/keys — nothing about the app changes,
-- only the rows in it. Also keeps `achievements`, which is
-- master badge-definition data seeded by the initial migration,
-- not per-gym user data.
--
-- Run this in: Supabase Dashboard → SQL Editor → New Query,
-- on the project you actually want wiped (double-check you're
-- looking at the right project before running).
--
-- Do the auth.users cleanup FIRST (see step 2 below) — deleting
-- gyms/profiles first would leave orphaned auth accounts with no
-- way to find them again via this repo.
-- ============================================================

-- ── Step 1: everything with a tracked migration ──
-- TRUNCATE ... CASCADE handles FK order for you — no need to
-- sequence these by dependency.
truncate table
  member_streaks,
  member_achievements,
  member_measurements,
  workout_logs,
  member_workout_plans,
  workout_exercises,
  workout_plans,
  inventory,
  trainer_assignments,
  attendance,
  member_subscriptions,
  subscription_plans,
  members,
  profiles,
  gyms
cascade;

-- ── Step 1b: tables confirmed in use by the app but with no
-- tracked migration (see "Known gap" in Development guide.md) ──
-- Wrapped so this script doesn't fail on a project where some of
-- these don't exist (e.g. a fresh project built only from the
-- tracked migrations).
do $$
begin
  execute 'truncate table staff, staff_attendance, gym_shifts, fee_payments, '
    || 'gym_announcements, gym_challenges, challenge_completions, nutrition_logs, '
    || 'progress_logs, trainer_notes, diet_charts, push_subscriptions cascade';
exception when undefined_table then
  raise notice 'Some untracked tables did not exist — skipped. This is expected on a fresh project.';
end $$;

-- ============================================================
-- Step 2: delete all Auth users — DO NOT do this with raw SQL.
--
-- auth.users is managed by Supabase's Auth service; deleting rows
-- directly can leave orphaned sessions/identities depending on
-- your project's version. Use one of these instead:
--
--   a) Dashboard → Authentication → Users → select all → Delete
--      (simplest for a full wipe)
--
--   b) Script it with the Admin API, one call per user:
--        supabaseAdmin.auth.admin.deleteUser(userId)
--      (needed if you have too many users to select by hand)
-- ============================================================
