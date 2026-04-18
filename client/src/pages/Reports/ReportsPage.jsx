import { useEffect, useState } from 'react';
import { Download, TrendingUp, Users, AlertCircle, Clock } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

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

export default function ReportsPage() {
  const [summary, setSummary] = useState(null);
  const [chart, setChart] = useState([]);
  const [expiringList, setExpiringList] = useState([]);
  const [topMembers, setTopMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user?.gym_id) return;
    const fetchAll = async () => {
      const gymId = user.gym_id;
      const today = new Date().toISOString().split('T')[0];
      const in7 = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      const last30 = Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        return d.toISOString().split('T')[0];
      });

      try {
        const [membersRes, todayRes, expiringRes, inventoryRes, attendRes, expListRes, topRes] = await Promise.all([
          supabase.from('members').select('id', { count: 'exact', head: true }).eq('gym_id', gymId).eq('status', 'active'),
          supabase.from('attendance').select('id', { count: 'exact', head: true }).eq('gym_id', gymId).eq('created_at', today),
          supabase.from('member_subscriptions').select('id', { count: 'exact', head: true }).eq('gym_id', gymId).eq('status', 'active').gte('end_date', today).lte('end_date', in7),
          supabase.from('inventory').select('id, quantity, low_stock_alert').eq('gym_id', gymId),
          supabase.from('attendance').select('created_at').eq('gym_id', gymId).in('created_at', last30),
          supabase.from('member_subscriptions').select('end_date, members(full_name, phone), subscription_plans(plan_name)').eq('gym_id', gymId).eq('status', 'active').gte('end_date', today).lte('end_date', in7).order('end_date'),
          supabase.from('attendance').select('member_id, members(full_name)').eq('gym_id', gymId).gte('created_at', last30[0]),
        ]);

        const lowStock = (inventoryRes.data || []).filter(i => i.quantity <= i.low_stock_alert).length;

        // Build 30-day chart
        const countMap = {};
        (attendRes.data || []).forEach(a => {
          countMap[a.created_at] = (countMap[a.created_at] || 0) + 1;
        });
        const chartData = last30.slice(-14).map(d => ({
          date: new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
          count: countMap[d] || 0,
        }));

        // Top 5 members by visits
        const memberVisits = {};
        (topRes.data || []).forEach(a => {
          const name = a.members?.full_name || 'Unknown';
          memberVisits[name] = (memberVisits[name] || 0) + 1;
        });
        const top5 = Object.entries(memberVisits).sort((a, b) => b[1] - a[1]).slice(0, 5)
          .map(([name, visits]) => ({ name, visits }));

        setSummary({
          total_members: membersRes.count ?? 0,
          today_attendance: todayRes.count ?? 0,
          expiring_soon: expiringRes.count ?? 0,
          low_stock_alerts: lowStock,
        });
        setChart(chartData);
        setExpiringList((expListRes.data || []).map(s => ({
          id: s.id,
          full_name: s.members?.full_name,
          phone: s.members?.phone,
          plan_name: s.subscription_plans?.plan_name,
          end_date: s.end_date,
        })));
        setTopMembers(top5);
      } catch { toast.error('Failed to load reports'); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, [user?.gym_id]);

  // ── CSV Export ───────────────────────────────────────────
  const handleExport = async () => {
    try {
      toast.loading('Generating report...');
      const gymId = user.gym_id;

      const [membersRes, subsRes, attendRes] = await Promise.all([
        supabase.from('members').select('member_code,full_name,phone,email,status,joined_at').eq('gym_id', gymId),
        supabase.from('member_subscriptions').select('start_date,end_date,status,members(full_name),subscription_plans(plan_name,price)').eq('gym_id', gymId),
        supabase.from('attendance').select('created_at,check_in,check_out,members(full_name)').eq('gym_id', gymId).order('check_in', { ascending: false }).limit(500),
      ]);

      const gymName = user.gym?.name || 'Gym';
      let csv = `GYM MANAGEMENT REPORT — ${gymName}\nGenerated: ${new Date().toLocaleString('en-IN')}\n\n`;

      csv += '=== MEMBERS ===\nCode,Name,Phone,Email,Status,Joined\n';
      (membersRes.data || []).forEach(m => {
        csv += `${m.member_code},"${m.full_name}",${m.phone || ''},${m.email || ''},${m.status},${m.joined_at?.split('T')[0]}\n`;
      });

      csv += '\n=== SUBSCRIPTIONS ===\nMember,Plan,Price,Start,End,Status\n';
      (subsRes.data || []).forEach(s => {
        csv += `"${s.members?.full_name}","${s.subscription_plans?.plan_name}",₹${s.subscription_plans?.price},${s.start_date},${s.end_date},${s.status}\n`;
      });

      csv += '\n=== ATTENDANCE (Last 500) ===\nMember,Date,Check-in,Check-out\n';
      (attendRes.data || []).forEach(a => {
        csv += `"${a.members?.full_name}",${a.created_at},${new Date(a.check_in).toLocaleTimeString('en-IN')},${a.check_out ? new Date(a.check_out).toLocaleTimeString('en-IN') : ''}\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${gymName.replace(/\s+/g, '-')}-report-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.dismiss();
      toast.success('Report exported!');
    } catch { toast.dismiss(); toast.error('Export failed'); }
  };

  return (
    <div className="space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Analytics and data insights</p>
        </div>
        <button onClick={handleExport} className="btn-primary flex items-center gap-2">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Members', value: summary?.total_members, icon: Users, color: 'from-primary-600 to-primary-500' },
          { label: "Today's Visits", value: summary?.today_attendance, icon: Clock, color: 'from-emerald-600 to-emerald-500' },
          { label: 'Expiring (7d)', value: summary?.expiring_soon, icon: AlertCircle, color: 'from-amber-600 to-amber-500' },
          { label: 'Low Stock Items', value: summary?.low_stock_alerts, icon: TrendingUp, color: 'from-red-600 to-red-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="kpi-card">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-gray-400 text-xs">{label}</p>
              <p className="text-2xl font-bold text-white">
                {loading ? <span className="inline-block w-8 h-5 bg-dark-600 rounded animate-pulse" /> : (value ?? 0)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Attendance Chart — Last 14 Days */}
      <div className="card">
        <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary-400" />
          Attendance Trend — Last 14 Days
        </h2>
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-7 h-7 border-2 border-primary-600/30 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chart} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="count" fill="url(#barGrad2)" radius={[6, 6, 0, 0]} />
              <defs>
                <linearGradient id="barGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c044ef" />
                  <stop offset="100%" stopColor="#a21cce" stopOpacity={0.6} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiring Subscriptions */}
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <h2 className="text-white font-semibold">Expiring Soon (7 days)</h2>
            {expiringList.length > 0 && (
              <span className="ml-auto text-xs font-medium bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">{expiringList.length}</span>
            )}
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Plan</th>
                <th>Expires</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => <tr key={i}>{Array.from({ length: 3 }).map((_, j) => <td key={j}><div className="h-4 bg-dark-600 rounded animate-pulse" /></td>)}</tr>)
              ) : expiringList.length === 0 ? (
                <tr><td colSpan={3} className="text-center py-8 text-gray-500">✅ None expiring soon</td></tr>
              ) : expiringList.map((s, i) => (
                <tr key={i}>
                  <td>
                    <p className="text-white font-medium text-sm">{s.full_name}</p>
                    <p className="text-gray-500 text-xs">{s.phone || '—'}</p>
                  </td>
                  <td className="text-gray-400 text-sm">{s.plan_name}</td>
                  <td className="text-amber-400 text-sm font-medium">{s.end_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top Members by Visits */}
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary-400" />
            <h2 className="text-white font-semibold">Most Active Members (30 days)</h2>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Member</th>
                <th>Visits</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <tr key={i}>{Array.from({ length: 3 }).map((_, j) => <td key={j}><div className="h-4 bg-dark-600 rounded animate-pulse" /></td>)}</tr>)
              ) : topMembers.length === 0 ? (
                <tr><td colSpan={3} className="text-center py-8 text-gray-500">No attendance data yet</td></tr>
              ) : topMembers.map((m, idx) => (
                <tr key={m.name}>
                  <td>
                    <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-amber-500 text-white' : idx === 1 ? 'bg-gray-400 text-white' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-dark-600 text-gray-400'}`}>
                      {idx + 1}
                    </span>
                  </td>
                  <td className="text-white font-medium text-sm">{m.name}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-dark-600 rounded-full h-1.5 max-w-[80px]">
                        <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${(m.visits / (topMembers[0]?.visits || 1)) * 100}%` }} />
                      </div>
                      <span className="text-primary-400 font-semibold text-sm">{m.visits}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
