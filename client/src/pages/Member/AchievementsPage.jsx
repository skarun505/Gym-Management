import { useEffect, useState, useCallback } from 'react';
import { Trophy, Medal, Flame, Users, Target, CheckCircle, Clock, Zap, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

// ─── Badge Grid ───────────────────────────────────────────────
function BadgesTab({ memberId }) {
  const [earned,  setEarned]  = useState([]);
  const [all,     setAll]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [{ data: earnedData }, { data: allData }] = await Promise.all([
        supabase.from('member_achievements')
          .select('earned_at, achievements(code, title, icon, description)')
          .eq('member_id', memberId)
          .order('earned_at', { ascending: false }),
        supabase.from('achievements').select('code, title, icon, description').order('id'),
      ]);
      setEarned(earnedData || []);
      setAll(allData || []);
      setLoading(false);
    };
    load();
  }, [memberId]);

  const earnedCodes = new Set((earned).map(e => e.achievements?.code).filter(Boolean));

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {earned.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">
            🏆 Earned ({earned.length})
          </p>
          <div className="grid grid-cols-3 gap-3">
            {earned.filter(e => e.achievements).map(e => (
              <div key={e.achievements.code}
                className="card p-3 text-center space-y-1.5 border-primary-500/20 bg-primary-500/5">
                <span className="text-3xl">{e.achievements.icon}</span>
                <p className="text-white text-xs font-bold leading-tight">{e.achievements.title}</p>
                <p className="text-gray-600 text-[10px]">{e.achievements.description}</p>
                <p className="text-primary-400 text-[10px] font-semibold">
                  {new Date(e.earned_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">
          🔒 Locked ({all.length - earned.length})
        </p>
        <div className="grid grid-cols-3 gap-3">
          {all.filter(a => !earnedCodes.has(a.code)).map(a => (
            <div key={a.code} className="card p-3 text-center space-y-1.5 opacity-40">
              <span className="text-3xl grayscale">{a.icon}</span>
              <p className="text-gray-400 text-xs font-bold leading-tight">{a.title}</p>
              <p className="text-gray-600 text-[10px]">{a.description}</p>
              <Lock className="w-3 h-3 text-gray-700 mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {earned.length === 0 && (
        <div className="card text-center py-10">
          <Trophy className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-white font-semibold">No badges yet</p>
          <p className="text-gray-500 text-sm mt-1">Check in daily to start earning badges!</p>
        </div>
      )}
    </div>
  );
}

// ─── Leaderboard Tab ──────────────────────────────────────────
function LeaderboardTab({ gymId, memberId }) {
  const [board,   setBoard]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('monthly_leaderboard')
        .select('*').eq('gym_id', gymId).limit(15);
      setBoard(data || []);
      setLoading(false);
    };
    load();
  }, [gymId]);

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" /></div>;

  const myRank = board.findIndex(b => b.member_id === memberId) + 1;
  const month  = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const MEDALS = ['🥇', '🥈', '🥉'];
  const rankColors = [
    'border-amber-500/40 bg-amber-500/8',
    'border-gray-400/30 bg-gray-400/5',
    'border-amber-700/30 bg-amber-700/5',
  ];

  return (
    <div className="space-y-4">
      {/* My rank */}
      {myRank > 0 && (
        <div className="card bg-primary-500/10 border-primary-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-600/30 flex items-center justify-center">
              <span className="text-white font-black text-sm">#{myRank}</span>
            </div>
            <div>
              <p className="text-white font-bold text-sm">Your Rank</p>
              <p className="text-primary-400 text-xs">Top {Math.round((myRank / board.length) * 100)}% this month</p>
            </div>
          </div>
          <Zap className="w-5 h-5 text-primary-400" />
        </div>
      )}

      <div>
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" /> {month} Leaderboard
        </p>

        {board.length === 0 ? (
          <div className="card text-center py-8">
            <Users className="w-8 h-8 text-gray-700 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No check-ins this month yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {board.map((m, i) => {
              const isMe = m.member_id === memberId;
              const rank = i + 1;
              return (
                <div key={m.member_id}
                  className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                    rank <= 3 ? rankColors[rank - 1] : isMe ? 'border-primary-500/30 bg-primary-500/5' : 'border-white/5 bg-dark-700/40'
                  }`}>
                  {/* Rank */}
                  <div className="w-8 text-center flex-shrink-0">
                    {rank <= 3
                      ? <span className="text-xl">{MEDALS[rank - 1]}</span>
                      : <span className="text-gray-500 font-bold text-sm">#{rank}</span>}
                  </div>

                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0">
                    {m.photo_url
                      ? <img src={m.photo_url} alt="" className="w-full h-full object-cover" />
                      : m.full_name?.charAt(0)}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm truncate ${isMe ? 'text-primary-300' : 'text-white'}`}>
                      {m.full_name} {isMe && <span className="text-primary-400 text-xs">(You)</span>}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {m.current_streak > 0 && (
                        <span className="text-orange-400 text-xs flex items-center gap-0.5">
                          <Flame className="w-3 h-3" /> {m.current_streak}d
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Check-ins */}
                  <div className="text-right flex-shrink-0">
                    <p className={`font-black text-lg leading-none ${rank === 1 ? 'text-amber-400' : rank === 2 ? 'text-gray-300' : rank === 3 ? 'text-amber-600' : 'text-white'}`}>
                      {m.month_checkins}
                    </p>
                    <p className="text-gray-600 text-[10px]">visits</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Challenges Tab ───────────────────────────────────────────
function ChallengesTab({ gymId, memberId }) {
  const [challenges,   setChallenges]   = useState([]);
  const [completions,  setCompletions]  = useState(new Set());
  const [completing,   setCompleting]   = useState({});
  const [loading,      setLoading]      = useState(true);

  const load = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    const [{ data: ch }, { data: comp }] = await Promise.all([
      supabase.from('gym_challenges').select('*')
        .eq('gym_id', gymId).eq('is_active', true)
        .gte('end_date', today)
        .order('end_date', { ascending: true }),
      supabase.from('challenge_completions').select('challenge_id')
        .eq('member_id', memberId),
    ]);
    setChallenges(ch || []);
    setCompletions(new Set((comp || []).map(c => c.challenge_id)));
    setLoading(false);
  }, [gymId, memberId]);

  useEffect(() => { load(); }, [load]);

  const complete = async (ch) => {
    setCompleting(p => ({ ...p, [ch.id]: true }));
    try {
      const { error } = await supabase.from('challenge_completions').insert({
        gym_id: gymId, challenge_id: ch.id, member_id: memberId,
      });
      if (error) throw error;
      toast.success(`Challenge completed! ${ch.badge_emoji}`);
      load();
    } catch (e) {
      toast.error(e.message.includes('unique') ? 'Already completed!' : e.message);
    } finally {
      setCompleting(p => ({ ...p, [ch.id]: false }));
    }
  };

  const daysLeft = (endDate) => {
    const d = Math.ceil((new Date(endDate) - new Date()) / 86400000);
    return d <= 0 ? 'Ends today' : `${d} day${d !== 1 ? 's' : ''} left`;
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-3">
      {challenges.length === 0 ? (
        <div className="card text-center py-10">
          <Target className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-white font-semibold">No active challenges</p>
          <p className="text-gray-500 text-sm mt-1">Check back soon — your gym will post challenges here!</p>
        </div>
      ) : challenges.map(ch => {
        const done = completions.has(ch.id);
        return (
          <div key={ch.id}
            className={`card transition-all ${done ? 'border-emerald-500/30 bg-emerald-500/5' : 'hover:border-primary-500/20'}`}>
            <div className="flex items-start gap-3">
              <span className="text-3xl flex-shrink-0">{ch.badge_emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm">{ch.title}</p>
                {ch.description && <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">{ch.description}</p>}
                <div className="flex items-center gap-3 mt-2">
                  <span className={`flex items-center gap-1 text-xs font-semibold ${done ? 'text-emerald-400' : 'text-amber-400'}`}>
                    <Clock className="w-3 h-3" /> {daysLeft(ch.end_date)}
                  </span>
                  {ch.target_count > 1 && (
                    <span className="text-gray-600 text-xs">Goal: {ch.target_count}×</span>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/5">
              {done ? (
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
                  <CheckCircle className="w-4 h-4" /> Completed! 🎉
                </div>
              ) : (
                <button
                  onClick={() => complete(ch)}
                  disabled={completing[ch.id]}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-2 text-sm disabled:opacity-50">
                  {completing[ch.id]
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <CheckCircle className="w-4 h-4" />}
                  Mark as Completed
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function AchievementsPage() {
  const { user }  = useAuthStore();
  const [member,  setMember]  = useState(null);
  const [tab,     setTab]     = useState('badges');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      const { data: m } = await supabase.from('members').select('*').eq('profile_id', user.id).maybeSingle();
      setMember(m);
      setLoading(false);
    };
    load();
  }, [user?.id]);

  const TABS = [
    { id: 'badges',      label: 'Badges',      icon: Trophy },
    { id: 'leaderboard', label: 'Leaderboard', icon: Medal },
    { id: 'challenges',  label: 'Challenges',  icon: Target },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-2 border-primary-600/30 border-t-primary-500 rounded-full animate-spin" />
    </div>
  );

  if (!member) return (
    <div className="flex flex-col items-center justify-center h-64 text-center px-6 gap-3">
      <Trophy className="w-12 h-12 text-gray-700" />
      <p className="text-white font-semibold">Profile not linked</p>
    </div>
  );

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-400" /> Wins
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">Badges, leaderboard & challenges</p>
      </div>

      {/* Tab bar */}
      <div className="px-5 mb-5">
        <div className="flex gap-2 bg-dark-800 rounded-2xl p-1 border border-white/5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                tab === id
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30'
                  : 'text-gray-500 hover:text-gray-300'
              }`}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5">
        {tab === 'badges'      && <BadgesTab memberId={member.id} />}
        {tab === 'leaderboard' && <LeaderboardTab gymId={member.gym_id} memberId={member.id} />}
        {tab === 'challenges'  && <ChallengesTab gymId={member.gym_id} memberId={member.id} />}
      </div>
    </div>
  );
}
