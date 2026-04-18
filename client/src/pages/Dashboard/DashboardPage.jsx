import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Clock, AlertCircle, Package, TrendingUp, Plus, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import { fetchExpiringSubscriptions } from '../../utils/subscriptionReminders';
import SubscriptionReminderBanner from '../../components/SubscriptionReminderBanner';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="glass-strong rounded-xl px-3 py-2 text-sm">
        <p className="text-gray-400">{label}</p>
        <p className="text-primary-400 font-semibold">{payload[0].value} check-ins</p>
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const [summary,   setSummary]   = useState(null);
  const [chartData, setChartData] = useState([]);
  const [expiring,  setExpiring]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user?.gym_id) return;
    const fetchData = async () => {
      try {
        const gymId = user.gym_id;
        const today = new Date().toISOString().split('T')[0];

        // Compute last 7 dates
        const last7 = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return d.toISOString().split('T')[0];
        });

        const [membersRes, todayRes, expiringRes, inventoryRes, chartRes] = await Promise.all([
          supabase.from('members').select('id', { count: 'exact' }).eq('gym_id', gymId).eq('status', 'active'),
          supabase.from('attendance').select('id', { count: 'exact' }).eq('gym_id', gymId).eq('created_at', today),
          supabase.from('member_subscriptions').select('id', { count: 'exact' })
            .eq('gym_id', gymId).eq('status', 'active')
            .gte('end_date', today)
            .lte('end_date', new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]),
          supabase.from('inventory').select('id, quantity, low_stock_alert').eq('gym_id', gymId),
          supabase.from('attendance').select('created_at').eq('gym_id', gymId).in('created_at', last7),
        ]);

        const lowStock = (inventoryRes.data || []).filter(i => i.quantity <= i.low_stock_alert).length;

        // Build chart from attendance
        const countMap = {};
        (chartRes.data || []).forEach(a => {
          countMap[a.created_at] = (countMap[a.created_at] || 0) + 1;
        });

        setSummary({
          total_members: membersRes.count ?? 0,
          today_attendance: todayRes.count ?? 0,
          expiring_soon: expiringRes.count ?? 0,
          low_stock_alerts: lowStock,
        });

        setChartData(last7.map(d => ({
          date: new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
          count: countMap[d] || 0,
        })));

        // Load reminder items
        const expiringItems = await fetchExpiringSubscriptions(gymId);
        setExpiring(expiringItems);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.gym_id]);

  const gymName = user?.gym?.name || 'Your Gym';

  const kpis = [
    { label: 'Active Members', value: summary?.total_members ?? '—', icon: Users, color: 'from-primary-600 to-primary-500', glow: 'group-hover:shadow-primary-600/30' },
    { label: "Today's Attendance", value: summary?.today_attendance ?? '—', icon: Clock, color: 'from-emerald-600 to-emerald-500', glow: 'group-hover:shadow-emerald-600/30' },
    { label: 'Expiring Soon', value: summary?.expiring_soon ?? '—', icon: AlertCircle, color: 'from-amber-600 to-amber-500', glow: 'group-hover:shadow-amber-600/30' },
    { label: 'Low Stock Alerts', value: summary?.low_stock_alerts ?? '—', icon: Package, color: 'from-red-600 to-red-500', glow: 'group-hover:shadow-red-600/30' },
  ];

  return (
    <div className="space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title text-gradient">{gymName}</h1>
          <p className="page-subtitle">Welcome back, {user?.name}! Here's your gym overview.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/attendance')} className="btn-secondary flex items-center gap-2">
            <Clock className="w-4 h-4" /> Mark Attendance
          </button>
          <button onClick={() => navigate('/members')} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Member
          </button>
        </div>
      </div>

      {/* Compact Reminder Banner */}
      <SubscriptionReminderBanner
        items={expiring}
        onPaid={async () => {
          const items = await fetchExpiringSubscriptions(user.gym_id);
          setExpiring(items);
        }}
        compact
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, color, glow }) => (
          <div key={label} className={`kpi-card group shadow-lg ${glow} transition-shadow`}>
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">{label}</p>
              <p className="text-2xl font-bold text-white">
                {loading ? <span className="inline-block w-10 h-6 bg-dark-600 rounded animate-pulse" /> : value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-primary-600/20 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Attendance — Last 7 Days</h2>
        </div>
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary-600/30 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="count" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c044ef" />
                  <stop offset="100%" stopColor="#a21cce" stopOpacity={0.6} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'View All Members', path: '/members', desc: 'Manage member profiles', icon: Users },
          { label: 'Subscriptions', path: '/subscriptions', desc: 'Plans & renewals', icon: AlertCircle },
          { label: 'View Reports', path: '/reports', desc: 'Analytics & exports', icon: TrendingUp },
        ].map(({ label, path, desc, icon: Icon }) => (
          <button key={path} onClick={() => navigate(path)}
            className="card text-left hover:-translate-y-1 cursor-pointer flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-dark-600 flex items-center justify-center group-hover:bg-primary-600/20 transition-colors">
                <Icon className="w-5 h-5 text-gray-400 group-hover:text-primary-400 transition-colors" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">{label}</p>
                <p className="text-gray-500 text-xs">{desc}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-primary-400 transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
}
