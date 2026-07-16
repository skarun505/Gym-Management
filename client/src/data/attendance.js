import { supabase } from '../lib/supabase';

// Column names verified against the live `attendance` table.
// Note: `check_in` and `check_out` are timestamptz (not date).
// `created_at` is DATE (not timestamptz) — this is unusual.
const ATTENDANCE_COLUMNS =
  'id, gym_id, member_id, check_in, check_out, marked_by, created_at';

const ATTENDANCE_WITH_MEMBER =
  `${ATTENDANCE_COLUMNS}, members(id, full_name, member_code, photo_url)`;

/**
 * Get today's check-ins for a gym.
 */
export function getTodayAttendance(gymId) {
  const today = new Date().toISOString().split('T')[0];
  return supabase
    .from('attendance')
    .select(ATTENDANCE_WITH_MEMBER)
    .eq('gym_id', gymId)
    .gte('created_at', today)
    .order('created_at', { ascending: false });
}

/**
 * Count today's check-ins (for KPI card).
 */
export function countTodayAttendance(gymId) {
  const today = new Date().toISOString().split('T')[0];
  return supabase
    .from('attendance')
    .select('id', { count: 'exact', head: true })
    .eq('gym_id', gymId)
    .gte('created_at', today);
}

/**
 * Get attendance records for a gym since a date (for charts).
 */
export function getAttendanceSince(gymId, sinceDate) {
  return supabase
    .from('attendance')
    .select('created_at, check_in')
    .eq('gym_id', gymId)
    .gte('created_at', sinceDate);
}

/**
 * Get recent check-ins for activity feed.
 */
export function getRecentCheckIns(gymId, limit = 5) {
  return supabase
    .from('attendance')
    .select('created_at, check_in, members(full_name, member_code)')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false })
    .limit(limit);
}

/**
 * Get attendance history for a specific member.
 */
export function getMemberAttendance(memberId, { limit = 30 } = {}) {
  return supabase
    .from('attendance')
    .select(ATTENDANCE_COLUMNS)
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })
    .limit(limit);
}
