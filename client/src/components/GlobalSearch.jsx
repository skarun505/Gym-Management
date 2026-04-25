import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Users, UserCog, CreditCard, Clock, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/authStore';
import { useNavigate } from 'react-router-dom';

const CATEGORY_CONFIG = {
  member: { icon: Users,     color: 'text-primary-400', bg: 'bg-primary-500/10', label: 'Member' },
  staff:  { icon: UserCog,   color: 'text-blue-400',    bg: 'bg-blue-500/10',    label: 'Staff'  },
  sub:    { icon: CreditCard, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Subscription' },
};

export default function GlobalSearch({ onClose }) {
  const { user }    = useAuthStore();
  const navigate    = useNavigate();
  const inputRef    = useRef(null);
  const [query,     setQuery]    = useState('');
  const [results,   setResults]  = useState([]);
  const [loading,   setLoading]  = useState(false);
  const [selected,  setSelected] = useState(0);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const search = useCallback(async (q) => {
    if (!q.trim() || q.length < 2 || !user?.gym_id) { setResults([]); return; }
    setLoading(true);
    try {
      const [mRes, sRes] = await Promise.all([
        supabase.from('members').select('id, full_name, phone, status, member_code')
          .eq('gym_id', user.gym_id)
          .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,member_code.ilike.%${q}%`)
          .limit(5),
        supabase.from('staff').select('id, full_name, phone, role')
          .eq('gym_id', user.gym_id)
          .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`)
          .limit(3),
      ]);

      const items = [
        ...(mRes.data || []).map(m => ({
          id:       m.id,
          category: 'member',
          title:    m.full_name,
          sub:      `${m.member_code || ''} · ${m.phone || ''} · ${m.status}`,
          path:     '/members',
        })),
        ...(sRes.data || []).map(s => ({
          id:       s.id,
          category: 'staff',
          title:    s.full_name,
          sub:      `${s.role} · ${s.phone || ''}`,
          path:     '/staff',
        })),
      ];
      setResults(items);
      setSelected(0);
    } finally { setLoading(false); }
  }, [user?.gym_id]);

  useEffect(() => {
    const t = setTimeout(() => search(query), 220);
    return () => clearTimeout(t);
  }, [query, search]);

  const handleKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && results[selected]) { go(results[selected]); }
    if (e.key === 'Escape') { onClose(); }
  };

  const go = (item) => { onClose(); navigate(item.path); };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-dark-800 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-fade-in"
        onClick={e => e.stopPropagation()}>
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5">
          <Search className="w-5 h-5 text-gray-500 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search members, staff…"
            className="flex-1 bg-transparent text-white placeholder-gray-600 outline-none text-base"
          />
          {loading && <div className="w-4 h-4 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin flex-shrink-0" />}
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        {results.length > 0 ? (
          <div className="max-h-80 overflow-y-auto py-2">
            {results.map((item, i) => {
              const cfg  = CATEGORY_CONFIG[item.category];
              const Icon = cfg.icon;
              return (
                <button key={item.id} onClick={() => go(item)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5 ${i === selected ? 'bg-white/5' : ''}`}>
                  <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{item.title}</p>
                    <p className="text-gray-500 text-xs truncate">{item.sub}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        ) : query.length >= 2 && !loading ? (
          <div className="px-4 py-8 text-center">
            <Search className="w-8 h-8 text-gray-700 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No results for "<span className="text-gray-300">{query}</span>"</p>
          </div>
        ) : (
          <div className="px-4 py-5">
            <p className="text-gray-600 text-xs font-semibold uppercase tracking-wider mb-3">Quick Links</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Members',    icon: Users,     path: '/members',    color: 'text-primary-400', bg: 'bg-primary-500/10' },
                { label: 'Staff',      icon: UserCog,   path: '/staff',      color: 'text-blue-400',    bg: 'bg-blue-500/10'    },
                { label: 'Attendance', icon: Clock,     path: '/attendance', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              ].map(({ label, icon: Icon, path, color, bg }) => (
                <button key={path} onClick={() => { onClose(); navigate(path); }}
                  className={`flex flex-col items-center gap-2 py-3 rounded-xl ${bg} hover:opacity-80 transition-opacity`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                  <span className={`text-xs font-semibold ${color}`}>{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-white/5 flex items-center gap-3 text-[11px] text-gray-600">
          <span><kbd className="bg-dark-600 px-1.5 py-0.5 rounded text-gray-500">↑↓</kbd> Navigate</span>
          <span><kbd className="bg-dark-600 px-1.5 py-0.5 rounded text-gray-500">↵</kbd> Open</span>
          <span><kbd className="bg-dark-600 px-1.5 py-0.5 rounded text-gray-500">Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}
