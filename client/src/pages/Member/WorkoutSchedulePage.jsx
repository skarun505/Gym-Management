import { useEffect, useState } from 'react';
import { Dumbbell, ChevronDown, ChevronUp, Play, X, CheckCircle, MessageSquare } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

// ── Log Workout Modal ─────────────────────────────────────────
function LogModal({ exercise, memberId, gymId, onClose, onSaved }) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: { sets_done: exercise?.sets, reps_done: exercise?.reps },
  });

  const onSubmit = async (data) => {
    try {
      const { error } = await supabase.from('workout_logs').insert({
        gym_id:      gymId,
        member_id:   memberId,
        exercise:    exercise.exercise,
        logged_date: new Date().toISOString().split('T')[0],
        sets_done:   Number(data.sets_done) || null,
        reps_done:   data.reps_done || null,
        weight_kg:   data.weight_kg ? Number(data.weight_kg) : null,
        duration_min: data.duration_min ? Number(data.duration_min) : null,
        notes:       data.notes || null,
      });
      if (error) throw error;
      toast.success('Workout logged! 💪');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to log');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold">{exercise.exercise}</h2>
            <p className="text-gray-500 text-xs mt-0.5">Log this set</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Sets Done</label>
              <input {...register('sets_done')} type="number" min="0" className="input-field" placeholder="3" />
            </div>
            <div>
              <label className="label">Reps Done</label>
              <input {...register('reps_done')} className="input-field" placeholder="10" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Weight (kg)</label>
              <input {...register('weight_kg')} type="number" step="0.5" className="input-field" placeholder="20" />
            </div>
            <div>
              <label className="label">Duration (min)</label>
              <input {...register('duration_min')} type="number" className="input-field" placeholder="30" />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea {...register('notes')} className="input-field" rows={2} placeholder="How did it feel?" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? 'Saving…' : '✓ Log Set'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Exercise Row ──────────────────────────────────────────────
function ExerciseRow({ ex, isLogged, onLog }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`rounded-xl border transition-all ${
      isLogged ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/5 bg-dark-700/50'
    }`}>
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center gap-3 px-4 py-3"
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isLogged ? 'bg-emerald-500/20' : 'bg-primary-600/20'
        }`}>
          {isLogged
            ? <CheckCircle className="w-4 h-4 text-emerald-400" />
            : <Dumbbell className="w-4 h-4 text-primary-400" />
          }
        </div>
        <div className="flex-1 text-left">
          <p className="text-white font-medium text-sm">{ex.exercise}</p>
          <p className="text-gray-500 text-xs">{ex.sets} sets × {ex.reps}</p>
        </div>
        {ex.rest_sec && <span className="text-gray-600 text-xs mr-2">⏱ {ex.rest_sec}s rest</span>}
        {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          {ex.notes && <p className="text-gray-400 text-sm italic">{ex.notes}</p>}
          {ex.video_url && (
            <a
              href={ex.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary-400 border border-primary-500/30 px-3 py-1.5 rounded-lg hover:bg-primary-500/10 transition-colors"
            >
              <Play className="w-3 h-3" /> Watch Demo
            </a>
          )}
          <button
            onClick={onLog}
            className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
              isLogged
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-primary-600/20 text-primary-300 border border-primary-500/30 hover:bg-primary-600/30'
            }`}
          >
            {isLogged ? '✓ Logged — Log again' : '+ Log This Exercise'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function WorkoutSchedulePage() {
  const { user } = useAuthStore();
  const [member, setMember]         = useState(null);
  const [plan, setPlan]             = useState(null);
  const [days, setDays]             = useState([]);
  const [activeDay, setActiveDay]   = useState(1);
  const [todayLogs,    setTodayLogs]   = useState([]);
  const [logModal,     setLogModal]     = useState(null);
  const [trainerNotes, setTrainerNotes] = useState([]);
  const [loading,      setLoading]      = useState(true);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!user?.id) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const { data: m } = await supabase
          .from('members').select('*').eq('profile_id', user.id).maybeSingle();
        if (!m) { setLoading(false); return; }
        setMember(m);

        const [planRes, logsRes, notesRes] = await Promise.all([
          supabase.from('member_workout_plans')
            .select('*, workout_plans(*, workout_exercises(*))')
            .eq('member_id', m.id).eq('is_active', true).maybeSingle(),
          supabase.from('workout_logs').select('exercise')
            .eq('member_id', m.id).eq('logged_date', today),
          supabase.from('trainer_notes').select('*')
            .eq('member_id', m.id)
            .order('created_at', { ascending: false }).limit(5),
        ]);
        setTrainerNotes(notesRes.data || []);

        if (planRes.data?.workout_plans) {
          const wp = planRes.data.workout_plans;
          setPlan(wp);
          const exercises = wp.workout_exercises || [];
          const uniqueDays = [...new Set(exercises.map(e => e.day_number))].sort((a, b) => a - b);
          setDays(uniqueDays);

          const daysSince = Math.floor((new Date(today) - new Date(planRes.data.assigned_on || today)) / 86400000) % 7;
          setActiveDay(uniqueDays[daysSince % uniqueDays.length] || uniqueDays[0] || 1);
        }
        setTodayLogs((logsRes.data || []).map(l => l.exercise));
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [user?.id]);

  const activeExercises = plan
    ? (plan.workout_exercises || [])
        .filter(e => e.day_number === activeDay)
        .sort((a, b) => a.order_index - b.order_index)
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-7 h-7 border-2 border-primary-600/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 px-6 text-center">
        <Dumbbell className="w-12 h-12 text-gray-700" />
        <p className="text-white font-semibold">No Workout Plan Assigned</p>
        <p className="text-gray-500 text-sm">Ask your trainer to assign a workout plan.</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Trainer Notes */}
      {trainerNotes.length > 0 && (
        <div className="px-5 pt-5 pb-2 space-y-2">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" /> Notes from your Trainer
          </p>
          {trainerNotes.map(n => {
            const colors = {
              workout:    'border-primary-500/30 bg-primary-500/5 text-primary-300',
              nutrition:  'border-emerald-500/30 bg-emerald-500/5 text-emerald-300',
              motivation: 'border-amber-500/30 bg-amber-500/5 text-amber-300',
              general:    'border-blue-500/30 bg-blue-500/5 text-blue-300',
            };
            const cls = colors[n.note_type] || colors.general;
            return (
              <div key={n.id} className={`rounded-xl border p-3 ${cls}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold capitalize opacity-70">{n.note_type}</span>
                  <span className="text-gray-600 text-xs">{n.note_date}</span>
                </div>
                <p className="text-sm leading-relaxed">{n.note}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-black text-white">{plan.name}</h1>
        {plan.description && <p className="text-gray-400 text-sm mt-1">{plan.description}</p>}
      </div>

      {/* Day Tabs */}
      <div className="px-5 pb-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {days.map(d => (
            <button
              key={d}
              onClick={() => setActiveDay(d)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeDay === d
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30'
                  : 'bg-dark-700 text-gray-400 hover:text-white'
              }`}
            >
              Day {d}
            </button>
          ))}
        </div>
      </div>

      {/* Exercises */}
      <div className="px-5 space-y-3">
        {activeExercises.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-gray-400 text-sm font-medium">Rest Day 💤</p>
            <p className="text-gray-600 text-xs mt-1">No exercises scheduled — recover well!</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-500 text-sm">{activeExercises.length} exercises</p>
              <p className="text-emerald-400 text-xs font-medium">
                {todayLogs.length} logged today
              </p>
            </div>
            {activeExercises.map(ex => (
              <ExerciseRow
                key={ex.id}
                ex={ex}
                isLogged={todayLogs.includes(ex.exercise)}
                onLog={() => setLogModal(ex)}
              />
            ))}
          </>
        )}
      </div>

      {/* Log Modal */}
      {logModal && member && (
        <LogModal
          exercise={logModal}
          memberId={member.id}
          gymId={member.gym_id}
          onClose={() => setLogModal(null)}
          onSaved={() => setTodayLogs(prev => [...prev, logModal.exercise])}
        />
      )}
    </div>
  );
}
