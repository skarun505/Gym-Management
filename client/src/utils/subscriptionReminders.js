/**
 * subscriptionReminders.js
 * 
 * Shared utility — computes which subscriptions need reminders today
 * and provides a one-call function to mark reminders as sent.
 *
 * Reminder tiers:
 *   7d — shown when  4 <= daysLeft <= 7
 *   3d — shown when  2 <= daysLeft <= 3
 *   24h — shown when daysLeft <= 1  (including 0 = today)
 *
 * If paid_confirmed = true → no reminder shown.
 */

import { supabase } from '../lib/supabase';

/** Returns number of calendar days until the given ISO date-string */
export function daysUntil(dateStr) {
  const end   = new Date(dateStr + 'T00:00:00');
  const today = new Date(new Date().toISOString().split('T')[0] + 'T00:00:00');
  return Math.ceil((end - today) / 86400000);
}

/**
 * Classify a subscription into a reminder tier.
 * Returns: 'critical' | 'warning' | 'caution' | 'ok' | 'paid' | null
 */
export function getReminderTier(sub) {
  if (!sub || sub.status !== 'active') return null;
  if (sub.paid_confirmed) return 'paid';
  const d = daysUntil(sub.end_date);
  if (d <= 0)  return 'expired';
  if (d <= 1)  return 'critical'; // ≤ 24 h
  if (d <= 3)  return 'warning';  // 3 days
  if (d <= 7)  return 'caution';  // 7 days
  return 'ok';
}

/**
 * Fetch all active subscriptions that need a reminder banner,
 * filtered by gym_id.
 */
export async function fetchExpiringSubscriptions(gymId) {
  const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const today   = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('member_subscriptions')
    .select(`
      id, end_date, start_date, status,
      paid_confirmed, paid_at,
      reminder_7d_sent, reminder_3d_sent, reminder_24h_sent,
      members (id, full_name, member_code, phone, email),
      subscription_plans (plan_name, duration, price)
    `)
    .eq('gym_id', gymId)
    .eq('status', 'active')
    .eq('paid_confirmed', false)
    .lte('end_date', in7Days)
    .gte('end_date', today)
    .order('end_date');

  if (error) throw error;
  return (data || []).map(s => ({
    ...s,
    daysLeft:   daysUntil(s.end_date),
    tier:       getReminderTier(s),
    memberName: s.members?.full_name,
    memberCode: s.members?.member_code,
    phone:      s.members?.phone,
    email:      s.members?.email,
    planName:   s.subscription_plans?.plan_name,
    price:      s.subscription_plans?.price,
    duration:   s.subscription_plans?.duration,
  }));
}

/**
 * Mark a subscription's reminder column as sent for the given tier.
 * tier: '7d' | '3d' | '24h'
 */
export async function markReminderSent(subId, tier) {
  const col = {
    '7d':  'reminder_7d_sent',
    '3d':  'reminder_3d_sent',
    '24h': 'reminder_24h_sent',
  }[tier];
  if (!col) return;
  await supabase.from('member_subscriptions').update({ [col]: true }).eq('id', subId);
}

/**
 * Mark a subscription as paid — suppresses all future reminders.
 */
export async function markPaid(subId) {
  const { error } = await supabase.from('member_subscriptions').update({
    paid_confirmed: true,
    paid_at:        new Date().toISOString(),
    status:         'active',  // keep active — renewal handled separately
  }).eq('id', subId);
  return error;
}
