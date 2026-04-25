import { useEffect, useState } from 'react';
import {
  Dumbbell, MessageSquare, Plus, X, Save, ChevronDown, ChevronUp,
  Trash2, Users, Send, Loader2, BookOpen
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const NOTE_TYPES = [
  { id: 'general',    label: 'General',    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { id: 'workout',    label: 'Workout',    color: 'bg-primary-500/20 text-primary-400 border-primary-500/30' },
  { id: 'nutrition',  label: 'Nutrition',  color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { id: 'motivation', label: 'Motivation', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
];

// ── Post Note Panel ────────────────────────────────────────────
function PostNote({ gymId, trainerId, members, onPosted }) {
  const [memberId, setMemberId] = useState('');
  const [note,     setNote]     = useState('');
  const [type,     setType]     = useState('general');
  const [saving,   setSaving]   = useState(false);

  const send = async () => {
    if (!memberId || !note.trim()) { toast.error('Select a member and write a note'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('trainer_notes').insert({
        gym_id: gymId, trainer_id: trainerId, member_id: memberId,
        note: note.trim(), note_type: type,
        note_date: new Date().toISOString().split('T')[0],
      });
      if (error) throw error;
      toast.success('Note sent!');
      setNote(''); setMemberId('');
      onPosted();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="card space-y-4">
      <p className="text-white font-bold flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-primary-400" /> Post a Note
      </p>

      <select value={memberId} onChange={e => setMemberId(e.target.value)} className="input-field">
        <option value="">Select member…</option>
        {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
      </select>

      <div className="flex gap-2 flex-wrap">
        {NOTE_TYPES.map(t => (
          <button key={t.id} onClick={() => setType(t.id)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${type === t.id ? t.color : 'bg-dark-700 text-gray-500 border-white/5'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <textarea
        value={note} onChange={e => setNote(e.target.value)}
        className="input-field" rows={3}
        placeholder="Write your note, tip, or motivation for this member…"
      />

      <button onClick={send} disabled={saving || !memberId || !note.trim()}
        className="btn-primary flex items-center gap-2 disabled:opacity-50">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        Send Note
      </button>
    </div>
  );
}

// ── Recent Notes List ──────────────────────────────────────────
function NotesList({ notes, members }) {
  const NOTE_COLOR = {
    general:    'border-blue-500/30 bg-blue-500/5 text-blue-400',
    workout:    'border-primary-500/30 bg-primary-500/5 text-primary-400',
    nutrition:  'border-emerald-500/30 bg-emerald-500/5 text-emerald-400',
    motivation: 'border-amber-500/30 bg-amber-500/5 text-amber-400',
  };
  const memberMap = Object.fromEntries(members.map(m => [m.id, m.full_name]));

  return (
    <div className="space-y-3">
      {notes.length === 0 ? (
        <div className="card text-center py-6">
          <MessageSquare className="w-8 h-8 text-gray-700 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">No notes posted yet</p>
        </div>
      ) : notes.map(n => (
        <div key={n.id} className={`card border ${NOTE_COLOR[n.note_type] || NOTE_COLOR.general}`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-white font-semibold text-sm">{memberMap[n.member_id] || 'Member'}</p>
            <div className="flex items-center gap-2">
              <span className="text-xs capitalize opacity-70">{n.note_type}</span>
              <span className="text-gray-600 text-xs">{n.note_date}</span>
            </div>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">{n.note}</p>
        </div>
      ))}
    </div>
  );
}

// ── Workout Plan Builder ───────────────────────────────────────
function PlanBuilder({ gymId, trainerId, members, onSaved }) {
  const [planName, setPlanName]   = useState('');
  const [planDesc, setPlanDesc]   = useState('');
  const [exercises, setExercises] = useState([]);
  const [memberId, setMemberId]   = useState('');
  const [saving, setSaving]       = useState(false);

  const addExercise = () => setExercises(p => [...p, {
    key: Date.now(), exercise: '', day_number: 1, sets: 3, reps: '10', rest_sec: 60, notes: '', order_index: p.length,
  }]);

  const updateEx = (key, field, val) => setExercises(p => p.map(e => e.key === key ? { ...e, [field]: val } : e));
  const removeEx = (key) => setExercises(p => p.filter(e => e.key !== key));

  const save = async () => {
    if (!planName.trim()) { toast.error('Enter a plan name'); return; }
    if (exercises.length === 0) { toast.error('Add at least one exercise'); return; }
    if (exercises.some(e => !e.exercise.trim())) { toast.error('Fill all exercise names'); return; }
    setSaving(true);
    try {
      // Create plan
      const { data: plan, error: planErr } = await supabase.from('workout_plans').insert({
        gym_id: gymId, trainer_id: trainerId,
        name: planName.trim(), description: planDesc.trim() || null,
      }).select().single();
      if (planErr) throw planErr;

      // Insert exercises
      const exRows = exercises.map(({ key, ...e }) => ({
        ...e, plan_id: plan.id,
        sets: Number(e.sets), rest_sec: Number(e.rest_sec), day_number: Number(e.day_number),
      }));
      const { error: exErr } = await supabase.from('workout_exercises').insert(exRows);
      if (exErr) throw exErr;

      // Assign to member if selected
      if (memberId) {
        // Deactivate old plan first
        await supabase.from('member_workout_plans').update({ is_active: false })
          .eq('member_id', memberId).eq('gym_id', gymId);
        await supabase.from('member_workout_plans').insert({
          gym_id: gymId, member_id: memberId, plan_id: plan.id,
          trainer_id: trainerId, is_active: true,
          assigned_on: new Date().toISOString().split('T')[0],
        });
      }

      toast.success('Plan created' + (memberId ? ' and assigned!' : '!'));
      setPlanName(''); setPlanDesc(''); setExercises([]); setMemberId('');
      onSaved();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const days = [1,2,3,4,5,6,7];

  return (
    <div className="card space-y-5">
      <p className="text-white font-bold flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-primary-400" /> Create Workout Plan
      </p>

      <div className="space-y-3">
        <input value={planName} onChange={e => setPlanName(e.target.value)}
          className="input-field" placeholder="Plan name (e.g. Beginner Strength 4-Day)" />
        <input value={planDesc} onChange={e => setPlanDesc(e.target.value)}
          className="input-field" placeholder="Description (optional)" />
      </div>

      {/* Exercises */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400 font-semibold">{exercises.length} exercises</p>
          <button onClick={addExercise} className="flex items-center gap-1.5 text-xs text-primary-400 font-semibold hover:text-primary-300">
            <Plus className="w-3.5 h-3.5" /> Add Exercise
          </button>
        </div>

        {exercises.map((ex, i) => (
          <div key={ex.key} className="bg-dark-700/60 rounded-xl p-4 space-y-3 border border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 font-mono">#{i + 1}</span>
              <button onClick={() => removeEx(ex.key)}>
                <X className="w-4 h-4 text-gray-600 hover:text-red-400 transition-colors" />
              </button>
            </div>
            <input value={ex.exercise} onChange={e => updateEx(ex.key, 'exercise', e.target.value)}
              className="input-field" placeholder="Exercise name (e.g. Bench Press)" />
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Day</label>
                <select value={ex.day_number} onChange={e => updateEx(ex.key, 'day_number', e.target.value)} className="input-field py-1.5 text-sm">
                  {days.map(d => <option key={d} value={d}>Day {d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Sets</label>
                <input value={ex.sets} onChange={e => updateEx(ex.key, 'sets', e.target.value)}
                  type="number" min="1" className="input-field py-1.5 text-sm" placeholder="3" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Reps</label>
                <input value={ex.reps} onChange={e => updateEx(ex.key, 'reps', e.target.value)}
                  className="input-field py-1.5 text-sm" placeholder="10" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Rest(s)</label>
                <input value={ex.rest_sec} onChange={e => updateEx(ex.key, 'rest_sec', e.target.value)}
                  type="number" className="input-field py-1.5 text-sm" placeholder="60" />
              </div>
            </div>
            <input value={ex.notes} onChange={e => updateEx(ex.key, 'notes', e.target.value)}
              className="input-field py-1.5 text-sm" placeholder="Trainer tip (optional)" />
          </div>
        ))}
      </div>

      {/* Assign to member */}
      <div>
        <label className="label">Assign to Member (optional)</label>
        <select value={memberId} onChange={e => setMemberId(e.target.value)} className="input-field">
          <option value="">Save plan only (assign later)</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
        </select>
      </div>

      <button onClick={save} disabled={saving || !planName.trim() || exercises.length === 0}
        className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saving ? 'Saving…' : 'Save Plan'}
      </button>
    </div>
  );
}

// ── Assign Existing Plan ───────────────────────────────────────
function AssignPlan({ gymId, trainerId, members }) {
  const [plans,    setPlans]    = useState([]);
  const [planId,   setPlanId]   = useState('');
  const [memberId, setMemberId] = useState('');
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    supabase.from('workout_plans').select('id, name')
      .eq('gym_id', gymId).eq('trainer_id', trainerId)
      .then(({ data }) => setPlans(data || []));
  }, [gymId, trainerId]);

  const assign = async () => {
    if (!planId || !memberId) { toast.error('Select both a plan and a member'); return; }
    setSaving(true);
    try {
      await supabase.from('member_workout_plans').update({ is_active: false })
        .eq('member_id', memberId).eq('gym_id', gymId);
      const { error } = await supabase.from('member_workout_plans').insert({
        gym_id: gymId, member_id: memberId, plan_id: planId,
        trainer_id: trainerId, is_active: true,
        assigned_on: new Date().toISOString().split('T')[0],
      });
      if (error) throw error;
      toast.success('Plan assigned!');
      setPlanId(''); setMemberId('');
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="card space-y-3">
      <p className="text-white font-semibold text-sm">Assign Existing Plan</p>
      <select value={planId} onChange={e => setPlanId(e.target.value)} className="input-field">
        <option value="">Select plan…</option>
        {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <select value={memberId} onChange={e => setMemberId(e.target.value)} className="input-field">
        <option value="">Select member…</option>
        {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
      </select>
      <button onClick={assign} disabled={saving || !planId || !memberId}
        className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Dumbbell className="w-4 h-4" />}
        Assign Plan
      </button>
    </div>
  );
}

// ── Main TrainerHub ────────────────────────────────────────────
export default function TrainerHub({ trainer }) {
  const { user } = useAuthStore();
  const [tab,     setTab]     = useState('notes');
  const [members, setMembers] = useState([]);
  const [notes,   setNotes]   = useState([]);
  const [loading, setLoading] = useState(true);

  const gymId    = user?.gym_id;
  const trainerId = trainer?.profile_id;

  const loadMembers = async () => {
    if (!trainerId || !gymId) return;
    const { data } = await supabase.from('trainer_assignments')
      .select('member_id, members(id, full_name, member_code, photo_url)')
      .eq('trainer_id', trainerId).eq('gym_id', gymId).eq('is_active', true);
    setMembers((data || []).map(d => d.members).filter(Boolean));
    setLoading(false);
  };

  const loadNotes = async () => {
    if (!trainerId || !gymId) return;
    const { data } = await supabase.from('trainer_notes')
      .select('*').eq('trainer_id', trainerId).eq('gym_id', gymId)
      .order('created_at', { ascending: false }).limit(20);
    setNotes(data || []);
  };

  useEffect(() => { loadMembers(); loadNotes(); }, [trainerId, gymId]);

  if (!trainerId) {
    return (
      <div className="text-center py-8">
        <Dumbbell className="w-8 h-8 text-gray-700 mx-auto mb-2" />
        <p className="text-gray-400 text-sm">Create a login for this trainer first.</p>
      </div>
    );
  }

  const TABS = [
    { id: 'notes', label: 'Notes', icon: MessageSquare },
    { id: 'plan',  label: 'Plan Builder', icon: BookOpen },
    { id: 'assign', label: 'Assign Plan', icon: Users },
  ];

  return (
    <div className="space-y-4">
      {/* Member count */}
      <div className="flex items-center gap-2">
        <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg px-3 py-1.5">
          <p className="text-primary-400 text-sm font-semibold">{members.length} PT members</p>
        </div>
        <p className="text-gray-500 text-xs">assigned to {trainer.full_name}</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 border-b border-white/5 pb-3">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              tab === id ? 'bg-primary-600/20 text-primary-300 border border-primary-500/30' : 'text-gray-500 hover:text-white'
            }`}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
        </div>
      ) : members.length === 0 ? (
        <div className="card text-center py-6">
          <Users className="w-8 h-8 text-gray-700 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">No members assigned yet</p>
          <p className="text-gray-600 text-xs mt-1">Use the PT Assignments tab to assign members first</p>
        </div>
      ) : (
        <>
          {tab === 'notes'  && <><PostNote gymId={gymId} trainerId={trainerId} members={members} onPosted={loadNotes} /><NotesList notes={notes} members={members} /></>}
          {tab === 'plan'   && <PlanBuilder gymId={gymId} trainerId={trainerId} members={members} onSaved={() => {}} />}
          {tab === 'assign' && <AssignPlan gymId={gymId} trainerId={trainerId} members={members} />}
        </>
      )}
    </div>
  );
}
