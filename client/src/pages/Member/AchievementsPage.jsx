import { useEffect, useState } from 'react';
import { Trophy, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../store/authStore';

// Category tabs config
const CATEGORIES = [
  { key: 'all',       label: 'All' },
  { key: 'streak',    label: '🔥 Streaks' },
  { key: 'milestone', label: '💯 Milestones' },
  { key: 'special',   label: '⚡ Special' },
];

// Badge card
function BadgeCard({ achievement, earned, earnedAt }) {
  return (
    <div className={`relative rounded-2xl p-4 text-center transition-all ${
      earned
        ? 'bg-gradient-to-br from-primary-600/20 to-accent-500/10 border border-primary-500/30 shadow-lg shadow-primary-600/10'
        : 'bg-dark-700/50 border border-white/5 opacity-60'
    }`}>
      {/* Glow ring for earned */}
      {earned && (
        <div className="absolute inset-0 rounded-2xl bg-primary-600/5 animate-pulse pointer-events-none" />
      )}

      <div className={`text-4xl mb-2 ${earned ? 'filter-none' : 'grayscale opacity-40'}`}>
        {achievement.icon}
      </div>

      <h3 className={`font-bold text-sm leading-tight ${earned ? 'text-white' : 'text-gray-500'}`}>
        {achievement.title}
      </h3>

      <p className={`text-[11px] mt-1 leading-tight ${earned ? 'text-gray-400' : 'text-gray-600'}`}>
        {achievement.description}
      </p>

      {earned ? (
        <div className="mt-3">
          <span className="inline-block text-[10px] font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/20 px-2 py-0.5 rounded-full">
            ✓ Earned {earnedAt ? new Date(earnedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
          </span>
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-center gap-1">
          <Lock className="w-3 h-3 text-gray-600" />
          <span className="text-[10px] text-gray-600 font-medium">Locked</span>
        </div>
      )}
    </div>
  );
}

export default function AchievementsPage() {
  const { user } = useAuthStore();
  const [allAchievements, setAllAchievements] = useState([]);
  const [earnedMap, setEarnedMap]             = useState({});
  const [activeCategory, setActiveCategory]   = useState('all');
  const [loading, setLoading]                 = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const fetch = async () => {
      setLoading(true);
      try {
        // Find member
        const { data: m } = await supabase
          .from('members').select('id').eq('profile_id', user.id).maybeSingle();

        const [allRes, earnedRes] = await Promise.all([
          supabase.from('achievements').select('*').order('category'),
          m
            ? supabase.from('member_achievements')
                .select('achievement_id, earned_at')
                .eq('member_id', m.id)
            : Promise.resolve({ data: [] }),
        ]);

        setAllAchievements(allRes.data || []);
        const map = {};
        (earnedRes.data || []).forEach(e => { map[e.achievement_id] = e.earned_at; });
        setEarnedMap(map);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [user?.id]);

  const filtered = activeCategory === 'all'
    ? allAchievements
    : allAchievements.filter(a => a.category === activeCategory);

  const earnedCount = Object.keys(earnedMap).length;

  return (
    <div>
      {/* Header */}
      <div className="px-5 pt-6 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-400" /> Achievements
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {earnedCount} of {allAchievements.length} unlocked
            </p>
          </div>
          {/* Progress ring */}
          <div className="relative w-16 h-16">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 60 60">
              <circle cx="30" cy="30" r="24" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
              <circle
                cx="30" cy="30" r="24"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={`${allAchievements.length > 0 ? (earnedCount / allAchievements.length) * 150.8 : 0} 150.8`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-black text-amber-400">
                {allAchievements.length > 0 ? Math.round((earnedCount / allAchievements.length) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="px-5 pb-4 flex gap-2 overflow-x-auto scrollbar-hide">
        {CATEGORIES.map(c => (
          <button
            key={c.key}
            onClick={() => setActiveCategory(c.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeCategory === c.key
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-dark-700 text-gray-400 hover:text-white'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Badges Grid */}
      {loading ? (
        <div className="px-5 grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 bg-dark-700 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="px-5 pb-4 grid grid-cols-2 gap-3">
          {filtered.map(a => (
            <BadgeCard
              key={a.id}
              achievement={a}
              earned={!!earnedMap[a.id]}
              earnedAt={earnedMap[a.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
