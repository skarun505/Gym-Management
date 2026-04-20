import { useEffect, useState, useCallback } from 'react';
import {
  Search, Users, UserCheck, UserX, Eye, X,
  Building2, Phone, Mail, CreditCard, Calendar,
  ChevronLeft, ChevronRight as ChevronRightIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const PAGE_SIZE = 20;

// ── Member Detail Drawer ──────────────────────────────────────
function MemberDrawer({ member, onClose }) {
  const [subs, setSubs] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!member) return;
    setLoading(true);
    Promise.all([
      supabase.from('member_subscriptions')
        .select('*, subscription_plans(plan_name, duration, price)')
        .eq('member_id', member.id)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase.from('attendance')
        .select('check_in, check_out')
        .eq('member_id', member.id)
        .order('check_in', { ascending: false })
        .limit(10),
    ]).then(([subsRes, attRes]) => {
      setSubs(subsRes.data || []);
      setAttendance(attRes.data || []);
      setLoading(false);
    });
  }, [member?.id]);

  if (!member) return null;

  const activeSub = subs.find(s => s.status === 'active');
  const daysLeft = activeSub
    ? Math.ceil((new Date(activeSub.end_date) - new Date()) / 86400000)
    : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="fixed top-0 right-0 h-full w-full max-w-md flex flex-col shadow-2xl"
        style={{ background: 'rgba(14,14,28,0.98)', borderLeft: '1px solid rgba(255,255,255,0.07)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center flex-shrink-0">
            {member.photo_url
              ? <img src={member.photo_url} alt={member.full_name} className="w-full h-full object-cover" />
              : <span className="text-white text-xl font-bold">{member.full_name?.charAt(0)}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-bold text-lg truncate">{member.full_name}</h2>
            <p className="font-mono text-violet-400 text-xs">{member.member_code}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                member.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
              }`}>{member.status}</span>
              <span className="text-xs text-gray-500">{member.gyms?.name}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Contact */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Contact Info</p>
            <div className="space-y-2">
              {[
                { icon: Phone, label: 'Phone', value: member.phone },
                { icon: Mail,  label: 'Email', value: member.email },
                { icon: Calendar, label: 'DOB', value: member.dob ? new Date(member.dob).toLocaleDateString('en-IN') : null },
              ].map(({ icon: Icon, label, value }) => value && (
                <div key={label} className="flex items-center gap-3 bg-dark-700/50 rounded-xl p-3">
                  <Icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
                    <p className="text-white text-sm">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Subscription */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Subscription</p>
            {loading ? (
              <div className="h-16 bg-dark-700 rounded-xl animate-pulse" />
            ) : activeSub ? (
              <div className="bg-dark-700/60 rounded-xl p-4 border border-white/5">
                <p className="text-white font-semibold">{activeSub.subscription_plans?.plan_name}</p>
                <p className="text-gray-400 text-sm capitalize">{activeSub.subscription_plans?.duration} · ₹{activeSub.subscription_plans?.price}</p>
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex-1 bg-dark-600 rounded-full h-1.5">
                    <div
                      className={`h-full rounded-full ${daysLeft > 7 ? 'bg-emerald-500' : daysLeft > 3 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.max(0, Math.min(100, (daysLeft / 30) * 100))}%` }}
                    />
                  </div>
                  <span className={`text-xs font-semibold ${daysLeft > 7 ? 'text-emerald-400' : daysLeft > 3 ? 'text-amber-400' : 'text-red-400'}`}>
                    {daysLeft}d left
                  </span>
                </div>
                <p className="text-gray-600 text-xs mt-2">Ends {new Date(activeSub.end_date).toLocaleDateString('en-IN')}</p>
              </div>
            ) : (
              <div className="bg-dark-700/40 rounded-xl p-4 text-center">
                <CreditCard className="w-6 h-6 text-gray-600 mx-auto mb-1" />
                <p className="text-gray-500 text-sm">No active subscription</p>
              </div>
            )}
          </div>

          {/* Recent Attendance */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Recent Attendance</p>
            {loading ? (
              <div className="space-y-2">{Array.from({length:3}).map((_,i) => <div key={i} className="h-10 bg-dark-700 rounded-xl animate-pulse" />)}</div>
            ) : attendance.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-3">No attendance recorded</p>
            ) : (
              <div className="space-y-2">
                {attendance.map((a, i) => (
                  <div key={i} className="flex items-center justify-between bg-dark-700/40 rounded-xl px-3 py-2.5">
                    <span className="text-gray-300 text-sm">{new Date(a.check_in).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                    <span className="text-gray-500 text-xs">{new Date(a.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fitness Goal */}
          {member.fitness_goal && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Fitness Goal</p>
              <p className="text-gray-300 text-sm bg-dark-700/40 rounded-xl p-3">{member.fitness_goal}</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/5">
          <p className="text-xs text-gray-600 text-center">
            Joined {new Date(member.joined_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function SuperMembersPage() {
  const [members,     setMembers]     = useState([]);
  const [gyms,        setGyms]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [gymFilter,   setGymFilter]   = useState('');
  const [statusFilter,setStatusFilter]= useState('');
  const [page,        setPage]        = useState(1);
  const [total,       setTotal]       = useState(0);
  const [selected,    setSelected]    = useState(null);

  // Load gyms for filter dropdown
  useEffect(() => {
    supabase.from('gyms').select('id, name').order('name').then(({ data }) => setGyms(data || []));
  }, []);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase
        .from('members')
        .select(`
          id, member_code, full_name, phone, email, dob, photo_url,
          status, joined_at, fitness_goal, health_notes, address,
          gym_id,
          gyms(id, name, theme_color),
          member_subscriptions(id, status, end_date, subscription_plans(plan_name))
        `, { count: 'exact' })
        .order('joined_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (search)      q = q.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,member_code.ilike.%${search}%,email.ilike.%${search}%`);
      if (gymFilter)   q = q.eq('gym_id', gymFilter);
      if (statusFilter) q = q.eq('status', statusFilter);

      const { data, count, error } = await q;
      if (error) throw error;
      setMembers(data || []);
      setTotal(count || 0);
    } catch (err) {
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [search, gymFilter, statusFilter, page]);

  useEffect(() => { setPage(1); }, [search, gymFilter, statusFilter]);
  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const getActiveSub = (m) => {
    const subs = m.member_subscriptions || [];
    return subs.find(s => s.status === 'active') || null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            All Members
          </h1>
          <p className="page-subtitle">{total.toLocaleString()} member{total !== 1 ? 's' : ''} across all gyms</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-10 w-full"
            placeholder="Search name, phone, ID..."
          />
        </div>

        {/* Gym filter */}
        <select
          value={gymFilter}
          onChange={e => setGymFilter(e.target.value)}
          className="input-field max-w-[200px]"
        >
          <option value="">All Gyms</option>
          {gyms.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>

        {/* Status filter */}
        <div className="flex rounded-xl overflow-hidden border border-white/10">
          {['', 'active', 'inactive'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                statusFilter === s ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Gym</th>
                <th>Admission ID</th>
                <th>Contact</th>
                <th>Subscription</th>
                <th>Status</th>
                <th>Joined</th>
                <th>View</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>{Array.from({length:8}).map((_,j) => <td key={j}><div className="h-4 bg-dark-600 rounded animate-pulse" /></td>)}</tr>
                ))
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <Users className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">No members found</p>
                  </td>
                </tr>
              ) : members.map(m => {
                const sub = getActiveSub(m);
                const daysLeft = sub ? Math.ceil((new Date(sub.end_date) - new Date()) / 86400000) : null;
                return (
                  <tr key={m.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ring-1 ring-white/10">
                          {m.photo_url
                            ? <img src={m.photo_url} alt={m.full_name} className="w-full h-full object-cover" />
                            : m.full_name?.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-white truncate">{m.full_name}</p>
                          <p className="text-xs text-gray-500 truncate">{m.email || m.phone || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                          style={{ background: m.gyms?.theme_color || '#7c3aed' }}
                        >
                          {m.gyms?.name?.charAt(0)}
                        </div>
                        <span className="text-gray-300 text-sm truncate max-w-[120px]">{m.gyms?.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="font-mono text-violet-400 text-xs">{m.member_code}</span>
                    </td>
                    <td>
                      <div className="text-sm">
                        <p className="text-gray-300">{m.phone || '—'}</p>
                        <p className="text-gray-500 text-xs truncate max-w-[140px]">{m.email || ''}</p>
                      </div>
                    </td>
                    <td>
                      {!sub ? (
                        <span className="text-gray-600 text-xs">No plan</span>
                      ) : (
                        <div>
                          <p className="text-gray-300 text-sm font-medium">{sub.subscription_plans?.plan_name}</p>
                          <span className={`text-[11px] font-semibold ${
                            daysLeft > 7 ? 'text-gray-500' : daysLeft > 3 ? 'text-amber-400' : 'text-red-400'
                          }`}>
                            {daysLeft > 0 ? `${daysLeft}d left` : 'Expired'}
                          </span>
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={m.status === 'active' ? 'badge-active' : 'badge-expired'}>
                        {m.status === 'active' ? <UserCheck className="w-3 h-3 mr-1"/> : <UserX className="w-3 h-3 mr-1"/>}
                        {m.status}
                      </span>
                    </td>
                    <td className="text-gray-400 text-sm">{new Date(m.joined_at).toLocaleDateString('en-IN')}</td>
                    <td>
                      <button
                        onClick={() => setSelected(m)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-violet-400 hover:bg-violet-500/10 transition-colors"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
            <p className="text-gray-500 text-sm">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-gray-300 text-sm font-medium px-2">{page} / {totalPages}</span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {selected && <MemberDrawer member={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
