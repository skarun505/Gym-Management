import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, Activity, TrendingUp, Plus, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function SuperDashboardPage() {
  const [stats, setStats] = useState(null);
  const [recentGyms, setRecentGyms] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [gymsRes, membersRes, recentRes] = await Promise.all([
          supabase.from('gyms').select('id, status, plan'),
          supabase.from('members').select('id, status'),
          supabase
            .from('gyms')
            .select('id, name, owner_name, plan, status, created_at, gym_code')
            .order('created_at', { ascending: false })
            .limit(5),
        ]);

        const gyms = gymsRes.data || [];
        const members = membersRes.data || [];

        setStats({
          totalGyms: gyms.length,
          activeGyms: gyms.filter(g => g.status === 'active').length,
          totalMembers: members.length,
          activeMembers: members.filter(m => m.status === 'active').length,
        });
        setRecentGyms(recentRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const kpis = [
    {
      label: 'Total Gyms',
      value: stats?.totalGyms ?? '—',
      sub: `${stats?.activeGyms ?? 0} active`,
      icon: Building2,
      gradient: 'from-violet-600 to-indigo-500',
      glow: 'shadow-violet-600/20',
    },
    {
      label: 'Total Members',
      value: stats?.totalMembers ?? '—',
      sub: `${stats?.activeMembers ?? 0} active`,
      icon: Users,
      gradient: 'from-emerald-600 to-teal-500',
      glow: 'shadow-emerald-600/20',
    },
    {
      label: 'Platform Health',
      value: '100%',
      sub: 'All systems normal',
      icon: Activity,
      gradient: 'from-blue-600 to-cyan-500',
      glow: 'shadow-blue-600/20',
    },
    {
      label: 'Revenue',
      value: 'Manual',
      sub: 'Billing coming soon',
      icon: TrendingUp,
      gradient: 'from-amber-600 to-orange-500',
      glow: 'shadow-amber-600/20',
    },
  ];

  const planColors = {
    trial: 'badge-pending',
    basic: 'badge-active',
    pro: 'badge-admin',
    enterprise: 'badge-trainer',
  };

  const statusColors = {
    active: 'badge-active',
    suspended: 'badge-expired',
    trial: 'badge-pending',
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Platform Dashboard
          </h1>
          <p className="page-subtitle">You have full access to all gyms on GymPro.</p>
        </div>
        <button
          onClick={() => navigate('/super-admin/gyms')}
          className="btn-primary flex items-center gap-2"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}
        >
          <Plus className="w-4 h-4" /> New Gym
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(({ label, value, sub, icon: Icon, gradient, glow }) => (
          <div key={label} className={`kpi-card group shadow-lg ${glow} transition-shadow`}>
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">{label}</p>
              <p className="text-2xl font-bold text-white">
                {loading ? <span className="inline-block w-10 h-6 bg-dark-600 rounded animate-pulse" /> : value}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Gyms */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-violet-400" />
            </div>
            <h2 className="text-white font-semibold">Recently Created Gyms</h2>
          </div>
          <button
            onClick={() => navigate('/super-admin/gyms')}
            className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
          >
            View all <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Gym</th>
                <th>Code</th>
                <th>Owner</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j}><div className="h-4 bg-dark-600 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : recentGyms.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <Building2 className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">No gyms yet</p>
                    <p className="text-gray-600 text-sm mt-1">Click "New Gym" to onboard your first customer</p>
                  </td>
                </tr>
              ) : recentGyms.map(gym => (
                <tr
                  key={gym.id}
                  className="cursor-pointer"
                  onClick={() => navigate('/super-admin/gyms')}
                >
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                        {gym.name.charAt(0)}
                      </div>
                      <span className="font-medium text-white">{gym.name}</span>
                    </div>
                  </td>
                  <td><span className="font-mono text-violet-400 text-xs">{gym.gym_code}</span></td>
                  <td className="text-gray-400">{gym.owner_name}</td>
                  <td><span className={planColors[gym.plan] || 'badge'}>{gym.plan}</span></td>
                  <td><span className={statusColors[gym.status] || 'badge'}>{gym.status}</span></td>
                  <td className="text-gray-400 text-sm">
                    {new Date(gym.created_at).toLocaleDateString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
