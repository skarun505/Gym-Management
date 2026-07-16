import { supabase } from '../lib/supabase';

// Column names verified against the live `members` table (production).
// Use this module instead of hand-writing column lists in pages — avoids
// the class of bug where the wrong column name is used silently.
const MEMBER_COLUMNS =
  'id, gym_id, profile_id, member_code, full_name, dob, phone, email, address, photo_url, fitness_goal, health_notes, status, joined_at, admission_fee';

const MEMBER_LIST_COLUMNS =
  'id, member_code, full_name, phone, email, status, joined_at, photo_url, dob';

/**
 * Fetch all members for a gym (paginated list view).
 * Ordered by joined_at descending so newest members appear first.
 */
export function listMembers(gymId, { status } = {}) {
  let query = supabase
    .from('members')
    .select(MEMBER_LIST_COLUMNS)
    .eq('gym_id', gymId)
    .order('joined_at', { ascending: false });

  if (status) query = query.eq('status', status);
  return query;
}

/**
 * Fetch all active members for a gym (count only).
 */
export function countActiveMembers(gymId) {
  return supabase
    .from('members')
    .select('id', { count: 'exact', head: true })
    .eq('gym_id', gymId)
    .eq('status', 'active');
}

/**
 * Fetch a single member by ID with all fields.
 */
export function getMember(memberId) {
  return supabase
    .from('members')
    .select(MEMBER_COLUMNS)
    .eq('id', memberId)
    .single();
}

/**
 * Fetch a member by their profile_id (auth link).
 */
export function getMemberByProfileId(gymId, profileId) {
  return supabase
    .from('members')
    .select(MEMBER_COLUMNS)
    .eq('gym_id', gymId)
    .eq('profile_id', profileId)
    .maybeSingle();
}

/**
 * Count new members joined since a given date.
 */
export function countNewMembersSince(gymId, sinceDate) {
  return supabase
    .from('members')
    .select('id', { count: 'exact', head: true })
    .eq('gym_id', gymId)
    .gte('joined_at', sinceDate);
}

/**
 * Fetch recently joined members (for activity feeds / dashboard).
 */
export function getRecentMembers(gymId, limit = 5) {
  return supabase
    .from('members')
    .select('id, full_name, joined_at, photo_url, member_code')
    .eq('gym_id', gymId)
    .order('joined_at', { ascending: false })
    .limit(limit);
}

/**
 * Fetch members whose birthdays fall on a given MM-DD.
 * Used for birthday notification checks.
 */
export function getMembersWithBirthdayOn(gymId, mmdd) {
  return supabase
    .from('members')
    .select('id, full_name, email, dob')
    .eq('gym_id', gymId)
    .eq('status', 'active')
    .not('dob', 'is', null)
    .like('dob', `%-${mmdd}`);
}
