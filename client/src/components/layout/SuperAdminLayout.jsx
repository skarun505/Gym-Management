import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { LayoutDashboard, Building2, LogOut, Shield, ChevronRight, Menu, X } from 'lucide-react';
import useAuthStore from '../../store/authStore';

const navItems = [
  { to: '/super-admin',       label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/super-admin/gyms',  label: 'Gyms',      icon: Building2 },
];

export default function SuperAdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [open, setOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => { setOpen(false); }, [location.pathname]);

  // Lock body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <aside
      className="w-64 h-full flex flex-col border-r border-white/5 p-4"
      style={{ background: 'rgba(10,10,20,0.97)' }}
    >
      {/* Logo + close (mobile) */}
      <div className="flex items-center gap-3 px-2 py-4 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-600/30 flex-shrink-0">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-bold text-base">GymPro</h1>
          <p className="text-xs text-violet-400 font-medium">Super Admin</p>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={() => setOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Platform badge */}
      <div className="mx-2 mb-5 px-3 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300">
        🔐 Platform Owner Access
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5">
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
        <button
          onClick={handleLogout}
          className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen">

      {/* ── Desktop sidebar ─────────────────────────────── */}
      <div className="hidden lg:flex h-screen sticky top-0 flex-shrink-0">
        <SidebarContent />
      </div>

      {/* ── Mobile hamburger button ──────────────────────── */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-40 w-10 h-10 rounded-xl border border-white/10 flex items-center justify-center text-gray-300 hover:text-white shadow-lg transition-colors"
        style={{ background: 'rgba(26,10,40,0.95)' }}
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* ── Mobile drawer ───────────────────────────────── */}
      {open && (
        <>
          <div
            className="sidebar-overlay lg:hidden animate-fade-in"
            onClick={() => setOpen(false)}
          />
          <div className="lg:hidden fixed top-0 left-0 h-full z-40 w-72 shadow-2xl animate-slide-in-right">
            <SidebarContent />
          </div>
        </>
      )}

      {/* ── Main content ────────────────────────────────── */}
      <main className="flex-1 min-w-0 overflow-y-auto">

        {/* Mobile top bar */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center h-14 px-4 border-b border-white/5"
          style={{ background: 'rgba(10,10,20,0.93)', backdropFilter: 'blur(12px)' }}
        >
          <div className="w-10" /> {/* hamburger spacer */}
          <div className="flex-1 flex items-center justify-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-white font-bold text-sm">GymPro</span>
            <span className="text-violet-400 text-xs font-medium">• Super Admin</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center text-xs font-bold text-white">
            {user?.name?.charAt(0) || 'S'}
          </div>
        </div>

        <div className="pt-14 lg:pt-0 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
