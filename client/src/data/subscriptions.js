import { supabase } from '../lib/supabase';

// Column names verified against the live `member_subscriptions` table.
// Note: the table has `paid_confirmed`, `paid_at`, `amount_due` fields
// in addition to the basic plan fields.
const SUBSCRIPTION_COLUMNS =
  'id, gym_id, member_id, plan_id, start_date, end_date, status, notes, created_at, reminder_7d_sent, reminder_3d_sent, reminder_24h_sent, paid_confirmed, paid_at, amount_due';

const SUBSCRIPTION_WITH_PLAN =
  `${SUBSCRIPTION_COLUMNS}, subscription_plans(id, plan_name, duration, price)`;

const SUBSCRIPTION_WITH_MEMBER =
  `${SUBSCRIPTION_COLUMNS}, members(id, full_name, email, phone, photo_url, member_code)`;

/**
 * Get the active subscription for a member (with plan details).
 */
export function getActiveMemberSubscription(memberId) {
  return supabase
    .from('member_subscriptions')
    .select(SUBSCRIPTION_WITH_PLAN)
    .eq('member_id', memberId)
    .eq('status', 'active')
    .maybeSingle();
}

/**
 * Get all subscriptions for a member, ordered newest first (for history).
 */
export function getMemberSubscriptionHistory(memberId, limit = 10) {
  return supabase
    .from('member_subscriptions')
    .select(SUBSCRIPTION_WITH_PLAN)
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })
    .limit(limit);
}

/**
 * Get subscriptions expiring within N days for a gym (for reminders/dashboard).
 * Returns both the subscription and the member name/email.
 */
export function getExpiringSoonSubscriptions(gymId, withinDays = 7) {
  const today   = new Date().toISOString().split('T')[0];
  const endDate = new Date(Date.now() + withinDays * 86400000).toISOString().split('T')[0];
  return supabase
    .from('member_subscriptions')
    .select(`${SUBSCRIPTION_WITH_PLAN}, members(id, full_name, email, phone, member_code)`)
    .eq('gym_id', gymId)
    .eq('status', 'active')
    .gte('end_date', today)
    .lte('end_date', endDate)
    .order('end_date', { ascending: true });
}

/**
 * Count active subscriptions expiring within N days (for KPI card).
 */
export function countExpiringSoon(gymId, withinDays = 7) {
  const today   = new Date().toISOString().split('T')[0];
  const endDate = new Date(Date.now() + withinDays * 86400000).toISOString().split('T')[0];
  return supabase
    .from('member_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('gym_id', gymId)
    .eq('status', 'active')
    .gte('end_date', today)
    .lte('end_date', endDate);
}

/**
 * List all subscriptions for a gym with member + plan info.
 */
export function listGymSubscriptions(gymId, { status } = {}) {
  let query = supabase
    .from('member_subscriptions')
    .select(SUBSCRIPTION_WITH_MEMBER + ', subscription_plans(id, plan_name, duration, price)')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);
  return query;
}

/**
 * List all subscription plans for a gym.
 */
export function listSubscriptionPlans(gymId) {
  return supabase
    .from('subscription_plans')
    .select('id, gym_id, plan_name, duration, price, created_at')
    .eq('gym_id', gymId)
    .order('price', { ascending: true });
}
