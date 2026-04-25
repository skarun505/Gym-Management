import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Users, Clock, LogOut,
  Dumbbell, Menu, X, ChevronRight, UserCog,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';

const NAV_ITEMS = [
  { to: '/staff-portal/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/staff-portal/members',   label: 'My Members', icon: Users },
  { to: '/staff-portal/attendance',label: 'Attendance', icon: Clock },
  { to: '/staff-portal/profile',   label: 'Profile',    icon: UserCog },
];

export default function StaffLayout() {
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

  const themeColor = user?.gym?.theme_color || '#10b981'; // emerald for staff

  const SidebarContent = ({ onClose }) => (
    <aside className="w-64 h-full flex flex-col border-r border-white/5 p-4"
      style={{ background: 'rgba(8,16,12,0.98)' }}>
      <div className="flex items-center gap-3 px-2 py-4 mb-2">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}88)` }}>
          <Dumbbell className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-bold text-base truncate">{user?.gym?.name || 'GymPro'}</h1>
          <p className="text-xs font-medium" style={{ color: themeColor }}>Staff Portal</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Role badge */}
      <div className="mx-2 mb-5 px-3 py-2 rounded-xl border text-xs flex items-center gap-2"
        style={{ background: `${themeColor}15`, borderColor: `${themeColor}30`, color: themeColor }}>
        <Dumbbell className="w-3.5 h-3.5" />
        <span className="capitalize">{user?.sub_role || 'Staff'}</span>
      </div>

      <nav className="flex-1 space-y-0.5">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }>
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{label}</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-30 flex-shrink-0" />
          </NavLink>
        ))}
      </nav>

      <div className="mt-4 pt-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-2 py-3 mb-1">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}88)` }}>
            {user?.name?.charAt(0) || 'S'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.sub_role}</p>
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
    <div className="flex min-h-screen" style={{ background: '#080f0a' }}>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex h-screen sticky top-0 flex-shrink-0">
        <SidebarContent />
      </div>

      <main className="flex-1 min-w-0 overflow-y-auto">
        {/* Mobile top bar */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center h-14 px-4 gap-2 border-b border-white/5"
          style={{ background: 'rgba(8,16,12,0.95)', backdropFilter: 'blur(16px)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}88)` }}>
              <Dumbbell className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none truncate max-w-[140px]">
                {user?.gym?.name || 'GymPro'}
              </p>
              <p className="text-[11px] mt-0.5 font-medium capitalize" style={{ color: themeColor }}>
                {user?.sub_role || 'Staff'}
              </p>
            </div>
          </div>
          <div className="flex-1" />
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}88)` }}>
            {user?.name?.charAt(0) || 'S'}
          </div>
        </div>

        <div className="pt-14 pb-20 lg:pt-0 lg:pb-0 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-white/5"
        style={{ background: 'rgba(8,16,12,0.97)', backdropFilter: 'blur(16px)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-stretch max-w-lg mx-auto">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold transition-all ${
                  isActive ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-300'
                }`
              }>
              {({ isActive }) => (
                <>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isActive ? 'bg-emerald-600/25' : ''}`}>
                    <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-gray-500'}`} strokeWidth={isActive ? 2.5 : 1.8} />
                  </div>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
          <button onClick={handleLogout}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold text-gray-500 hover:text-red-400 transition-all">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center">
              <LogOut className="w-5 h-5" strokeWidth={1.8} />
            </div>
            <span>Logout</span>
          </button>
        </div>
      </nav>

      {drawerOpen && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in" onClick={() => setDrawerOpen(false)} />
          <div className="lg:hidden fixed top-0 left-0 h-full z-50 w-72 shadow-2xl animate-slide-in-right">
            <SidebarContent onClose={() => setDrawerOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
}
