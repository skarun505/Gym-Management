import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Clock, AlertCircle, Package, TrendingUp, Plus,
  ChevronRight, IndianRupee, UserPlus, Activity, Zap,
  CreditCard, Megaphone, BarChart3,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import { fetchExpiringSubscriptions } from '../../utils/subscriptionReminders';
import SubscriptionReminderBanner from '../../components/SubscriptionReminderBanner';

// ─── Custom Chart Tooltip ─────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-xl px-3 py-2 text-sm space-y-1">
      <p className="text-gray-400 text-xs">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-semibold" style={{ color: p.color }}>
          {p.name === 'Revenue' ? `₹${p.value.toLocaleString('en-IN')}` : `${p.value} check-ins`}
        </p>
      ))}
    </div>
  );
};

// ─── KPI Card ─────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, gradient, loading, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`kpi-card group transition-all duration-200 ${onClick ? 'cursor-pointer hover:scale-[1.02] hover:shadow-lg' : ''}`}
    >
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 shadow-lg`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-gray-400 text-sm">{label}</p>
        <p className="text-2xl font-bold text-white mt-0.5">
          {loading
            ? <span className="inline-block w-12 h-6 bg-dark-600 rounded animate-pulse" />
            : value}
        </p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Activity Feed ────────────────────────────────────────────
function ActivityFeed({ events, loading }) {
  const icons = {
    checkin:  { icon: Clock,     color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    member:   { icon: UserPlus,  color: 'text-primary-400', bg: 'bg-primary-500/10' },
    payment:  { icon: IndianRupee, color: 'text-amber-400', bg: 'bg-amber-500/10'  },
    expiring: { icon: AlertCircle, color: 'text-red-400',   bg: 'bg-red-500/10'    },
  };

  if (loading) return (
    <div className="space-y-3">
      {[1,2,3,4,5].map(i => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <div className="w-8 h-8 rounded-lg bg-dark-600 flex-shrink-0" />
          <div className="flex-1 space-y-1">
            <div className="h-3 bg-dark-600 rounded w-3/4" />
            <div className="h-2.5 bg-dark-700 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );

  if (!events.length) return (
    <div className="text-center py-6">
      <Activity className="w-8 h-8 text-gray-700 mx-auto mb-2" />
      <p className="text-gray-500 text-sm">No recent activity</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {events.map((ev, i) => {
        const cfg = icons[ev.type] || icons.checkin;
        const Icon = cfg.icon;
        return (
          <div key={i} className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-4 h-4 ${cfg.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium">{ev.title}</p>
              <p className="text-gray-500 text-xs mt-0.5">{ev.time}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function DashboardPage() {
  const [summary,   setSummary]   = useState(null);
  const [chartData, setChartData] = useState([]);
  const [events,    setEvents]    = useState([]);
  const [expiring,  setExpiring]  = useState([]);
  const [chartMode, setChartMode] = useState('both'); // 'attendance' | 'revenue' | 'both'
  const [loading,   setLoading]   = useState(true);
  const navigate = useNavigate();
  const { user }  = useAuthStore();

  const fetchData = useCallback(async () => {
    if (!user?.gym_id) return;
    setLoading(true);
    try {
      const gymId = user.gym_id;
      const today = new Date().toISOString().split('T')[0];
      const monthStart = today.slice(0, 7) + '-01';

      // Last 7 dates
      const last7 = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split('T')[0];
      });

      const [
        membersRes, todayAttendRes, expiringSubRes, inventoryRes,
        chartAttRes, todayRevRes, monthRevRes, newMembersRes,
        recentCheckinsRes, recentMembersRes, recentPaymentsRes,
        chartRevRes,
      ] = await Promise.all([
        supabase.from('members').select('id', { count: 'exact' }).eq('gym_id', gymId).eq('status', 'active'),
        supabase.from('attendance').select('id', { count: 'exact' }).eq('gym_id', gymId).gte('created_at', today),
        supabase.from('member_subscriptions').select('id', { count: 'exact' })
          .eq('gym_id', gymId).eq('status', 'active')
          .gte('end_date', today)
          .lte('end_date', new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]),
        supabase.from('inventory').select('id, quantity, low_stock_alert').eq('gym_id', gymId),
        // Attendance chart (last 7 days)
        supabase.from('attendance').select('created_at').eq('gym_id', gymId)
          .gte('created_at', last7[0]),
        // Today's revenue
        supabase.from('fee_payments').select('amount_paid')
          .eq('gym_id', gymId).eq('payment_date', today),
        // Month revenue
        supabase.from('fee_payments').select('amount_paid')
          .eq('gym_id', gymId).gte('payment_date', monthStart),
        // New members this month
        supabase.from('members').select('id', { count: 'exact' })
          .eq('gym_id', gymId).gte('joined_at', monthStart),
        // Recent check-ins (for activity feed)
        supabase.from('attendance')
          .select('created_at, members(full_name)')
          .eq('gym_id', gymId)
          .order('created_at', { ascending: false }).limit(5),
        // Recent new members
        supabase.from('members')
          .select('full_name, joined_at')
          .eq('gym_id', gymId)
          .order('joined_at', { ascending: false }).limit(3),
        // Recent payments
        supabase.from('fee_payments')
          .select('amount_paid, payment_date, members(full_name)')
          .eq('gym_id', gymId)
          .order('created_at', { ascending: false }).limit(3),
        // Revenue chart (last 7 days)
        supabase.from('fee_payments').select('payment_date, amount_paid')
          .eq('gym_id', gymId).gte('payment_date', last7[0]),
      ]);

      const lowStock = (inventoryRes.data || []).filter(i => i.quantity <= i.low_stock_alert).length;
      const todayRev = (todayRevRes.data || []).reduce((s, p) => s + Number(p.amount_paid || 0), 0);
      const monthRev = (monthRevRes.data || []).reduce((s, p) => s + Number(p.amount_paid || 0), 0);

      // Build chart data
      const attMap = {}, revMap = {};
      (chartAttRes.data || []).forEach(a => {
        const d = a.created_at?.split('T')[0] || a.created_at;
        attMap[d] = (attMap[d] || 0) + 1;
      });
      (chartRevRes.data || []).forEach(p => {
        revMap[p.payment_date] = (revMap[p.payment_date] || 0) + Number(p.amount_paid || 0);
      });

      setChartData(last7.map(d => ({
        date: new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
        Checkins: attMap[d] || 0,
        Revenue: Math.round(revMap[d] || 0),
      })));

      setSummary({
        total_members:    membersRes.count ?? 0,
        today_attendance: todayAttendRes.count ?? 0,
        expiring_soon:    expiringSubRes.count ?? 0,
        low_stock_alerts: lowStock,
        today_revenue:    todayRev,
        month_revenue:    monthRev,
        new_members_month: newMembersRes.count ?? 0,
      });

      // Build activity feed
      const feed = [];
      (recentCheckinsRes.data || []).forEach(c => {
        const name = c.members?.full_name || 'Member';
        const when = c.created_at ? new Date(c.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
        feed.push({ type: 'checkin', title: `${name} checked in`, time: `Today · ${when}` });
      });
      (recentMembersRes.data || []).forEach(m => {
        feed.push({ type: 'member', title: `${m.full_name} joined`, time: m.joined_at || 'Recently' });
      });
      (recentPaymentsRes.data || []).forEach(p => {
        const name = p.members?.full_name || 'Member';
        feed.push({ type: 'payment', title: `${name} paid ₹${Number(p.amount_paid).toLocaleString('en-IN')}`, time: p.payment_date });
      });
      // Sort by most recent (they're already limited, just interleave)
      setEvents(feed.slice(0, 8));

      const expiringItems = await fetchExpiringSubscriptions(gymId);
      setExpiring(expiringItems);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user?.gym_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const gymName = user?.gym?.name || 'Your Gym';
  const hour    = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const kpis = [
    { label: "Today's Revenue",   value: loading ? '—' : `₹${(summary?.today_revenue || 0).toLocaleString('en-IN')}`,    sub: `₹${((summary?.month_revenue || 0)).toLocaleString('en-IN')} this month`,  icon: IndianRupee, gradient: 'from-emerald-600 to-teal-500', onClick: () => navigate('/revenue') },
    { label: 'Active Members',    value: loading ? '—' : summary?.total_members ?? 0,                                      sub: `+${summary?.new_members_month ?? 0} this month`,                         icon: Users,       gradient: 'from-primary-600 to-primary-500', onClick: () => navigate('/members') },
    { label: "Today's Checkins",  value: loading ? '—' : summary?.today_attendance ?? 0,                                   sub: `${summary?.total_members ? Math.round((summary.today_attendance / summary.total_members) * 100) : 0}% attendance rate`, icon: Clock, gradient: 'from-blue-600 to-cyan-500', onClick: () => navigate('/attendance') },
    { label: 'Expiring Soon',     value: loading ? '—' : summary?.expiring_soon ?? 0,                                      sub: 'In next 7 days',                                                          icon: AlertCircle, gradient: 'from-amber-600 to-orange-500', onClick: () => navigate('/subscriptions') },
    { label: 'New Members',       value: loading ? '—' : summary?.new_members_month ?? 0,                                  sub: 'This month',                                                               icon: UserPlus,    gradient: 'from-violet-600 to-purple-500', onClick: () => navigate('/members') },
    { label: 'Low Stock Alerts',  value: loading ? '—' : summary?.low_stock_alerts ?? 0,                                   sub: 'Items to restock',                                                        icon: Package,     gradient: 'from-red-600 to-rose-500', onClick: () => navigate('/inventory') },
  ];

  const themeColor = user?.gym?.theme_color || '#a21cce';

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <p className="text-gray-500 text-sm">{greeting}, {user?.name?.split(' ')[0]}! 👋</p>
          <h1 className="page-title text-gradient">{gymName}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/attendance')} className="btn-secondary flex items-center gap-2">
            <Clock className="w-4 h-4" /> Attendance
          </button>
          <button onClick={() => navigate('/members')} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Member
          </button>
        </div>
      </div>

      {/* ── Reminder Banner ─────────────────────────────────── */}
      <SubscriptionReminderBanner
        items={expiring}
        onPaid={async () => { const items = await fetchExpiringSubscriptions(user.gym_id); setExpiring(items); }}
        compact
      />

      {/* ── 6 KPI Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map(kpi => <KpiCard key={kpi.label} {...kpi} loading={loading} />)}
      </div>

      {/* ── Chart + Activity Feed ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${themeColor}22` }}>
                <TrendingUp className="w-4 h-4" style={{ color: themeColor }} />
              </div>
              <h2 className="text-white font-semibold">Last 7 Days</h2>
            </div>
            {/* Toggle */}
            <div className="flex gap-1 bg-dark-700 rounded-xl p-1">
              {[['both', 'All'], ['Checkins', 'Visits'], ['Revenue', '₹']].map(([mode, label]) => (
                <button key={mode} onClick={() => setChartMode(mode)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    chartMode === mode ? 'bg-dark-500 text-white' : 'text-gray-500 hover:text-gray-300'
                  }`}>{label}</button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="h-56 flex items-center justify-center">
              <div className="w-7 h-7 border-2 border-primary-600/30 border-t-primary-500 rounded-full animate-spin" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              {chartMode === 'Revenue' ? (
                <LineChart data={chartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.05)' }} />
                  <Line type="monotone" dataKey="Revenue" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981' }} name="Revenue" />
                </LineChart>
              ) : chartMode === 'Checkins' ? (
                <BarChart data={chartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="Checkins" fill={themeColor} radius={[6,6,0,0]} name="Checkins" />
                </BarChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af', paddingTop: 8 }} />
                  <Bar dataKey="Checkins" fill={themeColor} radius={[4,4,0,0]} name="Checkins" />
                  <Bar dataKey="Revenue" fill="#10b981" radius={[4,4,0,0]} name="Revenue" />
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>

        {/* Activity Feed */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary-400" />
            </div>
            <h2 className="text-white font-semibold">Recent Activity</h2>
          </div>
          <ActivityFeed events={events} loading={loading} />
        </div>
      </div>

      {/* ── Quick Actions (6-cell grid) ─────────────────────── */}
      <div>
        <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" /> Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Members',       path: '/members',       icon: Users,       color: 'text-primary-400',  bg: 'bg-primary-500/10'  },
            { label: 'Attendance',    path: '/attendance',    icon: Clock,       color: 'text-blue-400',     bg: 'bg-blue-500/10'     },
            { label: 'Subscriptions', path: '/subscriptions', icon: CreditCard,  color: 'text-emerald-400',  bg: 'bg-emerald-500/10'  },
            { label: 'Revenue',       path: '/revenue',       icon: IndianRupee, color: 'text-amber-400',    bg: 'bg-amber-500/10'    },
            { label: 'Announcements', path: '/announcements', icon: Megaphone,   color: 'text-violet-400',   bg: 'bg-violet-500/10'   },
            { label: 'Reports',       path: '/reports',       icon: BarChart3,   color: 'text-orange-400',   bg: 'bg-orange-500/10'   },
          ].map(({ label, path, icon: Icon, color, bg }) => (
            <button key={path} onClick={() => navigate(path)}
              className="card flex flex-col items-center gap-2.5 py-4 hover:border-white/20 hover:-translate-y-0.5 transition-all group">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <p className="text-gray-300 text-xs font-semibold group-hover:text-white transition-colors">{label}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
