import { Outlet, NavLink } from 'react-router-dom';
import { Home, Calendar, TrendingUp, Trophy, User } from 'lucide-react';
import useAuthStore from '../../store/authStore';

const navItems = [
  { to: '/member/dashboard',    label: 'Home',     icon: Home },
  { to: '/member/schedule',     label: 'Schedule', icon: Calendar },
  { to: '/member/progress',     label: 'Progress', icon: TrendingUp },
  { to: '/member/achievements', label: 'Wins',     icon: Trophy },
  { to: '/member/profile',      label: 'Profile',  icon: User },
];

export default function MemberLayout() {
  const { user } = useAuthStore();
  const themeColor = user?.gym?.theme_color || '#a21cce';

  return (
    <div className="flex flex-col bg-dark-900" style={{ minHeight: '100dvh' }}>

      {/* ── Top header ─────────────────────────────────────── */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-4 py-3 glass border-b border-white/5 sticky top-0 z-20"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}aa)` }}
          >
            {user?.gym?.name?.charAt(0) || 'G'}
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-none truncate max-w-[160px]">
              {user?.gym?.name || 'GymPro'}
            </p>
            <p className="text-gray-500 text-[11px] mt-0.5">Member Portal</p>
          </div>
        </div>
        {/* User avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {user?.name?.charAt(0) || 'M'}
        </div>
      </header>

      {/* ── Page content ───────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        {/* Extra bottom padding = nav bar height + safe area */}
        <div className="pb-24 animate-fade-in">
          <Outlet />
        </div>
      </main>

      {/* ── Bottom navigation ───────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 glass border-t border-white/5"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-stretch max-w-lg mx-auto">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold transition-all ${
                  isActive ? 'text-primary-400' : 'text-gray-500 hover:text-gray-300'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                    isActive ? 'bg-primary-600/25' : ''
                  }`}>
                    <Icon
                      className={`w-5 h-5 transition-all ${isActive ? 'text-primary-400' : 'text-gray-500'}`}
                      strokeWidth={isActive ? 2.5 : 1.8}
                    />
                  </div>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
