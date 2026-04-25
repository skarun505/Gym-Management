import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Clock, CheckCircle, Dumbbell, Calendar, ChevronRight,
  TrendingUp, Zap, MessageSquare, Star,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

// ─── KPI Card ─────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color, bg, loading, onClick }) {
  return (
    <div onClick={onClick}
      className={`kpi-card ${onClick ? 'cursor-pointer hover:scale-[1.02] transition-transform' : ''}`}>
      <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-gray-400 text-sm">{label}</p>
        <p className="text-2xl font-bold text-white mt-0.5">
          {loading ? <span className="inline-block w-10 h-5 bg-dark-600 rounded animate-pulse" /> : value}
        </p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function StaffDashboard() {
  const { user }  = useAuthStore();
  const navigate  = useNavigate();
  const [stats,   setStats]   = useState(null);
  const [members, setMembers] = useState([]); // PT members (if trainer)
  const [shifts,  setShifts]  = useState(null);
  const [todayAtt, setTodayAtt] = useState([]);
  const [loading, setLoading] = useState(true);

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const today    = new Date().toISOString().split('T')[0];

  const fetchAll = useCallback(async () => {
    if (!user?.id || !user?.gym_id) return;
    setLoading(true);
    try {
      // Get staff record for this logged-in user
      const { data: staffRow } = await supabase
        .from('staff')
        .select('*, gym_shifts(name, start_time, end_time, days)')
        .eq('profile_id', user.id)
        .eq('gym_id', user.gym_id)
        .maybeSingle();

      if (!staffRow) { setLoading(false); return; }
      setShifts(staffRow.gym_shifts || null);

      // Today's attendance count for the whole gym
      const { count: todayCount } = await supabase
        .from('attendance').select('id', { count: 'exact' })
        .eq('gym_id', user.gym_id).gte('created_at', today);

      // If trainer → get PT members
      // NOTE: trainer_assignments.trainer_id stores the auth profile_id (UUID),
      // NOT the staff table row id. TrainerAssignments.jsx inserts trainer.profile_id.
      let ptMembers = [];
      if (staffRow.role === 'trainer' || user.sub_role === 'trainer') {
        const trainerId = staffRow.profile_id || user.id;
        const { data: assignments } = await supabase
          .from('trainer_assignments')
          .select('*, members(id, full_name, photo_url, fitness_goal, status, member_code)')
          .eq('trainer_id', trainerId)
          .eq('gym_id', user.gym_id)
          .eq('is_active', true);
        ptMembers = (assignments || []).map(a => a.members).filter(Boolean);
      }
      setMembers(ptMembers);

      // Total active members in gym
      const { count: totalActive } = await supabase
        .from('members').select('id', { count: 'exact' })
        .eq('gym_id', user.gym_id).eq('status', 'active');

      // Recent check-ins for activity feed
      const { data: recentCheckins } = await supabase
        .from('attendance')
        .select('id, created_at, members(full_name)')
        .eq('gym_id', user.gym_id)
        .order('created_at', { ascending: false })
        .limit(8);

      setTodayAtt(recentCheckins || []);
      setStats({
        todayCheckins: todayCount ?? 0,
        totalMembers:  totalActive ?? 0,
        ptMembers:     ptMembers.length,
        shiftsCount:   staffRow.gym_shifts ? 1 : 0,
        staffRole:     staffRow.role,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.gym_id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const isTrainer = user?.sub_role === 'trainer' || stats?.staffRole === 'trainer';

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <p className="text-gray-500 text-sm">{greeting}! 💪</p>
          <h1 className="text-2xl font-black text-white">{user?.name?.split(' ')[0]}</h1>
          <p className="text-gray-500 text-sm mt-0.5 capitalize">{user?.sub_role || 'Staff'} · {user?.gym?.name}</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-white font-semibold">{new Date().toLocaleDateString('en-IN', { weekday: 'long' })}</p>
          <p className="text-gray-500 text-sm">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}</p>
        </div>
      </div>

      {/* ── Shift Info ──────────────────────────────────────── */}
      {shifts && (
        <div className="card p-4 flex items-center gap-3 border border-emerald-500/20 bg-emerald-500/5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">{shifts.name}</p>
            <p className="text-emerald-400 text-xs mt-0.5">
              {shifts.start_time?.slice(0,5)} – {shifts.end_time?.slice(0,5)}
              {shifts.days?.length ? ` · ${shifts.days.join(', ')}` : ''}
            </p>
          </div>
          <span className="badge-active">Today</span>
        </div>
      )}

      {/* ── KPI Cards ──────────────────────────────────────── */}
      <div className={`grid gap-3 ${isTrainer ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'}`}>
        <KpiCard label="Today's Checkins" value={stats?.todayCheckins ?? 0} icon={CheckCircle} color="text-emerald-400" bg="bg-emerald-500/10" loading={loading} sub="Gym-wide" />
        <KpiCard label="Active Members"   value={stats?.totalMembers  ?? 0} icon={Users}       color="text-blue-400"    bg="bg-blue-500/10"    loading={loading} sub="Your gym" />
        {isTrainer && (
          <>
            <KpiCard label="My PT Members" value={stats?.ptMembers ?? 0} icon={Dumbbell} color="text-primary-400" bg="bg-primary-500/10" loading={loading} sub="Active assignments" onClick={() => navigate('/staff/members')} />
            <KpiCard label="Workout Plans" value={stats?.ptMembers ?? 0} icon={Calendar} color="text-amber-400"   bg="bg-amber-500/10"   loading={loading} sub="Members with plans" />
          </>
        )}
      </div>

      {/* ── PT Members (Trainers only) ──────────────────────── */}
      {isTrainer && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <Dumbbell className="w-4 h-4 text-primary-400" />
              </div>
              <h2 className="text-white font-semibold">My PT Members</h2>
            </div>
            {members.length > 0 && (
              <button onClick={() => navigate('/staff/members')} className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
                View All <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-xl bg-dark-600" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-dark-600 rounded w-1/2" />
                    <div className="h-2.5 bg-dark-700 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8">
              <Dumbbell className="w-8 h-8 text-gray-700 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No PT members assigned yet.</p>
              <p className="text-gray-600 text-xs mt-1">Ask admin to assign members to you.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {members.slice(0, 5).map(m => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-dark-700/50 hover:bg-dark-600/50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-primary-600/20 flex items-center justify-center text-primary-400 font-bold text-sm flex-shrink-0 overflow-hidden">
                    {m.photo_url ? <img src={m.photo_url} alt={m.full_name} className="w-full h-full object-cover" /> : m.full_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm">{m.full_name}</p>
                    {m.fitness_goal && <p className="text-gray-500 text-xs truncate">🎯 {m.fitness_goal}</p>}
                  </div>
                  <span className={m.status === 'active' ? 'badge-active' : 'badge-expired'}>{m.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Recent Gym Activity ─────────────────────────────── */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <h2 className="text-white font-semibold">Recent Check-ins</h2>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-dark-600" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-dark-600 rounded w-2/3" />
                  <div className="h-2.5 bg-dark-700 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : todayAtt.length === 0 ? (
          <div className="text-center py-6">
            <Clock className="w-7 h-7 text-gray-700 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No check-ins yet today</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayAtt.map((a, i) => (
              <div key={a.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">{a.members?.full_name || 'Member'}</p>
                  <p className="text-gray-500 text-xs">
                    {a.created_at ? new Date(a.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Quick Actions ───────────────────────────────────── */}
      <div>
        <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" /> Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Mark Attendance', icon: CheckCircle, path: '/staff/attendance', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'My PT Members',   icon: Users,       path: '/staff/members',    color: 'text-primary-400', bg: 'bg-primary-500/10' },
          ].map(({ label, icon: Icon, path, color, bg }) => (
            <button key={path} onClick={() => navigate(path)}
              className="card flex items-center gap-3 p-4 hover:border-white/20 hover:-translate-y-0.5 transition-all group text-left">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <p className="text-gray-300 text-sm font-semibold group-hover:text-white transition-colors">{label}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
