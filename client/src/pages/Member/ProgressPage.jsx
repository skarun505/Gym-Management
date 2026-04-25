import { useEffect, useState, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, Minus, Scale, Ruler,
  Plus, Save, ChevronLeft, ChevronRight, Check, Activity
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const fmt = (d) => d.toISOString().split('T')[0];

// ─── Mini Sparkline ───────────────────────────────────────────
function Sparkline({ data, color = '#a21cce' }) {
  if (data.length < 2) return null;
  const vals = data.map(d => d.value).filter(Boolean);
  if (!vals.length) return null;
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const w = 80, h = 28;
  const pts = data
    .filter(d => d.value)
    .map((d, i, arr) => {
      const x = (i / (arr.length - 1)) * w;
      const y = h - ((d.value - min) / range) * h;
      return `${x},${y}`;
    }).join(' ');

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-70">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Stat Card ────────────────────────────────────────────────
function StatCard({ label, current, first, unit, icon: Icon, color, sparkData }) {
  const diff = current && first ? +(current - first).toFixed(1) : null;
  const TrendIcon = diff === null ? Minus : diff < 0 ? TrendingDown : diff > 0 ? TrendingUp : Minus;
  const trendColor = diff === null ? 'text-gray-600'
    : label === 'Weight' || label === 'Waist' || label === 'Body Fat'
      ? (diff < 0 ? 'text-emerald-400' : diff > 0 ? 'text-red-400' : 'text-gray-500')
      : (diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-amber-400' : 'text-gray-500');

  return (
    <div className="card space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
            <Icon className="w-3.5 h-3.5" style={{ color }} />
          </div>
          <span className="text-gray-400 text-xs font-semibold">{label}</span>
        </div>
        {diff !== null && (
          <div className={`flex items-center gap-0.5 text-xs font-bold ${trendColor}`}>
            <TrendIcon className="w-3.5 h-3.5" />
            {Math.abs(diff)}{unit}
          </div>
        )}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-white font-black text-xl leading-none">
            {current ?? '—'}
            {current && <span className="text-gray-500 text-xs font-normal ml-0.5">{unit}</span>}
          </p>
          {first && first !== current && (
            <p className="text-gray-600 text-[10px] mt-0.5">was {first}{unit}</p>
          )}
        </div>
        <Sparkline data={sparkData} color={color} />
      </div>
    </div>
  );
}

// ─── Input Field ─────────────────────────────────────────────
function MeasureInput({ label, field, value, onChange, unit, icon: Icon, color }) {
  return (
    <div>
      <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" style={{ color }} /> {label}
      </label>
      <div className="relative">
        <input
          type="number" step="0.1" min="0"
          value={value} onChange={e => onChange(field, e.target.value)}
          className="input-field pr-10"
          placeholder="—"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-semibold">{unit}</span>
      </div>
    </div>
  );
}

const MEASURES = [
  { label: 'Weight',   field: 'weight_kg', unit: 'kg', icon: Scale,    color: '#f97316' },
  { label: 'Chest',    field: 'chest_cm',  unit: 'cm', icon: Ruler,    color: '#a855f7' },
  { label: 'Waist',    field: 'waist_cm',  unit: 'cm', icon: Ruler,    color: '#3b82f6' },
  { label: 'Hips',     field: 'hips_cm',   unit: 'cm', icon: Ruler,    color: '#ec4899' },
  { label: 'Arms',     field: 'arms_cm',   unit: 'cm', icon: Activity, color: '#10b981' },
  { label: 'Thighs',   field: 'thighs_cm', unit: 'cm', icon: Ruler,    color: '#f59e0b' },
  { label: 'Body Fat', field: 'body_fat_pct', unit: '%', icon: TrendingDown, color: '#ef4444' },
];

export default function ProgressPage() {
  const { user } = useAuthStore();
  const [member,  setMember]  = useState(null);
  const [logs,    setLogs]    = useState([]);  // all logs newest first
  const [date,    setDate]    = useState(fmt(new Date()));
  const [form,    setForm]    = useState({});
  const [notes,   setNotes]   = useState('');
  const [saving,  setSaving]  = useState(false);
  const [loading, setLoading] = useState(true);

  const isToday   = date === fmt(new Date());
  const todayLog  = logs.find(l => l.log_date === date);
  const firstLog  = logs.length ? logs[logs.length - 1] : null;

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data: m } = await supabase.from('members').select('*').eq('profile_id', user.id).maybeSingle();
      if (!m) { setLoading(false); return; }
      setMember(m);
      const { data } = await supabase.from('progress_logs').select('*')
        .eq('member_id', m.id).order('log_date', { ascending: false }).limit(30);
      setLogs(data || []);
    } finally { setLoading(false); }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  // When date changes, prefill from that day's log
  useEffect(() => {
    const log = logs.find(l => l.log_date === date);
    if (log) {
      const f = {};
      MEASURES.forEach(m => { if (log[m.field]) f[m.field] = String(log[m.field]); });
      setForm(f);
      setNotes(log.notes || '');
    } else {
      setForm({});
      setNotes('');
    }
  }, [date, logs]);

  const navigate = (dir) => {
    const d = new Date(date); d.setDate(d.getDate() + dir);
    if (d > new Date()) return;
    setDate(fmt(d));
  };

  const save = async () => {
    if (!member) return;
    if (!Object.values(form).some(v => v)) { toast.error('Enter at least one measurement'); return; }
    setSaving(true);
    try {
      const row = {
        gym_id:    member.gym_id,
        member_id: member.id,
        log_date:  date,
        notes:     notes || null,
        ...Object.fromEntries(MEASURES.map(m => [m.field, form[m.field] ? Number(form[m.field]) : null])),
      };
      const { error } = todayLog
        ? await supabase.from('progress_logs').update(row).eq('id', todayLog.id)
        : await supabase.from('progress_logs').insert(row);
      if (error) throw error;
      toast.success('Progress saved! 📈');
      load();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-2 border-primary-600/30 border-t-primary-500 rounded-full animate-spin" />
    </div>
  );
  if (!member) return (
    <div className="flex flex-col items-center justify-center h-64 text-center px-6 gap-3">
      <TrendingUp className="w-12 h-12 text-gray-700" />
      <p className="text-white font-semibold">Profile not linked</p>
    </div>
  );

  // Build spark data for each metric
  const sparkFor = (field) => [...logs].reverse().slice(-8).map(l => ({ value: l[field] }));

  // Summary: change since first log
  const latestLog = logs[0];

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="px-5 pt-6">
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary-400" /> Progress
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">Track your body transformation</p>

        {/* Date nav */}
        <div className="flex items-center justify-between mt-4 bg-dark-800 border border-white/5 rounded-2xl px-4 py-2.5">
          <button onClick={() => navigate(-1)} className="p-1 text-gray-400 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-white font-bold text-sm">
              {isToday ? 'Today' : new Date(date).toLocaleDateString('en-IN', { weekday: 'long' })}
            </p>
            <p className="text-gray-500 text-xs">
              {new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <button onClick={() => navigate(1)} disabled={isToday}
            className="p-1 text-gray-400 hover:text-white disabled:opacity-30">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Progress overview cards */}
      {latestLog && (
        <div className="px-5">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">
            Your Progress {firstLog && firstLog.log_date !== latestLog.log_date ? `since ${new Date(firstLog.log_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {MEASURES.filter(m => latestLog[m.field]).map(m => (
              <StatCard
                key={m.field}
                label={m.label}
                current={latestLog[m.field]}
                first={firstLog?.[m.field]}
                unit={m.unit}
                icon={m.icon}
                color={m.color}
                sparkData={sparkFor(m.field)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Log form */}
      <div className="px-5 card space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-white font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary-400" />
            {todayLog ? 'Update' : 'Log'} Measurements
          </p>
          {todayLog && (
            <span className="text-emerald-400 text-xs flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Logged
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {MEASURES.map(m => (
            <MeasureInput
              key={m.field}
              label={m.label}
              field={m.field}
              value={form[m.field] || ''}
              onChange={(f, v) => setForm(p => ({ ...p, [f]: v }))}
              unit={m.unit}
              icon={m.icon}
              color={m.color}
            />
          ))}
        </div>

        <div>
          <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5 block">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            className="input-field" rows={2}
            placeholder="How are you feeling? Any changes in diet or workout?" />
        </div>

        <button onClick={save} disabled={saving}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
          {saving
            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : todayLog ? 'Update Log' : 'Save Progress'}
        </button>
      </div>

      {/* History list */}
      {logs.length > 0 && (
        <div className="px-5">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">Log History</p>
          <div className="space-y-2">
            {logs.slice(0, 10).map(l => (
              <div key={l.id}
                onClick={() => setDate(l.log_date)}
                className={`card flex items-start justify-between cursor-pointer hover:border-primary-500/30 transition-all ${l.log_date === date ? 'border-primary-500/30 bg-primary-500/5' : ''}`}>
                <div>
                  <p className="text-white text-sm font-semibold">
                    {new Date(l.log_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {l.log_date === fmt(new Date()) && <span className="ml-2 text-primary-400 text-xs">Today</span>}
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                    {MEASURES.filter(m => l[m.field]).map(m => (
                      <span key={m.field} className="text-gray-500 text-xs">
                        {m.label}: <span className="text-gray-300 font-semibold">{l[m.field]}{m.unit}</span>
                      </span>
                    ))}
                  </div>
                  {l.notes && <p className="text-gray-600 text-xs mt-1 italic">"{l.notes}"</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {logs.length === 0 && (
        <div className="px-5">
          <div className="card text-center py-8">
            <Scale className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-white font-semibold">No progress logs yet</p>
            <p className="text-gray-500 text-sm mt-1">Log your first measurement above to start tracking your transformation!</p>
          </div>
        </div>
      )}
    </div>
  );
}
