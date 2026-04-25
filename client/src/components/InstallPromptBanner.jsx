import { useState, useEffect, useRef } from 'react';
import { Download, X, Smartphone, Share, Zap, WifiOff, Bell, Star, MoreVertical } from 'lucide-react';

// ──────────────────────────────────────────────────────────────────────────────
//  Keys — bump suffix to force a re-show for all users
// ──────────────────────────────────────────────────────────────────────────────
const DISMISSED_KEY   = 'gympro-pwa-dismissed-v3';   // v3 resets everyone
const INSTALLED_KEY   = 'gympro-pwa-installed';
const SHOW_DELAY_MS   = 3_000;   // 3 s after page load
const RESHOW_DAYS     = 3;       // re-show after 3 days even if dismissed
const DISMISSED_AT_KEY = 'gympro-pwa-dismissed-at';

// ──────────────────────────────────────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────────────────────────────────────
function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

function isStandalone() {
  return (
    window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches
  );
}

/** Returns true if the browser can potentially support PWA installation */
function isPWACapable() {
  // iOS Safari supports Add to Home Screen
  if (isIOS()) return true;
  // Chrome / Edge on Android & Desktop support beforeinstallprompt
  const ua = navigator.userAgent;
  return /Chrome|Edg/i.test(ua);
}

/** Returns true only if dismissal was very recent (within RESHOW_DAYS) */
function wasRecentlyDismissed() {
  const dismissedAt = localStorage.getItem(DISMISSED_AT_KEY);
  if (!dismissedAt) return false;
  const diff = Date.now() - Number(dismissedAt);
  return diff < RESHOW_DAYS * 24 * 60 * 60 * 1000;
}

const FEATURES = [
  { icon: <Zap     style={{ width: 16, height: 16 }} />, label: 'Lightning Fast',  sub: 'Instant load, no lag'   },
  { icon: <WifiOff style={{ width: 16, height: 16 }} />, label: 'Works Offline',   sub: 'No internet needed'     },
  { icon: <Bell    style={{ width: 16, height: 16 }} />, label: 'Notifications',   sub: 'Real-time updates'      },
  { icon: <Star    style={{ width: 16, height: 16 }} />, label: 'Native Feel',     sub: 'Full-screen app'        },
];

// ──────────────────────────────────────────────────────────────────────────────
//  Component
// ──────────────────────────────────────────────────────────────────────────────
export default function InstallPromptBanner() {
  const [visible,    setVisible]    = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installed,  setInstalled]  = useState(false);
  // platform: 'ios' | 'android-native' | 'android-manual' | ''
  const [platform,   setPlatform]   = useState('');
  const deferredPrompt = useRef(null);
  const timerRef       = useRef(null);

  useEffect(() => {
    // 1. Already running as installed PWA — never show
    if (isStandalone()) return;

    // 2. Already installed by the user
    if (localStorage.getItem(INSTALLED_KEY) === 'true') return;

    // 3. Recently dismissed — respect the snooze window
    if (wasRecentlyDismissed()) return;

    // 4. Browser can't install PWAs — don't bother
    if (!isPWACapable()) return;

    // ── iOS path ──────────────────────────────────────────────
    if (isIOS()) {
      setPlatform('ios');
      timerRef.current = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
      return () => clearTimeout(timerRef.current);
    }

    // ── Chrome / Edge path ────────────────────────────────────
    const onBeforeInstall = (e) => {
      e.preventDefault();
      deferredPrompt.current = e;
      // We already have a native prompt ready — upgrade platform now
      setPlatform('android-native');
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    // Wait for the delay, then decide which mode to show
    timerRef.current = setTimeout(() => {
      if (deferredPrompt.current) {
        setPlatform('android-native');
      } else {
        // No native prompt received yet — show manual instructions
        setPlatform('android-manual');
      }
      setVisible(true);
    }, SHOW_DELAY_MS);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      clearTimeout(timerRef.current);
    };
  }, []);

  // ── Actions ─────────────────────────────────────────────────
  const handleInstall = async () => {
    if (!deferredPrompt.current) return;
    setInstalling(true);
    try {
      await deferredPrompt.current.prompt();
      const { outcome } = await deferredPrompt.current.userChoice;
      if (outcome === 'accepted') {
        setInstalled(true);
        localStorage.setItem(INSTALLED_KEY, 'true');
        setTimeout(() => setVisible(false), 2500);
      }
    } catch (err) {
      console.warn('[PWA] Install prompt error:', err);
    } finally {
      deferredPrompt.current = null;
      setInstalling(false);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    // Store dismiss time (not a permanent block — re-shows after RESHOW_DAYS)
    localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()));
    // Keep v3 key to avoid re-showing on hot reload during the same session
    localStorage.setItem(DISMISSED_KEY, 'true');
  };

  if (!visible) return null;

  // ── Shared styles ────────────────────────────────────────────
  const cardStyle = {
    background: 'linear-gradient(135deg, #13131f 0%, #1a1a2e 100%)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '24px',
    overflow: 'hidden',
    boxShadow: '0 32px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(162,28,206,0.2)',
    position: 'relative',
  };

  const ghostBtn = {
    flex: 1, width: '100%', padding: '14px', borderRadius: '14px',
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    color: '#9ca3af', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
  };

  const stepNum = () => ({
    minWidth: '24px', height: '24px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #a21cce, #f97316)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '11px', fontWeight: '800', color: '#fff', flexShrink: 0,
  });

  // ── iOS instructions ─────────────────────────────────────────
  const renderIOS = () => (
    <>
      <div style={{
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px', padding: '16px', marginBottom: '16px',
      }}>
        <p style={{ color: '#9ca3af', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px' }}>
          How to install on iPhone / iPad:
        </p>
        {[
          { n: 1, jsx: <>Tap the <Share style={{ display: 'inline', width: 14, height: 14, color: '#60a5fa', verticalAlign: 'middle', margin: '0 2px' }} /> <b>Share</b> button in Safari's bottom bar</> },
          { n: 2, jsx: <>Scroll and tap <b>"Add to Home Screen"</b></> },
          { n: 3, jsx: <>Tap <b>"Add"</b> — done! 🎉</> },
        ].map(({ n, jsx }) => (
          <div key={n} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: n > 1 ? '10px' : 0 }}>
            <div style={stepNum()}>{n}</div>
            <p style={{ color: '#d1d5db', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>{jsx}</p>
          </div>
        ))}
      </div>
      <button onClick={handleDismiss} style={ghostBtn}>Maybe later</button>
    </>
  );

  // ── Android manual instructions ──────────────────────────────
  const renderAndroidManual = () => (
    <>
      <div style={{
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px', padding: '16px', marginBottom: '16px',
      }}>
        <p style={{ color: '#9ca3af', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px' }}>
          How to install on Android / Chrome:
        </p>
        {[
          { n: 1, jsx: <><MoreVertical style={{ display: 'inline', width: 14, height: 14, color: '#d1d5db', verticalAlign: 'middle', margin: '0 2px' }} /> Tap the <b>menu (⋮)</b> in Chrome's top-right</> },
          { n: 2, jsx: <>Tap <b>"Add to Home screen"</b> or <b>"Install app"</b></> },
          { n: 3, jsx: <>Tap <b>"Install"</b> to confirm — you're all set! 🎉</> },
        ].map(({ n, jsx }) => (
          <div key={n} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: n > 1 ? '10px' : 0 }}>
            <div style={stepNum()}>{n}</div>
            <p style={{ color: '#d1d5db', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>{jsx}</p>
          </div>
        ))}
      </div>
      <button onClick={handleDismiss} style={ghostBtn}>Maybe later</button>
    </>
  );

  // ── Android / Chrome native one-click install ─────────────────
  const renderAndroidNative = () => (
    <>
      {installed && (
        <div style={{
          textAlign: 'center', padding: '16px', marginBottom: '16px',
          background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '14px',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</div>
          <p style={{ color: '#10b981', fontWeight: '700', margin: 0 }}>Successfully Installed!</p>
          <p style={{ color: '#6b7280', fontSize: '12px', margin: '4px 0 0' }}>Check your home screen for GymPro</p>
        </div>
      )}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={handleDismiss} style={ghostBtn}>Not now</button>
        <button
          onClick={handleInstall}
          disabled={installing || installed}
          style={{
            flex: 2, padding: '14px', borderRadius: '14px',
            background: installed ? '#10b981' : 'linear-gradient(135deg, #a21cce, #f97316)',
            border: 'none', color: '#fff', fontSize: '14px', fontWeight: '700',
            cursor: installing || installed ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            boxShadow: '0 4px 20px rgba(162,28,206,0.4)',
            opacity: installing ? 0.8 : 1, transition: 'all 0.2s',
          }}
        >
          {installing ? (
            <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Installing…</>
          ) : installed ? '✓ Installed!' : (
            <><Download style={{ width: 16, height: 16 }} /> Install App</>
          )}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Backdrop */}
      <div onClick={handleDismiss} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(6px)', zIndex: 9999, animation: 'fadeIn 0.3s ease',
      }} />

      {/* Modal */}
      <div style={{
        position: 'fixed', left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(92vw, 420px)', zIndex: 10000,
        animation: 'popIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <div style={cardStyle}>
          {/* Gradient bar */}
          <div style={{ height: '3px', background: 'linear-gradient(90deg,#c044ef,#f97316,#c044ef)', backgroundSize: '200%', animation: 'shimmer 3s linear infinite' }} />

          {/* Dismiss X */}
          <button onClick={handleDismiss} style={{
            position: 'absolute', top: 16, right: 16,
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#9ca3af',
          }}>
            <X style={{ width: 14, height: 14 }} />
          </button>

          {/* Body */}
          <div style={{ padding: '28px 24px 24px' }}>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                width: 72, height: 72, borderRadius: 20,
                background: 'linear-gradient(135deg,#a21cce,#f97316)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 14px',
                boxShadow: '0 8px 32px rgba(162,28,206,0.4)',
              }}>
                <Smartphone style={{ width: 34, height: 34, color: '#fff' }} />
              </div>

              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(162,28,206,0.12)', border: '1px solid rgba(162,28,206,0.3)',
                borderRadius: 20, padding: '4px 12px', marginBottom: 10,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a21cce', display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#c878f0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recommended</span>
              </div>

              <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: '0 0 8px', lineHeight: 1.2 }}>
                Get the GymPro App
              </h2>
              <p style={{ color: '#9ca3af', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                Add to your home screen for a{' '}
                <span style={{ color: '#d878f0', fontWeight: 600 }}>faster, native-like experience</span>!
              </p>
            </div>

            {/* Feature tiles */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {FEATURES.map(({ icon, label, sub }) => (
                <div key={label} style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 14, padding: 12,
                  display: 'flex', flexDirection: 'column', gap: 6,
                }}>
                  <div style={{ color: '#c044ef' }}>{icon}</div>
                  <div style={{ color: '#e5e7eb', fontSize: 12, fontWeight: 700 }}>{label}</div>
                  <div style={{ color: '#6b7280', fontSize: 10, lineHeight: 1.4 }}>{sub}</div>
                </div>
              ))}
            </div>

            {/* Platform-specific CTA */}
            {platform === 'ios'             && renderIOS()}
            {platform === 'android-native'  && renderAndroidNative()}
            {platform === 'android-manual'  && renderAndroidManual()}

            <p style={{ textAlign: 'center', color: '#374151', fontSize: 11, margin: '14px 0 0' }}>
              Free to install · No app store required
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 }                                                              to { opacity: 1 } }
        @keyframes popIn   { from { opacity: 0; transform: translate(-50%,-50%) scale(0.85) }                 to { opacity: 1; transform: translate(-50%,-50%) scale(1) } }
        @keyframes shimmer { 0%   { background-position: 200% center }                                       100% { background-position: -200% center } }
        @keyframes spin    { to   { transform: rotate(360deg) } }
        @keyframes pulse   { 0%, 100% { opacity: 1 }                                                         50% { opacity: 0.4 } }
      `}</style>
    </>
  );
}
