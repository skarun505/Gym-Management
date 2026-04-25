import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import { Dumbbell, MessageSquare, Target } from 'lucide-react';

export default function StaffMembersPage() {
  const { user }    = useAuthStore();
  const [members,   setMembers]   = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (!user?.id || !user?.gym_id) return;
    const load = async () => {
      setLoading(true);
      const { data: staffRow } = await supabase
        .from('staff').select('id').eq('profile_id', user.id).eq('gym_id', user.gym_id).maybeSingle();
      if (!staffRow) { setLoading(false); return; }

      const { data: assignments } = await supabase
        .from('trainer_assignments')
        .select('notes, assigned_on, members(id, full_name, photo_url, fitness_goal, status, phone, member_code, joined_at)')
        .eq('trainer_id', staffRow.id).eq('is_active', true);

      setMembers((assignments || []).map(a => ({ ...a.members, notes: a.notes, assigned_on: a.assigned_on })).filter(Boolean));
      setLoading(false);
    };
    load();
  }, [user?.id, user?.gym_id]);

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title text-gradient">My PT Members</h1>
          <p className="page-subtitle">{members.length} assigned member{members.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3">
          {[1,2,3].map(i => <div key={i} className="card h-24 animate-pulse bg-dark-700" />)}
        </div>
      ) : members.length === 0 ? (
        <div className="card text-center py-12">
          <Dumbbell className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No PT members assigned yet</p>
          <p className="text-gray-600 text-sm mt-1">Your admin will assign members to you.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {members.map(m => (
            <div key={m.id} className="card p-4 flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary-600/20 flex items-center justify-center text-primary-400 font-bold text-lg flex-shrink-0 overflow-hidden">
                {m.photo_url ? <img src={m.photo_url} alt={m.full_name} className="w-full h-full object-cover" /> : m.full_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-white font-bold">{m.full_name}</p>
                    <p className="text-gray-500 text-xs mt-0.5 font-mono">{m.member_code}</p>
                  </div>
                  <span className={m.status === 'active' ? 'badge-active' : 'badge-expired'}>{m.status}</span>
                </div>
                {m.fitness_goal && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <Target className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span className="text-emerald-400 text-xs">{m.fitness_goal}</span>
                  </div>
                )}
                {m.phone && <p className="text-gray-500 text-xs mt-1">📱 {m.phone}</p>}
                {m.notes && (
                  <div className="mt-2 flex items-start gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-gray-600 flex-shrink-0 mt-0.5" />
                    <p className="text-gray-500 text-xs italic">{m.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
