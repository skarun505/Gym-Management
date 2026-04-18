-- ============================================================
-- GymPro SaaS Platform — Full Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ============================================================
-- PART 1: CORE MULTI-TENANT TABLES
-- ============================================================

-- Gyms (one row per gym customer you sell to)
create table if not exists gyms (
  id            uuid default gen_random_uuid() primary key,
  gym_code      text unique not null,
  name          text not null,
  owner_name    text not null,
  email         text unique not null,
  phone         text,
  address       text,
  logo_url      text,
  theme_color   text default '#a21cce',
  plan          text default 'trial'
                  check (plan in ('trial','basic','pro','enterprise')),
  status        text default 'active'
                  check (status in ('active','suspended','trial')),
  max_members   integer default 50,
  max_staff     integer default 5,
  trial_ends_at timestamptz default (now() + interval '30 days'),
  created_at    timestamptz default now()
);

-- Profiles (extends Supabase auth.users — one per login account)
create table if not exists profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  gym_id      uuid references gyms(id) on delete cascade,
  full_name   text not null,
  phone       text,
  role        text not null check (role in ('super_admin','gym_owner','staff','member')),
  sub_role    text,        -- trainer / reception / manager (for staff role)
  photo_url   text,
  status      text default 'active' check (status in ('active','inactive','suspended')),
  created_at  timestamptz default now()
);

-- Members (gym members — may or may not have a login account)
create table if not exists members (
  id           uuid default gen_random_uuid() primary key,
  gym_id       uuid references gyms(id) on delete cascade not null,
  profile_id   uuid references profiles(id) on delete set null,
  member_code  text not null,
  full_name    text not null,
  dob          date,
  phone        text,
  email        text,
  address      text,
  photo_url    text,
  fitness_goal text,
  health_notes text,
  status       text default 'active' check (status in ('active','inactive')),
  joined_at    timestamptz default now(),
  unique(gym_id, member_code)
);

-- Subscription Plans (each gym creates their own plans)
create table if not exists subscription_plans (
  id        uuid default gen_random_uuid() primary key,
  gym_id    uuid references gyms(id) on delete cascade not null,
  plan_name text not null,
  duration  text check (duration in ('monthly','quarterly','yearly')),
  price     numeric(10,2) not null,
  created_at timestamptz default now()
);

-- Member Subscriptions
create table if not exists member_subscriptions (
  id         uuid default gen_random_uuid() primary key,
  gym_id     uuid references gyms(id) on delete cascade not null,
  member_id  uuid references members(id) on delete cascade,
  plan_id    uuid references subscription_plans(id),
  start_date date not null,
  end_date   date not null,
  status     text default 'active' check (status in ('active','expired','pending')),
  notes      text,
  created_at timestamptz default now()
);

-- Attendance
create table if not exists attendance (
  id         uuid default gen_random_uuid() primary key,
  gym_id     uuid references gyms(id) on delete cascade not null,
  member_id  uuid references members(id) on delete cascade,
  check_in   timestamptz not null default now(),
  check_out  timestamptz,
  marked_by  uuid references profiles(id) on delete set null,
  created_at date default current_date
);

-- Staff Assignments (trainer → member)
create table if not exists trainer_assignments (
  id          uuid default gen_random_uuid() primary key,
  gym_id      uuid references gyms(id) on delete cascade not null,
  trainer_id  uuid references profiles(id) on delete cascade,
  member_id   uuid references members(id) on delete cascade,
  assigned_on date default current_date,
  unique(gym_id, trainer_id, member_id)
);

-- Inventory
create table if not exists inventory (
  id              uuid default gen_random_uuid() primary key,
  gym_id          uuid references gyms(id) on delete cascade not null,
  item_name       text not null,
  quantity        integer default 0,
  condition       text check (condition in ('good','fair','poor')),
  purchase_date   date,
  supplier        text,
  maintenance_due date,
  low_stock_alert integer default 2,
  created_at      timestamptz default now()
);


-- ============================================================
-- PART 2: MEMBER PORTAL TABLES
-- ============================================================

-- Workout Plans (trainer creates templates)
create table if not exists workout_plans (
  id          uuid default gen_random_uuid() primary key,
  gym_id      uuid references gyms(id) on delete cascade not null,
  name        text not null,
  description text,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz default now()
);

-- Exercises within a plan (by day)
create table if not exists workout_exercises (
  id          uuid default gen_random_uuid() primary key,
  plan_id     uuid references workout_plans(id) on delete cascade,
  day_number  integer not null,
  day_label   text,            -- "Monday", "Push Day", etc.
  exercise    text not null,   -- "Bench Press"
  sets        integer,
  reps        text,            -- "8-12" or "As many as possible"
  rest_sec    integer,
  notes       text,
  video_url   text,
  order_index integer default 0
);

-- Assign a plan to a specific member
create table if not exists member_workout_plans (
  id          uuid default gen_random_uuid() primary key,
  gym_id      uuid references gyms(id) on delete cascade not null,
  member_id   uuid references members(id) on delete cascade,
  plan_id     uuid references workout_plans(id) on delete cascade,
  assigned_by uuid references profiles(id) on delete set null,
  assigned_on date default current_date,
  is_active   boolean default true
);

-- Member logs each workout session
create table if not exists workout_logs (
  id           uuid default gen_random_uuid() primary key,
  gym_id       uuid references gyms(id) on delete cascade not null,
  member_id    uuid references members(id) on delete cascade,
  exercise     text not null,
  logged_date  date default current_date,
  sets_done    integer,
  reps_done    text,
  weight_kg    numeric(6,2),
  duration_min integer,
  notes        text,
  is_pr        boolean default false,      -- personal record flag
  created_at   timestamptz default now()
);

-- Body measurements (weight, body fat, circumferences)
create table if not exists member_measurements (
  id            uuid default gen_random_uuid() primary key,
  gym_id        uuid references gyms(id) on delete cascade not null,
  member_id     uuid references members(id) on delete cascade,
  logged_date   date default current_date,
  weight_kg     numeric(5,2),
  body_fat_pct  numeric(4,2),
  chest_cm      numeric(5,2),
  waist_cm      numeric(5,2),
  hip_cm        numeric(5,2),
  bicep_cm      numeric(5,2),
  thigh_cm      numeric(5,2),
  notes         text,
  created_at    timestamptz default now()
);


-- ============================================================
-- PART 3: GAMIFICATION TABLES
-- ============================================================

-- Achievement definitions (global master list — seeded below)
create table if not exists achievements (
  id          uuid default gen_random_uuid() primary key,
  code        text unique not null,
  title       text not null,
  description text,
  icon        text,       -- emoji
  category    text check (category in ('streak','milestone','special'))
);

-- Achievements earned by members
create table if not exists member_achievements (
  id             uuid default gen_random_uuid() primary key,
  gym_id         uuid references gyms(id) on delete cascade not null,
  member_id      uuid references members(id) on delete cascade,
  achievement_id uuid references achievements(id),
  earned_at      timestamptz default now(),
  unique(member_id, achievement_id)
);

-- Streak tracking (one row per member, updated on each check-in)
create table if not exists member_streaks (
  member_id       uuid primary key references members(id) on delete cascade,
  gym_id          uuid references gyms(id) on delete cascade not null,
  current_streak  integer default 0,
  longest_streak  integer default 0,
  last_checkin    date,
  total_checkins  integer default 0
);


-- ============================================================
-- PART 4: SEED DEFAULT ACHIEVEMENTS
-- ============================================================

insert into achievements (code, title, description, icon, category) values
  ('FIRST_CHECKIN',   'First Step',         'Completed your very first gym visit',          '🔥', 'milestone'),
  ('STREAK_7',        '7-Day Warrior',      'Attended the gym 7 days in a row',             '💪', 'streak'),
  ('STREAK_30',       '30-Day Champion',    'Attended the gym 30 days in a row',            '🌟', 'streak'),
  ('STREAK_60',       'Diamond Grinder',    'Attended the gym 60 days in a row',            '💎', 'streak'),
  ('STREAK_90',       'Iron Man',           'Attended the gym 90 days in a row',            '🏆', 'streak'),
  ('TOTAL_50',        'Half Century',       'Completed 50 total gym visits',                '5️⃣0️⃣', 'milestone'),
  ('TOTAL_100',       'Century Club',       'Completed 100 total gym visits',               '💯', 'milestone'),
  ('TOTAL_250',       'Elite Member',       'Completed 250 total gym visits',               '🦅', 'milestone'),
  ('PERFECT_WEEK',    'Perfect Week',       'Checked in every day of the week (7/7)',       '📅', 'special'),
  ('EARLY_BIRD',      'Early Bird',         'Checked in before 7 AM five times',            '🌅', 'special'),
  ('PR_BREAKER',      'PR Breaker',         'Set a new personal record in any exercise',    '⚡', 'special'),
  ('COMEBACK_KID',    'Comeback Kid',       'Returned to the gym after a 14-day absence',  '🙌', 'special'),
  ('ANNIVERSARY_1',   '1-Year Anniversary', 'One full year since you joined the gym',       '🎂', 'milestone'),
  ('NIGHT_OWL',       'Night Owl',          'Checked in after 9 PM five times',             '🦉', 'special')
on conflict (code) do nothing;


-- ============================================================
-- PART 5: ROW LEVEL SECURITY (TENANT ISOLATION)
-- ============================================================

-- Enable RLS on every table
alter table gyms enable row level security;
alter table profiles enable row level security;
alter table members enable row level security;
alter table subscription_plans enable row level security;
alter table member_subscriptions enable row level security;
alter table attendance enable row level security;
alter table trainer_assignments enable row level security;
alter table inventory enable row level security;
alter table workout_plans enable row level security;
alter table workout_exercises enable row level security;
alter table member_workout_plans enable row level security;
alter table workout_logs enable row level security;
alter table member_measurements enable row level security;
alter table achievements enable row level security;
alter table member_achievements enable row level security;
alter table member_streaks enable row level security;

-- Helper function: get the current user's gym_id
create or replace function get_my_gym_id()
returns uuid
language sql
stable
as $$
  select gym_id from profiles where id = auth.uid()
$$;

-- Helper function: get the current user's role
create or replace function get_my_role()
returns text
language sql
stable
as $$
  select role from profiles where id = auth.uid()
$$;

-- Helper function: check if current user is super admin
create or replace function is_super_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'super_admin'
  )
$$;

-- ── GYMS TABLE ──
create policy "super_admin can manage all gyms"
  on gyms for all
  using (is_super_admin());

create policy "gym_owner can view their own gym"
  on gyms for select
  using (id = get_my_gym_id());

create policy "gym_owner can update their own gym"
  on gyms for update
  using (id = get_my_gym_id());

-- ── PROFILES TABLE ──
create policy "super_admin manages all profiles"
  on profiles for all
  using (is_super_admin());

create policy "users can view their own profile"
  on profiles for select
  using (id = auth.uid());

create policy "users can update their own profile"
  on profiles for update
  using (id = auth.uid());

create policy "gym_owner and staff can view profiles in their gym"
  on profiles for select
  using (
    gym_id = get_my_gym_id()
    and get_my_role() in ('gym_owner','staff')
  );

create policy "gym_owner can create profiles in their gym"
  on profiles for insert
  with check (
    gym_id = get_my_gym_id()
    and get_my_role() = 'gym_owner'
  );

-- ── MEMBERS TABLE ──
create policy "super_admin manages all members"
  on members for all
  using (is_super_admin());

create policy "gym staff/owner can manage their gym members"
  on members for all
  using (
    gym_id = get_my_gym_id()
    and get_my_role() in ('gym_owner','staff')
  );

create policy "member can view their own record"
  on members for select
  using (profile_id = auth.uid());

create policy "member can update their own record"
  on members for update
  using (profile_id = auth.uid());

-- ── GENERIC GYM-SCOPED POLICY HELPER (for remaining tables) ──
-- These tables are accessible to gym_owner and staff of the same gym,
-- and to members for their own rows.

-- subscription_plans
create policy "gym access subscription_plans"
  on subscription_plans for all
  using (gym_id = get_my_gym_id() or is_super_admin());

-- member_subscriptions
create policy "gym access member_subscriptions"
  on member_subscriptions for all
  using (gym_id = get_my_gym_id() or is_super_admin());

-- attendance (staff marks, member sees own)
create policy "gym staff manage attendance"
  on attendance for all
  using (
    (gym_id = get_my_gym_id() and get_my_role() in ('gym_owner','staff'))
    or is_super_admin()
  );

create policy "member sees own attendance"
  on attendance for select
  using (
    member_id in (select id from members where profile_id = auth.uid())
  );

create policy "member self checkin"
  on attendance for insert
  with check (
    gym_id = get_my_gym_id()
    and member_id in (select id from members where profile_id = auth.uid())
    and get_my_role() = 'member'
  );

-- inventory
create policy "gym access inventory"
  on inventory for all
  using (gym_id = get_my_gym_id() or is_super_admin());

-- trainer_assignments
create policy "gym access trainer_assignments"
  on trainer_assignments for all
  using (gym_id = get_my_gym_id() or is_super_admin());

-- workout_plans
create policy "gym access workout_plans"
  on workout_plans for all
  using (gym_id = get_my_gym_id() or is_super_admin());

-- workout_exercises (accessible via plan)
create policy "gym access workout_exercises"
  on workout_exercises for all
  using (
    plan_id in (select id from workout_plans where gym_id = get_my_gym_id())
    or is_super_admin()
  );

-- member_workout_plans
create policy "gym manage member_workout_plans"
  on member_workout_plans for all
  using (gym_id = get_my_gym_id() or is_super_admin());

create policy "member sees own workout plan"
  on member_workout_plans for select
  using (
    member_id in (select id from members where profile_id = auth.uid())
  );

-- workout_logs
create policy "gym access workout_logs"
  on workout_logs for all
  using (gym_id = get_my_gym_id() or is_super_admin());

create policy "member manages own workout_logs"
  on workout_logs for all
  using (
    member_id in (select id from members where profile_id = auth.uid())
  );

-- member_measurements
create policy "gym access measurements"
  on member_measurements for select
  using (gym_id = get_my_gym_id() or is_super_admin());

create policy "member manages own measurements"
  on member_measurements for all
  using (
    member_id in (select id from members where profile_id = auth.uid())
  );

-- achievements (everyone can read)
create policy "anyone can view achievements"
  on achievements for select
  using (true);

-- member_achievements
create policy "gym access member_achievements"
  on member_achievements for all
  using (gym_id = get_my_gym_id() or is_super_admin());

create policy "member sees own achievements"
  on member_achievements for select
  using (
    member_id in (select id from members where profile_id = auth.uid())
  );

-- member_streaks
create policy "gym access streaks"
  on member_streaks for all
  using (gym_id = get_my_gym_id() or is_super_admin());

create policy "member sees own streak"
  on member_streaks for select
  using (
    member_id in (select id from members where profile_id = auth.uid())
  );


-- ============================================================
-- PART 6: CREATE SUPER ADMIN USER
-- (Run this AFTER creating your account via Supabase Auth)
-- Replace 'YOUR-AUTH-USER-ID' with your actual user UUID from
-- Supabase Dashboard > Authentication > Users
-- ============================================================

-- insert into profiles (id, gym_id, full_name, role, status)
-- values ('YOUR-AUTH-USER-ID', null, 'Super Admin', 'super_admin', 'active');


-- ============================================================
-- ✅ DONE! All tables, RLS policies, and seed data are created.
-- ============================================================
