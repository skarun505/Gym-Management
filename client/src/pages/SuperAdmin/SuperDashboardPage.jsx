import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Users, UserCheck, Activity, TrendingUp, ChevronRight,
  ShieldCheck, ShieldOff, CreditCard, Dumbbell, RefreshCw, ArrowUp
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ── Stat Card ─────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, gradient, glow, loading, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`kpi-card group shadow-lg ${glow} transition-all duration-200 ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
    >
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 shadow-lg`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-gray-400 text-sm">{label}</p>
        <p className="text-2xl font-bold text-white mt-0.5">
          {loading ? <span className="inline-block w-12 h-6 bg-dark-600 rounded animate-pulse" /> : value}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

// ── Mini Bar ──────────────────────────────────────────────────
function MiniBar({ value, max, color }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex-1 bg-dark-600 rounded-full h-1.5">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── Plan-based member limits ───────────────────────────────────
const PLAN_LIMITS = {
  trial:   50,
  starter: 50,
  pro:     300,
  elite:   Infinity,
};
const memberLimit = (plan) => PLAN_LIMITS[plan] ?? 50;

export default function SuperDashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading]   = useState(true);
  const [stats,   setStats]     = useState(null);
  const [gyms,    setGyms]      = useState([]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [gymsRes, membersRes, staffRes, subsRes] = await Promise.all([
        supabase.from('gyms').select('id, name, status, plan, max_members, theme_color, gym_code, owner_name, created_at, address').order('created_at', { ascending: false }),
        supabase.from('members').select('id, status, gym_id, joined_at'),
        supabase.from('staff').select('id, status, gym_id, role'),
        supabase.from('member_subscriptions').select('id, status, end_date, gym_id'),
      ]);

      const gymsData   = gymsRes.data   || [];
      const members    = membersRes.data || [];
      const staff      = staffRes.data   || [];
      const subs       = subsRes.data    || [];

      // Per-gym enrichment
      const enriched = gymsData.map(g => ({
        ...g,
        memberCount:  members.filter(m => m.gym_id === g.id).length,
        activeMembers: members.filter(m => m.gym_id === g.id && m.status === 'active').length,
        staffCount:   staff.filter(s => s.gym_id === g.id).length,
        activeSubs:   subs.filter(s => s.gym_id === g.id && s.status === 'active').length,
        expiringSoon: subs.filter(s => {
          if (s.gym_id !== g.id || s.status !== 'active') return false;
          const d = Math.ceil((new Date(s.end_date) - new Date()) / 86400000);
          return d <= 7 && d >= 0;
        }).length,
      }));

      setGyms(enriched);
      setStats({
        totalGyms:      gymsData.length,
        activeGyms:     gymsData.filter(g => g.status === 'active').length,
        suspendedGyms:  gymsData.filter(g => g.status === 'suspended').length,
        totalMembers:   members.length,
        activeMembers:  members.filter(m => m.status === 'active').length,
        totalStaff:     staff.length,
        activeStaff:    staff.filter(s => s.status === 'active').length,
        activeSubs:     subs.filter(s => s.status === 'active').length,
        expiringSoon:   subs.filter(s => {
          if (s.status !== 'active') return false;
          const d = Math.ceil((new Date(s.end_date) - new Date()) / 86400000);
          return d <= 7 && d >= 0;
        }).length,
      planBreakdown: {
          trial:   gymsData.filter(g => g.plan === 'trial').length,
          starter: gymsData.filter(g => g.plan === 'starter').length,
          pro:     gymsData.filter(g => g.plan === 'pro').length,
          elite:   gymsData.filter(g => g.plan === 'elite').length,
        },
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const planColors = {
    trial:   { badge: 'badge-pending', bar: 'bg-amber-500'  },
    starter: { badge: 'badge-active',  bar: 'bg-emerald-500' },
    pro:     { badge: 'badge-admin',   bar: 'bg-violet-500'  },
    elite:   { badge: 'badge-trainer', bar: 'bg-blue-500'    },
  };

  const statusColors = {
    active:    'badge-active',
    suspended: 'badge-expired',
    trial:     'badge-pending',
  };

  const kpis = [
    { label: 'Total Gyms',    value: stats?.totalGyms    ?? '—', sub: `${stats?.activeGyms ?? 0} active · ${stats?.suspendedGyms ?? 0} suspended`, icon: Building2,  gradient: 'from-violet-600 to-indigo-500', glow: 'shadow-violet-600/20', onClick: () => navigate('/super-admin/gyms') },
    { label: 'Total Members', value: stats?.totalMembers ?? '—', sub: `${stats?.activeMembers ?? 0} active`, icon: Users,      gradient: 'from-emerald-600 to-teal-500', glow: 'shadow-emerald-600/20', onClick: () => navigate('/super-admin/members') },
    { label: 'Total Staff',   value: stats?.totalStaff   ?? '—', sub: `${stats?.activeStaff ?? 0} active`,  icon: Dumbbell,   gradient: 'from-blue-600 to-cyan-500',     glow: 'shadow-blue-600/20',   onClick: () => navigate('/super-admin/staff') },
    { label: 'Expiring Soon', value: stats?.expiringSoon ?? '—', sub: 'Subscriptions in 7 days',             icon: TrendingUp, gradient: 'from-amber-600 to-orange-500',  glow: 'shadow-amber-600/20' },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Platform Dashboard
          </h1>
          <p className="page-subtitle">Master control across all gyms on GymPro.</p>
        </div>
        <button
          onClick={fetchAll}
          className="p-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(k => <StatCard key={k.label} {...k} loading={loading} />)}
      </div>

      {/* Plan Breakdown + Active Subscriptions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Plan breakdown */}
        <div className="card p-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Plan Distribution</p>
          <div className="space-y-3">
            {Object.entries(stats?.planBreakdown || {}).map(([plan, count]) => (
              <div key={plan} className="flex items-center gap-3">
                <span className={`w-20 flex-shrink-0 text-xs font-semibold capitalize ${planColors[plan]?.badge || 'badge'}`}>{plan}</span>
                <MiniBar value={count} max={stats?.totalGyms || 1} color={planColors[plan]?.bar || 'bg-gray-500'} />
                <span className="text-white font-bold text-sm w-5 text-right">{loading ? '—' : count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Platform health */}
        <div className="card p-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Platform Health</p>
          <div className="space-y-3">
            {[
              { label: 'Active Gyms',        value: stats?.activeGyms,    total: stats?.totalGyms,   color: 'bg-emerald-500', icon: ShieldCheck },
              { label: 'Active Members',     value: stats?.activeMembers, total: stats?.totalMembers, color: 'bg-violet-500',  icon: UserCheck   },
              { label: 'Active Staff',       value: stats?.activeStaff,   total: stats?.totalStaff,   color: 'bg-blue-500',    icon: Dumbbell    },
              { label: 'Active Subs',        value: stats?.activeSubs,    total: stats?.totalMembers, color: 'bg-amber-500',  icon: CreditCard  },
            ].map(({ label, value, total, color, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-3.5 h-3.5 text-gray-400" />
                </div>
                <span className="text-gray-400 text-sm w-32 flex-shrink-0">{label}</span>
                <MiniBar value={value || 0} max={total || 1} color={color} />
                <span className="text-white font-semibold text-sm w-8 text-right">
                  {loading ? '—' : value ?? 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* All Gyms Overview Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-violet-400" />
            </div>
            <h2 className="text-white font-semibold">All Gyms Overview</h2>
          </div>
          <button
            onClick={() => navigate('/super-admin/gyms')}
            className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
          >
            Manage <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Gym</th>
                <th>Code</th>
                <th>Owner</th>
                <th>Members</th>
                <th>Staff</th>
                <th>Active Subs</th>
                <th>Expiring Soon</th>
                <th>Plan</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({length:4}).map((_,i) => (
                  <tr key={i}>{Array.from({length:9}).map((_,j) => <td key={j}><div className="h-4 bg-dark-600 rounded animate-pulse" /></td>)}</tr>
                ))
              ) : gyms.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <Building2 className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">No gyms yet</p>
                  </td>
                </tr>
              ) : gyms.map(gym => (
                <tr
                  key={gym.id}
                  className="cursor-pointer"
                  onClick={() => navigate('/super-admin/gyms')}
                >
                  <td>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${gym.theme_color || '#a21cce'}, ${gym.theme_color || '#a21cce'}99)` }}
                      >
                        {gym.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-white">{gym.name}</p>
                        <p className="text-xs text-gray-500">{gym.address || 'No address'}</p>
                      </div>
                    </div>
                  </td>
                  <td><span className="font-mono text-violet-400 text-xs">{gym.gym_code}</span></td>
                  <td className="text-gray-300">{gym.owner_name}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">{gym.memberCount}</span>
                      <span className="text-gray-500 text-xs">
                        / {memberLimit(gym.plan) === Infinity ? '∞' : memberLimit(gym.plan)}
                      </span>
                      <div style={{ width: 40 }}>
                        <MiniBar
                          value={gym.memberCount}
                          max={memberLimit(gym.plan) === Infinity ? Math.max(gym.memberCount, 1) : memberLimit(gym.plan)}
                          color={gym.memberCount >= memberLimit(gym.plan) ? 'bg-red-500' : 'bg-emerald-500'}
                        />
                      </div>
                    </div>
                  </td>
                  <td><span className="text-white font-semibold">{gym.staffCount}</span></td>
                  <td>
                    <span className="text-emerald-400 font-semibold">{gym.activeSubs}</span>
                  </td>
                  <td>
                    {gym.expiringSoon > 0 ? (
                      <span className="inline-flex items-center gap-1 text-amber-400 text-xs font-semibold">
                        <Activity className="w-3 h-3" /> {gym.expiringSoon}
                      </span>
                    ) : (
                      <span className="text-gray-600 text-xs">—</span>
                    )}
                  </td>
                  <td><span className={planColors[gym.plan]?.badge || 'badge'}>{gym.plan}</span></td>
                  <td><span className={statusColors[gym.status] || 'badge'}>{gym.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick nav shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Manage Gyms',   sub: 'Edit, suspend, onboard',        icon: Building2,  path: '/super-admin/gyms',    color: 'from-violet-600 to-indigo-500' },
          { label: 'View Members',  sub: 'All members across gyms',        icon: Users,      path: '/super-admin/members', color: 'from-emerald-600 to-teal-500'  },
          { label: 'View Staff',    sub: 'Trainers, admin, reception',     icon: Dumbbell,   path: '/super-admin/staff',   color: 'from-blue-600 to-cyan-500'     },
        ].map(({ label, sub, icon: Icon, path, color }) => (
          <button
            key={label}
            onClick={() => navigate(path)}
            className="card p-5 flex items-center gap-4 hover:border-white/20 transition-all duration-200 hover:scale-[1.01] text-left"
          >
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0 shadow-lg`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold">{label}</p>
              <p className="text-gray-500 text-xs mt-0.5">{sub}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-600 ml-auto" />
          </button>
        ))}
      </div>
    </div>
  );
}
