-- =============================================================================
-- CRITICAL SECURITY FIX — profiles role/gym_id self-escalation
-- =============================================================================
-- Found during the 2026-07-14 security audit: the live "users can update
-- their own profile" RLS policy on public.profiles is
--   USING (id = auth.uid())   -- no WITH CHECK
-- Per Postgres RLS semantics, when an UPDATE policy has no WITH CHECK, the
-- USING clause is reused to validate the new row. Since `id` never changes
-- on a self-update, this check passes no matter what other columns are set —
-- including `role` and `gym_id`. Any authenticated member/staff/gym_owner
-- can therefore run, from the browser console with their own session:
--   supabase.from('profiles').update({ role: 'super_admin', gym_id: null }).eq('id', myId)
-- and immediately gain platform-wide super_admin access. This bypasses the
-- app entirely — it's a gap in the live policy, not an app-code bug.
--
-- Fix: a BEFORE UPDATE trigger that blocks changes to `role`/`gym_id` unless
-- the request is made with the service-role key (auth.role() = 'service_role'),
-- which is how every legitimate role-setting path already works
-- (create-gym, create-staff-login, create-member-login, reset-owner-password
-- all use the service-role admin client). No legitimate flow is affected;
-- self-service privilege escalation is closed.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'role cannot be changed directly';
    END IF;
    IF NEW.gym_id IS DISTINCT FROM OLD.gym_id THEN
      RAISE EXCEPTION 'gym_id cannot be changed directly';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_escalation ON public.profiles;

CREATE TRIGGER trg_prevent_profile_privilege_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();
