import { useEffect, useState, useCallback } from 'react';
import { Search, Clock, LogOut, LogIn, Calendar, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

export default function AttendancePage() {
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [checkingIn, setCheckingIn] = useState(false);
  const { user } = useAuthStore();

  // ── Fetch today's attendance log ──────────────────────────
  const fetchLog = useCallback(async () => {
    if (!user?.gym_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*, members(full_name, member_code)')
        .eq('gym_id', user.gym_id)
        .eq('created_at', date)
        .order('check_in', { ascending: false });

      if (error) throw error;
      setLog(
        (data || []).map(a => ({
          ...a,
          full_name: a.members?.full_name,
          member_code: a.members?.member_code,
        }))
      );
    } catch {
      toast.error('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, [date, user?.gym_id]);

  useEffect(() => { fetchLog(); }, [fetchLog]);

  // ── Live member search ────────────────────────────────────
  const searchMembers = async (val) => {
    setSearch(val);
    if (!val.trim()) { setSearchResults([]); return; }
    try {
      const { data } = await supabase
        .from('members')
        .select('id, full_name, member_code, phone')
        .eq('gym_id', user.gym_id)
        .eq('status', 'active')
        .or(`full_name.ilike.%${val}%,member_code.ilike.%${val}%,phone.ilike.%${val}%`)
        .limit(5);
      setSearchResults(data || []);
    } catch { }
  };

  // ── Check In ─────────────────────────────────────────────
  const handleCheckIn = async (member) => {
    setCheckingIn(true);
    try {
      // Prevent duplicate check-in on same day
      const { data: existing } = await supabase
        .from('attendance')
        .select('id, check_out')
        .eq('gym_id', user.gym_id)
        .eq('member_id', member.id)
        .eq('created_at', date)
        .is('check_out', null)
        .maybeSingle();

      if (existing) {
        toast.error(`${member.full_name} is already checked in!`);
        return;
      }

      const { error } = await supabase.from('attendance').insert({
        gym_id: user.gym_id,
        member_id: member.id,
        check_in: new Date().toISOString(),
        marked_by: user.id,
        created_at: date,
      });

      if (error) throw error;
      toast.success(`✅ ${member.full_name} checked in!`);
      setSearch('');
      setSearchResults([]);
      fetchLog();
    } catch (err) {
      toast.error(err.message || 'Check-in failed');
    } finally {
      setCheckingIn(false);
    }
  };

  // ── Check Out ─────────────────────────────────────────────
  const handleCheckOut = async (id, name) => {
    try {
      const { error } = await supabase
        .from('attendance')
        .update({ check_out: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast.success(`${name} checked out!`);
      fetchLog();
    } catch (err) {
      toast.error(err.message || 'Check-out failed');
    }
  };

  const activeCount = log.filter(a => !a.check_out).length;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="page-subtitle">
            {log.length} entries · <span className="text-emerald-400">{activeCount} currently inside</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="input-field"
          />
        </div>
      </div>

      {/* Check-in Search */}
      <div className="card space-y-3 relative">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <LogIn className="w-4 h-4 text-emerald-400" />
          Mark Check-in
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={e => searchMembers(e.target.value)}
            className="input-field pl-10"
            placeholder="Search member by name, ID, or phone..."
          />
        </div>

        {searchResults.length > 0 && (
          <div className="absolute z-20 left-6 right-6 top-[calc(100%-8px)] bg-dark-800 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
            {searchResults.map(m => (
              <button
                key={m.id}
                onClick={() => handleCheckIn(m)}
                disabled={checkingIn}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {m.full_name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">{m.full_name}</p>
                  <p className="text-gray-500 text-xs">{m.member_code} · {m.phone || 'No phone'}</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2 py-1 rounded-lg">
                  <LogIn className="w-3 h-3" /> Check In
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Attendance Log Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
          <Clock className="w-4 h-4 text-primary-400" />
          <h2 className="text-white font-semibold">
            Log for {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { dateStyle: 'long' })}
          </h2>
          <span className="ml-auto badge bg-primary-500/20 text-primary-300 border border-primary-500/30">
            {log.length} entries
          </span>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Member Code</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Duration</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j}><div className="h-4 bg-dark-600 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : log.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-14">
                    <CheckCircle className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">No attendance records for this date</p>
                  </td>
                </tr>
              ) : log.map(a => {
                const checkIn = new Date(a.check_in);
                const checkOut = a.check_out ? new Date(a.check_out) : null;
                const duration = checkOut
                  ? (() => {
                      const mins = Math.round((checkOut - checkIn) / 60000);
                      return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
                    })()
                  : '—';
                return (
                  <tr key={a.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {a.full_name?.charAt(0)}
                        </div>
                        <span className="font-medium text-white">{a.full_name}</span>
                      </div>
                    </td>
                    <td><span className="font-mono text-primary-400 text-xs">{a.member_code}</span></td>
                    <td className="text-emerald-400 text-sm">{checkIn.toLocaleTimeString('en-IN', { timeStyle: 'short' })}</td>
                    <td className="text-sm">
                      {checkOut
                        ? <span className="text-gray-400">{checkOut.toLocaleTimeString('en-IN', { timeStyle: 'short' })}</span>
                        : <span className="text-amber-400 font-medium">● Active</span>
                      }
                    </td>
                    <td className="text-gray-400 text-sm">{duration}</td>
                    <td>
                      {!a.check_out && (
                        <button
                          onClick={() => handleCheckOut(a.id, a.full_name)}
                          className="flex items-center gap-1.5 text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <LogOut className="w-3.5 h-3.5" /> Check-out
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
