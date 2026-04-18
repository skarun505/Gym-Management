import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Achievement condition checker ──────────────────────────────
function checkAchievements({
  totalCheckins,
  currentStreak,
  checkInHour,
  lastCheckin,
  joinedAt,
  weekCheckins,
  earlyBirdCount,
  nightOwlCount,
  alreadyEarned,
}: {
  totalCheckins: number;
  currentStreak: number;
  checkInHour: number;
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

  // Anniversary — 1 year since joining
  if (joinedAt) {
    const joined  = new Date(joinedAt);
    const today   = new Date();
    const yearAgo = new Date(today);
    yearAgo.setFullYear(today.getFullYear() - 1);
    check(
      'ANNIVERSARY_1',
      joined.getFullYear()  === yearAgo.getFullYear() &&
      joined.getMonth()     === yearAgo.getMonth() &&
      joined.getDate()      === yearAgo.getDate()
    );
  }

  return toUnlock;
}

// ─── Main handler ───────────────────────────────────────────────
Deno.serve(async (req: Request) => {
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

    const today   = new Date().toISOString().split('T')[0];
    const now     = new Date();
    const checkInHour = now.getUTCHours() + 5;
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

    // 2. Insert attendance
    const { error: attendErr } = await supabaseAdmin.from('attendance').insert({
      gym_id: gymId, member_id: memberId,
      check_in: now.toISOString(), marked_by: user.id, created_at: today,
    });
    if (attendErr) throw new Error('Check-in failed: ' + attendErr.message);

    // 3. Load + update streak
    const { data: streakRow } = await supabaseAdmin
      .from('member_streaks').select('*').eq('member_id', memberId).maybeSingle();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yestStr = yesterday.toISOString().split('T')[0];

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
      const h = new Date(a.check_in).getUTCHours() + 5;
      if (h < 7)  earlyBirdCount++;
      if (h >= 21) nightOwlCount++;
    });

    // 6. Count this week
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const { data: weekRows } = await supabaseAdmin
      .from('attendance').select('created_at').eq('member_id', memberId)
      .gte('created_at', weekStart.toISOString().split('T')[0]);
    const weekCheckins = new Set((weekRows ?? []).map((r: { created_at: string }) => r.created_at)).size;

    // 7. Check achievements
    const toUnlock = checkAchievements({
      totalCheckins: newTotal, currentStreak: newCurrent,
      checkInHour, lastCheckin: streakRow?.last_checkin ?? null,
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
