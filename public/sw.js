// Cache-busting service worker - Forces complete refresh
const CACHE_VERSION = 'v-robust-1';
const CACHE_NAME = `business-manager-${CACHE_VERSION}`;

console.log('[SW] Cache version:', CACHE_NAME);

// Install - don't wait, skip immediately
self.addEventListener('install', (event) => {
  console.log('[SW] Installing with cache:', CACHE_NAME);
  self.skipWaiting();
});

// Activate - clear all old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating - clearing old caches');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch - network first, then cache
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests or chrome-extension requests
  if (request.method !== 'GET' || request.url.startsWith('chrome-extension')) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, clone);
        });
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          // If offline and cache missing, return basic offline response if possible
          return cached || new Response('You are offline. Please check your connection.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' })
          });
        });
      })
  );
});

// Push Notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push Received');
  const data = event.data ? event.data.json() : { title: 'New Notification', body: 'Check app for updates.' };

  const options = {
    body: data.body,
    icon: '/vite.svg',
    badge: '/vite.svg',
    data: { url: data.url || '/' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification Click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});

// Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-sales') {
    console.log('[SW] Background Syncing Sales');
    // Logic to sync pending sales would go here
    // event.waitUntil(syncSales());
  }
});

console.log('[SW] Service Worker loaded - Cache busting enabled');