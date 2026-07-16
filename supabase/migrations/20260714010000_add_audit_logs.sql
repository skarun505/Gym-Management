-- =============================================================================
-- audit_logs — accountability trail for super_admin actions
-- =============================================================================
-- Added as part of the 2026-07-14 security audit: reset-owner-password,
-- create-gym, and resend-gym-invite let a super_admin act on any gym with no
-- record of who did what, when. This table is a minimal, append-only log
-- written by those edge functions via the service-role client (never by the
-- client directly).
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     uuid REFERENCES auth.users(id),
  action       text NOT NULL,
  target_gym_id uuid REFERENCES public.gyms(id),
  target_id    text,
  detail       jsonb,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only super_admins can read the log. No INSERT/UPDATE/DELETE policy is
-- defined for any role — writes happen exclusively through the service-role
-- client inside edge functions, which bypasses RLS by design.
CREATE POLICY audit_logs_select_super_admin ON public.audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'
    )
  );
