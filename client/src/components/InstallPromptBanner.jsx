import { useState, useEffect, useRef } from 'react';
import { Download, X, Smartphone, Share } from 'lucide-react';

// How long to wait before showing the prompt (ms)
const SHOW_DELAY_MS = 30_000; // 30 seconds
// localStorage key — don't show again after dismissed
const DISMISSED_KEY = 'gympro-pwa-dismissed';
const INSTALLED_KEY = 'gympro-pwa-installed';

/**
 * Detects iOS (Safari) — no beforeinstallprompt, manual steps needed
 */
function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

/**
 * Returns true if already running as a PWA (standalone)
 */
function isStandalone() {
  return (
    window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches
  );
}

export default function InstallPromptBanner() {
  const [visible,      setVisible]      = useState(false);
  const [installing,   setInstalling]   = useState(false);
  const [installed,    setInstalled]    = useState(false);
  const [isIos,        setIsIos]        = useState(false);
  const deferredPrompt = useRef(null);
  const timerRef       = useRef(null);

  useEffect(() => {
    // Already running as PWA → never show
    if (isStandalone()) return;

    // Already dismissed or installed → skip
    if (
      localStorage.getItem(DISMISSED_KEY) === 'true' ||
      localStorage.getItem(INSTALLED_KEY) === 'true'
    ) return;

    const ios = isIOS();
    setIsIos(ios);

    if (!ios) {
      // Capture Chrome/Android install event
      const handleBeforeInstall = (e) => {
        e.preventDefault();
        deferredPrompt.current = e;

        // Show after 30s delay
        timerRef.current = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstall);

      // If already captured before component mounted
      if (deferredPrompt.current) {
        timerRef.current = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
      }

      // Clean up on unmount
      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        clearTimeout(timerRef.current);
      };
    } else {
      // iOS: just show info banner after delay
      timerRef.current = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
      return () => clearTimeout(timerRef.current);
    }
  }, []);

  const handleInstall = async () => {
    if (isIos) return; // iOS shows instructions, no auto-install

    if (!deferredPrompt.current) return;
    setInstalling(true);

    try {
      await deferredPrompt.current.prompt();
      const { outcome } = await deferredPrompt.current.userChoice;

      if (outcome === 'accepted') {
        setInstalled(true);
        localStorage.setItem(INSTALLED_KEY, 'true');
        setTimeout(() => setVisible(false), 2000);
      }
    } finally {
      deferredPrompt.current = null;
      setInstalling(false);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, 'true');
  };

  if (!visible) return null;

  // ── iOS instructions banner ──────────────────────────────
  if (isIos) {
    return (
      <div
        className="fixed bottom-4 left-3 right-3 z-[999] animate-slide-up"
        style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="rounded-2xl border border-white/15 shadow-2xl overflow-hidden"
          style={{ background: 'rgba(17,17,24,0.97)', backdropFilter: 'blur(20px)' }}
        >
          {/* iOS-style gradient top border */}
          <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #c044ef, #f97316)' }} />

          <div className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #a21cce, #f97316)' }}
                >
                  <span className="text-white font-bold text-lg">G</span>
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Install GymPro App</p>
                  <p className="text-gray-400 text-xs mt-0.5">Add to your home screen</p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1.5 rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* iOS Steps */}
            <div className="bg-white/5 rounded-xl p-3 space-y-2 mb-3">
              <p className="text-gray-300 text-xs font-semibold mb-2 uppercase tracking-wider">How to install:</p>
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-primary-600/30 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary-400">1</div>
                <p className="text-gray-300 text-xs">
                  Tap the <span className="text-white font-semibold">Share</span> button{' '}
                  <Share className="inline w-3.5 h-3.5 text-blue-400" /> at the bottom of Safari
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-primary-600/30 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary-400">2</div>
                <p className="text-gray-300 text-xs">
                  Scroll and tap <span className="text-white font-semibold">"Add to Home Screen"</span>
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-primary-600/30 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary-400">3</div>
                <p className="text-gray-300 text-xs">
                  Tap <span className="text-white font-semibold">"Add"</span> — that's it! 🎉
                </p>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-gray-400 border border-white/10 hover:bg-white/5 transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Android / Chrome auto-install banner ─────────────────
  return (
    <div
      className="fixed bottom-4 left-3 right-3 z-[999] animate-slide-up"
      style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <div
        className="rounded-2xl border border-white/15 shadow-2xl overflow-hidden"
        style={{ background: 'rgba(17,17,24,0.97)', backdropFilter: 'blur(20px)' }}
      >
        {/* Top gradient accent */}
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #c044ef, #f97316)' }} />

        <div className="p-4">
          {/* App info row */}
          <div className="flex items-start gap-3 mb-4">
            {/* App icon */}
            <div
              className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #a21cce, #f97316)' }}
            >
              <span className="text-white font-black text-xl">G</span>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm">Install GymPro App</p>
              <p className="text-gray-400 text-xs mt-0.5">
                {installed
                  ? '✓ Installing… enjoy the app!'
                  : 'Get the full app — works offline, faster & easier!'}
              </p>
            </div>

            {/* Dismiss */}
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Benefits pills */}
          {!installed && (
            <div className="flex gap-1.5 mb-4 flex-wrap">
              {['⚡ Faster', '📶 Works Offline', '🏠 Home Screen', '🔔 Notifications'].map(t => (
                <span key={t} className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: 'rgba(192,68,239,0.12)', color: '#d870f8', border: '1px solid rgba(192,68,239,0.25)' }}>
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleDismiss}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-400 border border-white/10 hover:bg-white/5 transition-colors"
            >
              Not now
            </button>
            <button
              onClick={handleInstall}
              disabled={installing || installed}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-70"
              style={{ background: installed ? '#10b981' : 'linear-gradient(135deg, #a21cce, #f97316)' }}
            >
              {installing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Installing…
                </>
              ) : installed ? (
                <>✓ Installed!</>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Install App
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
