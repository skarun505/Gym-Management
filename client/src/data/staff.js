import { supabase } from '../lib/supabase';

// Column names verified against the live `staff` table.
// IMPORTANT: the shift column is `shift_info` (text), NOT `shift`.
// There is also a `shift_id` (uuid FK → gym_shifts) for the newer shift
// assignment system, while `shift_info` is the legacy free-text field.
// See staffProfile.js for the original bug note.
const STAFF_COLUMNS =
  'id, gym_id, profile_id, full_name, role, phone, email, shift_info, status, created_at, dob, salary, photo_url, shift_id, staff_code';

const STAFF_LIST_COLUMNS =
  'id, staff_code, full_name, role, phone, email, status, photo_url, shift_info, created_at';

/**
 * Get a staff member by their auth profile_id.
 * (This is the canonical version — replaces the one in staffProfile.js)
 */
export function getMyStaffProfile(gymId, authProfileId) {
  return supabase
    .from('staff')
    .select(STAFF_COLUMNS)
    .eq('profile_id', authProfileId)
    .eq('gym_id', gymId)
    .maybeSingle();
}

/**
 * List all staff for a gym.
 */
export function listStaff(gymId, { status } = {}) {
  let query = supabase
    .from('staff')
    .select(STAFF_LIST_COLUMNS)
    .eq('gym_id', gymId)
    .order('full_name', { ascending: true });

  if (status) query = query.eq('status', status);
  return query;
}

/**
 * Get a single staff member by ID.
 */
export function getStaffMember(staffId) {
  return supabase
    .from('staff')
    .select(STAFF_COLUMNS)
    .eq('id', staffId)
    .single();
}

/**
 * Count active staff for a gym.
 */
export function countActiveStaff(gymId) {
  return supabase
    .from('staff')
    .select('id', { count: 'exact', head: true })
    .eq('gym_id', gymId)
    .eq('status', 'active');
}
