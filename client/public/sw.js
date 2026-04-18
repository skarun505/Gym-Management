/**
 * GymPro Service Worker
 * 
 * Enables:
 *  - PWA installability (required by Chrome/Android)
 *  - Offline fallback page
 *  - Cache-first for static assets
 */

const CACHE_NAME  = 'gympro-v1';
const OFFLINE_URL = '/offline.html';

// Assets to pre-cache on install
const PRECACHE = [
  '/',
  '/manifest.json',
  '/icon-512.svg',
];

// ── Install ──────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Don't fail install if some assets are missing
      return Promise.allSettled(PRECACHE.map(url => cache.add(url)));
    })
  );
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch ─────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip Supabase API & edge function calls — always network
  const url = new URL(request.url);
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('supabase.in')
  ) return;

  // Network-first for HTML navigation (keeps app fresh)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match('/') || caches.match(OFFLINE_URL))
    );
    return;
  }

  // Cache-first for static assets (JS, CSS, images, fonts)
  if (
    request.destination === 'script'  ||
    request.destination === 'style'   ||
    request.destination === 'image'   ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request).then(cached =>
        cached || fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return response;
        })
      )
    );
  }
});
