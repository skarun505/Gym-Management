-- =============================================================================
-- GymPro — Schema Baseline (Documentation Snapshot)
-- Migration: 20260714000000_schema_baseline_documentation.sql
-- =============================================================================
-- PURPOSE:
--   This file documents the full live schema as it exists in the Supabase
--   project (fmikzzectrzpyuhkmmcg) as of 2026-07-14. It was captured using
--   the Supabase Management API because `supabase db dump` / `db pull`
--   requires Docker which had SSL/network issues in this environment.
--
--   The 34 original migrations (2026-04-18 to 2026-05-10) that created this
--   schema were reconciled out of the migration ledger (`migration repair
--   --status reverted`). This file serves as the new authoritative starting
--   point for the local migration history.
--
-- NOTE:
--   This migration is marked as a DOCUMENTATION SNAPSHOT. Run `supabase
--   migration repair --status applied 20260714000000` after verifying the
--   schema matches production — do NOT re-run CREATE TABLE statements below
--   against an already-initialized database.
--
--   To add changes going forward: create a new numbered migration file.
-- =============================================================================

-- ── Extensions ────────────────────────────────────────────────────────────────
-- These are expected to already exist in the Supabase project.
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── gyms ──────────────────────────────────────────────────────────────────────
-- Core tenant table. Each row = one gym business.
-- `plan` controls feature access (free/basic/pro/enterprise).
-- `owner_auth_id` added in 20260711120000_add_gym_owner_auth_id.sql.
CREATE TABLE IF NOT EXISTS public.gyms (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_code            text UNIQUE,
  name                text NOT NULL,
  owner_name          text,
  email               text,
  phone               text,
  address             text,
  logo_url            text,
  theme_color         text,
  plan                text DEFAULT 'free',
  status              text DEFAULT 'active',
  max_members         integer DEFAULT 50,
  max_staff           integer DEFAULT 5,
  trial_ends_at       timestamptz,
  created_at          timestamptz DEFAULT now(),
  website             text,
  instagram           text,
  established_year    integer,
  plan_expires_at     timestamptz,
  monthly_price       integer,
  owner_auth_id       uuid REFERENCES auth.users(id)
);

-- ── profiles ──────────────────────────────────────────────────────────────────
-- Mirror of auth.users for gym-scoped role/profile data.
-- One profile per auth user per gym. `role`: gym_owner | staff | member | super_admin.
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  gym_id      uuid REFERENCES public.gyms(id) ON DELETE CASCADE,
  full_name   text,
  phone       text,
  role        text NOT NULL,
  sub_role    text,
  photo_url   text,
  status      text DEFAULT 'active',
  created_at  timestamptz DEFAULT now()
);

-- ── members ───────────────────────────────────────────────────────────────────
-- Gym members (physical people who train at the gym).
-- `profile_id` links to auth when the member has a portal login.
-- `admission_fee` auto-syncs to fee_payments via trg_sync_admission_fee trigger.
CREATE TABLE IF NOT EXISTS public.members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id        uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  profile_id    uuid REFERENCES public.profiles(id),
  member_code   text,
  full_name     text NOT NULL,
  dob           date,
  phone         text,
  email         text,
  address       text,
  photo_url     text,
  fitness_goal  text,
  health_notes  text,
  status        text DEFAULT 'active',
  joined_at     timestamptz DEFAULT now(),
  admission_fee numeric
);

-- ── staff ─────────────────────────────────────────────────────────────────────
-- Gym staff (trainers, receptionists, managers, etc.).
-- `shift_info` is legacy free-text. `shift_id` FK → gym_shifts is the newer system.
-- IMPORTANT: column is `shift_info` NOT `shift` — hand-written column bugs found here.
CREATE TABLE IF NOT EXISTS public.staff (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  profile_id  uuid REFERENCES public.profiles(id),
  full_name   text NOT NULL,
  role        text DEFAULT 'trainer',
  phone       text,
  email       text,
  shift_info  text,
  status      text DEFAULT 'active',
  created_at  timestamptz DEFAULT now(),
  dob         date,
  salary      numeric,
  photo_url   text,
  shift_id    uuid,
  staff_code  text
);

-- ── subscription_plans ────────────────────────────────────────────────────────
-- Plan templates defined per gym. Members subscribe to these.
-- `duration`: 'monthly' | 'quarterly' | 'yearly'
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  plan_name   text NOT NULL,
  duration    text,
  price       numeric NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- ── member_subscriptions ──────────────────────────────────────────────────────
-- Active and historical subscriptions linking members to plans.
-- `paid_confirmed` = true when payment is recorded for this subscription period.
-- `reminder_*d_sent` flags prevent duplicate reminders.
CREATE TABLE IF NOT EXISTS public.member_subscriptions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id            uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  member_id         uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  plan_id           uuid REFERENCES public.subscription_plans(id),
  start_date        date,
  end_date          date,
  status            text DEFAULT 'active',
  notes             text,
  created_at        timestamptz DEFAULT now(),
  reminder_7d_sent  boolean DEFAULT false,
  reminder_3d_sent  boolean DEFAULT false,
  reminder_24h_sent boolean DEFAULT false,
  paid_confirmed    boolean DEFAULT false,
  paid_at           timestamptz,
  amount_due        numeric
);

-- ── fee_payments ──────────────────────────────────────────────────────────────
-- Payment records. `payment_date` is DATE (not timestamptz).
-- Admission fee payments auto-inserted by trg_sync_admission_fee trigger.
-- Note: there is NO `receipt_no` column.
CREATE TABLE IF NOT EXISTS public.fee_payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id          uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  member_id       uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.member_subscriptions(id),
  amount_paid     numeric NOT NULL,
  payment_date    date NOT NULL DEFAULT CURRENT_DATE,
  payment_method  text,
  notes           text,
  created_at      timestamptz DEFAULT now()
);

-- ── attendance ────────────────────────────────────────────────────────────────
-- Check-in / check-out records.
-- UNUSUAL: `created_at` is DATE not timestamptz. `check_in`/`check_out` are timestamptz.
CREATE TABLE IF NOT EXISTS public.attendance (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  member_id   uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  check_in    timestamptz,
  check_out   timestamptz,
  marked_by   uuid REFERENCES public.profiles(id),
  created_at  date DEFAULT CURRENT_DATE
);

-- ── inventory ─────────────────────────────────────────────────────────────────
-- Gym equipment/inventory management.
-- IMPORTANT: name column is `item_name` NOT `name` — this caused a silent bug
-- in NotificationBell.jsx (fixed 2026-07-14).
CREATE TABLE IF NOT EXISTS public.inventory (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id          uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  item_name       text NOT NULL,
  quantity        integer DEFAULT 0,
  condition       text DEFAULT 'good',
  purchase_date   date,
  supplier        text,
  maintenance_due date,
  low_stock_alert integer DEFAULT 2,
  created_at      timestamptz DEFAULT now()
);

-- ── gym_announcements ─────────────────────────────────────────────────────────
-- Announcements/notifications from gym owner to all members.
-- `badge_type` / `triggered_by_member_id` are for achievement-based auto-announcements.
CREATE TABLE IF NOT EXISTS public.gym_announcements (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id                  uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  title                   text NOT NULL,
  body                    text,
  emoji                   text,
  priority                text DEFAULT 'normal',
  is_active               boolean DEFAULT true,
  posted_by               uuid REFERENCES public.profiles(id),
  expires_at              date,
  created_at              timestamptz DEFAULT now(),
  badge_type              text,
  triggered_by_member_id  uuid REFERENCES public.members(id)
);

-- ── achievements ──────────────────────────────────────────────────────────────
-- Seed/reference table of available badges. Not gym-specific (no gym_id).
CREATE TABLE IF NOT EXISTS public.achievements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  icon        text,
  condition   jsonb,
  created_at  timestamptz DEFAULT now()
);

-- ── member_achievements ───────────────────────────────────────────────────────
-- Junction: which achievements each member has earned.
CREATE TABLE IF NOT EXISTS public.member_achievements (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id      uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id),
  earned_at      timestamptz DEFAULT now(),
  gym_id         uuid REFERENCES public.gyms(id)
);

-- ── member_streaks ────────────────────────────────────────────────────────────
-- Tracks check-in streaks per member (updated by process-checkin edge function).
CREATE TABLE IF NOT EXISTS public.member_streaks (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id      uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  gym_id         uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  last_checkin   date,
  updated_at     timestamptz DEFAULT now()
);

-- ── member_measurements ───────────────────────────────────────────────────────
-- Body measurements log per member.
CREATE TABLE IF NOT EXISTS public.member_measurements (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id       uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  member_id    uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  measured_at  date DEFAULT CURRENT_DATE,
  weight_kg    numeric,
  height_cm    numeric,
  chest_cm     numeric,
  waist_cm     numeric,
  hips_cm      numeric,
  arms_cm      numeric,
  thighs_cm    numeric,
  body_fat_pct numeric,
  notes        text
);

-- ── progress_logs ─────────────────────────────────────────────────────────────
-- Member progress tracking (body metrics over time).
CREATE TABLE IF NOT EXISTS public.progress_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id        uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  member_id     uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  log_date      date DEFAULT CURRENT_DATE,
  weight_kg     numeric,
  chest_cm      numeric,
  waist_cm      numeric,
  hips_cm       numeric,
  arms_cm       numeric,
  thighs_cm     numeric,
  body_fat_pct  numeric,
  notes         text,
  created_at    timestamptz DEFAULT now()
);

-- ── nutrition_logs ────────────────────────────────────────────────────────────
-- Daily nutrition tracking per member.
CREATE TABLE IF NOT EXISTS public.nutrition_logs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id         uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  member_id      uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  log_date       date DEFAULT CURRENT_DATE,
  calories       integer,
  protein_g      numeric,
  carbs_g        numeric,
  fat_g          numeric,
  water_glasses  integer,
  notes          text,
  created_at     timestamptz DEFAULT now()
);

-- ── workout_plans ─────────────────────────────────────────────────────────────
-- Reusable workout plan templates (created by trainers or gym).
CREATE TABLE IF NOT EXISTS public.workout_plans (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  created_by  uuid REFERENCES public.profiles(id),
  name        text NOT NULL,
  description text,
  goal        text,
  duration_weeks integer,
  difficulty  text,
  is_public   boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- ── workout_exercises ─────────────────────────────────────────────────────────
-- Exercises within a workout plan.
CREATE TABLE IF NOT EXISTS public.workout_exercises (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id      uuid NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  gym_id       uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  day_number   integer,
  exercise_name text NOT NULL,
  sets         integer,
  reps         text,
  duration_min integer,
  notes        text,
  order_index  integer DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

-- ── member_workout_plans ──────────────────────────────────────────────────────
-- Assignment of workout plans to specific members.
CREATE TABLE IF NOT EXISTS public.member_workout_plans (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  member_id   uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  plan_id     uuid NOT NULL REFERENCES public.workout_plans(id),
  assigned_by uuid REFERENCES public.profiles(id),
  assigned_at timestamptz DEFAULT now(),
  status      text DEFAULT 'active'
);

-- ── workout_logs ──────────────────────────────────────────────────────────────
-- Actual workout sessions logged by members.
CREATE TABLE IF NOT EXISTS public.workout_logs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id         uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  member_id      uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  plan_id        uuid REFERENCES public.workout_plans(id),
  log_date       date DEFAULT CURRENT_DATE,
  duration_min   integer,
  calories_burned integer,
  exercises_done jsonb,
  notes          text,
  mood           text,
  energy_level   integer,
  created_at     timestamptz DEFAULT now()
);

-- ── trainer_assignments ───────────────────────────────────────────────────────
-- Links members to their assigned trainers.
CREATE TABLE IF NOT EXISTS public.trainer_assignments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  trainer_id  uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  member_id   uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  status      text DEFAULT 'active',
  notes       text
);

-- ── trainer_notes ─────────────────────────────────────────────────────────────
-- Notes written by trainers about specific members.
CREATE TABLE IF NOT EXISTS public.trainer_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  trainer_id  uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  member_id   uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  note_date   date NOT NULL DEFAULT CURRENT_DATE,
  note        text NOT NULL,
  note_type   text NOT NULL DEFAULT 'general',
  created_at  timestamptz DEFAULT now()
);

-- ── diet_charts ───────────────────────────────────────────────────────────────
-- Diet/meal plans created by trainers for members.
CREATE TABLE IF NOT EXISTS public.diet_charts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  trainer_id  uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  member_id   uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  title       text NOT NULL,
  meals       jsonb,
  notes       text,
  valid_from  date,
  valid_until date,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- ── gym_shifts ────────────────────────────────────────────────────────────────
-- Shift definitions for staff scheduling.
CREATE TABLE IF NOT EXISTS public.gym_shifts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  name        text NOT NULL,
  start_time  time,
  end_time    time,
  days        jsonb,
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- ── staff_attendance ──────────────────────────────────────────────────────────
-- Check-in/out records for staff members.
CREATE TABLE IF NOT EXISTS public.staff_attendance (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  staff_id    uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  shift_id    uuid REFERENCES public.gym_shifts(id),
  check_in    timestamptz,
  check_out   timestamptz,
  status      text DEFAULT 'present',
  notes       text,
  date        date DEFAULT CURRENT_DATE,
  created_at  timestamptz DEFAULT now()
);

-- ── gym_challenges ────────────────────────────────────────────────────────────
-- Fitness challenges created by gyms for member engagement.
CREATE TABLE IF NOT EXISTS public.gym_challenges (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id        uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  title         text NOT NULL,
  description   text,
  challenge_type text,
  target_value  numeric,
  target_unit   text,
  start_date    date,
  end_date      date,
  reward_badge  text,
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

-- ── challenge_completions ─────────────────────────────────────────────────────
-- Records which members completed which challenges.
CREATE TABLE IF NOT EXISTS public.challenge_completions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id  uuid NOT NULL REFERENCES public.gym_challenges(id) ON DELETE CASCADE,
  member_id     uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  completed_at  timestamptz DEFAULT now(),
  gym_id        uuid REFERENCES public.gyms(id)
);

-- ── notification_logs ─────────────────────────────────────────────────────────
-- Deduplication table for send-reminders edge function.
-- Unique constraint on (member_id, type, channel, sent_date) prevents duplicate sends.
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  member_id   uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  type        text NOT NULL,
  channel     text NOT NULL DEFAULT 'email',
  subject     text,
  status      text NOT NULL DEFAULT 'sent',
  error_msg   text,
  sent_date   date NOT NULL DEFAULT CURRENT_DATE,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (member_id, type, channel, sent_date)
);

-- ── push_subscriptions ────────────────────────────────────────────────────────
-- Web Push (VAPID) subscriptions per member device.
-- Used by web-push-notify edge function.
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id        uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  member_id     uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  endpoint      text NOT NULL,
  p256dh        text NOT NULL,
  auth          text NOT NULL,
  user_agent    text,
  subscribed_at timestamptz DEFAULT now(),
  is_active     boolean DEFAULT true
);

-- ── monthly_leaderboard (VIEW) ────────────────────────────────────────────────
-- Computed view — no CREATE TABLE needed. Documented here for reference.
-- This view aggregates check-in counts per member per month for leaderboard display.
-- CREATE VIEW public.monthly_leaderboard AS ...

-- =============================================================================
-- End of schema baseline documentation
-- =============================================================================
