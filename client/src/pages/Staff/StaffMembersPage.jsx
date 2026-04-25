import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import {
  Dumbbell, Target, Phone, Calendar, ChevronRight, X,
  Plus, Save, Trash2, Utensils, MessageSquare, User, Loader2, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Workout Plan Tab ──────────────────────────────────────────────
function WorkoutTab({ member, trainerId, gymId }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [exercises, setExercises] = useState([
    { day: 'Monday', exercise: '', sets: '', reps: '', rest: '' },
  ]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('workout_plans')
      .select('*').eq('member_id', member.id).eq('gym_id', gymId)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (data) {
      setPlan(data);
      setName(data.name || '');
      setDurationWeeks(data.duration_weeks || 4);
      setExercises(data.exercises?.length ? data.exercises : [{ day: 'Monday', exercise: '', sets: '', reps: '', rest: '' }]);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [member.id]);

  const addRow = () => setExercises(e => [...e, { day: '', exercise: '', sets: '', reps: '', rest: '' }]);
  const removeRow = (i) => setExercises(e => e.filter((_, idx) => idx !== i));
  const updateRow = (i, key, val) => setExercises(e => e.map((r, idx) => idx === i ? { ...r, [key]: val } : r));

  const save = async () => {
    if (!name.trim()) { toast.error('Enter a plan name'); return; }
    setSaving(true);
    try {
      const payload = { gym_id: gymId, trainer_id: trainerId, member_id: member.id, name, duration_weeks: durationWeeks, exercises, created_by: trainerId };
      if (plan?.id) {
        await supabase.from('workout_plans').update({ name, duration_weeks: durationWeeks, exercises }).eq('id', plan.id);
      } else {
        await supabase.from('workout_plans').insert(payload);
      }
      toast.success('Workout plan saved!');
      load();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary-400" /></div>;

  return (
    <div className="space-y-4">
      {plan && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
          <Dumbbell className="w-3.5 h-3.5" /> Existing plan loaded — you can update it below.
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Plan Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="Strength Phase 1" />
        </div>
        <div>
          <label className="label">Duration (weeks)</label>
          <input type="number" value={durationWeeks} onChange={e => setDurationWeeks(Number(e.target.value))} className="input-field" min={1} max={52} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label">Exercise Schedule</label>
          <button onClick={addRow} className="text-xs flex items-center gap-1 text-primary-400 hover:text-primary-300">
            <Plus className="w-3 h-3" /> Add Row
          </button>
        </div>
        <div className="space-y-2">
          {exercises.map((row, i) => (
            <div key={i} className="grid grid-cols-6 gap-2 items-center">
              <select value={row.day} onChange={e => updateRow(i, 'day', e.target.value)} className="input-field text-xs col-span-1">
                {DAYS.map(d => <option key={d}>{d}</option>)}
                <option value="Rest">Rest</option>
              </select>
              <input value={row.exercise} onChange={e => updateRow(i, 'exercise', e.target.value)} className="input-field text-xs col-span-2" placeholder="Exercise name" />
              <input value={row.sets} onChange={e => updateRow(i, 'sets', e.target.value)} className="input-field text-xs" placeholder="Sets" />
              <input value={row.reps} onChange={e => updateRow(i, 'reps', e.target.value)} className="input-field text-xs" placeholder="Reps" />
              <button onClick={() => removeRow(i)} className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-50">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saving ? 'Saving...' : plan ? 'Update Plan' : 'Save Plan'}
      </button>
    </div>
  );
}

// ── Diet Chart Tab ────────────────────────────────────────────────
function DietTab({ member, trainerId, gymId }) {
  const [chart, setChart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('Diet Plan');
  const [notes, setNotes] = useState('');
  const [meals, setMeals] = useState([
    { meal: 'Breakfast', time: '7:00 AM', foods: '', calories: '' },
    { meal: 'Lunch',     time: '1:00 PM', foods: '', calories: '' },
    { meal: 'Dinner',    time: '8:00 PM', foods: '', calories: '' },
  ]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('diet_charts')
      .select('*').eq('member_id', member.id).eq('gym_id', gymId)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (data) {
      setChart(data);
      setTitle(data.title || 'Diet Plan');
      setNotes(data.notes || '');
      setMeals(data.meals?.length ? data.meals : meals);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [member.id]);

  const updateMeal = (i, key, val) => setMeals(m => m.map((r, idx) => idx === i ? { ...r, [key]: val } : r));
  const addMeal = () => setMeals(m => [...m, { meal: '', time: '', foods: '', calories: '' }]);
  const removeMeal = (i) => setMeals(m => m.filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true);
    try {
      const payload = { gym_id: gymId, trainer_id: trainerId, member_id: member.id, title, notes, meals };
      if (chart?.id) {
        await supabase.from('diet_charts').update({ title, notes, meals, updated_at: new Date().toISOString() }).eq('id', chart.id);
      } else {
        await supabase.from('diet_charts').insert(payload);
      }
      toast.success('Diet chart saved!');
      load();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary-400" /></div>;

  return (
    <div className="space-y-4">
      {chart && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400">
          🥗 Existing diet chart loaded — you can update it.
        </div>
      )}
      <div>
        <label className="label">Plan Title</label>
        <input value={title} onChange={e => setTitle(e.target.value)} className="input-field" placeholder="Weight Loss Diet" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label">Meal Schedule</label>
          <button onClick={addMeal} className="text-xs flex items-center gap-1 text-primary-400 hover:text-primary-300">
            <Plus className="w-3 h-3" /> Add Meal
          </button>
        </div>
        <div className="space-y-2">
          {meals.map((m, i) => (
            <div key={i} className="p-3 rounded-xl bg-dark-700/50 border border-white/5 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <input value={m.meal} onChange={e => updateMeal(i, 'meal', e.target.value)} className="input-field text-xs" placeholder="Meal (Breakfast)" />
                <input value={m.time} onChange={e => updateMeal(i, 'time', e.target.value)} className="input-field text-xs" placeholder="Time (7:00 AM)" />
                <input value={m.calories} onChange={e => updateMeal(i, 'calories', e.target.value)} className="input-field text-xs" placeholder="Calories" />
              </div>
              <div className="flex gap-2">
                <input value={m.foods} onChange={e => updateMeal(i, 'foods', e.target.value)} className="input-field text-xs flex-1" placeholder="Foods: Oats, Banana, Milk..." />
                <button onClick={() => removeMeal(i)} className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Additional Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} className="input-field" rows={2} placeholder="Avoid processed foods, drink 3L water..." />
      </div>

      <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-50">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saving ? 'Saving...' : chart ? 'Update Diet Chart' : 'Save Diet Chart'}
      </button>
    </div>
  );
}

// ── Notes Tab ─────────────────────────────────────────────────────
function NotesTab({ member, trainerId, gymId }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [type, setType] = useState('general');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('trainer_notes')
      .select('*').eq('member_id', member.id).eq('gym_id', gymId)
      .order('created_at', { ascending: false });
    setNotes(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [member.id]);

  const save = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await supabase.from('trainer_notes').insert({
        gym_id: gymId, trainer_id: trainerId, member_id: member.id,
        note: text, note_type: type, note_date: new Date().toISOString().split('T')[0],
      });
      setText(''); toast.success('Note saved!'); load();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const deleteNote = async (id) => {
    await supabase.from('trainer_notes').delete().eq('id', id);
    setNotes(n => n.filter(x => x.id !== id));
  };

  const TYPE_COLOR = { general: 'text-blue-400', progress: 'text-emerald-400', diet: 'text-amber-400', medical: 'text-red-400' };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary-400" /></div>;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <label className="label">Add Note</label>
            <textarea value={text} onChange={e => setText(e.target.value)} className="input-field" rows={2} placeholder="Progress update, observations..." />
          </div>
          <div>
            <label className="label">Type</label>
            <select value={type} onChange={e => setType(e.target.value)} className="input-field">
              <option value="general">General</option>
              <option value="progress">Progress</option>
              <option value="diet">Diet</option>
              <option value="medical">Medical</option>
            </select>
          </div>
        </div>
        <button onClick={save} disabled={saving || !text.trim()} className="btn-primary flex items-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Add Note'}
        </button>
      </div>

      <div className="space-y-2">
        {notes.length === 0 && <p className="text-gray-600 text-sm text-center py-4">No notes yet</p>}
        {notes.map(n => (
          <div key={n.id} className="p-3 rounded-xl bg-dark-700/50 border border-white/5 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs capitalize font-semibold ${TYPE_COLOR[n.note_type] || 'text-gray-400'}`}>{n.note_type}</span>
                <span className="text-gray-600 text-xs">{new Date(n.created_at).toLocaleDateString('en-IN')}</span>
              </div>
              <p className="text-gray-300 text-sm">{n.note}</p>
            </div>
            <button onClick={() => deleteNote(n.id)} className="p-1 text-gray-700 hover:text-red-400 transition-colors flex-shrink-0">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Member Detail Drawer ──────────────────────────────────────────
function MemberDrawer({ member, trainerId, gymId, onClose }) {
  const [tab, setTab] = useState('overview');

  const TABS = [
    { key: 'overview', label: 'Overview', icon: User },
    { key: 'workout',  label: 'Workout',  icon: Dumbbell },
    { key: 'diet',     label: 'Diet',     icon: Utensils },
    { key: 'notes',    label: 'Notes',    icon: MessageSquare },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-lg bg-dark-800 border-l border-white/10 overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between sticky top-0 bg-dark-800 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-600/20 flex items-center justify-center text-primary-400 font-bold overflow-hidden flex-shrink-0">
              {member.photo_url ? <img src={member.photo_url} alt={member.full_name} className="w-full h-full object-cover" /> : member.full_name.charAt(0)}
            </div>
            <div>
              <p className="text-white font-bold">{member.full_name}</p>
              <p className="text-gray-500 text-xs font-mono">{member.member_code}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400"><X className="w-5 h-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 px-4 pt-3 gap-1 sticky top-[73px] bg-dark-800 z-10">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-all ${
                tab === key ? 'border-primary-500 text-primary-300' : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5 flex-1">
          {tab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Status', value: member.status, badge: true },
                  { label: 'Phone', value: member.phone || '—', icon: Phone },
                  { label: 'Goal', value: member.fitness_goal || '—', icon: Target },
                  { label: 'Joined', value: member.joined_at ? new Date(member.joined_at).toLocaleDateString('en-IN') : '—', icon: Calendar },
                ].map(({ label, value, badge, icon: Icon }) => (
                  <div key={label} className="card p-3">
                    <p className="text-gray-500 text-xs">{label}</p>
                    {badge
                      ? <span className={`mt-1 inline-block text-xs px-2 py-0.5 rounded-full font-medium ${value === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{value}</span>
                      : <p className="text-white text-sm mt-1 font-medium flex items-center gap-1.5">{Icon && <Icon className="w-3.5 h-3.5 text-gray-500" />}{value}</p>
                    }
                  </div>
                ))}
              </div>
              {member.notes && (
                <div className="card p-3">
                  <p className="text-gray-500 text-xs mb-1">Assignment Notes</p>
                  <p className="text-gray-300 text-sm italic">{member.notes}</p>
                </div>
              )}
            </div>
          )}
          {tab === 'workout' && <WorkoutTab member={member} trainerId={trainerId} gymId={gymId} />}
          {tab === 'diet'    && <DietTab    member={member} trainerId={trainerId} gymId={gymId} />}
          {tab === 'notes'   && <NotesTab   member={member} trainerId={trainerId} gymId={gymId} />}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function StaffMembersPage() {
  const { user } = useAuthStore();
  const [members,  setMembers]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);
  const [trainerId, setTrainerId] = useState(null);

  useEffect(() => {
    if (!user?.id || !user?.gym_id) return;
    const load = async () => {
      setLoading(true);
      // FIX: use profile_id to get staff row, then use user.id (profile_id) as trainer_id
      // because trainer_assignments.trainer_id = profile_id
      const trainerId = user.id; // profile_id = auth UUID
      setTrainerId(trainerId);

      const { data: assignments } = await supabase
        .from('trainer_assignments')
        .select('notes, assigned_on, members(id, full_name, photo_url, fitness_goal, status, phone, member_code, joined_at)')
        .eq('trainer_id', trainerId)   // ✅ profile_id — matches how admin assigns
        .eq('gym_id', user.gym_id)
        .eq('is_active', true);

      setMembers(
        (assignments || [])
          .map(a => ({ ...a.members, notes: a.notes, assigned_on: a.assigned_on }))
          .filter(Boolean)
      );
      setLoading(false);
    };
    load();
  }, [user?.id, user?.gym_id]);

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title text-gradient">My PT Members</h1>
          <p className="page-subtitle">{members.length} assigned member{members.length !== 1 ? 's' : ''} — click any card to manage</p>
        </div>
        <button onClick={() => { setLoading(true); setMembers([]); setTimeout(() => window.location.reload(), 100); }}
          className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="grid gap-3">
          {[1,2,3].map(i => <div key={i} className="card h-24 animate-pulse bg-dark-700" />)}
        </div>
      ) : members.length === 0 ? (
        <div className="card text-center py-12">
          <Dumbbell className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No PT members assigned yet</p>
          <p className="text-gray-600 text-sm mt-1">Your admin will assign members to you from the Trainer Assignments page.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {members.map(m => (
            <button key={m.id} onClick={() => setSelected(m)}
              className="card p-4 flex items-center gap-4 text-left w-full hover:border-primary-500/30 hover:bg-dark-700/70 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-primary-600/20 flex items-center justify-center text-primary-400 font-bold text-lg flex-shrink-0 overflow-hidden">
                {m.photo_url ? <img src={m.photo_url} alt={m.full_name} className="w-full h-full object-cover" /> : m.full_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-white font-bold">{m.full_name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{m.status}</span>
                </div>
                <p className="text-gray-500 text-xs font-mono mt-0.5">{m.member_code}</p>
                {m.fitness_goal && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Target className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400 text-xs">{m.fitness_goal}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 mt-1">
                  {m.phone && <span className="text-gray-600 text-xs">📱 {m.phone}</span>}
                  <span className="text-primary-500 text-xs flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    Manage <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <MemberDrawer
          member={selected}
          trainerId={trainerId}
          gymId={user.gym_id}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
