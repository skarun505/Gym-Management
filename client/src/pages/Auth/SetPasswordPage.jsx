import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

// Landing page for both invite-accept and forgot-password links.
// Supabase's client (detectSessionInUrl: true, see lib/supabase.js)
// parses the token in the URL and establishes a session automatically;
// this page just waits for that, then lets the user pick a password.

function linkType() {
  const hash = new URLSearchParams(window.location.hash.replace('#', ''));
  const query = new URLSearchParams(window.location.search);
  return hash.get('type') || query.get('type') || null;
}

const ROLE_ROUTES = {
  super_admin: '/super-admin',
  gym_owner:   '/',
  staff:       '/staff-portal/dashboard',
  member:      '/member/dashboard',
};

export default function SetPasswordPage() {
  const [status, setStatus]     = useState('checking'); // checking | ready | invalid | done
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const navigate = useNavigate();
  const { restoreSession, user } = useAuthStore();

  // ── Wait for Supabase to parse the link token ─────────────────────────────
  useEffect(() => {
    let settled = false;
    const markReady = (session) => {
      if (settled) return;
      settled = true;
      if (session) setStatus('ready');
      else setStatus('invalid');
    };

    // Session may already be established by the time this mounts.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) markReady(session);
    });

    // Or it may arrive just after — Supabase fires PASSWORD_RECOVERY
    // for reset links, SIGNED_IN for invite links.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') markReady(session);
    });

    const timeout = setTimeout(() => markReady(null), 8000);

    return () => { sub.subscription.unsubscribe(); clearTimeout(timeout); };
  }, []);

  // ── Navigate once status=done AND user role is available ─────────────────
  // We watch `user?.role` here instead of calling getState() synchronously
  // after restoreSession() — that was a stale-closure bug where the Zustand
  // state hadn't committed yet at the point of the navigate() call.
  useEffect(() => {
    if (status === 'done' && user?.role) {
      navigate(ROLE_ROUTES[user.role] || '/login');
    }
  }, [status, user?.role, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirm) { setError("Passwords don't match"); return; }

    setSaving(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) throw updateErr;

      toast.success('Password set! Taking you in…');

      // restoreSession populates user + role in the store; the useEffect
      // above picks that up and triggers navigation — no race condition.
      await restoreSession();
      setStatus('done');
    } catch (err) {
      setError(err.message || 'Could not set password');
    } finally {
      setSaving(false);
    }
  };

  const type = linkType();
  const heading = type === 'recovery' ? 'Reset your password' : 'Welcome — set your password';

  return (
    <div style={styles.root}>
      <div style={styles.card}>
        <div style={styles.iconWrap}><KeyRound size={22} color="#fff" /></div>

        {status === 'checking' && (
          <>
            <p style={styles.title}>Verifying your link…</p>
            <Loader2 className="spin" size={22} style={{ margin: '16px auto 0', display: 'block', color: 'rgba(255,255,255,0.4)' }} />
          </>
        )}

        {status === 'invalid' && (
          <>
            <p style={styles.title}>This link is invalid or has expired</p>
            <p style={styles.sub}>
              Invite and reset links expire after a while. Ask your gym admin to resend
              your invite, or use "Forgot password?" on the login page to request a new one.
            </p>
            <button style={styles.submitBtn} onClick={() => navigate('/login')}>Back to login</button>
          </>
        )}

        {status === 'ready' && (
          <>
            <p style={styles.title}>{heading}</p>
            <p style={styles.sub}>Choose a password you'll use to log in from now on.</p>
            {error && <div style={styles.errorBox}>{error}</div>}
            <form onSubmit={handleSubmit} style={{ width: '100%' }}>
              <div style={styles.inputWrap}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="New password (min 8 characters)"
                  style={styles.input}
                  autoComplete="new-password"
                  autoFocus
                  required
                />
                <button type="button" onClick={() => setShowPass(s => !s)} style={styles.eyeBtn}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div style={{ ...styles.inputWrap, marginTop: 12 }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Confirm password"
                  style={styles.input}
                  autoComplete="new-password"
                  required
                />
              </div>
              <button type="submit" disabled={saving} style={{ ...styles.submitBtn, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Setting password…' : 'Set password & continue'}
              </button>
            </form>
          </>
        )}

        {status === 'done' && (
          <>
            <CheckCircle2 size={32} color="#10b981" style={{ margin: '4px auto 8px', display: 'block' }} />
            <p style={styles.title}>You're all set!</p>
            <p style={styles.sub}>Redirecting you now…</p>
          </>
        )}
      </div>
      <style>{`.spin { animation: spin 0.8s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const styles = {
  root: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '24px 16px', background: '#060612', fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  card: {
    width: '100%', maxWidth: 380, background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: '32px 28px',
    textAlign: 'center', boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
  },
  iconWrap: {
    width: 52, height: 52, borderRadius: 16, margin: '0 auto 16px',
    background: 'linear-gradient(135deg, #7c3aed, #a21cce)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  title: { color: '#fff', fontSize: 18, fontWeight: 800, margin: '0 0 6px' },
  sub: { color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 1.5, margin: '0 0 20px' },
  errorBox: {
    background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
    borderRadius: 12, padding: '9px 12px', color: '#fca5a5', fontSize: 13, marginBottom: 14,
  },
  inputWrap: { position: 'relative' },
  input: {
    width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)',
    border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '13px 40px 13px 16px',
    color: '#fff', fontSize: 14, outline: 'none',
  },
  eyeBtn: {
    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: 4,
  },
  submitBtn: {
    marginTop: 18, width: '100%', padding: '14px 20px', borderRadius: 14, border: 'none',
    background: 'linear-gradient(135deg, #7c3aed 0%, #a21cce 50%, #f97316 100%)',
    color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer',
  },
};
