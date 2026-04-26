import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Clock, CreditCard,
  UserCog, Package, BarChart3, LogOut, Dumbbell, Settings, Menu, X,
  IndianRupee, Megaphone, ChevronRight, Search, Lock,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import GlobalSearch from '../GlobalSearch';
import { usePlanGate } from '../../hooks/usePlanGate';
import { PlanBadge, UpgradeModal } from '../PlanGate';

// Feature key mapped per nav route — if null, always accessible
const NAV_FEATURE = {
  '/revenue':       'revenue',
  '/staff':         'staff',
  '/inventory':     'inventory',
  '/announcements': 'announcements',
  '/reports':       'reports',
};

const allNavItems = [
  { to: '/',               label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/members',        label: 'Members',       icon: Users },
  { to: '/attendance',     label: 'Attendance',    icon: Clock },
  { to: '/subscriptions',  label: 'Subscriptions', icon: CreditCard },
  { to: '/revenue',        label: 'Revenue',       icon: IndianRupee,   roles: ['gym_owner'] },
  { to: '/staff',          label: 'Staff',         icon: UserCog,       roles: ['gym_owner'] },
  { to: '/inventory',      label: 'Inventory',     icon: Package,       roles: ['gym_owner'] },
  { to: '/announcements',  label: 'Announcements', icon: Megaphone,     roles: ['gym_owner'] },
  { to: '/reports',        label: 'Reports',       icon: BarChart3,     roles: ['gym_owner'] },
  { to: '/settings',       label: 'Settings',      icon: Settings,      roles: ['gym_owner'] },
];

// Items shown in mobile bottom nav (most used 5)
const mobileBottomItems = ['/', '/members', '/attendance', '/subscriptions', '/staff'];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [showSearch,  setShowSearch]  = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState(null); // feature key for upgrade modal

  const { canAccess, plan, trialDaysLeft } = usePlanGate();

  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const visibleItems = allNavItems.filter(item =>
    !item.roles || item.roles.includes(user?.role)
  );

  const themeColor = user?.gym?.theme_color || '#a21cce';

  // ── Desktop Sidebar ─────────────────────────────────────────
  const SidebarContent = ({ onClose }) => (
    <aside className="w-64 h-full flex flex-col border-r border-white/5 p-4"
      style={{ background: 'rgba(10,10,20,0.97)' }}>
      {/* Logo + close */}
      <div className="flex items-center gap-3 px-2 py-4 mb-4">
        <div
          className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shadow-lg flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}88)` }}
        >
          {user?.gym?.logo_url
            ? <img src={user.gym.logo_url} alt="logo" className="w-full h-full object-contain p-0.5" />
            : <Dumbbell className="w-5 h-5 text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-bold text-base truncate">{user?.gym?.name || 'GymPro'}</h1>
          <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Trial / expiry warning */}
      {plan === 'trial' && trialDaysLeft !== null && trialDaysLeft <= 7 && (
        <div className="mb-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
          ⏰ Trial ends in <strong>{trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''}</strong>. Upgrade to keep access.
        </div>
      )}

      {/* Search trigger */}
      <button onClick={() => setShowSearch(true)}
        className="flex items-center gap-2.5 w-full px-3 py-2 mb-3 rounded-xl bg-dark-700/60 border border-white/5 text-gray-500 hover:text-gray-300 hover:border-white/10 transition-all text-sm">
        <Search className="w-4 h-4" />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="text-[10px] bg-dark-600 px-1.5 py-0.5 rounded text-gray-600">⌘K</kbd>
      </button>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto">
        {visibleItems.map(({ to, label, icon: Icon }) => {
          const featureKey = NAV_FEATURE[to];
          const isLocked   = featureKey ? !canAccess(featureKey) : false;

          if (isLocked) {
            return (
              <button
                key={to}
                onClick={() => setUpgradeFeature(featureKey)}
                className="sidebar-link w-full opacity-50 hover:opacity-70"
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left">{label}</span>
                <Lock className="w-3.5 h-3.5 flex-shrink-0 text-gray-500" />
              </button>
            );
          }

          return (
            <NavLink
              key={to} to={to} end={to === '/'}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-30 flex-shrink-0" />
            </NavLink>
          );
        })}
      </nav>

      {/* Plan Badge + User + Logout */}
      <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
        {/* Plan Badge */}
        <PlanBadge plan={plan} />

        {/* User row */}
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}88)` }}>
            {user?.name?.charAt(0) || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>

        <button onClick={handleLogout}
          className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>
    </aside>
  );

  const bottomItems = visibleItems.filter(it => mobileBottomItems.includes(it.to));

  return (
    <>
      {/* ── Desktop sidebar ────────────────────────────────── */}
      <div className="hidden lg:flex h-screen sticky top-0 flex-shrink-0">
        <SidebarContent />
      </div>

      {/* ── Mobile bottom nav ─────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-white/5"
        style={{ background: 'rgba(10,10,20,0.97)', backdropFilter: 'blur(16px)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-stretch max-w-lg mx-auto">
          {bottomItems.map(({ to, label, icon: Icon }) => {
            const featureKey = NAV_FEATURE[to];
            const isLocked   = featureKey ? !canAccess(featureKey) : false;

            if (isLocked) {
              return (
                <button key={to}
                  onClick={() => setUpgradeFeature(featureKey)}
                  className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold text-gray-600 opacity-50">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center relative">
                    <Icon className="w-5 h-5" strokeWidth={1.8} />
                    <Lock className="w-2.5 h-2.5 absolute -bottom-0.5 -right-0.5 text-gray-500" />
                  </div>
                  <span>{label}</span>
                </button>
              );
            }

            return (
              <NavLink
                key={to} to={to} end={to === '/'}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold transition-all ${
                    isActive ? 'text-primary-400' : 'text-gray-500 hover:text-gray-300'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isActive ? 'bg-primary-600/25' : ''}`}>
                      <Icon className={`w-5 h-5 transition-all ${isActive ? 'text-primary-400' : 'text-gray-500'}`} strokeWidth={isActive ? 2.5 : 1.8} />
                    </div>
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            );
          })}

          {/* "More" button opens full drawer */}
          <button
            onClick={() => setDrawerOpen(true)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold transition-all ${drawerOpen ? 'text-primary-400' : 'text-gray-500'}`}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center">
              <Menu className="w-5 h-5" strokeWidth={1.8} />
            </div>
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* ── Mobile full drawer ─────────────────────────────── */}
      {drawerOpen && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
            onClick={() => setDrawerOpen(false)} />
          <div className="lg:hidden fixed top-0 left-0 h-full z-50 w-72 shadow-2xl animate-slide-in-right">
            <SidebarContent onClose={() => setDrawerOpen(false)} />
          </div>
        </>
      )}

      {/* Global Search Modal */}
      {showSearch && <GlobalSearch onClose={() => setShowSearch(false)} />}

      {/* Upgrade Modal */}
      {upgradeFeature && (
        <UpgradeModal
          feature={upgradeFeature}
          currentPlan={plan}
          onClose={() => setUpgradeFeature(null)}
        />
      )}
    </>
  );
}
