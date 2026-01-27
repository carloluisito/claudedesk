/**
 * ClaudeDesk Service Worker
 * - Cache-first for static assets
 * - Network-first for API calls with offline fallback
 * - IndexedDB for cached data
 */

const CACHE_NAME = 'claudedesk-v1';
const STATIC_CACHE_NAME = 'claudedesk-static-v1';
const API_CACHE_NAME = 'claudedesk-api-v1';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

// API routes to cache (network-first with cache fallback)
const API_CACHE_PATTERNS = [
  '/api/health/status',
  '/api/repos',
  '/api/workspaces',
  '/api/apps',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Failed to cache some static assets:', err);
      });
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return (
                name.startsWith('claudedesk-') &&
                name !== CACHE_NAME &&
                name !== STATIC_CACHE_NAME &&
                name !== API_CACHE_NAME
              );
            })
            .map((name) => caches.delete(name))
        );
      }),
      // Claim all clients
      self.clients.claim(),
    ])
  );
});

// Fetch event - apply caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // API requests - network first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithCache(request));
    return;
  }

  // Static assets - cache first with network fallback
  event.respondWith(cacheFirstWithNetwork(request));
});

/**
 * Cache-first strategy for static assets
 */
async function cacheFirstWithNetwork(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    // Return cached version, refresh in background
    refreshCache(request);
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Offline - return offline page if available
    const offlineResponse = await caches.match('/');
    if (offlineResponse) {
      return offlineResponse;
    }

    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

/**
 * Network-first strategy for API requests
 */
async function networkFirstWithCache(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache successful API responses
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Network failed - try cache
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      // Add header to indicate cached response
      const headers = new Headers(cachedResponse.headers);
      headers.set('X-From-Cache', 'true');

      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers,
      });
    }

    // No cache - return error response
    return new Response(
      JSON.stringify({ error: 'Offline - data unavailable' }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Background cache refresh
 */
async function refreshCache(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse);
    }
  } catch (error) {
    // Silently fail - we already have a cached version
  }
}

// Handle push notifications (future use)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();

  event.waitUntil(
    self.registration.showNotification(data.title || 'ClaudeDesk', {
      body: data.body,
      icon: '/icons/icon-192.svg',
      badge: '/icons/icon-192.svg',
      tag: data.tag || 'claudedesk-notification',
      data: data.data,
    })
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data;
  const url = data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

// Message handling for manual cache updates
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('claudedesk-'))
            .map((name) => caches.delete(name))
        );
      })
    );
  }
});
