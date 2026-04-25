import { useEffect, useState } from 'react';
import { Dumbbell, X, UserPlus, UserMinus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

export default function TrainerAssignments({ trainer }) {
  const { user } = useAuthStore();
  const [assigned, setAssigned] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});

  const load = async () => {
    if (!trainer?.profile_id || !user?.gym_id) return;
    setLoading(true);
    const [{ data: assigns }, { data: members }] = await Promise.all([
      supabase.from('trainer_assignments')
        .select('id, member_id, members(id, full_name, photo_url, member_code)')
        .eq('trainer_id', trainer.profile_id)
        .eq('gym_id', user.gym_id),
      supabase.from('members')
        .select('id, full_name, photo_url, member_code, status')
        .eq('gym_id', user.gym_id)
        .eq('status', 'active')
        .order('full_name'),
    ]);
    setAssigned(assigns || []);
    setAllMembers(members || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [trainer?.id]);

  const isAssigned = (memberId) => assigned.some(a => a.member_id === memberId);

  const assign = async (memberId) => {
    setSaving(p => ({ ...p, [memberId]: true }));
    try {
      const { error } = await supabase.from('trainer_assignments').insert({
        gym_id: user.gym_id,
        trainer_id: trainer.profile_id,
        member_id: memberId,
      });
      if (error) throw error;
      toast.success('Member assigned!');
      load();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(p => ({ ...p, [memberId]: false })); }
  };

  const unassign = async (memberId) => {
    setSaving(p => ({ ...p, [memberId]: true }));
    try {
      const { error } = await supabase.from('trainer_assignments')
        .delete()
        .eq('trainer_id', trainer.profile_id)
        .eq('member_id', memberId)
        .eq('gym_id', user.gym_id);
      if (error) throw error;
      toast.success('Member removed!');
      load();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(p => ({ ...p, [memberId]: false })); }
  };

  if (!trainer?.profile_id) {
    return (
      <div className="text-center py-8">
        <Dumbbell className="w-8 h-8 text-gray-700 mx-auto mb-2" />
        <p className="text-gray-400 text-sm">Create a login for this trainer first to assign members.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5">
          <p className="text-emerald-400 text-sm font-semibold">{assigned.length} assigned</p>
        </div>
        <p className="text-gray-500 text-xs">PT members for {trainer.full_name}</p>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-dark-700 rounded-xl animate-pulse" />)}</div>
      ) : allMembers.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-4">No active members found.</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {allMembers.map(m => {
            const yes = isAssigned(m.id);
            return (
              <div key={m.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${yes ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/5 bg-dark-700/40'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0">
                    {m.photo_url ? <img src={m.photo_url} alt={m.full_name} className="w-full h-full object-cover" /> : m.full_name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{m.full_name}</p>
                    <p className="text-gray-500 text-xs font-mono">{m.member_code}</p>
                  </div>
                </div>
                <button
                  onClick={() => yes ? unassign(m.id) : assign(m.id)}
                  disabled={saving[m.id]}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${yes
                    ? 'bg-red-600/10 text-red-400 border-red-500/20 hover:bg-red-600/20'
                    : 'bg-primary-600/20 text-primary-400 border-primary-500/30 hover:bg-primary-600/30'}`}
                >
                  {saving[m.id] ? '...' : yes ? <><UserMinus className="w-3 h-3" /> Remove</> : <><UserPlus className="w-3 h-3" /> Assign</>}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
