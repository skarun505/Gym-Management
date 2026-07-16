import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders as buildCorsHeaders } from '../_shared/cors.ts';

// ─── Gym-local time (IST, UTC+5:30) ─────────────────────────────
// All day-boundary logic (duplicate check, streaks, "today") and
// hour-of-day logic (early bird / night owl) must use the gym's local
// clock, not UTC — otherwise check-ins before 05:30 IST land on the
// previous day and late-evening hours misclassify.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Date object shifted so that getUTC*() accessors read IST wall-clock time. */
function toIST(d: Date): Date {
  return new Date(d.getTime() + IST_OFFSET_MS);
}

/** 'YYYY-MM-DD' in IST for a given instant. */
function istDateStr(d: Date): string {
  return toIST(d).toISOString().split('T')[0];
}

/** Hour of day (0–23) in IST for a given instant. */
function istHour(d: Date): number {
  return toIST(d).getUTCHours();
}

// ─── Achievement condition checker ──────────────────────────────
function checkAchievements({
  totalCheckins,
  currentStreak,
  lastCheckin,
  joinedAt,
  weekCheckins,
  earlyBirdCount,
  nightOwlCount,
  alreadyEarned,
}: {
  totalCheckins: number;
  currentStreak: number;
  lastCheckin: string | null;
  joinedAt: string;
  weekCheckins: number;
  earlyBirdCount: number;
  nightOwlCount: number;
  alreadyEarned: string[];
}): string[] {
  const toUnlock: string[] = [];

  const check = (code: string, condition: boolean) => {
    if (condition && !alreadyEarned.includes(code)) toUnlock.push(code);
  };

  // Milestones — visits count
  check('FIRST_CHECKIN', totalCheckins === 1);
  check('TOTAL_50',      totalCheckins >= 50);
  check('TOTAL_100',     totalCheckins >= 100);
  check('TOTAL_250',     totalCheckins >= 250);

  // Streaks
  check('STREAK_7',  currentStreak >= 7);
  check('STREAK_30', currentStreak >= 30);
  check('STREAK_60', currentStreak >= 60);
  check('STREAK_90', currentStreak >= 90);

  // Special — time-based
  check('EARLY_BIRD', earlyBirdCount >= 5);
  check('NIGHT_OWL',  nightOwlCount  >= 5);

  // Perfect week (7 distinct days this calendar week)
  check('PERFECT_WEEK', weekCheckins >= 7);

  // Comeback Kid — gap >= 14 days
  if (lastCheckin) {
    const gapDays = Math.floor(
      (new Date().getTime() - new Date(lastCheckin).getTime()) / 86400000
    );
    check('COMEBACK_KID', gapDays >= 14);
  }

  // Anniversary — unlocks on any check-in once 1 year has passed since
  // joining (an exact-date match would miss anyone who skips that day).
  if (joinedAt) {
    const joined  = new Date(joinedAt);
    const yearAgo = new Date();
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    check('ANNIVERSARY_1', joined.getTime() <= yearAgo.getTime());
  }

  return toUnlock;
}

// ─── Main handler ───────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')              ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(jwt);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles').select('role, gym_id').eq('id', user.id).single();

    if (profile?.role !== 'member') {
      return new Response(JSON.stringify({ error: 'Only members can use this endpoint' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: member, error: memberErr } = await supabaseAdmin
      .from('members').select('id, gym_id, joined_at').eq('profile_id', user.id).single();

    if (memberErr || !member) {
      return new Response(JSON.stringify({ error: 'Member record not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now     = new Date();
    const today   = istDateStr(now);
    const gymId   = member.gym_id;
    const memberId = member.id;

    // 1. Prevent duplicate
    const { data: existingToday } = await supabaseAdmin
      .from('attendance').select('id')
      .eq('gym_id', gymId).eq('member_id', memberId).eq('created_at', today)
      .limit(1).maybeSingle();

    if (existingToday) {
      return new Response(JSON.stringify({ error: 'Already checked in today', alreadyCheckedIn: true }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Insert attendance. The unique index on (member_id, created_at)
    // makes this the real duplicate guard — the SELECT above is just a
    // friendly fast path; two concurrent requests both pass it, and the
    // second insert fails with 23505 here.
    const { error: attendErr } = await supabaseAdmin.from('attendance').insert({
      gym_id: gymId, member_id: memberId,
      check_in: now.toISOString(), marked_by: user.id, created_at: today,
    });
    if (attendErr) {
      if (attendErr.code === '23505') {
        return new Response(JSON.stringify({ error: 'Already checked in today', alreadyCheckedIn: true }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('Check-in failed: ' + attendErr.message);
    }

    // 3. Load + update streak
    const { data: streakRow } = await supabaseAdmin
      .from('member_streaks').select('*').eq('member_id', memberId).maybeSingle();

    const yestStr = istDateStr(new Date(now.getTime() - 86400000));

    const continued   = streakRow?.last_checkin === yestStr;
    const newCurrent  = continued ? (streakRow!.current_streak + 1) : 1;
    const newLongest  = Math.max(newCurrent, streakRow?.longest_streak ?? 0);
    const newTotal    = (streakRow?.total_checkins ?? 0) + 1;

    if (streakRow) {
      await supabaseAdmin.from('member_streaks').update({
        current_streak: newCurrent, longest_streak: newLongest,
        last_checkin: today, total_checkins: newTotal,
      }).eq('member_id', memberId);
    } else {
      await supabaseAdmin.from('member_streaks').insert({
        member_id: memberId, gym_id: gymId,
        current_streak: 1, longest_streak: 1,
        last_checkin: today, total_checkins: 1,
      });
    }

    // 4. Load already-earned
    const { data: earned } = await supabaseAdmin
      .from('member_achievements')
      .select('achievement_id, achievements(code)')
      .eq('member_id', memberId);

    const alreadyEarned = (earned ?? []).map(
      (e: { achievements: { code: string } }) => e.achievements?.code
    ).filter(Boolean) as string[];

    // 5. Count time-specific check-ins
    const { data: allCheckins } = await supabaseAdmin
      .from('attendance').select('check_in').eq('member_id', memberId);

    let earlyBirdCount = 0, nightOwlCount = 0;
    (allCheckins ?? []).forEach((a: { check_in: string }) => {
      if (!a.check_in) return;
      const h = istHour(new Date(a.check_in));
      if (h < 7)  earlyBirdCount++;
      if (h >= 21) nightOwlCount++;
    });

    // 6. Count this week (week starts Sunday, IST calendar)
    const istNow = toIST(now);
    const weekStart = new Date(istNow.getTime() - istNow.getUTCDay() * 86400000);
    const { data: weekRows } = await supabaseAdmin
      .from('attendance').select('created_at').eq('member_id', memberId)
      .gte('created_at', weekStart.toISOString().split('T')[0]);
    const weekCheckins = new Set((weekRows ?? []).map((r: { created_at: string }) => r.created_at)).size;

    // 7. Check achievements
    const toUnlock = checkAchievements({
      totalCheckins: newTotal, currentStreak: newCurrent,
      lastCheckin: streakRow?.last_checkin ?? null,
      joinedAt: member.joined_at, weekCheckins,
      earlyBirdCount, nightOwlCount, alreadyEarned,
    });

    // 8. Unlock badges
    let newAchievements: { code: string; title: string; icon: string; description: string }[] = [];
    if (toUnlock.length > 0) {
      const { data: achRows } = await supabaseAdmin
        .from('achievements').select('id, code, title, icon, description').in('code', toUnlock);
      if (achRows?.length) {
        await supabaseAdmin.from('member_achievements').insert(
          achRows.map((a: { id: string }) => ({
            gym_id: gymId, member_id: memberId,
            achievement_id: a.id, earned_at: now.toISOString(),
          }))
        );
        newAchievements = achRows;
      }
    }

    return new Response(
      JSON.stringify({ success: true, newStreak: newCurrent, longestStreak: newLongest, totalCheckins: newTotal, newAchievements }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
