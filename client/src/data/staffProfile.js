import { supabase } from '../lib/supabase';

// Column names verified against the current `staff` table in production
// (this table has no tracked migration — see 20260418062400_initial_schema.sql,
// which predates it). shift_info/created_at, not shift/joined_at — see
// commit f9f4863 "fix: staff profile page - wrong column names".
const STAFF_PROFILE_COLUMNS =
  'id, full_name, role, email, phone, shift_info, created_at, status, photo_url, profile_id, staff_code, dob, salary';

export function getMyStaffProfile(gymId, authProfileId) {
  return supabase
    .from('staff')
    .select(STAFF_PROFILE_COLUMNS)
    .eq('profile_id', authProfileId)
    .eq('gym_id', gymId)
    .maybeSingle();
}
