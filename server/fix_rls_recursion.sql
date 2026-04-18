-- ============================================================
-- FIX: Stack depth limit exceeded (RLS infinite recursion)
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- The helper functions need SECURITY DEFINER so they run as
-- the DB owner (postgres) and bypass RLS — breaking the loop.

create or replace function get_my_gym_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select gym_id from profiles where id = auth.uid()
$$;

create or replace function get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'super_admin'
  )
$$;

-- Also fix the profiles policies — the existing ones call get_my_role()
-- which reads profiles → causes recursion. Use auth.uid() directly instead.

-- Drop old recursive policies on profiles
drop policy if exists "super_admin manages all profiles" on profiles;
drop policy if exists "users can view their own profile" on profiles;
drop policy if exists "users can update their own profile" on profiles;
drop policy if exists "gym_owner and staff can view profiles in their gym" on profiles;
drop policy if exists "gym_owner can create profiles in their gym" on profiles;

-- Recreate safe policies (auth.uid() is safe — no table lookup)
create policy "users can view their own profile"
  on profiles for select
  using (id = auth.uid());

create policy "users can update their own profile"
  on profiles for update
  using (id = auth.uid());

-- For gym_owner/staff seeing other profiles: use a subquery with SECURITY DEFINER fn
create policy "gym staff view profiles in their gym"
  on profiles for select
  using (
    gym_id = get_my_gym_id()
  );

create policy "gym_owner can insert profiles"
  on profiles for insert
  with check (
    gym_id = get_my_gym_id()
  );

-- Super admin bypass (now safe since is_super_admin() has SECURITY DEFINER)
create policy "super_admin full access profiles"
  on profiles for all
  using (is_super_admin());

-- ✅ Done! Try logging in now.
