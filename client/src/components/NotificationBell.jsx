import { useEffect, useState, useRef, useCallback } from 'react';
import { Bell, AlertCircle, Package, UserPlus, X, CheckCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/authStore';
import { useNavigate } from 'react-router-dom';

// Types of notifications with config
const TYPE_CONFIG = {
  expiring:  { icon: AlertCircle, color: 'text-amber-400',  bg: 'bg-amber-500/10',   label: 'Expiring Subscription' },
  lowstock:  { icon: Package,     color: 'text-red-400',    bg: 'bg-red-500/10',      label: 'Low Stock'             },
  newmember: { icon: UserPlus,    color: 'text-primary-400', bg: 'bg-primary-500/10', label: 'New Member'            },
};

const STORAGE_KEY = (gymId) => `notif_seen_${gymId}`;

export default function NotificationBell() {
  const { user }  = useAuthStore();
  const navigate  = useNavigate();
  const [open,    setOpen]    = useState(false);
  const [notifs,  setNotifs]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [seen,    setSeen]    = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY(user?.gym_id)) || '[]')); }
    catch { return new Set(); }
  });
  const panelRef = useRef(null);

  const load = useCallback(async () => {
    if (!user?.gym_id) return;
    setLoading(true);
    try {
      const today   = new Date().toISOString().split('T')[0];
      const in7days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      const monthStart = today.slice(0, 7) + '-01';

      const [expRes, stockRes, newRes] = await Promise.all([
        supabase.from('member_subscriptions')
          .select('id, end_date, members(full_name)')
          .eq('gym_id', user.gym_id).eq('status', 'active')
          .gte('end_date', today).lte('end_date', in7days),
        supabase.from('inventory')
          .select('id, name, quantity, low_stock_alert')
          .eq('gym_id', user.gym_id),
        supabase.from('members')
          .select('id, full_name, joined_at')
          .eq('gym_id', user.gym_id)
          .gte('joined_at', monthStart)
          .order('joined_at', { ascending: false }).limit(5),
      ]);

      const items = [];

      (expRes.data || []).forEach(s => {
        const daysLeft = Math.ceil((new Date(s.end_date) - new Date()) / 86400000);
        items.push({
          id:   `exp_${s.id}`,
          type: 'expiring',
          msg:  `${s.members?.full_name || 'Member'}'s subscription expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
          path: '/subscriptions',
        });
      });

      (stockRes.data || []).filter(i => i.quantity <= i.low_stock_alert).forEach(i => {
        items.push({
          id:   `stock_${i.id}`,
          type: 'lowstock',
          msg:  `${i.name} is low on stock (${i.quantity} left)`,
          path: '/inventory',
        });
      });

      (newRes.data || []).forEach(m => {
        items.push({
          id:   `new_${m.id}`,
          type: 'newmember',
          msg:  `${m.full_name} joined this month`,
          path: '/members',
        });
      });

      setNotifs(items);
    } finally { setLoading(false); }
  }, [user?.gym_id]);

  useEffect(() => { load(); }, [load]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const unseen = notifs.filter(n => !seen.has(n.id));
  const count  = unseen.length;

  const markAllRead = () => {
    const allIds = new Set(notifs.map(n => n.id));
    setSeen(allIds);
    localStorage.setItem(STORAGE_KEY(user?.gym_id), JSON.stringify([...allIds]));
  };

  const handleClick = (notif) => {
    const next = new Set(seen); next.add(notif.id);
    setSeen(next);
    localStorage.setItem(STORAGE_KEY(user?.gym_id), JSON.stringify([...next]));
    setOpen(false);
    navigate(notif.path);
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-9 h-9 rounded-xl border border-white/10 bg-dark-700 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all"
      >
        <Bell className="w-4 h-4" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 w-4.5 h-4.5 min-w-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-11 w-80 sm:w-96 bg-dark-800 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary-400" />
              <span className="text-white font-semibold text-sm">Notifications</span>
              {count > 0 && (
                <span className="bg-red-500/20 text-red-400 text-xs font-bold px-1.5 py-0.5 rounded-full">{count} new</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {count > 0 && (
                <button onClick={markAllRead}
                  className="text-xs text-gray-500 hover:text-primary-400 flex items-center gap-1 transition-colors">
                  <CheckCheck className="w-3.5 h-3.5" /> All read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="ml-2 text-gray-600 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
            {loading ? (
              <div className="p-6 text-center">
                <div className="w-5 h-5 border-2 border-primary-600/30 border-t-primary-500 rounded-full animate-spin mx-auto" />
              </div>
            ) : notifs.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">All caught up! 🎉</p>
              </div>
            ) : notifs.map(n => {
              const cfg  = TYPE_CONFIG[n.type] || TYPE_CONFIG.expiring;
              const Icon = cfg.icon;
              const isNew = !seen.has(n.id);
              return (
                <button key={n.id} onClick={() => handleClick(n)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/4 transition-colors ${isNew ? 'bg-primary-500/4' : ''}`}>
                  <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <Icon className={`w-4 h-4 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${isNew ? 'text-white font-medium' : 'text-gray-300'}`}>{n.msg}</p>
                    <p className={`text-xs mt-0.5 ${cfg.color} capitalize`}>{cfg.label}</p>
                  </div>
                  {isNew && <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-1.5" />}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-white/5 text-center">
            <button onClick={() => { setOpen(false); navigate('/subscriptions'); }}
              className="text-xs text-gray-500 hover:text-primary-400 transition-colors">
              View all subscriptions →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
