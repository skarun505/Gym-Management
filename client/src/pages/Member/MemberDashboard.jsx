import { useEffect, useState, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { Zap, Calendar, CheckCircle, ChevronRight, Dumbbell, X, Trophy, Star, Flame, BarChart3, Apple, UserCheck, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

// ─── Celebration Modal ────────────────────────────────────────
function CelebrationModal({ achievements, streak, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Card */}
      <div className="relative w-full max-w-sm bg-dark-800 border border-white/10 rounded-3xl overflow-hidden animate-slide-up shadow-2xl">
        {/* Confetti-style gradient top */}
        <div className="h-2 w-full bg-gradient-to-r from-orange-500 via-primary-500 to-emerald-500" />

        <div className="p-6 text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Streak pulse */}
          <div className="relative inline-flex mb-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-primary-600 flex items-center justify-center shadow-xl shadow-primary-600/40">
              <span className="text-white font-black text-2xl">{streak}</span>
            </div>
            <div className="absolute inset-0 rounded-full bg-primary-500/20 animate-ping" />
          </div>

          <h2 className="text-2xl font-black text-white mb-1">
            🔥 {streak} Day Streak!
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            {streak === 1 ? "You're back! Keep going!" : `Incredible — keep that fire burning!`}
          </p>

          {/* New badges */}
          {achievements.length > 0 && (
            <div className="space-y-3 mb-6">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
                🏆 New Achievement{achievements.length > 1 ? 's' : ''} Unlocked!
              </p>
              {achievements.map(a => (
                <div
                  key={a.code}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-primary-600/20 to-accent-500/10 border border-primary-500/30"
                >
                  <span className="text-3xl flex-shrink-0">{a.icon}</span>
                  <div className="text-left">
                    <p className="text-white font-bold text-sm">{a.title}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{a.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #a21cce, #f97316)' }}
          >
            Let's Go! 💪
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 7-day mini calendar ─────────────────────────────────────
function WeekCalendar({ checkedDays }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      label:   d.toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 1),
      date:    d.toISOString().split('T')[0],
      isToday: d.toISOString().split('T')[0] === new Date().toISOString().split('T')[0],
    };
  });

  return (
    <div className="flex justify-between gap-1">
      {days.map(({ label, date, isToday }) => {
        const checked = checkedDays.includes(date);
        return (
          <div key={date} className="flex flex-col items-center gap-1.5 flex-1">
            <span className="text-[10px] text-gray-500 font-medium">{label}</span>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${
              checked
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40'
                : isToday
                ? 'border-2 border-primary-500/50 text-primary-400'
                : 'bg-dark-600 text-gray-700'
            }`}>
              {checked ? '✓' : isToday ? '●' : ''}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Animated streak ring ────────────────────────────────────
function StreakRing({ current, longest }) {
  const pct  = longest > 0 ? Math.min((current / longest) * 100, 100) : 0;
  const r    = 40;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="relative w-28 h-28 flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <circle
          cx="48" cy="48" r={r}
          fill="none"
          stroke="url(#sGrad)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          className="transition-all duration-700"
        />
        <defs>
          <linearGradient id="sGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#c044ef" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-white leading-none">{current}</span>
        <span className="text-[10px] text-gray-500 font-medium mt-0.5">days</span>
      </div>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────
const EDGE_URL = 'https://fmikzzectrzpyuhkmmcg.supabase.co/functions/v1/process-checkin';

export default function MemberDashboard() {
  const { user } = useAuthStore();
  const [member,        setMember]        = useState(null);
  const [streak,        setStreak]        = useState(null);
  const [sub,           setSub]           = useState(null);
  const [workoutPlan,   setWorkoutPlan]   = useState(null);
  const [weekDays,      setWeekDays]      = useState([]);
  const [checkedToday,  setCheckedToday]  = useState(false);
  const [checkingIn,    setCheckingIn]    = useState(false);
  const [celebration,   setCelebration]   = useState(null); // { streak, achievements[] }
  const [loading,       setLoading]       = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [badges,        setBadges]        = useState([]);
  const [trainer,       setTrainer]       = useState(null);
  const [weekGoals,     setWeekGoals]     = useState({ workouts: 0, nutrition: 0, water: 0 });
  const [dismissedAnns, setDismissedAnns] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dismissed_anns') || '[]'); } catch { return []; }
  });

  const today    = new Date().toISOString().split('T')[0];
  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  const fetchAll = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data: m } = await supabase
        .from('members').select('*').eq('profile_id', user.id).maybeSingle();
      if (!m) { setLoading(false); return; }
      setMember(m);

      const memberId = m.id;

      const [streakRes, subRes, attendRes, planRes, annRes, badgeRes, trainerRes, nutritionRes] = await Promise.all([
        supabase.from('member_streaks').select('*').eq('member_id', memberId).maybeSingle(),
        supabase.from('member_subscriptions')
          .select('*, subscription_plans(plan_name, duration)')
          .eq('member_id', memberId).eq('status', 'active')
          .order('end_date', { ascending: true }).limit(1).maybeSingle(),
        supabase.from('attendance').select('created_at')
          .eq('member_id', memberId).in('created_at', last7),
        supabase.from('member_workout_plans')
          .select('*, workout_plans(id, name, description, workout_exercises(*))')
          .eq('member_id', memberId).eq('is_active', true).maybeSingle(),
        supabase.from('gym_announcements')
          .select('*')
          .eq('gym_id', m.gym_id)
          .eq('is_active', true)
          .or(`expires_at.is.null,expires_at.gte.${today}`)
          .order('created_at', { ascending: false })
          .limit(5),
        // Earned badges
        supabase.from('member_achievements')
          .select('earned_at, achievements(code, title, icon, description)')
          .eq('member_id', memberId)
          .order('earned_at', { ascending: false }),
        // Trainer assignment
        supabase.from('trainer_assignments')
          .select('*, staff(full_name, role, photo_url, phone)')
          .eq('member_id', memberId)
          .eq('is_active', true)
          .maybeSingle(),
        // This week's nutrition logs
        supabase.from('nutrition_logs')
          .select('log_date, calories, water_glasses')
          .eq('member_id', memberId)
          .gte('log_date', last7[0]),
      ]);

      setAnnouncements(annRes.data || []);
      setBadges((badgeRes.data || []).filter(b => b.achievements).map(b => ({
        ...b.achievements,
        earned_at: b.earned_at,
      })));
      setTrainer(trainerRes.data?.staff || null);

      setStreak(streakRes.data);
      setSub(subRes.data);
      const days = (attendRes.data || []).map(a => a.created_at);
      setWeekDays(days);
      setCheckedToday(days.includes(today));

      // Weekly goals from nutrition logs
      const nutLogs = nutritionRes?.data || [];
      setWeekGoals({
        workouts:  days.length,
        nutrition: nutLogs.filter(l => l.calories && l.calories > 0).length,
        water:     nutLogs.reduce((s, l) => s + (l.water_glasses || 0), 0),
      });

      if (planRes.data?.workout_plans) {
        const joinedDate = planRes.data.assigned_on || today;
        const daysSince  = Math.floor((new Date(today) - new Date(joinedDate)) / 86400000) % 7;
        const exercises  = (planRes.data.workout_plans.workout_exercises || [])
          .filter(e => e.day_number === daysSince + 1)
          .sort((a, b) => a.order_index - b.order_index);
        setWorkoutPlan({ name: planRes.data.workout_plans.name, day: daysSince + 1, exercises });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─── Check In via Edge Function ──────────────────────────────
  const handleCheckIn = async () => {
    if (!member || checkingIn || checkedToday) return;
    setCheckingIn(true);
    try {
      // Get current session JWT
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const res = await fetch(EDGE_URL, {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type':  'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      });

      const data = await res.json();

      if (res.status === 409) {
        toast.error('Already checked in today!');
        setCheckedToday(true);
        return;
      }

      if (!res.ok) throw new Error(data.error || 'Check-in failed');

      // Update local state immediately
      setCheckedToday(true);
      setWeekDays(prev => [...new Set([...prev, today])]);
      setStreak(prev => ({
        ...prev,
        current_streak: data.newStreak,
        longest_streak: data.longestStreak,
        total_checkins: data.totalCheckins,
        last_checkin:   today,
        diet_unlocked:  data.dietUnlocked,
      }));

      // Show celebration modal
      setCelebration({
        streak:       data.newStreak,
        achievements: data.newAchievements || [],
      });

    } catch (err) {
      toast.error(err.message || 'Check-in failed');
    } finally {
      setCheckingIn(false);
    }
  };

  const daysUntilExpiry = sub
    ? Math.ceil((new Date(sub.end_date) - new Date()) / 86400000)
    : null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-8 h-8 border-2 border-primary-600/30 border-t-primary-500 rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Loading your dashboard…</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 px-6 text-center">
        <Dumbbell className="w-12 h-12 text-gray-700" />
        <p className="text-white font-semibold">Profile not linked</p>
        <p className="text-gray-500 text-sm">Ask your gym staff to link your member profile to this account.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-0">
      {/* ── Announcements Banner ──────────────────── */}
        {announcements.filter(a => !dismissedAnns.includes(a.id)).length > 0 && (
          <div className="px-5 pb-3 space-y-2">
            {announcements.filter(a => !dismissedAnns.includes(a.id)).map(ann => {
              const priorityColors = {
                urgent: 'bg-red-500/10 border-red-500/30 text-red-300',
                high:   'bg-amber-500/10 border-amber-500/30 text-amber-300',
                normal: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
                low:    'bg-gray-500/10 border-gray-500/20 text-gray-400',
              };
              const cls = priorityColors[ann.priority] || priorityColors.normal;
              return (
                <div key={ann.id} className={`flex items-start gap-3 p-3 rounded-2xl border ${cls} relative`}>
                  <span className="text-xl flex-shrink-0">{ann.emoji || '📢'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">{ann.title}</p>
                    <p className="text-xs mt-0.5 opacity-80">{ann.body}</p>
                  </div>
                  <button
                    onClick={() => {
                      const updated = [...dismissedAnns, ann.id];
                      setDismissedAnns(updated);
                      localStorage.setItem('dismissed_anns', JSON.stringify(updated));
                    }}
                    className="p-1 rounded-full hover:bg-white/10 flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Greeting + Streak Ring ─────────────────── */}
        <div className="px-5 pt-6 pb-4 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-400 text-sm">{greeting} 👋</p>
              <h1 className="text-2xl font-black text-white mt-0.5">
                {member.full_name.split(' ')[0]}!
              </h1>
              {member.fitness_goal && (
                <p className="text-primary-400 text-xs mt-1 font-medium">🎯 {member.fitness_goal}</p>
              )}
            </div>
            <div className="flex flex-col items-center gap-1">
              <StreakRing
                current={streak?.current_streak || 0}
                longest={Math.max(streak?.longest_streak || 1, streak?.current_streak || 1)}
              />
              <p className="text-[10px] text-gray-500">
                🏆 Best: {streak?.longest_streak || 0}d
              </p>
            </div>
          </div>

          {/* 7-day calendar */}
          <div className="card p-4">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">This Week</p>
            <WeekCalendar checkedDays={weekDays} />
          </div>
        </div>

        {/* ── Check-In Button ──────────────────────── */}
        <div className="px-5 pb-4">
          <button
            onClick={handleCheckIn}
            disabled={checkingIn || checkedToday}
            className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-xl ${
              checkedToday
                ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 cursor-default'
                : 'text-white shadow-primary-600/40 active:scale-98'
            }`}
            style={!checkedToday ? {
              background: 'linear-gradient(135deg, #a21cce, #f97316)',
            } : {}}
          >
            {checkingIn ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : checkedToday ? (
              <><CheckCircle className="w-6 h-6" /> Checked In Today!</>
            ) : (
              <><Zap className="w-6 h-6" /> Check In Now</>
            )}
          </button>
        </div>

        {/* ── Stats Row ────────────────────────────── */}
        <div className="px-5 pb-4 grid grid-cols-3 gap-3">
          {[
            { label: 'Total Visits', value: streak?.total_checkins || 0, icon: <BarChart3 className="w-5 h-5" />, color: 'text-primary-400' },
            { label: 'Day Streak',   value: streak?.current_streak || 0, icon: <Flame className="w-5 h-5" />,    color: 'text-orange-400' },
            { label: 'Best Streak',  value: streak?.longest_streak || 0, icon: <Trophy className="w-5 h-5" />,   color: 'text-amber-400' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="card p-3 text-center">
              <span className={color}>{icon}</span>
              <p className={`text-xl font-black mt-1 ${color}`}>{value}</p>
              <p className="text-[10px] text-gray-500 mt-0.5 font-medium">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Weekly Goals ──────────────────────────── */}
        <div className="px-5 pb-4">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">
            This Week's Goals
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: 'Workouts', value: weekGoals.workouts, max: 5,
                color: '#a21cce', icon: '🏋️',
              },
              {
                label: 'Nutrition Logs', value: weekGoals.nutrition, max: 7,
                color: '#10b981', icon: '🥗',
              },
              {
                label: 'Glasses Water', value: weekGoals.water, max: 56, // 8/day × 7
                color: '#3b82f6', icon: '💧',
              },
            ].map(({ label, value, max, color, icon }) => {
              const pct  = Math.min((value / max) * 100, 100);
              const r    = 24, circ = 2 * Math.PI * r;
              const done = pct >= 100;
              return (
                <div key={label} className="card p-3 flex flex-col items-center gap-2">
                  <div className="relative w-14 h-14">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
                      <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
                      <circle cx="28" cy="28" r={r} fill="none"
                        stroke={done ? '#10b981' : color}
                        strokeWidth="5" strokeLinecap="round"
                        strokeDasharray={`${(pct / 100) * circ} ${circ}`}
                        style={{ transition: 'stroke-dasharray 0.7s ease' }} />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-lg">
                      {done ? '✅' : icon}
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-white font-black text-sm leading-none">{value}<span className="text-gray-600 text-[10px]">/{max}</span></p>
                    <p className="text-gray-500 text-[10px] mt-0.5 font-medium">{label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Subscription Status ──────────────────── */}
        {sub && (
          <div className="px-5 pb-4">
            <div className={`card p-4 flex items-center gap-3 ${
              daysUntilExpiry !== null && daysUntilExpiry <= 7
                ? 'border border-amber-500/30 bg-amber-500/5'
                : ''
            }`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                daysUntilExpiry !== null && daysUntilExpiry <= 7 ? 'bg-amber-500/20' : 'bg-primary-600/20'
              }`}>
                <Calendar className={`w-5 h-5 ${
                  daysUntilExpiry !== null && daysUntilExpiry <= 7 ? 'text-amber-400' : 'text-primary-400'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm">
                  {sub.subscription_plans?.plan_name}
                </p>
                <p className={`text-xs mt-0.5 ${
                  daysUntilExpiry !== null && daysUntilExpiry <= 7 ? 'text-amber-400' : 'text-gray-500'
                }`}>
                  {daysUntilExpiry !== null && daysUntilExpiry <= 7
                    ? `⚠️ Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`
                    : `Valid until ${new Date(sub.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Personal Trainer Card ─────────────────── */}
        {trainer && (
          <div className="px-5 pb-4">
            <h2 className="text-white font-bold mb-3 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-primary-400" /> Your Personal Trainer
            </h2>
            <div className="card flex items-center gap-4">
              {trainer.photo_url ? (
                <img src={trainer.photo_url} alt={trainer.full_name} className="w-14 h-14 rounded-2xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center text-white text-xl font-black flex-shrink-0">
                  {trainer.full_name?.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold">{trainer.full_name}</p>
                <p className="text-primary-400 text-xs font-semibold capitalize mt-0.5">{trainer.role || 'Personal Trainer'}</p>
                {trainer.phone && (
                  <p className="text-gray-500 text-xs mt-1">{trainer.phone}</p>
                )}
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                <Star className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
          </div>
        )}

        {/* ── Diet Chart Unlock Banner ──────────────── */}
        <div className="px-5 pb-4">
          <NavLink
            to="/member/diet"
            className={`card flex items-center gap-4 transition-all ${
              streak?.diet_unlocked
                ? 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10'
                : 'border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10'
            }`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
              streak?.diet_unlocked ? 'bg-emerald-500/20' : 'bg-amber-500/20'
            }`}>
              <Apple className={`w-6 h-6 ${streak?.diet_unlocked ? 'text-emerald-400' : 'text-amber-400'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm">
                {streak?.diet_unlocked ? '🥗 Your Diet Chart' : '🔒 Diet Chart'}
              </p>
              <p className="text-xs mt-0.5">
                {streak?.diet_unlocked
                  ? <span className="text-emerald-400">Unlocked! Tap to view your meal plan →</span>
                  : <span className="text-amber-400">Earn a 7-day streak to unlock · {streak?.current_streak || 0}/7 days</span>}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
          </NavLink>
        </div>

        {/* ── My Badges ────────────────────────────── */}
        <div className="px-5 pb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-bold flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" /> My Badges
            </h2>
            <NavLink to="/member/achievements" className="text-primary-400 text-xs font-medium flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </NavLink>
          </div>
          {badges.length === 0 ? (
            <div className="card text-center py-5">
              <Trophy className="w-8 h-8 text-gray-700 mx-auto mb-2" />
              <p className="text-gray-400 text-sm font-medium">No badges yet</p>
              <p className="text-gray-600 text-xs mt-1">Start checking in to earn your first badge!</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {badges.slice(0, 6).map(b => (
                <div key={b.code} className="card p-3 text-center space-y-1 hover:border-primary-500/30 transition-all">
                  <span className="text-2xl">{b.icon}</span>
                  <p className="text-white text-xs font-bold leading-tight">{b.title}</p>
                  <p className="text-gray-600 text-[10px]">{new Date(b.earned_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Workout Preview ──────────────────────── */}
        <div className="px-5 pb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-bold flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-primary-400" />
              Today's Workout
            </h2>
            {workoutPlan && (
              <NavLink to="/member/schedule" className="text-primary-400 text-xs font-medium flex items-center gap-1">
                View full <ChevronRight className="w-3 h-3" />
              </NavLink>
            )}
          </div>

          {workoutPlan ? (
            <div className="card space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-primary-300 font-semibold text-sm">{workoutPlan.name}</p>
                <span className="text-xs text-gray-500 bg-dark-600 px-2 py-0.5 rounded-full">
                  Day {workoutPlan.day}
                </span>
              </div>
              {workoutPlan.exercises.length === 0 ? (
                <p className="text-gray-500 text-sm">Rest day — recover well! 💤</p>
              ) : (
                <div className="space-y-2">
                  {workoutPlan.exercises.slice(0, 4).map((ex, i) => (
                    <div key={ex.id} className="flex items-center gap-3 py-1.5 border-b border-white/5 last:border-0">
                      <span className="w-5 h-5 rounded-full bg-primary-600/20 text-primary-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                        {i + 1}
                      </span>
                      <span className="flex-1 text-gray-300 text-sm font-medium">{ex.exercise}</span>
                      <span className="text-gray-500 text-xs">{ex.sets}×{ex.reps}</span>
                    </div>
                  ))}
                  {workoutPlan.exercises.length > 4 && (
                    <p className="text-gray-600 text-xs text-center pt-1">
                      +{workoutPlan.exercises.length - 4} more exercises
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="card text-center py-6">
              <Dumbbell className="w-8 h-8 text-gray-700 mx-auto mb-2" />
              <p className="text-gray-400 text-sm font-medium">No workout plan assigned</p>
              <p className="text-gray-600 text-xs mt-1">Ask your trainer to assign a plan</p>
            </div>
          )}
        </div>

        {/* ── Quick Actions ────────────────────────── */}
        <div className="px-5 pb-6 grid grid-cols-2 gap-3">
          <NavLink to="/member/nutrition"
            className="card flex flex-col items-start gap-3 hover:border-emerald-500/30 transition-all group">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 flex items-center justify-center group-hover:bg-emerald-500/25 transition-colors">
              <Apple className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Nutrition</p>
              <p className="text-gray-500 text-xs mt-0.5">Log today's macros</p>
            </div>
          </NavLink>
          <NavLink to="/member/progress"
            className="card flex flex-col items-start gap-3 hover:border-primary-500/30 transition-all group">
            <div className="w-10 h-10 rounded-2xl bg-primary-500/15 flex items-center justify-center group-hover:bg-primary-500/25 transition-colors">
              <TrendingUp className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Progress</p>
              <p className="text-gray-500 text-xs mt-0.5">Track measurements</p>
            </div>
          </NavLink>
        </div>
      </div>

      {/* ── Celebration Modal ────────────────────── */}
      {celebration && (
        <CelebrationModal
          streak={celebration.streak}
          achievements={celebration.achievements}
          onClose={() => setCelebration(null)}
        />
      )}
    </>
  );
}
