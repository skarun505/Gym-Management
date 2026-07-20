-- ============================================================
-- GymPro — Comprehensive QC Test Accounts Seed Script
-- Run in: Supabase Dashboard → SQL Editor → New Query
--
-- Creates testing gyms for ALL 4 PACKAGES (Trial, Starter, Pro, Elite)
-- Each gym gets a Gym Owner, 1 Staff (Reception), and 1 Member.
-- Plus 1 Super Admin account.
--
-- ALL PASSWORDS ARE THE SAME: Test@1234
--
-- WARNING: Run this ONLY on a fresh/test project.
-- ============================================================

-- ── Step 0: Clean up previous QC test data ──────────────────
-- Delete gyms first (cascades to members, staff, subscriptions)
DELETE FROM public.gyms WHERE gym_code LIKE 'QC-%';
-- Delete users (cascades to profiles, though triggers might re-fire on insert)
DELETE FROM auth.users WHERE email LIKE '%@qctest.com' OR email = 'superadmin@gympro.in';

-- ── Step 1: Create Auth Users (Password: Test@1234) ─────────
-- (Using the same password for all to make QC testing easier)

-- 1a. Super Admin
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, aud, role, confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES 
(gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'superadmin@gympro.in', crypt('Test@1234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Super Admin"}', 'authenticated', 'authenticated', '', '', '', '');

-- 1b. TRIAL Package Users
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role, confirmation_token, recovery_token, email_change_token_new, email_change) VALUES 
(gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'owner.trial@qctest.com', crypt('Test@1234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Trial Owner"}', 'authenticated', 'authenticated', '', '', '', ''),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'staff.trial@qctest.com', crypt('Test@1234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Trial Staff"}', 'authenticated', 'authenticated', '', '', '', ''),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'member.trial@qctest.com', crypt('Test@1234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Trial Member"}', 'authenticated', 'authenticated', '', '', '', '');

-- 1c. STARTER Package Users
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role, confirmation_token, recovery_token, email_change_token_new, email_change) VALUES 
(gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'owner.starter@qctest.com', crypt('Test@1234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Starter Owner"}', 'authenticated', 'authenticated', '', '', '', ''),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'staff.starter@qctest.com', crypt('Test@1234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Starter Staff"}', 'authenticated', 'authenticated', '', '', '', ''),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'member.starter@qctest.com', crypt('Test@1234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Starter Member"}', 'authenticated', 'authenticated', '', '', '', '');

-- 1d. PRO Package Users
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role, confirmation_token, recovery_token, email_change_token_new, email_change) VALUES 
(gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'owner.pro@qctest.com', crypt('Test@1234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Pro Owner"}', 'authenticated', 'authenticated', '', '', '', ''),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'staff.pro@qctest.com', crypt('Test@1234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Pro Staff"}', 'authenticated', 'authenticated', '', '', '', ''),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'member.pro@qctest.com', crypt('Test@1234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Pro Member"}', 'authenticated', 'authenticated', '', '', '', '');

-- 1e. ELITE Package Users
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role, confirmation_token, recovery_token, email_change_token_new, email_change) VALUES 
(gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'owner.elite@qctest.com', crypt('Test@1234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Elite Owner"}', 'authenticated', 'authenticated', '', '', '', ''),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'staff.elite@qctest.com', crypt('Test@1234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Elite Staff"}', 'authenticated', 'authenticated', '', '', '', ''),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'member.elite@qctest.com', crypt('Test@1234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Elite Member"}', 'authenticated', 'authenticated', '', '', '', '');

-- ── Step 2: Super Admin Profile ─────────────────────────────
INSERT INTO public.profiles (id, gym_id, full_name, role, status)
SELECT id, null, 'Super Admin', 'super_admin', 'active'
FROM auth.users WHERE email = 'superadmin@gympro.in'
ON CONFLICT (id) DO UPDATE SET gym_id = EXCLUDED.gym_id, role = EXCLUDED.role, full_name = EXCLUDED.full_name;

-- ── Step 3: Create Gyms for each Package ────────────────────
INSERT INTO public.gyms (gym_code, name, owner_name, email, phone, plan, status, max_members, max_staff, owner_auth_id)
SELECT 'QC-TRIAL', 'QC Trial Gym', 'Trial Owner', 'owner.trial@qctest.com', '1111111111', 'trial', 'active', 50, 5, u.id FROM auth.users u WHERE u.email = 'owner.trial@qctest.com'
ON CONFLICT (gym_code) DO NOTHING;

INSERT INTO public.gyms (gym_code, name, owner_name, email, phone, plan, status, max_members, max_staff, owner_auth_id)
SELECT 'QC-STARTER', 'QC Starter Gym', 'Starter Owner', 'owner.starter@qctest.com', '2222222222', 'starter', 'active', 50, 5, u.id FROM auth.users u WHERE u.email = 'owner.starter@qctest.com'
ON CONFLICT (gym_code) DO NOTHING;

INSERT INTO public.gyms (gym_code, name, owner_name, email, phone, plan, status, max_members, max_staff, owner_auth_id)
SELECT 'QC-PRO', 'QC Pro Gym', 'Pro Owner', 'owner.pro@qctest.com', '3333333333', 'pro', 'active', 300, 20, u.id FROM auth.users u WHERE u.email = 'owner.pro@qctest.com'
ON CONFLICT (gym_code) DO NOTHING;

INSERT INTO public.gyms (gym_code, name, owner_name, email, phone, plan, status, max_members, max_staff, owner_auth_id)
SELECT 'QC-ELITE', 'QC Elite Gym', 'Elite Owner', 'owner.elite@qctest.com', '4444444444', 'elite', 'active', 1000, 50, u.id FROM auth.users u WHERE u.email = 'owner.elite@qctest.com'
ON CONFLICT (gym_code) DO NOTHING;

-- ── Step 4: Gym Owner Profiles ──────────────────────────────
INSERT INTO public.profiles (id, gym_id, full_name, role, status)
SELECT u.id, g.id, split_part(u.email, '@', 1), 'gym_owner', 'active'
FROM auth.users u
JOIN public.gyms g ON g.gym_code = 'QC-' || UPPER(split_part(split_part(u.email, '@', 1), '.', 2))
WHERE u.email LIKE 'owner.%@qctest.com'
ON CONFLICT (id) DO UPDATE SET gym_id = EXCLUDED.gym_id, role = EXCLUDED.role, full_name = EXCLUDED.full_name;

-- ── Step 5: Staff Profiles + Staff Rows ─────────────────────
INSERT INTO public.profiles (id, gym_id, full_name, role, sub_role, status)
SELECT u.id, g.id, split_part(u.email, '@', 1), 'staff', 'reception', 'active'
FROM auth.users u
JOIN public.gyms g ON g.gym_code = 'QC-' || UPPER(split_part(split_part(u.email, '@', 1), '.', 2))
WHERE u.email LIKE 'staff.%@qctest.com'
ON CONFLICT (id) DO UPDATE SET gym_id = EXCLUDED.gym_id, role = EXCLUDED.role, full_name = EXCLUDED.full_name, sub_role = EXCLUDED.sub_role;

INSERT INTO public.staff (gym_id, profile_id, full_name, role, phone, email, status)
SELECT g.id, u.id, split_part(u.email, '@', 1), 'reception', '9999999999', u.email, 'active'
FROM auth.users u
JOIN public.gyms g ON g.gym_code = 'QC-' || UPPER(split_part(split_part(u.email, '@', 1), '.', 2))
WHERE u.email LIKE 'staff.%@qctest.com';

-- ── Step 6: Member Profiles + Member Rows ───────────────────
INSERT INTO public.profiles (id, gym_id, full_name, role, status)
SELECT u.id, g.id, split_part(u.email, '@', 1), 'member', 'active'
FROM auth.users u
JOIN public.gyms g ON g.gym_code = 'QC-' || UPPER(split_part(split_part(u.email, '@', 1), '.', 2))
WHERE u.email LIKE 'member.%@qctest.com'
ON CONFLICT (id) DO UPDATE SET gym_id = EXCLUDED.gym_id, role = EXCLUDED.role, full_name = EXCLUDED.full_name;

INSERT INTO public.members (gym_id, profile_id, member_code, full_name, email, phone, status, joined_at)
SELECT g.id, u.id, 'MB-' || UPPER(g.plan), split_part(u.email, '@', 1), u.email, '8888888888', 'active', now()
FROM auth.users u
JOIN public.gyms g ON g.gym_code = 'QC-' || UPPER(split_part(split_part(u.email, '@', 1), '.', 2))
WHERE u.email LIKE 'member.%@qctest.com';

-- ── Step 7: Subscription Plans for each Gym ─────────────────
INSERT INTO public.subscription_plans (gym_id, plan_name, duration, price)
SELECT id, 'Monthly Basic', 'monthly', 999 FROM public.gyms WHERE gym_code LIKE 'QC-%';

-- ── Step 8: Assign Subscriptions to Members ─────────────────
INSERT INTO public.member_subscriptions (gym_id, member_id, plan_id, start_date, end_date, status, paid_confirmed)
SELECT m.gym_id, m.id, sp.id, current_date, current_date + interval '30 days', 'active', false
FROM public.members m
JOIN public.subscription_plans sp ON sp.gym_id = m.gym_id AND sp.plan_name = 'Monthly Basic';

-- ── Step 9: Member Streaks ──────────────────────────────────
INSERT INTO public.member_streaks (member_id, gym_id, current_streak, longest_streak)
SELECT m.id, m.gym_id, 0, 0 FROM public.members m WHERE m.email LIKE 'member.%@qctest.com'
ON CONFLICT (member_id) DO NOTHING;

-- ── RESULT: Show all created accounts ───────────────────────
SELECT 
  g.plan AS package,
  p.role,
  u.email,
  'Test@1234' AS password,
  COALESCE(g.name, 'Global Admin') AS gym_name,
  '✅ Ready' AS status
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.gyms g ON g.id = p.gym_id
WHERE u.email LIKE '%@qctest.com' OR u.email = 'superadmin@gympro.in'
ORDER BY 
  CASE WHEN g.plan IS NULL THEN 0
       WHEN g.plan = 'trial' THEN 1
       WHEN g.plan = 'starter' THEN 2
       WHEN g.plan = 'pro' THEN 3
       WHEN g.plan = 'elite' THEN 4 END,
  CASE p.role 
       WHEN 'super_admin' THEN 1 
       WHEN 'gym_owner' THEN 2 
       WHEN 'staff' THEN 3 
       WHEN 'member' THEN 4 END;
