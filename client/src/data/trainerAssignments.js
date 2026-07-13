import { supabase } from '../lib/supabase';

/**
 * trainer_assignments.trainer_id stores the trainer's AUTH PROFILE id
 * (profiles.id, i.e. staff.profile_id) — NOT staff.id. Passing staff.id
 * here doesn't error, it just silently returns zero rows (RLS filters
 * them out). This exact mistake shipped to production once already —
 * see commit b97e837 "fix: PT members not showing in staff dashboard".
 */
export function trainerAssignmentsForTrainer(gymId, trainerProfileId, columns) {
  return supabase
    .from('trainer_assignments')
    .select(columns)
    .eq('trainer_id', trainerProfileId)
    .eq('gym_id', gymId);
}
