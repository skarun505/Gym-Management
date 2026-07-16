import { useState } from 'react';
import { Check, Clock, Timer, ChevronDown } from 'lucide-react';

// ── Subscription Status Quick-Change Badge ────────────────────
export default function SubStatusBadge({ sub, onChangeStatus }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!sub) return <span className="text-gray-600 text-xs">No plan</span>;

  const cfg = {
    active:  { label: 'Active',  cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    expired: { label: 'Expired', cls: 'text-red-400 bg-red-500/10 border-red-500/20' },
    pending: { label: 'Pending', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  };
  const current = cfg[sub.status] || cfg.active;

  const handleSelect = async (newStatus) => {
    if (newStatus === sub.status) { setOpen(false); return; }
    setSaving(true);
    setOpen(false);
    await onChangeStatus(sub.id, newStatus);
    setSaving(false);
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={saving}
        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all hover:opacity-80 ${current.cls}`}
        title="Click to change subscription status"
      >
        {saving
          ? <div className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />
          : current.label === 'Active'  ? <Check className="w-2.5 h-2.5" />
          : current.label === 'Expired' ? <Clock className="w-2.5 h-2.5" />
          : <Timer className="w-2.5 h-2.5" />}
        {current.label}
        <ChevronDown className="w-2.5 h-2.5 opacity-60" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-50 bg-dark-700 border border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[120px]">
            {Object.entries(cfg).map(([val, { label }]) => (
              <button
                key={val}
                onClick={() => handleSelect(val)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold hover:bg-white/5 transition-colors text-left ${
                  val === sub.status ? 'opacity-40 cursor-default' : ''
                } ${
                  val === 'active' ? 'text-emerald-400'
                  : val === 'expired' ? 'text-red-400'
                  : 'text-amber-400'
                }`}
              >
                {val === 'active'  ? <Check className="w-3 h-3" />
                : val === 'expired' ? <Clock className="w-3 h-3" />
                : <Timer className="w-3 h-3" />}
                {label}
                {val === sub.status && <Check className="w-3 h-3 ml-auto" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
