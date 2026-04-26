import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Zap, ArrowRight, Download, Smartphone, Share2 } from 'lucide-react';
import useAuthStore from '../../store/authStore';

// ── PWA helpers ─────────────────────────────────────────────────
function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream; }
function isStandalone() {
  return window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;
}

// Floating pill tags that drift across the background
const PILLS = [
  { text: '💪 Gains', x: '8%',  y: '12%', delay: '0s',   dur: '6s'  },
  { text: '🔥 Grind', x: '78%', y: '8%',  delay: '1s',   dur: '7s'  },
  { text: '⚡ Energy', x: '85%', y: '55%', delay: '2s',   dur: '5s'  },
  { text: '🏆 Win',   x: '5%',  y: '70%', delay: '0.5s', dur: '8s'  },
  { text: '🎯 Goals', x: '60%', y: '82%', delay: '1.5s', dur: '6.5s'},
  { text: '🚀 Push',  x: '30%', y: '88%', delay: '3s',   dur: '7.5s'},
];

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password,   setPassword]   = useState('');
  const [showPass,   setShowPass]   = useState(false);
  const [focused,    setFocused]    = useState('');
  const { login, isLoading, error } = useAuthStore();
  const navigate = useNavigate();

  // PWA install state
  // 'idle'       → always visible, no native prompt yet (show manual guide)
  // 'ready'      → native beforeinstallprompt available (one-click install)
  // 'ios'        → iOS Safari (show Add to Home Screen steps)
  // 'installing' → waiting for user choice
  // 'done'       → installed!
  const deferredPrompt = useRef(null);
  const [installState, setInstallState] = useState('idle');
  const [showGuide,    setShowGuide]    = useState(false);

  useEffect(() => {
    // Hide entirely if already running as installed PWA
    if (isStandalone()) { setInstallState('done'); return; }

    // iOS Safari — Add to Home Screen
    if (isIOS()) { setInstallState('ios'); return; }

    // Chrome/Edge/Android — listen for native prompt
    const handler = (e) => {
      e.preventDefault();
      deferredPrompt.current = e;
      setInstallState('ready'); // upgrade to one-click
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setInstallState('done');
      deferredPrompt.current = null;
    });
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (installState === 'ios' || installState === 'idle') {
      setShowGuide(g => !g);
      return;
    }
    if (!deferredPrompt.current) { setShowGuide(g => !g); return; }
    setInstallState('installing');
    try {
      await deferredPrompt.current.prompt();
      const { outcome } = await deferredPrompt.current.userChoice;
      if (outcome === 'accepted') setInstallState('done');
      else setInstallState('ready');
    } catch { setInstallState('ready'); }
    deferredPrompt.current = null;
  };

  const isPhone = identifier.trim() !== '' && !identifier.includes('@');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(identifier, password);
    if (result.success) {
      const routes = {
        super_admin: '/super-admin',
        gym_owner:   '/',
        staff:       '/staff-portal/dashboard',
        member:      '/member/dashboard',
      };
      navigate(routes[result.role] || '/');
    }
  };

  return (
    <div style={styles.root}>
      {/* ── Aurora mesh background ── */}
      <div style={styles.auroraWrap}>
        <div style={{ ...styles.blob, ...styles.blob1 }} />
        <div style={{ ...styles.blob, ...styles.blob2 }} />
        <div style={{ ...styles.blob, ...styles.blob3 }} />
        <div style={styles.grid} />
      </div>

      {/* ── Floating pills ── */}
      {PILLS.map((p) => (
        <div key={p.text} style={{
          ...styles.pill,
          left: p.x, top: p.y,
          animation: `floatY ${p.dur} ease-in-out ${p.delay} infinite alternate`,
        }}>
          {p.text}
        </div>
      ))}

      {/* ── Card ── */}
      <div style={styles.card}>

        {/* Logo area */}
        <div style={styles.logoWrap}>
          <div style={styles.logoIcon}>
            <span style={{ fontSize: 28 }}>🏋️</span>
          </div>
          <div style={styles.logoRing} />
        </div>

        <h1 style={styles.brand}>GymPro</h1>
        <p style={styles.tagline}>no cap, we track your gains fr fr 💯</p>

        {/* Divider */}
        <div style={styles.divider}>
          <span style={styles.dividerLine} />
          <span style={styles.dividerText}>sign in</span>
          <span style={styles.dividerLine} />
        </div>

        {/* Error */}
        {error && (
          <div style={styles.errorBox}>
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          {/* Identifier field */}
          <div style={styles.fieldWrap}>
            <label style={styles.label}>
              {isPhone ? '📱 Mobile Number' : '✉️ Email'}
            </label>
            <div style={{
              ...styles.inputWrap,
              ...(focused === 'id' ? styles.inputWrapFocused : {}),
            }}>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                onFocus={() => setFocused('id')}
                onBlur={() => setFocused('')}
                style={styles.input}
                placeholder="email or 10-digit number"
                autoComplete="username"
                required
              />
            </div>
          </div>

          {/* Password field */}
          <div style={{ ...styles.fieldWrap, marginTop: 16 }}>
            <label style={styles.label}>🔑 Password</label>
            <div style={{
              ...styles.inputWrap,
              ...(focused === 'pw' ? styles.inputWrapFocused : {}),
            }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocused('pw')}
                onBlur={() => setFocused('')}
                style={{ ...styles.input, paddingRight: 48 }}
                placeholder="shhh, keep it secret"
                autoComplete="current-password"
                required
              />
              <button type="button" onClick={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              ...styles.submitBtn,
              opacity: isLoading ? 0.8 : 1,
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading ? (
              <span style={styles.spinner} />
            ) : (
              <>
                <Zap size={18} fill="white" />
                <span>Let's Go!</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* ── PWA Install Button ── always visible unless already installed */}
        {installState !== 'done' && (
          <div style={{ width: '100%', marginTop: 12 }}>
            <button
              type="button"
              onClick={handleInstall}
              style={{
                ...styles.installBtn,
                ...(installState === 'ready' ? styles.installBtnReady : {}),
                cursor: installState === 'installing' ? 'not-allowed' : 'pointer',
                opacity: installState === 'installing' ? 0.75 : 1,
              }}
            >
              {installState === 'installing' ? (
                <><span style={styles.spinner} /><span>Installing…</span></>
              ) : installState === 'ios' ? (
                <><Share2 size={15} /><span>{showGuide ? 'Hide Guide' : '📱 Add to Home Screen'}</span></>
              ) : installState === 'ready' ? (
                <><Download size={15} /><span>⚡ Install App — One Click!</span></>
              ) : (
                <><Smartphone size={15} /><span>📲 Install App on Your Device</span></>
              )}
            </button>

            {/* Guide panel — shown on click for idle/ios/no-native-prompt */}
            {showGuide && (
              <div style={styles.iosGuide}>
                {installState === 'ios' ? (
                  <>
                    <p style={styles.iosGuideTitle}>Install on iPhone / iPad (Safari):</p>
                    {[
                      { n: 1, text: 'Tap the Share button (□↑) at the bottom of Safari' },
                      { n: 2, text: 'Scroll down and tap "Add to Home Screen"' },
                      { n: 3, text: 'Tap "Add" in the top-right corner — done! 🎉' },
                    ].map(({ n, text }) => (
                      <div key={n} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: n > 1 ? 8 : 0 }}>
                        <div style={styles.stepDot}>{n}</div>
                        <p style={{ color: '#d1d5db', fontSize: 12, margin: 0, lineHeight: 1.5 }}>{text}</p>
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <p style={styles.iosGuideTitle}>Install on Android / Chrome / Edge:</p>
                    {[
                      { n: 1, text: 'Tap the ⋮ menu (top-right) in Chrome or Edge' },
                      { n: 2, text: 'Tap "Add to Home screen" or "Install app"' },
                      { n: 3, text: 'Tap "Install" to confirm — you\'re all set! 🎉' },
                    ].map(({ n, text }) => (
                      <div key={n} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: n > 1 ? 8 : 0 }}>
                        <div style={styles.stepDot}>{n}</div>
                        <p style={{ color: '#d1d5db', fontSize: 12, margin: 0, lineHeight: 1.5 }}>{text}</p>
                      </div>
                    ))}
                  </>
                )}
                <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, margin: '10px 0 0', textAlign: 'center' }}>
                  Free · No app store · Works offline
                </p>
              </div>
            )}

            {/* Native prompt hint */}
            {installState === 'ready' && (
              <p style={{ textAlign: 'center', color: 'rgba(196,132,252,0.6)', fontSize: 11, margin: '6px 0 0', fontWeight: 500 }}>
                ✨ One click — no app store needed!
              </p>
            )}
          </div>
        )}

        {installState === 'done' && (
          <p style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: '#10b981', fontWeight: 600 }}>
            ✓ GymPro installed on your device!
          </p>
        )}

        {/* Footer */}
        <p style={styles.footer}>
          GymPro · built different © {new Date().getFullYear()} ✨
        </p>
      </div>

      {/* Keyframe styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap');

        @keyframes floatY {
          from { transform: translateY(0px) rotate(-1deg); }
          to   { transform: translateY(-18px) rotate(1deg); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes blobPulse {
          0%,100% { transform: scale(1) translate(0,0); }
          50%      { transform: scale(1.15) translate(20px, -20px); }
        }
        @keyframes cardIn {
          from { opacity:0; transform: translateY(32px) scale(0.97); }
          to   { opacity:1; transform: translateY(0)    scale(1);    }
        }
        @keyframes ringPulse {
          0%,100% { transform: scale(1);    opacity: 0.6; }
          50%      { transform: scale(1.25); opacity: 0.2; }
        }
      `}</style>
    </div>
  );
}

// ─── Inline styles ─────────────────────────────────────────────
const styles = {
  root: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    background: '#060612',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    position: 'relative',
    overflow: 'hidden',
  },

  // Aurora blobs
  auroraWrap: {
    position: 'fixed', inset: 0,
    pointerEvents: 'none', zIndex: 0,
  },
  blob: {
    position: 'absolute',
    borderRadius: '50%',
    filter: 'blur(80px)',
    animation: 'blobPulse 8s ease-in-out infinite',
  },
  blob1: {
    width: 500, height: 500,
    top: '-120px', left: '-100px',
    background: 'radial-gradient(circle, #7c3aed88, #a21cce44)',
    animationDelay: '0s',
  },
  blob2: {
    width: 450, height: 450,
    bottom: '-100px', right: '-80px',
    background: 'radial-gradient(circle, #f97316aa, #ec489966)',
    animationDelay: '3s',
  },
  blob3: {
    width: 350, height: 350,
    top: '40%', left: '50%',
    background: 'radial-gradient(circle, #06b6d455, #8b5cf622)',
    animationDelay: '5s',
  },
  grid: {
    position: 'absolute', inset: 0,
    backgroundImage:
      'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),' +
      'linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
    backgroundSize: '48px 48px',
  },

  // Floating pills
  pill: {
    position: 'fixed',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    backdropFilter: 'blur(8px)',
    borderRadius: 999,
    padding: '6px 14px',
    fontSize: 13,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.7)',
    pointerEvents: 'none',
    zIndex: 1,
    whiteSpace: 'nowrap',
  },

  // Card
  card: {
    position: 'relative', zIndex: 10,
    width: '100%', maxWidth: 400,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    backdropFilter: 'blur(32px)',
    borderRadius: 28,
    padding: '36px 32px 28px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset',
    animation: 'cardIn 0.5s cubic-bezier(0.16,1,0.3,1) both',
  },

  // Logo
  logoWrap: {
    position: 'relative',
    width: 72, height: 72,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  logoIcon: {
    width: 64, height: 64,
    borderRadius: 20,
    background: 'linear-gradient(135deg, #7c3aed, #f97316)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 0 32px rgba(162,28,206,0.5)',
    position: 'relative', zIndex: 1,
  },
  logoRing: {
    position: 'absolute', inset: -8,
    borderRadius: 28,
    border: '2px solid rgba(162,28,206,0.4)',
    animation: 'ringPulse 2.5s ease-in-out infinite',
  },

  brand: {
    fontSize: 30,
    fontWeight: 900,
    color: '#fff',
    margin: '14px 0 4px',
    letterSpacing: '-0.5px',
    background: 'linear-gradient(135deg, #fff 30%, #c084fc)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },

  tagline: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    margin: '0 0 20px',
    fontWeight: 500,
    textAlign: 'center',
  },

  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: 'rgba(255,255,255,0.08)',
  },
  dividerText: {
    fontSize: 11,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.25)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },

  errorBox: {
    width: '100%',
    background: 'rgba(239,68,68,0.12)',
    border: '1px solid rgba(239,68,68,0.25)',
    borderRadius: 14,
    padding: '10px 14px',
    color: '#fca5a5',
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 16,
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },

  // Fields
  fieldWrap: { width: '100%' },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
    letterSpacing: '0.01em',
  },
  inputWrap: {
    position: 'relative',
    borderRadius: 14,
    border: '1.5px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  inputWrapFocused: {
    borderColor: '#a21cce',
    boxShadow: '0 0 0 3px rgba(162,28,206,0.2)',
  },
  input: {
    width: '100%',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    padding: '13px 16px',
    color: '#fff',
    fontSize: 15,
    fontWeight: 500,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    boxSizing: 'border-box',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12, top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'rgba(255,255,255,0.35)',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
  },

  // Submit
  submitBtn: {
    marginTop: 24,
    width: '100%',
    padding: '15px 24px',
    borderRadius: 14,
    border: 'none',
    background: 'linear-gradient(135deg, #7c3aed 0%, #a21cce 50%, #f97316 100%)',
    backgroundSize: '200% 200%',
    color: '#fff',
    fontSize: 16,
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    cursor: 'pointer',
    boxShadow: '0 8px 32px rgba(162,28,206,0.45)',
    transition: 'transform 0.15s, box-shadow 0.15s',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    letterSpacing: '-0.2px',
  },

  spinner: {
    display: 'inline-block',
    width: 20, height: 20,
    border: '2.5px solid rgba(255,255,255,0.25)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },

  footer: {
    marginTop: 24,
    fontSize: 12,
    color: 'rgba(255,255,255,0.2)',
    fontWeight: 500,
    textAlign: 'center',
  },

  // PWA install button
  installBtn: {
    width: '100%',
    padding: '12px 18px',
    borderRadius: 12,
    border: '1.5px solid rgba(162,28,206,0.35)',
    background: 'rgba(162,28,206,0.08)',
    color: 'rgba(196,132,252,0.85)',
    fontSize: 14,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    transition: 'all 0.2s',
  },
  installBtnReady: {
    background: 'rgba(162,28,206,0.18)',
    border: '1.5px solid rgba(162,28,206,0.6)',
    color: '#d878f0',
    boxShadow: '0 0 18px rgba(162,28,206,0.3)',
  },
  iosGuide: {
    marginTop: 12,
    padding: '14px 16px',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  iosGuideTitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    margin: '0 0 10px',
  },
  stepDot: {
    minWidth: 20, height: 20,
    borderRadius: '50%',
    background: 'linear-gradient(135deg,#a21cce,#f97316)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 10, fontWeight: 800, color: '#fff', flexShrink: 0,
  },
};
