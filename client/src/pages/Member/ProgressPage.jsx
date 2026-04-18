import { useEffect, useState } from 'react';
import { TrendingUp, Scale, Activity, Award, Plus, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const CustomTooltip = ({ active, payload, label, unit }) => {
  if (active && payload?.length) {
    return (
      <div className="glass-strong rounded-xl px-3 py-2 text-xs">
        <p className="text-gray-400">{label}</p>
        <p className="text-primary-400 font-bold">{payload[0].value}{unit}</p>
      </div>
    );
  }
  return null;
};

// ── Measurement Log Modal ─────────────────────────────────────
function MeasurementModal({ memberId, gymId, onClose, onSaved }) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: { logged_date: new Date().toISOString().split('T')[0] },
  });

  const onSubmit = async (data) => {
    try {
      const payload = {
        gym_id:    gymId,
        member_id: memberId,
        logged_date: data.logged_date,
      };
      const fields = ['weight_kg', 'body_fat_pct', 'chest_cm', 'waist_cm', 'hip_cm', 'bicep_cm'];
      fields.forEach(f => { if (data[f]) payload[f] = Number(data[f]); });
      if (data.notes) payload.notes = data.notes;

      const { error } = await supabase.from('member_measurements').insert(payload);
      if (error) throw error;
      toast.success('Measurements logged! 📏');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold">Log Measurements</h2>
            <p className="text-gray-500 text-xs mt-0.5">Track your body progress</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="label">Date</label>
            <input {...register('logged_date')} type="date" className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Weight (kg)</label>
              <input {...register('weight_kg')} type="number" step="0.1" className="input-field" placeholder="70.5" />
            </div>
            <div>
              <label className="label">Body Fat %</label>
              <input {...register('body_fat_pct')} type="number" step="0.1" className="input-field" placeholder="18.2" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Chest (cm)</label>
              <input {...register('chest_cm')} type="number" step="0.5" className="input-field" />
            </div>
            <div>
              <label className="label">Waist (cm)</label>
              <input {...register('waist_cm')} type="number" step="0.5" className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Hip (cm)</label>
              <input {...register('hip_cm')} type="number" step="0.5" className="input-field" />
            </div>
            <div>
              <label className="label">Bicep (cm)</label>
              <input {...register('bicep_cm')} type="number" step="0.5" className="input-field" />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea {...register('notes')} className="input-field" rows={2} placeholder="How's progress feeling?" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Personal Bests Table ──────────────────────────────────────
function PersonalBests({ memberId }) {
  const [bests, setBests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!memberId) return;
    supabase
      .from('workout_logs')
      .select('exercise, weight_kg')
      .eq('member_id', memberId)
      .not('weight_kg', 'is', null)
      .order('weight_kg', { ascending: false })
      .then(({ data }) => {
        const map = {};
        (data || []).forEach(l => {
          if (!map[l.exercise] || l.weight_kg > map[l.exercise]) map[l.exercise] = l.weight_kg;
        });
        setBests(Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8));
        setLoading(false);
      });
  }, [memberId]);

  if (loading) return <div className="h-20 bg-dark-600 rounded-xl animate-pulse" />;
  if (bests.length === 0) return (
    <p className="text-gray-500 text-sm text-center py-6">No lifting data yet — start logging! 💪</p>
  );

  return (
    <div className="space-y-2">
      {bests.map(([exercise, weight], i) => (
        <div key={exercise} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
            i === 0 ? 'bg-amber-500 text-white' : i === 1 ? 'bg-gray-400 text-white' : i === 2 ? 'bg-amber-700 text-white' : 'bg-dark-600 text-gray-400'
          }`}>{i + 1}</span>
          <span className="flex-1 text-gray-300 text-sm font-medium truncate">{exercise}</span>
          <span className="text-primary-400 font-bold text-sm">{weight} kg</span>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function ProgressPage() {
  const { user } = useAuthStore();
  const [member, setMember]       = useState(null);
  const [attendChart, setAttendChart] = useState([]);
  const [weightChart, setWeightChart] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading]     = useState(true);

  const fetchData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data: m } = await supabase
        .from('members').select('*').eq('profile_id', user.id).maybeSingle();
      if (!m) { setLoading(false); return; }
      setMember(m);

      const last8Weeks = Array.from({ length: 8 }, (_, i) => {
        const start = new Date();
        start.setDate(start.getDate() - (7 - i) * 7);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        return {
          start: start.toISOString().split('T')[0],
          end:   end.toISOString().split('T')[0],
          label: `W${i + 1}`,
        };
      });

      const [attendRes, measureRes] = await Promise.all([
        supabase.from('attendance').select('created_at').eq('member_id', m.id)
          .gte('created_at', last8Weeks[0].start),
        supabase.from('member_measurements').select('logged_date, weight_kg')
          .eq('member_id', m.id).order('logged_date').limit(30),
      ]);

      // Attendance by week
      const dates = (attendRes.data || []).map(a => a.created_at);
      setAttendChart(last8Weeks.map(w => ({
        label: w.label,
        count: dates.filter(d => d >= w.start && d <= w.end).length,
      })));

      // Weight timeline
      setWeightChart((measureRes.data || [])
        .filter(m => m.weight_kg)
        .map(m => ({
          date:   new Date(m.logged_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
          weight: Number(m.weight_kg),
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [user?.id]);

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Progress</h1>
          <p className="text-gray-500 text-sm mt-0.5">Your fitness journey</p>
        </div>
        {member && (
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" /> Log
          </button>
        )}
      </div>

      {loading ? (
        <div className="px-5 space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-40 bg-dark-700 rounded-2xl animate-pulse" />)}
        </div>
      ) : !member ? (
        <div className="flex flex-col items-center justify-center h-64 gap-2 px-6 text-center">
          <Activity className="w-10 h-10 text-gray-700" />
          <p className="text-gray-400 font-medium">Profile not linked</p>
        </div>
      ) : (
        <div className="space-y-0">
          {/* Attendance Chart */}
          <div className="px-5 pb-4">
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-primary-400" />
                <h2 className="text-white font-bold text-sm">Attendance — Last 8 Weeks</h2>
              </div>
              {attendChart.every(d => d.count === 0) ? (
                <p className="text-gray-500 text-sm text-center py-4">No attendance data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={attendChart} margin={{ left: -25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip unit=" sessions" />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="count" fill="url(#pGrad)" radius={[6, 6, 0, 0]} />
                    <defs>
                      <linearGradient id="pGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#c044ef" />
                        <stop offset="100%" stopColor="#a21cce" stopOpacity={0.5} />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Weight Chart */}
          <div className="px-5 pb-4">
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Scale className="w-4 h-4 text-emerald-400" />
                <h2 className="text-white font-bold text-sm">Weight Tracking</h2>
                <span className="ml-auto text-xs text-gray-500">kg</span>
              </div>
              {weightChart.length < 2 ? (
                <div className="text-center py-4">
                  <p className="text-gray-500 text-sm">Not enough data yet</p>
                  <p className="text-gray-600 text-xs mt-1">Log measurements to see your trend</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={weightChart} margin={{ left: -25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                    <Tooltip content={<CustomTooltip unit=" kg" />} />
                    <Line
                      type="monotone" dataKey="weight"
                      stroke="#10b981" strokeWidth={2}
                      dot={{ fill: '#10b981', r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Personal Bests */}
          <div className="px-5 pb-4">
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-4 h-4 text-amber-400" />
                <h2 className="text-white font-bold text-sm">Personal Bests</h2>
                <span className="ml-auto text-xs text-gray-500">Max weight lifted</span>
              </div>
              <PersonalBests memberId={member?.id} />
            </div>
          </div>
        </div>
      )}

      {showModal && member && (
        <MeasurementModal
          memberId={member.id}
          gymId={member.gym_id}
          onClose={() => setShowModal(false)}
          onSaved={fetchData}
        />
      )}
    </div>
  );
}
