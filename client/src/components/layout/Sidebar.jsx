import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Clock, CreditCard,
  UserCog, Package, BarChart3, LogOut, Dumbbell, Settings, Menu, X
} from 'lucide-react';
import useAuthStore from '../../store/authStore';

const navItems = [
  { to: '/',             label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/members',      label: 'Members',      icon: Users },
  { to: '/attendance',   label: 'Attendance',   icon: Clock },
  { to: '/subscriptions',label: 'Subscriptions',icon: CreditCard },
  { to: '/staff',        label: 'Staff',        icon: UserCog,   roles: ['gym_owner'] },
  { to: '/inventory',    label: 'Inventory',    icon: Package,   roles: ['gym_owner'] },
  { to: '/reports',      label: 'Reports',      icon: BarChart3, roles: ['gym_owner'] },
  { to: '/settings',     label: 'Settings',     icon: Settings,  roles: ['gym_owner'] },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [open, setOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => { setOpen(false); }, [location.pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const visibleItems = navItems.filter(item =>
    !item.roles || item.roles.includes(user?.role)
  );

  const SidebarContent = () => (
    <aside className="w-64 flex-shrink-0 h-full flex flex-col glass border-r border-white/5 p-4">
      {/* Logo + close (mobile only) */}
      <div className="flex items-center gap-3 px-2 py-4 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center glow-purple flex-shrink-0">
          <Dumbbell className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-bold text-base truncate">{user?.gym?.name || 'GymPro'}</h1>
          <p className="text-xs text-gray-500">Management System</p>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={() => setOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto">
        {visibleItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User Profile + Logout */}
      <div className="mt-4 pt-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-2 py-3 mb-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {user?.name?.charAt(0) || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
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
    <>
      {/* ── Desktop sidebar (always visible ≥ lg) ───────────── */}
      <div className="hidden lg:flex h-screen sticky top-0 flex-shrink-0">
        <SidebarContent />
      </div>

      {/* ── Mobile hamburger button ─────────────────────────── */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-40 w-10 h-10 rounded-xl bg-dark-700 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white shadow-lg transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* ── Mobile drawer overlay ───────────────────────────── */}
      {open && (
        <>
          <div
            className="sidebar-overlay lg:hidden animate-fade-in"
            onClick={() => setOpen(false)}
          />
          <div className="lg:hidden fixed top-0 left-0 h-full z-40 animate-slide-in-right w-72 shadow-2xl">
            <SidebarContent />
          </div>
        </>
      )}
    </>
  );
}
