-- =============================================================================
-- Attendance: enforce one check-in per member per day at the database level
-- =============================================================================
-- process-checkin used a SELECT-then-INSERT duplicate guard, which is not
-- atomic: two rapid requests (double-tap, retry) could both pass the SELECT
-- and insert two rows for the same day, inflating member_streaks.total_checkins
-- and the attendance analytics.
--
-- attendance.created_at is a DATE (see 20260714000000 baseline), so a unique
-- index on (member_id, created_at) is exactly "one check-in per day".
-- process-checkin now treats the 23505 conflict as "already checked in".
--
-- Step 1 removes any existing duplicates (keeps the earliest check_in per
-- member/day) so the index can build.

DELETE FROM public.attendance a
USING public.attendance b
WHERE a.member_id = b.member_id
  AND a.created_at = b.created_at
  AND (a.check_in > b.check_in
       OR (a.check_in = b.check_in AND a.id > b.id)
       OR (a.check_in IS NULL AND b.check_in IS NOT NULL));

CREATE UNIQUE INDEX IF NOT EXISTS attendance_member_daily_unique
  ON public.attendance (member_id, created_at);
