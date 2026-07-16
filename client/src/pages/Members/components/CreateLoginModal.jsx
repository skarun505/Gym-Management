import { useState } from 'react';
import { KeyRound, X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase, edgeFunctionUrl } from '../../../lib/supabase';

// ── Create Login Modal ─────────────────────────────────────────
export default function CreateLoginModal({ member, onClose, onSuccess }) {
  const [email, setEmail] = useState(member.email || '');
  const [loading, setLoading] = useState(false);

  const hasEmail = !!email.trim();

  const handleCreate = async () => {
    if (!hasEmail) {
      toast.error('An email address is required to send a login invite.');
      return;
    }
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Not authenticated. Please log in again.');

      const res = await fetch(edgeFunctionUrl('create-member-login'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId: member.id,
          email: email.trim(),
          redirectTo: `${window.location.origin}/set-password`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send login invite');

      if (data.manualLink) {
        await navigator.clipboard.writeText(data.manualLink);
        toast.success('Invite link copied — automatic email wasn\'t available, share it with the member directly.');
        onClose();
        return;
      }
      onSuccess(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-primary-400" />
              Create Login
            </h2>
            <p className="text-gray-500 text-xs mt-0.5">{member.full_name}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Email field — editable */}
          <div>
            <label className="label">
              Email (Login ID)
              {!member.email && <span className="text-amber-400 font-normal ml-1 text-xs">— not saved yet</span>}
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input-field"
              placeholder="member@email.com"
            />
            <p className="text-gray-600 text-[11px] mt-1.5">
              We'll email this address a link to set their own password — no password to generate or share yourself.
            </p>
            {!hasEmail && (
              <p className="text-amber-400 text-[11px] mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                An email address is required — portal login can't be set up by phone number alone.
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={handleCreate}
              disabled={loading || !hasEmail}
              className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <KeyRound className="w-4 h-4" />}
              Send Invite
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
