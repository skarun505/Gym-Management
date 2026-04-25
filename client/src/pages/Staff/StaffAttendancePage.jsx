import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import { Search, CheckCircle, Clock, Users } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StaffAttendancePage() {
  const { user }    = useAuthStore();
  const [members,   setMembers]   = useState([]);
  const [search,    setSearch]    = useState('');
  const [marked,    setMarked]    = useState(new Set());
  const [marking,   setMarking]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!user?.gym_id) return;
    const load = async () => {
      setLoading(true);
      const [mRes, attRes] = await Promise.all([
        supabase.from('members').select('id, full_name, member_code, photo_url, status')
          .eq('gym_id', user.gym_id).eq('status', 'active').order('full_name'),
        supabase.from('attendance').select('member_id')
          .eq('gym_id', user.gym_id).gte('created_at', today),
      ]);
      setMembers(mRes.data || []);
      setMarked(new Set((attRes.data || []).map(a => a.member_id)));
      setLoading(false);
    };
    load();
  }, [user?.gym_id]);

  const markAttendance = async (member) => {
    if (marked.has(member.id) || marking === member.id) return;
    setMarking(member.id);
    try {
      const { error } = await supabase.from('attendance').insert({
        gym_id: user.gym_id, member_id: member.id, created_at: today,
      });
      if (error) throw error;
      setMarked(prev => new Set([...prev, member.id]));
      toast.success(`${member.full_name} marked present ✅`);
    } catch (e) {
      toast.error(e.message);
    } finally { setMarking(null); }
  };

  const filtered = members.filter(m =>
    m.full_name.toLowerCase().includes(search.toLowerCase()) ||
    m.member_code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title text-gradient">Mark Attendance</h1>
          <p className="page-subtitle">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-white font-bold">{marked.size}</span>
          <span className="text-gray-500 text-sm">/ {members.length} present</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          className="input-field pl-10" placeholder="Search member name or ID…" />
      </div>

      {/* Member list */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-dark-700 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(m => {
            const isPresent = marked.has(m.id);
            const isMarking = marking === m.id;
            return (
              <div key={m.id}
                onClick={() => !isPresent && markAttendance(m)}
                className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                  isPresent
                    ? 'border-emerald-500/20 bg-emerald-500/5'
                    : 'border-white/5 bg-dark-700/50 hover:bg-dark-600/50 cursor-pointer hover:border-white/10'
                }`}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden"
                  style={{ background: isPresent ? 'rgba(16,185,129,0.2)' : 'rgba(162,28,206,0.2)' }}>
                  {m.photo_url
                    ? <img src={m.photo_url} alt={m.full_name} className="w-full h-full object-cover" />
                    : <span className={isPresent ? 'text-emerald-400' : 'text-primary-400'}>{m.full_name.charAt(0)}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm">{m.full_name}</p>
                  <p className="text-gray-500 text-xs font-mono">{m.member_code}</p>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isPresent ? 'bg-emerald-500/20' : 'bg-dark-600'
                }`}>
                  {isMarking ? (
                    <div className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                  ) : isPresent ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Clock className="w-4 h-4 text-gray-600" />
                  )}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-10">
              <Users className="w-8 h-8 text-gray-700 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No members found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
