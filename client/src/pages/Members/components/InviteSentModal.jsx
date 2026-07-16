import { useState } from 'react';
import { ShieldCheck, X, CheckCheck, Copy } from 'lucide-react';

// ── Copy-to-clipboard helper hook ────────────────────────────
function useCopy() {
  const [copied, setCopied] = useState({});
  const copy = (key, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(p => ({ ...p, [key]: true }));
      setTimeout(() => setCopied(p => ({ ...p, [key]: false })), 2000);
    });
  };
  return { copied, copy };
}

// ── Invite Sent Modal ─────────────────────────────────────────
export default function InviteSentModal({ result, onClose }) {
  const { copied, copy } = useCopy();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-white font-bold">Invite Sent!</h2>
              <p className="text-gray-500 text-xs">{result.memberName} · {result.memberCode}</p>
            </div>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Success banner */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
            <p className="text-emerald-400 text-sm font-semibold">
              {result.resumed ? '✓ Login finished setting up' : '✓ Invite email sent'}
            </p>
            <p className="text-emerald-400/60 text-xs mt-1">
              {result.memberName} will get an email to set their own password.
            </p>
          </div>

          <div className="bg-dark-700 rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-gray-500 text-[11px] font-medium uppercase tracking-wider">Invited Email</p>
              <p className="text-white font-mono font-semibold text-sm mt-0.5 truncate">{result.email}</p>
            </div>
            <button
              onClick={() => copy('email', result.email)}
              className="flex-shrink-0 p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="Copy"
            >
              {copied.email
                ? <CheckCheck className="w-4 h-4 text-emerald-400" />
                : <Copy className="w-4 h-4 text-gray-400" />}
            </button>
          </div>

          <p className="text-gray-500 text-xs">
            Link didn't arrive, or expired? Open "Create Login" for this member again to resend it.
          </p>

          <button onClick={onClose} className="btn-primary w-full">Done</button>
        </div>
      </div>
    </div>
  );
}
