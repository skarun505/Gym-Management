import { supabase } from '../lib/supabase';

// Column names verified against the live `fee_payments` table.
// Note: `payment_date` is a date column; `created_at` is timestamptz.
// There is NO `receipt_no` column — it does not exist in production.
const FEE_PAYMENT_COLUMNS =
  'id, gym_id, member_id, subscription_id, amount_paid, payment_date, payment_method, notes, created_at';

const FEE_PAYMENT_WITH_MEMBER =
  `${FEE_PAYMENT_COLUMNS}, members(id, full_name, email, member_code)`;

/**
 * Get all payments for a gym, ordered newest first.
 */
export function listGymPayments(gymId, { since } = {}) {
  let query = supabase
    .from('fee_payments')
    .select(FEE_PAYMENT_WITH_MEMBER)
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false });

  if (since) query = query.gte('payment_date', since);
  return query;
}

/**
 * Get all payments for a specific member.
 */
export function getMemberPayments(memberId, limit = 20) {
  return supabase
    .from('fee_payments')
    .select(FEE_PAYMENT_COLUMNS)
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })
    .limit(limit);
}

/**
 * Get today's revenue for a gym.
 */
export function getTodayRevenue(gymId) {
  const today = new Date().toISOString().split('T')[0];
  return supabase
    .from('fee_payments')
    .select('amount_paid')
    .eq('gym_id', gymId)
    .eq('payment_date', today);
}

/**
 * Get revenue for a gym since a date (e.g. month start).
 */
export function getRevenueSince(gymId, sinceDate) {
  return supabase
    .from('fee_payments')
    .select('amount_paid, payment_date')
    .eq('gym_id', gymId)
    .gte('payment_date', sinceDate);
}

/**
 * Get recent payments for activity feed (with member name).
 */
export function getRecentPayments(gymId, limit = 5) {
  return supabase
    .from('fee_payments')
    .select('amount_paid, payment_date, created_at, members(full_name, member_code)')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false })
    .limit(limit);
}

/**
 * Helper: sum amount_paid from a payment rows array.
 */
export function sumPayments(rows) {
  return (rows || []).reduce((s, p) => s + Number(p.amount_paid || 0), 0);
}
