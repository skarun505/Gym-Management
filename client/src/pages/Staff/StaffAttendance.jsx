import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, UserCheck, LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

function fmt(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function StaffAttendance({ staffList }) {
  const { user } = useAuthStore();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [marking, setMarking] = useState({});

  const load = async () => {
    if (!user?.gym_id) return;
    setLoading(true);
    const { data } = await supabase
      .from('staff_attendance')
      .select('*')
      .eq('gym_id', user.gym_id)
      .eq('date', date)
      .order('check_in', { ascending: false });
    setRecords(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [date, user?.gym_id]);

  const checkedIn = (staffId) => records.find(r => r.staff_id === staffId && !r.check_out);
  const hasRecord = (staffId) => records.find(r => r.staff_id === staffId);

  const markIn = async (staffId) => {
    setMarking(p => ({ ...p, [staffId]: true }));
    try {
      const { error } = await supabase.from('staff_attendance').insert({
        gym_id: user.gym_id,
        staff_id: staffId,
        marked_by: user.id,
        date,
        check_in: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success('Checked in!');
      load();
    } catch (e) { toast.error(e.message); }
    finally { setMarking(p => ({ ...p, [staffId]: false })); }
  };

  const markOut = async (staffId) => {
    const rec = checkedIn(staffId);
    if (!rec) return;
    setMarking(p => ({ ...p, [staffId]: true }));
    try {
      const { error } = await supabase.from('staff_attendance')
        .update({ check_out: new Date().toISOString() })
        .eq('id', rec.id);
      if (error) throw error;
      toast.success('Checked out!');
      load();
    } catch (e) { toast.error(e.message); }
    finally { setMarking(p => ({ ...p, [staffId]: false })); }
  };

  const activeStaff = (staffList || []).filter(s => s.status === 'active');
  const presentToday = records.filter(r => r.check_in).length;

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2 text-center">
            <p className="text-emerald-400 text-xl font-bold">{presentToday}</p>
            <p className="text-gray-500 text-xs">Present</p>
          </div>
          <div className="bg-dark-700 border border-white/5 rounded-xl px-4 py-2 text-center">
            <p className="text-white text-xl font-bold">{activeStaff.length}</p>
            <p className="text-gray-500 text-xs">Total Staff</p>
          </div>
        </div>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="input-field w-auto"
        />
      </div>

      {/* Staff list */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-dark-700 rounded-xl animate-pulse" />)}
        </div>
      ) : activeStaff.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No active staff found.</p>
      ) : (
        <div className="space-y-2">
          {activeStaff.map(s => {
            const inRec = checkedIn(s.id);
            const rec = hasRecord(s.id);
            const isIn = !!inRec;
            const done = !!rec?.check_out;
            return (
              <div key={s.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${isIn ? 'border-emerald-500/30 bg-emerald-500/5' : done ? 'border-white/5 bg-dark-700/40' : 'border-white/5 bg-dark-700/40'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center text-white text-sm font-bold overflow-hidden flex-shrink-0">
                    {s.photo_url ? <img src={s.photo_url} alt={s.full_name} className="w-full h-full object-cover" /> : s.full_name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{s.full_name}</p>
                    <p className="text-gray-500 text-xs capitalize">{s.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {rec && (
                    <div className="text-right text-xs text-gray-400">
                      <p>In: {fmt(rec.check_in)}</p>
                      {rec.check_out && <p>Out: {fmt(rec.check_out)}</p>}
                    </div>
                  )}
                  {!rec ? (
                    <button
                      onClick={() => markIn(s.id)}
                      disabled={marking[s.id]}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 text-xs font-semibold transition-colors"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      {marking[s.id] ? '...' : 'Check In'}
                    </button>
                  ) : isIn ? (
                    <button
                      onClick={() => markOut(s.id)}
                      disabled={marking[s.id]}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600/20 text-orange-400 border border-orange-500/30 hover:bg-orange-600/30 text-xs font-semibold transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      {marking[s.id] ? '...' : 'Check Out'}
                    </button>
                  ) : (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-500">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Done
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
