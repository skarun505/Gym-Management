import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';
import { Dumbbell, Search } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import NotificationBell from '../NotificationBell';
import GlobalSearch from '../GlobalSearch';

export default function AppLayout() {
  const { user }    = useAuthStore();
  const [showSearch, setShowSearch] = useState(false);
  const themeColor = user?.gym?.theme_color || '#a21cce';

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(s => !s);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="flex min-h-screen bg-dark-900">
      <Sidebar />

      <main className="flex-1 min-w-0 overflow-y-auto">
        {/* ── Mobile top bar ──────────────────────────────────── */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center h-14 px-4 gap-2 border-b border-white/5"
          style={{ background: 'rgba(10,10,20,0.95)', backdropFilter: 'blur(16px)', paddingTop: 'env(safe-area-inset-top)' }}>
          {/* Logo + gym name */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0 overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}88)` }}>
              {user?.gym?.logo_url
                ? <img src={user.gym.logo_url} alt="logo" className="w-full h-full object-contain rounded-lg p-0.5" />
                : <Dumbbell className="w-4 h-4 text-white" />}
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none truncate max-w-[140px]">
                {user?.gym?.name || 'GymPro'}
              </p>
              <p className="text-gray-500 text-[11px] mt-0.5 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>

          <div className="flex-1" />

          {/* Search icon */}
          <button onClick={() => setShowSearch(true)}
            className="w-9 h-9 rounded-xl border border-white/10 bg-dark-700 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all">
            <Search className="w-4 h-4" />
          </button>

          {/* Notification Bell */}
          <NotificationBell />

          {/* Avatar */}
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}88)` }}>
            {user?.name?.charAt(0) || 'A'}
          </div>
        </div>

        {/* ── Page content ────────────────────────────────────── */}
        <div className="pt-14 pb-20 lg:pt-0 lg:pb-0 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
          <Outlet />
        </div>
      </main>

      {/* Global Search Modal */}
      {showSearch && <GlobalSearch onClose={() => setShowSearch(false)} />}
    </div>
  );
}
