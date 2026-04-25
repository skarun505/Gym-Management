import { useEffect, useState, useCallback } from 'react';
import {
  Flame, Droplets, Apple, Beef, Wheat, Plus,
  ChevronLeft, ChevronRight, Save, TrendingUp, Check
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

// ─── Helpers ──────────────────────────────────────────────────
const fmt = (d) => d.toISOString().split('T')[0];
const GOAL_TARGETS = {
  'Weight Loss':     { calories: 1800, protein: 150, carbs: 150, fat: 50,  water: 10 },
  'Muscle Gain':     { calories: 2800, protein: 180, carbs: 320, fat: 80,  water: 12 },
  'General Fitness': { calories: 2200, protein: 120, carbs: 250, fat: 65,  water: 8  },
};
const DEFAULT_TARGET = { calories: 2000, protein: 120, carbs: 200, fat: 60, water: 8 };

// ─── Macro Ring ────────────────────────────────────────────────
function MacroRing({ label, current, target, color, unit = 'g', icon: Icon }) {
  const pct  = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const r    = 28, circ = 2 * Math.PI * r;
  const done = pct >= 100;
  return (
    <div className="card p-3 flex flex-col items-center gap-2">
      <div className="relative w-16 h-16">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
          <circle cx="32" cy="32" r={r} fill="none" stroke={done ? '#10b981' : color}
            strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * circ} ${circ}`}
            className="transition-all duration-700" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {done
            ? <Check className="w-5 h-5 text-emerald-400" />
            : <Icon className="w-4 h-4" style={{ color }} />}
        </div>
      </div>
      <div className="text-center">
        <p className="text-white font-bold text-sm">{current}<span className="text-gray-500 text-xs ml-0.5">{unit}</span></p>
        <p className="text-gray-600 text-[10px]">/ {target}{unit}</p>
        <p className="text-gray-400 text-[10px] font-medium mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ─── Water Tracker ─────────────────────────────────────────────
function WaterTracker({ glasses, target, onChange }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <p className="text-white font-semibold flex items-center gap-2">
          <Droplets className="w-4 h-4 text-blue-400" /> Water Intake
        </p>
        <p className="text-blue-400 font-bold text-sm">{glasses} / {target} glasses</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: target }, (_, i) => (
          <button key={i} onClick={() => onChange(i < glasses ? i : i + 1)}
            className={`w-9 h-9 rounded-xl border transition-all text-lg ${
              i < glasses
                ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                : 'bg-dark-700 border-white/5 text-gray-700 hover:border-blue-500/30'
            }`}>
            💧
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Macro Input ───────────────────────────────────────────────
function MacroInput({ label, value, onChange, icon: Icon, color, unit = 'g', placeholder }) {
  return (
    <div>
      <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" style={{ color }} /> {label}
      </label>
      <div className="relative">
        <input
          type="number" min="0" value={value}
          onChange={e => onChange(e.target.value)}
          className="input-field pr-10"
          placeholder={placeholder}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-semibold">{unit}</span>
      </div>
    </div>
  );
}

// ─── 7-Day History Bar Chart ───────────────────────────────────
function WeekChart({ logs, target }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const key = fmt(d);
    const log = logs.find(l => l.log_date === key);
    return { key, label: d.toLocaleDateString('en-IN', { weekday: 'short' }).slice(0,1), cal: log?.calories || 0 };
  });
  const max = Math.max(...days.map(d => d.cal), target, 1);
  return (
    <div className="card">
      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-4 flex items-center gap-1.5">
        <TrendingUp className="w-3.5 h-3.5" /> 7-Day Calories
      </p>
      <div className="flex items-end gap-2 h-24">
        {days.map(d => {
          const pct = (d.cal / max) * 100;
          const isToday = d.key === fmt(new Date());
          return (
            <div key={d.key} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                <div
                  className={`w-full rounded-t-lg transition-all duration-500 ${
                    isToday ? 'bg-primary-500' : d.cal >= target * 0.8 ? 'bg-emerald-500/60' : 'bg-dark-600'
                  }`}
                  style={{ height: `${Math.max(pct, 2)}%` }}
                />
              </div>
              <span className={`text-[10px] font-medium ${isToday ? 'text-primary-400' : 'text-gray-600'}`}>{d.label}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
        <div className="w-3 h-3 rounded-sm bg-primary-500 flex-shrink-0" />
        <span className="text-gray-500 text-xs">Today</span>
        <div className="w-3 h-3 rounded-sm bg-emerald-500/60 flex-shrink-0 ml-2" />
        <span className="text-gray-500 text-xs">≥80% of target ({target} kcal)</span>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────
export default function NutritionPage() {
  const { user } = useAuthStore();
  const [member,   setMember]   = useState(null);
  const [log,      setLog]      = useState(null);     // today's saved log
  const [history,  setHistory]  = useState([]);
  const [date,     setDate]     = useState(fmt(new Date()));
  const [saving,   setSaving]   = useState(false);
  const [loading,  setLoading]  = useState(true);

  // Form state
  const [calories, setCalories] = useState('');
  const [protein,  setProtein]  = useState('');
  const [carbs,    setCarbs]    = useState('');
  const [fat,      setFat]      = useState('');
  const [water,    setWater]    = useState(0);
  const [notes,    setNotes]    = useState('');

  const isToday = date === fmt(new Date());

  const target = GOAL_TARGETS[member?.fitness_goal] || DEFAULT_TARGET;

  const fillForm = (row) => {
    setCalories(row?.calories?.toString() || '');
    setProtein(row?.protein_g?.toString() || '');
    setCarbs(row?.carbs_g?.toString() || '');
    setFat(row?.fat_g?.toString() || '');
    setWater(row?.water_glasses || 0);
    setNotes(row?.notes || '');
  };

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data: m } = await supabase.from('members').select('*').eq('profile_id', user.id).maybeSingle();
      if (!m) { setLoading(false); return; }
      setMember(m);

      const [logRes, histRes] = await Promise.all([
        supabase.from('nutrition_logs').select('*').eq('member_id', m.id).eq('log_date', date).maybeSingle(),
        supabase.from('nutrition_logs').select('log_date, calories, protein_g')
          .eq('member_id', m.id).order('log_date', { ascending: false }).limit(7),
      ]);
      setLog(logRes.data);
      fillForm(logRes.data);
      setHistory(histRes.data || []);
    } finally { setLoading(false); }
  }, [user?.id, date]);

  useEffect(() => { load(); }, [load]);

  const navigate = (dir) => {
    const d = new Date(date); d.setDate(d.getDate() + dir);
    if (d > new Date()) return;
    setDate(fmt(d));
  };

  const save = async () => {
    if (!member) return;
    if (!calories && !protein && !carbs && !fat && !water) {
      toast.error('Enter at least one value'); return;
    }
    setSaving(true);
    try {
      const row = {
        gym_id:        member.gym_id,
        member_id:     member.id,
        log_date:      date,
        calories:      calories ? Number(calories) : null,
        protein_g:     protein  ? Number(protein)  : null,
        carbs_g:       carbs    ? Number(carbs)     : null,
        fat_g:         fat      ? Number(fat)       : null,
        water_glasses: water,
        notes:         notes || null,
      };
      const { error } = log?.id
        ? await supabase.from('nutrition_logs').update(row).eq('id', log.id)
        : await supabase.from('nutrition_logs').insert(row);
      if (error) throw error;
      toast.success('Nutrition logged! 🥗');
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
    <div className="flex flex-col items-center justify-center h-64 px-6 text-center gap-3">
      <Apple className="w-12 h-12 text-gray-700" />
      <p className="text-white font-semibold">Profile not linked</p>
    </div>
  );

  return (
    <div className="space-y-4 pb-8">
      {/* Header + date nav */}
      <div className="px-5 pt-6">
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <Apple className="w-6 h-6 text-emerald-400" /> Nutrition
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">Track your daily food intake</p>

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

      {/* Macro rings */}
      <div className="px-5 grid grid-cols-4 gap-2">
        <MacroRing label="Calories" current={Number(calories)||0} target={target.calories} color="#f97316" unit="kcal" icon={Flame} />
        <MacroRing label="Protein"  current={Number(protein)||0}  target={target.protein}  color="#a855f7" unit="g"    icon={Beef} />
        <MacroRing label="Carbs"    current={Number(carbs)||0}    target={target.carbs}    color="#f59e0b" unit="g"    icon={Wheat} />
        <MacroRing label="Fat"      current={Number(fat)||0}      target={target.fat}      color="#10b981" unit="g"    icon={Apple} />
      </div>

      {/* Water */}
      <div className="px-5">
        <WaterTracker glasses={water} target={target.water} onChange={setWater} />
      </div>

      {/* Inputs */}
      <div className="px-5 card space-y-4">
        <p className="text-white font-semibold text-sm flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary-400" />
          {log ? 'Update' : 'Log'} for {isToday ? 'Today' : new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <MacroInput label="Calories" value={calories} onChange={setCalories} icon={Flame}  color="#f97316" unit="kcal" placeholder={String(target.calories)} />
          <MacroInput label="Protein"  value={protein}  onChange={setProtein}  icon={Beef}   color="#a855f7" unit="g"    placeholder={String(target.protein)}  />
          <MacroInput label="Carbs"    value={carbs}    onChange={setCarbs}    icon={Wheat}  color="#f59e0b" unit="g"    placeholder={String(target.carbs)}    />
          <MacroInput label="Fat"      value={fat}      onChange={setFat}      icon={Apple}  color="#10b981" unit="g"    placeholder={String(target.fat)}      />
        </div>
        <div>
          <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5 block">Notes (optional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            className="input-field" rows={2} placeholder="Cheat day, ate out, post-workout meal…" />
        </div>
        <button onClick={save} disabled={saving}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
          {saving
            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : log ? 'Update Log' : 'Save Log'}
        </button>
        {log && (
          <p className="text-center text-emerald-400 text-xs flex items-center justify-center gap-1">
            <Check className="w-3.5 h-3.5" /> Logged — edit above and save to update
          </p>
        )}
      </div>

      {/* Target reference */}
      <div className="px-5 card bg-dark-800/40">
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">
          Your Daily Targets · {member.fitness_goal || 'General Fitness'}
        </p>
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: 'Calories', val: target.calories, unit: 'kcal', color: 'text-orange-400' },
            { label: 'Protein',  val: target.protein,  unit: 'g',    color: 'text-purple-400' },
            { label: 'Carbs',    val: target.carbs,    unit: 'g',    color: 'text-amber-400'  },
            { label: 'Fat',      val: target.fat,      unit: 'g',    color: 'text-emerald-400'},
          ].map(t => (
            <div key={t.label}>
              <p className={`font-bold ${t.color}`}>{t.val}<span className="text-gray-600 text-[10px] ml-0.5">{t.unit}</span></p>
              <p className="text-gray-600 text-[10px]">{t.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 7-day chart */}
      <div className="px-5">
        <WeekChart logs={history} target={target.calories} />
      </div>
    </div>
  );
}
