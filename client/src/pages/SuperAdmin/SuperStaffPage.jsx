import { useEffect, useState, useCallback } from 'react';
import {
  Search, Users, X, Eye, Building2, Phone, Mail,
  Briefcase, Calendar, ChevronLeft, ChevronRight as ChevronRightIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const PAGE_SIZE = 20;

const ROLE_COLORS = {
  admin:     { bg: 'bg-violet-500/15', text: 'text-violet-400' },
  trainer:   { bg: 'bg-blue-500/15',   text: 'text-blue-400'   },
  reception: { bg: 'bg-cyan-500/15',   text: 'text-cyan-400'   },
  staff:     { bg: 'bg-gray-500/15',   text: 'text-gray-400'   },
};

// ── Staff Detail Drawer ───────────────────────────────────────
function StaffDrawer({ staff, onClose }) {
  if (!staff) return null;
  const rc = ROLE_COLORS[staff.role] || ROLE_COLORS.staff;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="fixed top-0 right-0 h-full w-full max-w-md flex flex-col shadow-2xl"
        style={{ background: 'rgba(14,14,28,0.98)', borderLeft: '1px solid rgba(255,255,255,0.07)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xl font-bold">{staff.full_name?.charAt(0)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-bold text-lg truncate">{staff.full_name}</h2>
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${rc.bg} ${rc.text}`}>
              <Briefcase className="w-3 h-3" />
              {staff.role}
            </span>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Gym */}
          <div className="bg-dark-700/60 rounded-xl p-4 border border-white/5 flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ background: staff.gyms?.theme_color || '#7c3aed' }}
            >
              {staff.gyms?.name?.charAt(0)}
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Gym</p>
              <p className="text-white font-semibold text-sm">{staff.gyms?.name}</p>
            </div>
          </div>

          {/* Details */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Contact Info</p>
            <div className="space-y-2">
              {[
                { icon: Phone,    label: 'Phone', value: staff.phone },
                { icon: Mail,     label: 'Email', value: staff.email },
                { icon: Calendar, label: 'DOB',   value: staff.dob ? new Date(staff.dob).toLocaleDateString('en-IN') : null },
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

          {staff.shift_info && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Shift / Schedule</p>
              <p className="text-gray-300 text-sm bg-dark-700/40 rounded-xl p-3">{staff.shift_info}</p>
            </div>
          )}

          {staff.salary && (
            <div className="bg-dark-700/60 rounded-xl p-4 border border-white/5 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Monthly Salary</p>
                <p className="text-white font-bold text-xl mt-0.5">₹{Number(staff.salary).toLocaleString('en-IN')}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <span className="text-emerald-400 font-bold text-lg">₹</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/5">
          <p className="text-xs text-gray-600 text-center">
            Joined staff {new Date(staff.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function SuperStaffPage() {
  const [staffList,   setStaffList]   = useState([]);
  const [gyms,        setGyms]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [gymFilter,   setGymFilter]   = useState('');
  const [roleFilter,  setRoleFilter]  = useState('');
  const [page,        setPage]        = useState(1);
  const [total,       setTotal]       = useState(0);
  const [selected,    setSelected]    = useState(null);

  useEffect(() => {
    supabase.from('gyms').select('id, name').order('name').then(({ data }) => setGyms(data || []));
  }, []);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase
        .from('staff')
        .select(`
          id, full_name, role, phone, email, shift_info, status, salary, dob, created_at, gym_id,
          gyms(id, name, theme_color)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (search)     q = q.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
      if (gymFilter)  q = q.eq('gym_id', gymFilter);
      if (roleFilter) q = q.eq('role', roleFilter);

      const { data, count, error } = await q;
      if (error) throw error;
      setStaffList(data || []);
      setTotal(count || 0);
    } catch (err) {
      toast.error('Failed to load staff');
    } finally {
      setLoading(false);
    }
  }, [search, gymFilter, roleFilter, page]);

  useEffect(() => { setPage(1); }, [search, gymFilter, roleFilter]);
  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            All Staff
          </h1>
          <p className="page-subtitle">{total.toLocaleString()} staff member{total !== 1 ? 's' : ''} across all gyms</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10 w-full" placeholder="Search name, phone, email..." />
        </div>
        <select value={gymFilter} onChange={e => setGymFilter(e.target.value)} className="input-field max-w-[200px]">
          <option value="">All Gyms</option>
          {gyms.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="input-field max-w-[160px]">
          <option value="">All Roles</option>
          {['admin','trainer','reception','staff'].map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Gym</th>
                <th>Role</th>
                <th>Contact</th>
                <th>Shift</th>
                <th>Salary</th>
                <th>Status</th>
                <th>View</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({length:5}).map((_,i) => (
                  <tr key={i}>{Array.from({length:8}).map((_,j) => <td key={j}><div className="h-4 bg-dark-600 rounded animate-pulse" /></td>)}</tr>
                ))
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <Users className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">No staff found</p>
                  </td>
                </tr>
              ) : staffList.map(s => {
                const rc = ROLE_COLORS[s.role] || ROLE_COLORS.staff;
                return (
                  <tr key={s.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {s.full_name?.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-white truncate">{s.full_name}</p>
                          <p className="text-xs text-gray-500 truncate">{s.email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                          style={{ background: s.gyms?.theme_color || '#7c3aed' }}
                        >
                          {s.gyms?.name?.charAt(0)}
                        </div>
                        <span className="text-gray-300 text-sm truncate max-w-[120px]">{s.gyms?.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${rc.bg} ${rc.text}`}>
                        {s.role}
                      </span>
                    </td>
                    <td>
                      <div className="text-sm">
                        <p className="text-gray-300">{s.phone || '—'}</p>
                      </div>
                    </td>
                    <td className="text-gray-400 text-sm max-w-[120px] truncate">{s.shift_info || '—'}</td>
                    <td className="text-white font-semibold text-sm">
                      {s.salary ? `₹${Number(s.salary).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td>
                      <span className={s.status === 'active' ? 'badge-active' : 'badge-expired'}>{s.status}</span>
                    </td>
                    <td>
                      <button
                        onClick={() => setSelected(s)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-violet-400 hover:bg-violet-500/10 transition-colors"
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
            <p className="text-gray-500 text-sm">Showing {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE,total)} of {total}</p>
            <div className="flex items-center gap-2">
              <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="p-2 rounded-lg text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-gray-300 text-sm font-medium px-2">{page} / {totalPages}</span>
              <button disabled={page===totalPages} onClick={() => setPage(p=>p+1)} className="p-2 rounded-lg text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {selected && <StaffDrawer staff={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
