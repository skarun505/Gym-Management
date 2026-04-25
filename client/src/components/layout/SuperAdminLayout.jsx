import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Building2, LogOut, Shield,
  Users, Dumbbell, Menu, X, ChevronRight,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';

const navItems = [
  { to: '/super-admin',         label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/super-admin/gyms',    label: 'Gyms',      icon: Building2 },
  { to: '/super-admin/members', label: 'Members',   icon: Users },
  { to: '/super-admin/staff',   label: 'Staff',     icon: Dumbbell },
];

export default function SuperAdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const handleLogout = async () => { await logout(); navigate('/login'); };

  // ── Sidebar (drawer) content ────────────────────────────────
  const SidebarContent = ({ onClose }) => (
    <aside className="w-64 h-full flex flex-col border-r border-white/5 p-4"
      style={{ background: 'rgba(10,8,24,0.98)' }}>
      {/* Logo + close */}
      <div className="flex items-center gap-3 px-2 py-4 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-600/30 flex-shrink-0">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-bold text-base">GymPro</h1>
          <p className="text-xs text-violet-400 font-medium">Super Admin</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Platform badge */}
      <div className="mx-2 mb-5 px-3 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300 flex items-center gap-2">
        <Shield className="w-3.5 h-3.5" /> Platform Owner Access
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'bg-violet-500/20 text-white border border-violet-500/30' : ''}`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{label}</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-30 flex-shrink-0" />
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="mt-4 pt-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-2 py-3 mb-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {user?.name?.charAt(0) || 'S'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-violet-400">Super Admin</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen" style={{ background: '#08071a' }}>

      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <div className="hidden lg:flex h-screen sticky top-0 flex-shrink-0">
        <SidebarContent />
      </div>

      {/* ── Main content ────────────────────────────────────── */}
      <main className="flex-1 min-w-0 overflow-y-auto">

        {/* Mobile top bar */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center h-14 px-4 border-b border-white/5"
          style={{ background: 'rgba(10,8,24,0.95)', backdropFilter: 'blur(16px)', paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">GymPro</p>
              <p className="text-violet-400 text-[11px] mt-0.5 font-medium">Super Admin</p>
            </div>
          </div>
          <div className="flex-1" />
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center text-xs font-bold text-white">
            {user?.name?.charAt(0) || 'S'}
          </div>
        </div>

        <div className="pt-14 pb-20 lg:pt-0 lg:pb-0 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
          <Outlet />
        </div>
      </main>

      {/* ── Mobile bottom nav ───────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-white/5"
        style={{ background: 'rgba(10,8,24,0.97)', backdropFilter: 'blur(16px)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-stretch max-w-lg mx-auto">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold transition-all ${
                  isActive ? 'text-violet-400' : 'text-gray-500 hover:text-gray-300'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isActive ? 'bg-violet-600/25' : ''}`}>
                    <Icon className={`w-5 h-5 transition-all ${isActive ? 'text-violet-400' : 'text-gray-500'}`} strokeWidth={isActive ? 2.5 : 1.8} />
                  </div>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* Logout in nav for mobile convenience */}
          <button onClick={handleLogout}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold text-gray-500 hover:text-red-400 transition-all">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-red-500/10">
              <LogOut className="w-5 h-5" strokeWidth={1.8} />
            </div>
            <span>Logout</span>
          </button>
        </div>
      </nav>

      {/* ── Mobile drawer (no longer needed for SA — all 4 nav fit) ── */}
      {drawerOpen && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
            onClick={() => setDrawerOpen(false)} />
          <div className="lg:hidden fixed top-0 left-0 h-full z-50 w-72 shadow-2xl animate-slide-in-right">
            <SidebarContent onClose={() => setDrawerOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
}
