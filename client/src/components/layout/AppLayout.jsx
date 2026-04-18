import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';
import { Dumbbell } from 'lucide-react';
import useAuthStore from '../../store/authStore';

export default function AppLayout() {
  const { user } = useAuthStore();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto">

        {/* ── Mobile top bar ───────────────────────────────── */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center h-14 px-4 border-b border-white/5 bg-dark-900/90 backdrop-blur-md">
          {/* Hamburger spacer — 40px for the button */}
          <div className="w-10" />
          {/* Centered gym name */}
          <div className="flex-1 flex items-center justify-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center">
              <Dumbbell className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-white font-bold text-sm truncate max-w-[160px]">
              {user?.gym?.name || 'GymPro'}
            </span>
          </div>
          {/* Right: user avatar */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center text-xs font-bold text-white">
            {user?.name?.charAt(0) || 'A'}
          </div>
        </div>

        {/* ── Page content ─────────────────────────────────── */}
        {/* Mobile: 56px top for the fixed bar */}
        <div className="pt-14 lg:pt-0 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
