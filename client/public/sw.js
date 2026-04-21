/**
 * GymPro Service Worker
 *
 * Enables:
 *  - PWA installability (required by Chrome/Android)
 *  - Offline fallback page
 *  - Cache-first for static assets
 *  - Web Push Notifications 🔔
 */

const CACHE_NAME  = 'gympro-v2';
const OFFLINE_URL = '/offline.html';

const PRECACHE = ['/', '/manifest.json', '/icon-512.svg'];

// ── Install ───────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(PRECACHE.map(url => cache.add(url)))
    )
  );
  self.skipWaiting();
});

// ── Activate ──────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch ─────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.hostname.includes('supabase.co') || url.hostname.includes('supabase.in')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/') || caches.match(OFFLINE_URL))
    );
    return;
  }

  if (['script', 'style', 'image', 'font'].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then(cached =>
        cached || fetch(request).then(response => {
          if (response.ok) {
            caches.open(CACHE_NAME).then(c => c.put(request, response.clone()));
          }
          return response;
        })
      )
    );
  }
});

// ── Push Notification Received 🔔 ──────────────────────────────
self.addEventListener('push', event => {
  let data = { title: 'GymPro', body: 'You have a new notification' };
  try { if (event.data) data = event.data.json(); } catch { /* defaults */ }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    data.icon || '/icon-512.svg',
      badge:   '/icon-512.svg',
      vibrate: [200, 100, 200],
      data:    data.data || { url: '/' },
      actions: [
        { action: 'open',    title: 'Open App' },
        { action: 'dismiss', title: 'Dismiss'  },
      ],
    })
  );
});

// ── Notification Click ─────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(wins => {
      for (const w of wins) {
        if (w.url.includes(self.location.origin) && 'focus' in w) {
          w.navigate(url);
          return w.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
