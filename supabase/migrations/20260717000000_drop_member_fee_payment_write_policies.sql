-- =============================================================================
-- SECURITY: members could INSERT and DELETE their own fee_payments rows
-- =============================================================================
-- Found 2026-07-17 while verifying the RLS baseline against production.
-- The live policies
--   "gym_members_insert_payments"  (INSERT, member_id belongs to caller)
--   "gym_members_delete_payments"  (DELETE, member_id belongs to caller)
-- let any logged-in member fabricate payment records or erase their payment
-- history from the browser console — fee_payments is the source of truth for
-- the owner's revenue reports (RevenuePage, Dashboard KPIs).
--
-- No app flow needs them: payments are written by staff
-- ("staff can insert fee_payments"), owners ("gym_owner full access
-- fee_payments"), and the admission-fee DB trigger (SECURITY DEFINER, exempt
-- from RLS). Members keep read-only access via "gym_members_see_own_payments".

DROP POLICY IF EXISTS "gym_members_insert_payments" ON public.fee_payments;
DROP POLICY IF EXISTS "gym_members_delete_payments" ON public.fee_payments;
