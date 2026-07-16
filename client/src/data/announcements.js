import { supabase } from '../lib/supabase';

// Column names verified against the live `gym_announcements` table.
// Note: `badge_type` and `triggered_by_member_id` are newer columns added
// for achievement-based announcements. `posted_by` references profiles.id.
const ANNOUNCEMENT_COLUMNS =
  'id, gym_id, title, body, emoji, priority, is_active, posted_by, expires_at, created_at, badge_type, triggered_by_member_id';

/**
 * List active announcements for a gym, newest first.
 */
export function listActiveAnnouncements(gymId) {
  const today = new Date().toISOString().split('T')[0];
  return supabase
    .from('gym_announcements')
    .select(ANNOUNCEMENT_COLUMNS)
    .eq('gym_id', gymId)
    .eq('is_active', true)
    .or(`expires_at.is.null,expires_at.gte.${today}`)
    .order('created_at', { ascending: false });
}

/**
 * List all announcements for a gym (including inactive/expired), for management.
 */
export function listAllAnnouncements(gymId) {
  return supabase
    .from('gym_announcements')
    .select(ANNOUNCEMENT_COLUMNS)
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false });
}

/**
 * Get recent announcements for member dashboard (limited, active only).
 */
export function getRecentAnnouncements(gymId, limit = 5) {
  const today = new Date().toISOString().split('T')[0];
  return supabase
    .from('gym_announcements')
    .select('id, title, body, emoji, priority, created_at, badge_type')
    .eq('gym_id', gymId)
    .eq('is_active', true)
    .or(`expires_at.is.null,expires_at.gte.${today}`)
    .order('created_at', { ascending: false })
    .limit(limit);
}
