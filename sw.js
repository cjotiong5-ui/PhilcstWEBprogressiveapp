/**
 * PhilCST Service Worker — v1.0.0
 * ═══════════════════════════════════════════════════════════════
 * Caching Strategy:
 *  - App Shell  → Cache-First (instant loads, versioned)
 *  - Images     → Stale-While-Revalidate (fast + fresh)
 *  - API calls  → Network-First with cache fallback
 *  - Navigations → Cache-First with network fallback (offline support)
 * ═══════════════════════════════════════════════════════════════
 */

const CACHE_VERSION   = 'v1.0.0';
const SHELL_CACHE     = `philcst-shell-${CACHE_VERSION}`;
const IMAGE_CACHE     = `philcst-images-${CACHE_VERSION}`;
const DYNAMIC_CACHE   = `philcst-dynamic-${CACHE_VERSION}`;

// Files that form the "App Shell" — must be cached on install
const APP_SHELL_ASSETS = [
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/offline.html',
  // Google Fonts (subset the ones actually used)
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400&family=DM+Sans:wght@300;400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap'
];

// Max images to store in the image cache
const IMAGE_CACHE_MAX = 40;

// ── INSTALL ───────────────────────────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Installing PhilCST Service Worker...');

  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => {
        console.log('[SW] Pre-caching app shell...');
        // Use addAll but don't fail if optional resources miss
        return Promise.allSettled(
          APP_SHELL_ASSETS.map(url => cache.add(url).catch(err => {
            console.warn(`[SW] Failed to pre-cache ${url}:`, err.message);
          }))
        );
      })
      .then(() => {
        console.log('[SW] App shell cached. Skipping waiting...');
        return self.skipWaiting();
      })
  );
});

// ── ACTIVATE ──────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activating PhilCST Service Worker...');

  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        const validCaches = [SHELL_CACHE, IMAGE_CACHE, DYNAMIC_CACHE];
        return Promise.all(
          cacheNames
            .filter(name => name.startsWith('philcst-') && !validCaches.includes(name))
            .map(stale => {
              console.log('[SW] Deleting stale cache:', stale);
              return caches.delete(stale);
            })
        );
      })
      .then(() => {
        console.log('[SW] SW activated. Claiming clients...');
        return self.clients.claim();
      })
  );
});

// ── FETCH ─────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and browser-extension requests
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // ── 1. Navigation requests → Cache-First with network fallback
  if (request.mode === 'navigate') {
    event.respondWith(navigationStrategy(request));
    return;
  }

  // ── 2. Image requests → Stale-While-Revalidate
  if (request.destination === 'image') {
    event.respondWith(imageStrategy(request));
    return;
  }

  // ── 3. App Shell assets → Cache-First
  if (isShellAsset(url)) {
    event.respondWith(cacheFirstStrategy(request, SHELL_CACHE));
    return;
  }

  // ── 4. External API / unknown → Network-First
  event.respondWith(networkFirstStrategy(request));
});

// ── STRATEGIES ────────────────────────────────────────────────────

/** Navigation: serve from cache instantly, fall back to network, then offline page */
async function navigationStrategy(request) {
  try {
    // Try network first for navigation (ensures fresh HTML)
    const networkResponse = await fetchWithTimeout(request, 4000);
    if (networkResponse.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    // Network failed → try cache
    const cached = await caches.match(request) || await caches.match('/index.html');
    if (cached) return cached;
    // Last resort: offline page
    return caches.match('/offline.html');
  }
}

/** Images: serve from cache, revalidate in background, evict old entries */
async function imageStrategy(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);

  // Revalidate in background regardless
  const fetchPromise = fetch(request)
    .then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
        trimCache(IMAGE_CACHE, IMAGE_CACHE_MAX);
      }
      return response;
    })
    .catch(() => null);

  // Return cached immediately if available, else await network
  return cached || fetchPromise || new Response('', { status: 404 });
}

/** App Shell: cache first, no network fallback needed */
async function cacheFirstStrategy(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Resource unavailable offline', { status: 503 });
  }
}

/** Dynamic / APIs: network first with cache fallback */
async function networkFirstStrategy(request) {
  try {
    const response = await fetchWithTimeout(request, 5000);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response(JSON.stringify({ error: 'Offline', cached: false }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ── HELPERS ───────────────────────────────────────────────────────

function isShellAsset(url) {
  const localPaths = ['/style.css', '/app.js', '/manifest.json', '/sw.js'];
  if (url.origin === self.location.origin) {
    return localPaths.some(p => url.pathname === p)
      || url.pathname.startsWith('/icons/')
      || url.pathname.startsWith('/img/');
  }
  // Google Fonts
  return url.hostname === 'fonts.googleapis.com'
      || url.hostname === 'fonts.gstatic.com';
}

function fetchWithTimeout(request, ms) {
  return Promise.race([
    fetch(request),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('SW fetch timeout')), ms)
    )
  ]);
}

async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys  = await cache.keys();
  if (keys.length > maxItems) {
    // Delete oldest entries (FIFO)
    await Promise.all(keys.slice(0, keys.length - maxItems).map(k => cache.delete(k)));
  }
}

// ── BACKGROUND SYNC ───────────────────────────────────────────────
self.addEventListener('sync', event => {
  console.log('[SW] Background sync triggered:', event.tag);
  if (event.tag === 'attendance-sync') {
    event.waitUntil(syncPendingAttendance());
  }
});

async function syncPendingAttendance() {
  // Stub: in production, read from IndexedDB and POST to API
  console.log('[SW] Syncing pending attendance records...');
}

// ── PUSH NOTIFICATIONS ────────────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: 'PhilCST', body: event.data.text() };
  }

  const options = {
    body:    data.body    || 'You have a new notification from PhilCST.',
    icon:    '/icons/icon-192x192.png',
    badge:   '/icons/icon-96x96.png',
    image:   data.image   || undefined,
    vibrate: [200, 100, 200],
    tag:     data.tag     || 'philcst-notification',
    renotify: true,
    requireInteraction: data.requireInteraction || false,
    data: {
      url: data.url || '/',
      timestamp: Date.now()
    },
    actions: data.actions || [
      { action: 'view',    title: 'View',    icon: '/icons/icon-72x72.png' },
      { action: 'dismiss', title: 'Dismiss', icon: '/icons/icon-72x72.png' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'PhilCST', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        // Focus existing tab if open
        for (const client of clients) {
          if (client.url === targetUrl && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new tab
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

// ── MESSAGE HANDLER ───────────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'GET_VERSION') {
    event.ports[0]?.postMessage({ version: CACHE_VERSION });
  }
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.keys()
      .then(names => Promise.all(names.map(n => caches.delete(n))))
      .then(() => event.ports[0]?.postMessage({ cleared: true }));
  }
});

console.log('[SW] PhilCST Service Worker loaded. Version:', CACHE_VERSION);
