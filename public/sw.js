/**
 * Lenticchia — Service Worker
 *
 * Strategia cache:
 *   - Shell dell'app (JS/CSS/HTML): Cache First — aggiornata in background
 *   - Immagini statiche (icone): Cache First con TTL 30 giorni
 *   - API Firestore / Anthropic: Network Only — mai cachare dati live
 *   - Navigazione (pagine): Network First con fallback offline
 *
 * Non usiamo workbox per tenere il SW leggero e senza dipendenze extra.
 */

const CACHE_NAME = 'lenticchia-v1';
const OFFLINE_URL = '/offline.html';

// Risorse da precachare al momento dell'installazione
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ── Installazione: precache della shell ──────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()) // attiva subito senza aspettare il reload
  );
});

// ── Attivazione: pulizia cache vecchie ───────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim()) // prende controllo di tutte le tab aperte
  );
});

// ── Fetch: strategia per tipo di risorsa ─────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Mai intercettare: Firestore, Anthropic API, Firebase Auth, Telegram
  const bypassHosts = [
    'firestore.googleapis.com',
    'identitytoolkit.googleapis.com',
    'securetoken.googleapis.com',
    'api.anthropic.com',
    'api.telegram.org',
    'accounts.google.com',
  ];
  if (bypassHosts.some(host => url.hostname.includes(host))) {
    return; // lascia passare senza intercettare
  }

  // 2. Richieste POST/PUT/DELETE: mai cachare
  if (request.method !== 'GET') return;

  // 3. Navigazione (HTML): Network First con fallback offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // 4. Risorse statiche (JS, CSS, font, icone): Cache First
  const isStaticAsset = (
    url.pathname.match(/\.(js|css|woff2?|ttf|png|jpg|svg|ico)$/) ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/assets/')
  );

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request)
        .then(cached => {
          if (cached) return cached;
          // Non in cache: scarica e salva
          return fetch(request).then(response => {
            if (response.ok) {
              const cloned = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(request, cloned));
            }
            return response;
          });
        })
    );
    return;
  }

  // 5. Tutto il resto: Network Only (nessuna cache)
});

// ── Push notifications (futuro) ───────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); }
  catch { payload = { title: 'Lenticchia', body: event.data.text() }; }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Lenticchia 🌿', {
      body:    payload.body || '',
      icon:    '/icons/icon-192.png',
      badge:   '/icons/icon-192.png',
      tag:     payload.tag || 'lenticchia-notif',
      data:    payload.data || {},
      vibrate: [100, 50, 100],
    })
  );
});

// Tap su notifica → apre l'app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        const existing = clientList.find(c => c.url === url && 'focus' in c);
        if (existing) return existing.focus();
        return clients.openWindow(url);
      })
  );
});
