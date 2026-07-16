import { useState } from 'react';
import { Trash2, X, UserX, ShieldAlert } from 'lucide-react';

// ── Delete Confirm Modal ──────────────────────────────────────
export default function DeleteConfirmModal({ member, onClose, onDeactivate, onPermanentDelete }) {
  const [tab, setTab]           = useState('deactivate'); // 'deactivate' | 'permanent'
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading]   = useState(false);

  const nameMatches = confirmText.trim().toLowerCase() === member.full_name.trim().toLowerCase();

  const handleDeactivate = async () => {
    setLoading(true);
    await onDeactivate(member.id);
    setLoading(false);
    onClose();
  };

  const handlePermanent = async () => {
    if (!nameMatches) return;
    setLoading(true);
    await onPermanentDelete(member.id);
    setLoading(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-white font-bold">Remove Member</h2>
              <p className="text-gray-500 text-xs mt-0.5 truncate max-w-[240px]">{member.full_name} · {member.member_code}</p>
            </div>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-white/5">
          {[
            { id: 'deactivate', label: 'Deactivate' },
            { id: 'permanent',  label: 'Permanent Delete' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setConfirmText(''); }}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                tab === t.id
                  ? t.id === 'permanent'
                    ? 'border-red-500 text-red-400'
                    : 'border-primary-500 text-white'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-5">

          {/* ── Deactivate tab ── */}
          {tab === 'deactivate' && (
            <>
              <div className="bg-dark-700/60 rounded-xl p-4 border border-white/5 space-y-2">
                <p className="text-white font-semibold text-sm flex items-center gap-2">
                  <UserX className="w-4 h-4 text-amber-400" /> Soft Deactivation
                </p>
                <ul className="text-gray-400 text-xs space-y-1.5 list-disc list-inside">
                  <li>Member is marked <span className="text-amber-400 font-semibold">Inactive</span> — not deleted</li>
                  <li>All subscription &amp; attendance history is kept</li>
                  <li>Can be reactivated at any time from the Edit modal</li>
                </ul>
              </div>
              <div className="flex gap-3">
                <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                <button
                  onClick={handleDeactivate}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm bg-amber-600/20 text-amber-400 border border-amber-500/30 hover:bg-amber-600/30 transition-colors disabled:opacity-50"
                >
                  {loading
                    ? <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                    : <UserX className="w-4 h-4" />}
                  Deactivate
                </button>
              </div>
            </>
          )}

          {/* ── Permanent Delete tab ── */}
          {tab === 'permanent' && (
            <>
              <div className="bg-red-500/8 rounded-xl p-4 border border-red-500/20 space-y-2">
                <p className="text-red-400 font-semibold text-sm flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" /> Permanent &amp; Irreversible
                </p>
                <ul className="text-red-300/70 text-xs space-y-1.5 list-disc list-inside">
                  <li>Member record is <span className="text-red-400 font-bold">permanently deleted</span></li>
                  <li>All subscriptions, attendance &amp; linked data are wiped</li>
                  <li>This action <span className="text-red-400 font-bold">cannot be undone</span></li>
                </ul>
              </div>

              <div>
                <label className="label text-red-400">
                  Type <span className="font-bold text-white">{member.full_name}</span> to confirm
                </label>
                <input
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  className="input-field mt-1 border-red-500/30 focus:border-red-500"
                  placeholder={member.full_name}
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                <button
                  onClick={handlePermanent}
                  disabled={!nameMatches || loading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {loading
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <Trash2 className="w-4 h-4" />}
                  Delete Forever
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
