import { NavLink, useNavigate } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Building2, LogOut, Shield, ChevronRight
} from 'lucide-react';
import useAuthStore from '../../store/authStore';

const navItems = [
  { to: '/super-admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/super-admin/gyms', label: 'Gyms', icon: Building2 },
];

export default function SuperAdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-64 flex-shrink-0 h-screen sticky top-0 flex flex-col border-r border-white/5 p-4"
        style={{ background: 'rgba(10,10,20,0.95)' }}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-2 py-4 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-600/30">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-base">GymPro</h1>
            <p className="text-xs text-violet-400 font-medium">Super Admin</p>
          </div>
        </div>

        {/* Platform badge */}
        <div className="mx-2 mb-6 px-3 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300">
          🔐 Platform Owner Access
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'bg-violet-500/20 text-white border border-violet-500/30' : ''}`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              <ChevronRight className="w-3 h-3 opacity-40" />
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="mt-4 pt-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-2 py-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center text-xs font-bold text-white">
              {user?.name?.charAt(0) || 'S'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-violet-400">Super Admin</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
