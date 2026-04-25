import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// ── One-time PWA key migration: clear old dismissed flag ────
// v2 key is obsolete; clearing it ensures returning users see the new popup
if (localStorage.getItem('gympro-pwa-dismissed-v2') === 'true') {
  localStorage.removeItem('gympro-pwa-dismissed-v2');
  // Also wipe the timestamp so it appears fresh
  localStorage.removeItem('gympro-pwa-dismissed-at');
}

// ── Register Service Worker ─────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(reg => console.log('[SW] Registered', reg.scope))
      .catch(err => console.warn('[SW] Registration failed:', err));
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
