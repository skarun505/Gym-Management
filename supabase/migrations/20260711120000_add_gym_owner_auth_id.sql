-- ============================================================
-- Support idempotent gym provisioning (roadmap item 0.7).
--
-- create-gym previously had no durable way to tell "this gym's
-- owner auth user already exists, resume from there" apart from
-- catching an "already registered" error with nothing to resume
-- *to*. Storing the auth user id on the gym row as soon as it's
-- created lets a retried call skip straight to profile creation
-- instead of failing, and lets create-gym drop its delete-on-
-- failure rollback (a crash mid-rollback could orphan auth users
-- with no matching profiles row).
-- ============================================================

alter table gyms
  add column if not exists owner_auth_id uuid references auth.users(id) on delete set null;
