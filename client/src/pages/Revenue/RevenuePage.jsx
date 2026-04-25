import { useEffect, useState } from 'react';
import {
  IndianRupee, TrendingUp, Users, AlertCircle, Wallet,
  Download, Calendar, BarChart2, PieChart as PieIcon, RefreshCw,
  Banknote, Smartphone, CreditCard, Landmark, CheckCircle2
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const COLORS = ['#a21cce', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6'];

const CustomTooltip = ({ active, payload, label, prefix = '₹' }) => {
  if (active && payload?.length) {
    return (
      <div className="glass-strong rounded-xl px-3 py-2 text-sm border border-white/10">
        <p className="text-gray-400 mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="font-semibold" style={{ color: p.color }}>
            {prefix}{Number(p.value).toLocaleString('en-IN')}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function RevenuePage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({});
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [planBreakdown, setPlanBreakdown] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [duesList, setDuesList] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);
  const [period, setPeriod] = useState('6m'); // '1m' | '3m' | '6m' | '12m' | 'custom'
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo]   = useState('');

  const fetchAll = async () => {
    if (!user?.gym_id) return;
    setLoading(true);
    const gymId = user.gym_id;
    const today = new Date();

    const monthsBack = period === '1m' ? 1 : period === '3m' ? 3 : period === '6m' ? 6 : 12;

    // Custom date range overrides preset
    let fromDate, toDateStr;
    if (period === 'custom' && customFrom && customTo) {
      fromDate   = customFrom;
      toDateStr  = customTo;
    }

    try {
      // Build month buckets for preset periods
      let months;
      if (period === 'custom' && customFrom && customTo) {
        // Build day buckets for custom range
        const start = new Date(customFrom);
        const end   = new Date(customTo);
        const diffDays = Math.ceil((end - start) / 86400000) + 1;
        // Group by month if range > 31 days, else by day
        if (diffDays > 31) {
          const mSet = {};
          for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
            const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
            if (!mSet[key]) mSet[key] = {
              key,
              label: `${MONTH_NAMES[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`,
              start: key + '-01',
              end: new Date(d.getFullYear(), d.getMonth()+1, 0).toISOString().split('T')[0],
            };
          }
          months = Object.values(mSet);
        } else {
          months = Array.from({ length: diffDays }, (_, i) => {
            const d = new Date(start); d.setDate(d.getDate() + i);
            const iso = d.toISOString().split('T')[0];
            return { key: iso, label: iso.slice(5), start: iso, end: iso };
          });
        }
      } else {
        months = Array.from({ length: monthsBack }, (_, i) => {
          const d = new Date(today.getFullYear(), today.getMonth() - (monthsBack - 1 - i), 1);
          return {
            key:   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}`,
            label: `${MONTH_NAMES[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`,
            start: d.toISOString().split('T')[0],
            end:   new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0],
          };
        });
        fromDate  = months[0].start;
        toDateStr = months[months.length - 1].end;
      }

      const [paymentsRes, subsRes, duesRes, recentRes] = await Promise.all([
        // All fee payments in period
        (() => {
          let q = supabase.from('fee_payments')
            .select('amount_paid, payment_date, payment_method')
            .eq('gym_id', gymId)
            .gte('payment_date', fromDate);
          if (toDateStr) q = q.lte('payment_date', toDateStr);
          return q;
        })(),
        // All subscriptions for plan breakdown
        supabase.from('member_subscriptions')
          .select('*, subscription_plans(plan_name, price, duration)')
          .eq('gym_id', gymId)
          .eq('status', 'active'),
        // Unpaid / partial dues
        supabase.from('member_subscriptions')
          .select('id, paid_confirmed, members(full_name, phone, member_code), subscription_plans(plan_name, price)')
          .eq('gym_id', gymId)
          .eq('status', 'active')
          .eq('paid_confirmed', false),
        // Recent payments with member info
        supabase.from('fee_payments')
          .select('*, members(full_name, member_code)')
          .eq('gym_id', gymId)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      const allPayments = paymentsRes.data || [];

      // ── Monthly Revenue chart ─────────────────────────────
      const monthMap = {};
      months.forEach(m => { monthMap[m.key] = { label: m.label, revenue: 0, txns: 0 }; });
      allPayments.forEach(p => {
        // Match by full date key (for daily) or month prefix (for monthly)
        const kFull  = p.payment_date;
        const kMonth = p.payment_date?.slice(0, 7);
        const key    = monthMap[kFull] ? kFull : kMonth;
        if (monthMap[key]) {
          monthMap[key].revenue += Number(p.amount_paid);
          monthMap[key].txns += 1;
        }
      });
      setMonthlyRevenue(Object.values(monthMap));

      // ── KPIs ─────────────────────────────────────────────
      const totalRevenue  = allPayments.reduce((s, p) => s + Number(p.amount_paid), 0);
      const currentMonth  = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2,'0')}`;
      const thisMonthRev  = allPayments
        .filter(p => p.payment_date?.startsWith(currentMonth))
        .reduce((s, p) => s + Number(p.amount_paid), 0);
      const activeCount   = (subsRes.data || []).length;

      // Dues
      const paidMapRes = await supabase
        .from('fee_payments')
        .select('subscription_id, amount_paid')
        .eq('gym_id', gymId);
      const paidMap = {};
      (paidMapRes.data || []).forEach(p => {
        paidMap[p.subscription_id] = (paidMap[p.subscription_id] || 0) + Number(p.amount_paid);
      });
      const duesRows = (duesRes.data || []).map(s => ({
        ...s,
        full_name:   s.members?.full_name,
        member_code: s.members?.member_code,
        phone:       s.members?.phone,
        plan_name:   s.subscription_plans?.plan_name,
        plan_price:  Number(s.subscription_plans?.price || 0),
        paid:        paidMap[s.id] || 0,
        balance:     Math.max(0, Number(s.subscription_plans?.price || 0) - (paidMap[s.id] || 0)),
      })).filter(s => s.balance > 0);
      const totalDues = duesRows.reduce((s, r) => s + r.balance, 0);

      setKpis({ totalRevenue, thisMonthRev, activeCount, totalDues });
      setDuesList(duesRows);

      // ── Plan Breakdown pie ────────────────────────────────
      const planMap = {};
      (subsRes.data || []).forEach(s => {
        const name = s.subscription_plans?.plan_name || 'Unknown';
        planMap[name] = (planMap[name] || 0) + 1;
      });
      setPlanBreakdown(Object.entries(planMap).map(([name, value]) => ({ name, value })));

      // ── Payment Method pie ────────────────────────────────
      const methodMap = {};
      allPayments.forEach(p => {
        const m = p.payment_method || 'cash';
        methodMap[m] = (methodMap[m] || 0) + Number(p.amount_paid);
      });
      setPaymentMethods(Object.entries(methodMap).map(([name, value]) => ({
        name: name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value,
      })));

      // ── Recent payments ───────────────────────────────────
      setRecentPayments((recentRes.data || []).map(p => ({
        ...p,
        member_name: p.members?.full_name,
        member_code: p.members?.member_code,
      })));

    } catch (err) {
      toast.error('Failed to load revenue data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [user?.gym_id, period, customFrom, customTo]);

  const METHOD_ICON = {
    Cash: <Banknote className="w-4 h-4" />,
    Upi: <Smartphone className="w-4 h-4" />,
    Card: <CreditCard className="w-4 h-4" />,
    'Bank Transfer': <Landmark className="w-4 h-4" />,
  };

  const handleExportDues = () => {
    if (!duesList.length) { toast('No outstanding dues'); return; }
    let csv = 'Member,Code,Phone,Plan,Balance Due\n';
    duesList.forEach(d => {
      csv += `"${d.full_name}","${d.member_code}","${d.phone || ''}","${d.plan_name}",₹${d.balance}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `dues-${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Dues list exported!');
  };

  const kpiCards = [
    {
      label: period === 'custom' && customFrom && customTo
        ? `Revenue (${customFrom} → ${customTo})`
        : `Revenue (${period})`,
      value: `₹${(kpis.totalRevenue || 0).toLocaleString('en-IN')}`,
      icon: TrendingUp,
      color: 'from-primary-600 to-primary-500',
      glow: 'shadow-primary-600/20',
    },
    {
      label: 'This Month',
      value: `₹${(kpis.thisMonthRev || 0).toLocaleString('en-IN')}`,
      icon: Calendar,
      color: 'from-emerald-600 to-emerald-500',
      glow: 'shadow-emerald-600/20',
    },
    {
      label: 'Active Subscriptions',
      value: kpis.activeCount ?? '—',
      icon: Users,
      color: 'from-blue-600 to-blue-500',
      glow: 'shadow-blue-600/20',
    },
    {
      label: 'Outstanding Dues',
      value: `₹${(kpis.totalDues || 0).toLocaleString('en-IN')}`,
      icon: AlertCircle,
      color: 'from-red-600 to-red-500',
      glow: 'shadow-red-600/20',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <IndianRupee className="w-6 h-6 text-primary-400" />
            Revenue & Finance
          </h1>
          <p className="page-subtitle">Track income, dues, and payment trends</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Preset period selector */}
          <div className="flex gap-1 bg-dark-700 rounded-xl p-1 border border-white/8">
            {['1m','3m','6m','12m','custom'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  period === p ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {p === '1m' ? '1 Month' : p === '3m' ? '3 Months' : p === '6m' ? '6 Months' : p === '12m' ? '1 Year' : 'Custom'}
              </button>
            ))}
          </div>

          {/* Custom date range */}
          {period === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="input-field py-1.5 text-sm w-36"
              />
              <span className="text-gray-500 text-xs">to</span>
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="input-field py-1.5 text-sm w-36"
              />
            </div>
          )}

          <button
            onClick={fetchAll}
            disabled={loading}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map(({ label, value, icon: Icon, color, glow }) => (
          <div key={label} className={`kpi-card shadow-lg ${glow}`}>
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">{label}</p>
              <p className="text-2xl font-bold text-white">
                {loading ? <span className="inline-block w-16 h-6 bg-dark-600 rounded animate-pulse" /> : value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-primary-600/20 flex items-center justify-center">
            <BarChart2 className="w-4 h-4 text-primary-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Monthly Revenue</h2>
        </div>
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary-600/30 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyRevenue} margin={{ left: -10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${v}`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="revenue" name="Revenue" fill="url(#revGrad)" radius={[6, 6, 0, 0]} />
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c044ef" />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.6} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Pie Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan Breakdown */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <PieIcon className="w-4 h-4 text-primary-400" />
            <h2 className="text-white font-semibold">Active Members by Plan</h2>
          </div>
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
            </div>
          ) : planBreakdown.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-500">No active subscriptions</div>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie
                    data={planBreakdown}
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {planBreakdown.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} members`, '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {planBreakdown.map((p, i) => (
                  <div key={p.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-gray-300 text-sm truncate max-w-[120px]">{p.name}</span>
                    </div>
                    <span className="text-white font-bold text-sm">{p.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Payment Methods */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <h2 className="text-white font-semibold">Revenue by Payment Method</h2>
          </div>
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            </div>
          ) : paymentMethods.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-500">No payment data yet</div>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie
                    data={paymentMethods}
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {paymentMethods.map((_, i) => (
                      <Cell key={i} fill={['#10b981', '#3b82f6', '#a21cce', '#f59e0b'][i % 4]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {paymentMethods.map((m, i) => (
                  <div key={m.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-dark-600 flex items-center justify-center text-primary-400 flex-shrink-0">
                      {METHOD_ICON[m.name] || <IndianRupee className="w-4 h-4" />}
                    </span>
                      <span className="text-gray-300 text-sm">{m.name}</span>
                    </div>
                    <span className="text-white font-bold text-sm">₹{Number(m.value).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Outstanding Dues Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <h2 className="text-white font-semibold">Outstanding Dues</h2>
            {duesList.length > 0 && (
              <span className="ml-1 text-xs font-medium bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full">
                {duesList.length} members
              </span>
            )}
          </div>
          {duesList.length > 0 && (
            <button onClick={handleExportDues} className="btn-secondary text-sm flex items-center gap-2">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          )}
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Plan</th>
              <th>Total Fee</th>
              <th>Paid</th>
              <th>Balance Due</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 5 }).map((_, j) => (
                  <td key={j}><div className="h-4 bg-dark-600 rounded animate-pulse" /></td>
                ))}</tr>
              ))
            ) : duesList.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-gray-500">
                  ✅ No outstanding dues — all paid!
                </td>
              </tr>
            ) : duesList.map(d => (
              <tr key={d.id}>
                <td>
                  <p className="text-white font-medium text-sm">{d.full_name}</p>
                  <p className="text-gray-500 text-xs font-mono">{d.member_code}</p>
                </td>
                <td className="text-gray-400 text-sm">{d.plan_name}</td>
                <td className="text-gray-300 text-sm">₹{d.plan_price.toLocaleString('en-IN')}</td>
                <td className="text-emerald-400 text-sm font-medium">₹{d.paid.toLocaleString('en-IN')}</td>
                <td>
                  <span className="font-bold text-red-400 text-sm">₹{d.balance.toLocaleString('en-IN')}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent Payments */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
          <IndianRupee className="w-4 h-4 text-primary-400" />
          <h2 className="text-white font-semibold">Recent Payments</h2>
        </div>
        <div className="divide-y divide-white/5">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-dark-600 animate-pulse" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-dark-600 rounded w-32 animate-pulse" />
                  <div className="h-3 bg-dark-700 rounded w-20 animate-pulse" />
                </div>
              </div>
            ))
          ) : recentPayments.length === 0 ? (
            <div className="text-center py-10 text-gray-500">No payments recorded yet</div>
          ) : recentPayments.map(p => (
            <div key={p.id} className="px-5 py-3 flex items-center justify-between hover:bg-white/2 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center text-lg">
                  {({ cash: '💵', upi: '📱', card: '💳', bank_transfer: '🏦' })[p.payment_method] || '💵'}
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{p.member_name}</p>
                  <p className="text-gray-500 text-xs">{p.payment_date} · {p.payment_method?.replace('_', ' ')}</p>
                </div>
              </div>
              <span className="text-emerald-400 font-bold">+₹{Number(p.amount_paid).toLocaleString('en-IN')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
