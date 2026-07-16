-- =============================================================================
-- Attendance: enforce one OPEN check-in per member per day at the DB level
-- =============================================================================
-- process-checkin used a SELECT-then-INSERT duplicate guard, which is not
-- atomic: two rapid requests (double-tap, retry) could both pass the SELECT
-- and insert two rows for the same day, inflating member_streaks.total_checkins
-- and the attendance analytics.
--
-- The index is PARTIAL (WHERE check_out IS NULL) rather than a full unique on
-- (member_id, created_at) because the owner/staff AttendancePage flow
-- legitimately re-checks a member in after they've checked out the same day —
-- closed visits may repeat, but there can only ever be one open visit per day.
-- The race in process-checkin always inserts open rows, so it's fully covered.
-- process-checkin treats the 23505 conflict as "already checked in".
--
-- attendance.created_at is a DATE (see 20260714000000 baseline).
-- Step 1 removes existing duplicate OPEN rows (keeps the earliest check_in
-- per member/day) so the index can build.

DELETE FROM public.attendance a
USING public.attendance b
WHERE a.member_id = b.member_id
  AND a.created_at = b.created_at
  AND a.check_out IS NULL
  AND b.check_out IS NULL
  AND (a.check_in > b.check_in
       OR (a.check_in IS NOT DISTINCT FROM b.check_in AND a.id > b.id));

CREATE UNIQUE INDEX IF NOT EXISTS attendance_member_open_daily_unique
  ON public.attendance (member_id, created_at)
  WHERE check_out IS NULL;
