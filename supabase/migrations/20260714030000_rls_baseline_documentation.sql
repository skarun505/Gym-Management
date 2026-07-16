-- =============================================================================
-- RLS Baseline (Documentation Snapshot) — pulled live 2026-07-14
-- =============================================================================
-- Companion to 20260714000000_schema_baseline_documentation.sql. The 34
-- original migrations that created these policies/functions were reconciled
-- out of the migration ledger before their SQL was captured (see Development
-- guide.md). This file recovers that SQL by reading it back from the live
-- project (fmikzzectrzpyuhkmmcg) via the Management API, so RLS is finally
-- reviewable as code instead of "trust it's right in prod".
--
-- DOCUMENTATION SNAPSHOT — this is already applied in production. Run
-- `supabase migration repair --status applied 20260714030000` after
-- verifying against live, do NOT blindly re-run against an already
-- initialized database (the CREATE POLICY statements are not idempotent
-- the way CREATE TABLE IF NOT EXISTS is — drop-if-exists guards are
-- included below for that reason).
-- =============================================================================

-- ── Helper functions (all SECURITY DEFINER, search_path pinned) ────────────
-- get_my_role() / get_my_gym_id() / is_gym_owner() / is_staff() /
-- is_super_admin() read public.profiles for the calling auth.uid() so RLS
-- policies can branch on role/tenant without each policy re-deriving it.
-- All were already correctly SECURITY DEFINER with search_path pinned to
-- 'public' — no search-path-injection gap found here.

CREATE OR REPLACE FUNCTION public.get_my_gym_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT gym_id FROM public.profiles WHERE id = auth.uid(); $$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT role FROM public.profiles WHERE id = auth.uid(); $$;

CREATE OR REPLACE FUNCTION public.is_gym_owner()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gym_owner'); $$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'staff'); $$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'); $$;

-- ── RLS policies, by table ──────────────────────────────────────────────────
-- Recovered verbatim from pg_policies. Grouped by table; comments flag the
-- one confirmed gap (profiles self-update — fixed by the migration
-- immediately before this one, 20260714020000).

-- achievements: seed/reference table, world-readable, no write policy for
-- any client role (writes are service-role only).
DROP POLICY IF EXISTS "anyone can view achievements" ON public.achievements;
CREATE POLICY "anyone can view achievements" ON public.achievements FOR SELECT USING (true);

-- attendance
DROP POLICY IF EXISTS "gym staff manage attendance" ON public.attendance;
CREATE POLICY "gym staff manage attendance" ON public.attendance FOR ALL
  USING (((gym_id = get_my_gym_id()) AND (get_my_role() = ANY (ARRAY['gym_owner','staff']))) OR is_super_admin());
DROP POLICY IF EXISTS "member sees own attendance" ON public.attendance;
CREATE POLICY "member sees own attendance" ON public.attendance FOR SELECT
  USING (member_id IN (SELECT id FROM public.members WHERE profile_id = auth.uid()));
DROP POLICY IF EXISTS "member self checkin" ON public.attendance;
CREATE POLICY "member self checkin" ON public.attendance FOR INSERT
  WITH CHECK (member_id IN (SELECT id FROM public.members WHERE profile_id = auth.uid()));

-- challenge_completions
DROP POLICY IF EXISTS "challenge_completions_gym" ON public.challenge_completions;
CREATE POLICY "challenge_completions_gym" ON public.challenge_completions FOR ALL
  USING (gym_id IN (SELECT gym_id FROM public.profiles WHERE id = auth.uid()));

-- diet_charts
DROP POLICY IF EXISTS "trainer can manage their diet charts" ON public.diet_charts;
CREATE POLICY "trainer can manage their diet charts" ON public.diet_charts FOR ALL
  USING (gym_id = get_my_gym_id());
DROP POLICY IF EXISTS "trainer can view own diet charts" ON public.diet_charts;
CREATE POLICY "trainer can view own diet charts" ON public.diet_charts FOR SELECT
  USING ((trainer_id = auth.uid()) OR (gym_id = get_my_gym_id()) OR is_super_admin());

-- fee_payments
DROP POLICY IF EXISTS "gym_members_delete_payments" ON public.fee_payments;
CREATE POLICY "gym_members_delete_payments" ON public.fee_payments FOR DELETE
  USING (member_id IN (SELECT id FROM public.members WHERE profile_id = auth.uid()));
DROP POLICY IF EXISTS "gym_members_insert_payments" ON public.fee_payments;
CREATE POLICY "gym_members_insert_payments" ON public.fee_payments FOR INSERT
  WITH CHECK (member_id IN (SELECT id FROM public.members WHERE profile_id = auth.uid()));
DROP POLICY IF EXISTS "gym_members_see_own_payments" ON public.fee_payments;
CREATE POLICY "gym_members_see_own_payments" ON public.fee_payments FOR SELECT
  USING (member_id IN (SELECT id FROM public.members WHERE profile_id = auth.uid()));
DROP POLICY IF EXISTS "gym_owner full access fee_payments" ON public.fee_payments;
CREATE POLICY "gym_owner full access fee_payments" ON public.fee_payments FOR ALL
  USING (((gym_id = get_my_gym_id()) AND is_gym_owner()) OR is_super_admin())
  WITH CHECK (((gym_id = get_my_gym_id()) AND is_gym_owner()) OR is_super_admin());
DROP POLICY IF EXISTS "staff can insert fee_payments" ON public.fee_payments;
CREATE POLICY "staff can insert fee_payments" ON public.fee_payments FOR INSERT
  WITH CHECK ((gym_id = get_my_gym_id()) AND is_staff());

-- gym_announcements
DROP POLICY IF EXISTS "gym owner manages announcements" ON public.gym_announcements;
CREATE POLICY "gym owner manages announcements" ON public.gym_announcements FOR ALL
  USING ((gym_id = get_my_gym_id()) OR is_super_admin());
DROP POLICY IF EXISTS "member sees gym announcements" ON public.gym_announcements;
CREATE POLICY "member sees gym announcements" ON public.gym_announcements FOR SELECT
  USING (gym_id IN (SELECT gym_id FROM public.profiles WHERE id = auth.uid()));

-- gym_challenges
DROP POLICY IF EXISTS "challenges_gym" ON public.gym_challenges;
CREATE POLICY "challenges_gym" ON public.gym_challenges FOR ALL
  USING (gym_id IN (SELECT gym_id FROM public.profiles WHERE id = auth.uid()));

-- gym_shifts
DROP POLICY IF EXISTS "gym_shifts_gym_access" ON public.gym_shifts;
CREATE POLICY "gym_shifts_gym_access" ON public.gym_shifts FOR ALL
  USING (gym_id IN (SELECT gym_id FROM public.profiles WHERE id = auth.uid()));

-- gyms
DROP POLICY IF EXISTS "gym_owner can update their own gym" ON public.gyms;
CREATE POLICY "gym_owner can update their own gym" ON public.gyms FOR UPDATE
  USING (id = get_my_gym_id());
DROP POLICY IF EXISTS "gym_owner can view their own gym" ON public.gyms;
CREATE POLICY "gym_owner can view their own gym" ON public.gyms FOR SELECT
  USING (id = get_my_gym_id());
DROP POLICY IF EXISTS "staff and members can view their own gym" ON public.gyms;
CREATE POLICY "staff and members can view their own gym" ON public.gyms FOR SELECT
  USING (id = get_my_gym_id());
DROP POLICY IF EXISTS "super_admin can manage all gyms" ON public.gyms;
CREATE POLICY "super_admin can manage all gyms" ON public.gyms FOR ALL
  USING (is_super_admin());

-- inventory
DROP POLICY IF EXISTS "gym access inventory" ON public.inventory;
CREATE POLICY "gym access inventory" ON public.inventory FOR ALL
  USING ((gym_id = get_my_gym_id()) OR is_super_admin());

-- member_achievements
DROP POLICY IF EXISTS "gym access member_achievements" ON public.member_achievements;
CREATE POLICY "gym access member_achievements" ON public.member_achievements FOR ALL
  USING ((gym_id = get_my_gym_id()) OR is_super_admin());
DROP POLICY IF EXISTS "member sees own achievements" ON public.member_achievements;
CREATE POLICY "member sees own achievements" ON public.member_achievements FOR SELECT
  USING (member_id IN (SELECT id FROM public.members WHERE profile_id = auth.uid()));

-- member_measurements
DROP POLICY IF EXISTS "gym access measurements" ON public.member_measurements;
CREATE POLICY "gym access measurements" ON public.member_measurements FOR SELECT
  USING ((gym_id = get_my_gym_id()) OR is_super_admin());
DROP POLICY IF EXISTS "member manages own measurements" ON public.member_measurements;
CREATE POLICY "member manages own measurements" ON public.member_measurements FOR ALL
  USING (member_id IN (SELECT id FROM public.members WHERE profile_id = auth.uid()));

-- member_streaks
DROP POLICY IF EXISTS "gym access streaks" ON public.member_streaks;
CREATE POLICY "gym access streaks" ON public.member_streaks FOR ALL
  USING ((gym_id = get_my_gym_id()) OR is_super_admin());
DROP POLICY IF EXISTS "member sees own streak" ON public.member_streaks;
CREATE POLICY "member sees own streak" ON public.member_streaks FOR SELECT
  USING (member_id IN (SELECT id FROM public.members WHERE profile_id = auth.uid()));

-- member_subscriptions
DROP POLICY IF EXISTS "gym_owner full access member_subscriptions" ON public.member_subscriptions;
CREATE POLICY "gym_owner full access member_subscriptions" ON public.member_subscriptions FOR ALL
  USING (((gym_id = get_my_gym_id()) AND is_gym_owner()) OR is_super_admin())
  WITH CHECK (((gym_id = get_my_gym_id()) AND is_gym_owner()) OR is_super_admin());
DROP POLICY IF EXISTS "staff can insert member_subscriptions" ON public.member_subscriptions;
CREATE POLICY "staff can insert member_subscriptions" ON public.member_subscriptions FOR INSERT
  WITH CHECK ((gym_id = get_my_gym_id()) AND is_staff());
DROP POLICY IF EXISTS "staff can view member subscriptions in their gym" ON public.member_subscriptions;
CREATE POLICY "staff can view member subscriptions in their gym" ON public.member_subscriptions FOR SELECT
  USING ((gym_id = get_my_gym_id()) AND is_staff());

-- member_workout_plans
DROP POLICY IF EXISTS "gym manage member_workout_plans" ON public.member_workout_plans;
CREATE POLICY "gym manage member_workout_plans" ON public.member_workout_plans FOR ALL
  USING ((gym_id = get_my_gym_id()) OR is_super_admin());
DROP POLICY IF EXISTS "member sees own workout plan" ON public.member_workout_plans;
CREATE POLICY "member sees own workout plan" ON public.member_workout_plans FOR SELECT
  USING (member_id IN (SELECT id FROM public.members WHERE profile_id = auth.uid()));

-- members
DROP POLICY IF EXISTS "gym staff/owner can manage their gym members" ON public.members;
CREATE POLICY "gym staff/owner can manage their gym members" ON public.members FOR ALL
  USING ((gym_id = get_my_gym_id()) AND (get_my_role() = ANY (ARRAY['gym_owner','staff'])));
DROP POLICY IF EXISTS "member can update their own record" ON public.members;
CREATE POLICY "member can update their own record" ON public.members FOR UPDATE
  USING (profile_id = auth.uid());
DROP POLICY IF EXISTS "member can view their own record" ON public.members;
CREATE POLICY "member can view their own record" ON public.members FOR SELECT
  USING (profile_id = auth.uid());
DROP POLICY IF EXISTS "super_admin manages all members" ON public.members;
CREATE POLICY "super_admin manages all members" ON public.members FOR ALL
  USING (is_super_admin());

-- notification_logs
DROP POLICY IF EXISTS "gym admin reads logs" ON public.notification_logs;
CREATE POLICY "gym admin reads logs" ON public.notification_logs FOR SELECT
  USING ((gym_id = get_my_gym_id()) OR is_super_admin());
DROP POLICY IF EXISTS "service can insert logs" ON public.notification_logs;
CREATE POLICY "service can insert logs" ON public.notification_logs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = ANY (ARRAY['admin','super_admin'])));

-- nutrition_logs
DROP POLICY IF EXISTS "nutrition_logs_gym" ON public.nutrition_logs;
CREATE POLICY "nutrition_logs_gym" ON public.nutrition_logs FOR ALL
  USING (gym_id IN (SELECT gym_id FROM public.profiles WHERE id = auth.uid()));

-- profiles
-- NOTE: "users can update their own profile" below is intentionally left as
-- USING-only (matching prod) — the escalation gap it has is closed by a
-- BEFORE UPDATE trigger in 20260714020000, not by rewriting this policy,
-- since a WITH CHECK here can't distinguish "same value, unchanged" from
-- "explicitly re-set to the same value" the way a trigger comparing
-- NEW/OLD can.
DROP POLICY IF EXISTS "gym staff view profiles in their gym" ON public.profiles;
CREATE POLICY "gym staff view profiles in their gym" ON public.profiles FOR SELECT
  USING (gym_id = get_my_gym_id());
DROP POLICY IF EXISTS "gym_owner can insert profiles" ON public.profiles;
CREATE POLICY "gym_owner can insert profiles" ON public.profiles FOR INSERT
  WITH CHECK (gym_id = get_my_gym_id());
DROP POLICY IF EXISTS "super_admin full access profiles" ON public.profiles;
CREATE POLICY "super_admin full access profiles" ON public.profiles FOR ALL
  USING (is_super_admin());
DROP POLICY IF EXISTS "users can update their own profile" ON public.profiles;
CREATE POLICY "users can update their own profile" ON public.profiles FOR UPDATE
  USING (id = auth.uid());
DROP POLICY IF EXISTS "users can view their own profile" ON public.profiles;
CREATE POLICY "users can view their own profile" ON public.profiles FOR SELECT
  USING (id = auth.uid());
DROP POLICY IF EXISTS "users read own profile always" ON public.profiles;
CREATE POLICY "users read own profile always" ON public.profiles FOR SELECT
  USING (id = auth.uid());

-- progress_logs
DROP POLICY IF EXISTS "progress_logs_gym" ON public.progress_logs;
CREATE POLICY "progress_logs_gym" ON public.progress_logs FOR ALL
  USING (gym_id IN (SELECT gym_id FROM public.profiles WHERE id = auth.uid()));

-- push_subscriptions
DROP POLICY IF EXISTS "gym admin reads push subs" ON public.push_subscriptions;
CREATE POLICY "gym admin reads push subs" ON public.push_subscriptions FOR SELECT
  USING ((gym_id = get_my_gym_id()) OR is_super_admin());
DROP POLICY IF EXISTS "member manages own push subs" ON public.push_subscriptions;
CREATE POLICY "member manages own push subs" ON public.push_subscriptions FOR ALL
  USING (profile_id = auth.uid());

-- staff
DROP POLICY IF EXISTS "gym access staff" ON public.staff;
CREATE POLICY "gym access staff" ON public.staff FOR ALL
  USING ((gym_id = get_my_gym_id()) OR is_super_admin());
DROP POLICY IF EXISTS "staff_read_own" ON public.staff;
CREATE POLICY "staff_read_own" ON public.staff FOR SELECT
  USING (profile_id = auth.uid());

-- staff_attendance
DROP POLICY IF EXISTS "staff_attendance_gym_access" ON public.staff_attendance;
CREATE POLICY "staff_attendance_gym_access" ON public.staff_attendance FOR ALL
  USING (gym_id IN (SELECT gym_id FROM public.profiles WHERE id = auth.uid()));

-- subscription_plans
DROP POLICY IF EXISTS "gym owner full access subscription_plans" ON public.subscription_plans;
CREATE POLICY "gym owner full access subscription_plans" ON public.subscription_plans FOR ALL
  USING (((gym_id = get_my_gym_id()) AND is_gym_owner()) OR is_super_admin())
  WITH CHECK (((gym_id = get_my_gym_id()) AND is_gym_owner()) OR is_super_admin());
DROP POLICY IF EXISTS "staff can read subscription_plans" ON public.subscription_plans;
CREATE POLICY "staff can read subscription_plans" ON public.subscription_plans FOR SELECT
  USING ((gym_id = get_my_gym_id()) AND is_staff());

-- trainer_assignments
DROP POLICY IF EXISTS "gym access trainer_assignments" ON public.trainer_assignments;
CREATE POLICY "gym access trainer_assignments" ON public.trainer_assignments FOR ALL
  USING ((gym_id = get_my_gym_id()) OR is_super_admin());
DROP POLICY IF EXISTS "gym_owner can manage trainer assignments" ON public.trainer_assignments;
CREATE POLICY "gym_owner can manage trainer assignments" ON public.trainer_assignments FOR ALL
  USING (gym_id = get_my_gym_id()) WITH CHECK (gym_id = get_my_gym_id());
DROP POLICY IF EXISTS "trainer can view own assignments" ON public.trainer_assignments;
CREATE POLICY "trainer can view own assignments" ON public.trainer_assignments FOR SELECT
  USING ((trainer_id = auth.uid()) OR (gym_id = get_my_gym_id()) OR is_super_admin());

-- trainer_notes
DROP POLICY IF EXISTS "gym access trainer notes" ON public.trainer_notes;
CREATE POLICY "gym access trainer notes" ON public.trainer_notes FOR ALL
  USING (gym_id = get_my_gym_id());
DROP POLICY IF EXISTS "trainer_notes_gym" ON public.trainer_notes;
CREATE POLICY "trainer_notes_gym" ON public.trainer_notes FOR ALL
  USING (gym_id IN (SELECT gym_id FROM public.profiles WHERE id = auth.uid()));

-- workout_exercises
DROP POLICY IF EXISTS "gym access workout_exercises" ON public.workout_exercises;
CREATE POLICY "gym access workout_exercises" ON public.workout_exercises FOR ALL
  USING ((plan_id IN (SELECT id FROM public.workout_plans WHERE gym_id = get_my_gym_id())) OR is_super_admin());

-- workout_logs
DROP POLICY IF EXISTS "gym access workout_logs" ON public.workout_logs;
CREATE POLICY "gym access workout_logs" ON public.workout_logs FOR ALL
  USING ((gym_id = get_my_gym_id()) OR is_super_admin());
DROP POLICY IF EXISTS "member manages own workout_logs" ON public.workout_logs;
CREATE POLICY "member manages own workout_logs" ON public.workout_logs FOR ALL
  USING (member_id IN (SELECT id FROM public.members WHERE profile_id = auth.uid()));

-- workout_plans
DROP POLICY IF EXISTS "gym access workout plans" ON public.workout_plans;
CREATE POLICY "gym access workout plans" ON public.workout_plans FOR ALL
  USING (gym_id = get_my_gym_id());
DROP POLICY IF EXISTS "gym access workout_plans" ON public.workout_plans;
CREATE POLICY "gym access workout_plans" ON public.workout_plans FOR ALL
  USING ((gym_id = get_my_gym_id()) OR is_super_admin());

-- =============================================================================
-- End of RLS baseline documentation
-- =============================================================================
