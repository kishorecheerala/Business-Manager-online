// Cache-busting service worker - Forces complete refresh
const CACHE_VERSION = 'v-robust-2-shell';
const CACHE_NAME = `business-manager-${CACHE_VERSION}`;

console.log('[SW] Cache version:', CACHE_NAME);

// Install - Precache App Shell
self.addEventListener('install', (event) => {
  console.log('[SW] Installing with cache:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching App Shell');
      return cache.addAll([
        '/',
        '/index.html',
        '/manifest.json',
        '/vite.svg'
      ]);
    })
  );
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

// Fetch - Stale-while-revalidate for assets, Network-first for API, Offline fallback for Nav
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests or chrome-extension requests
  if (request.method !== 'GET' || request.url.startsWith('chrome-extension')) return;

  // Navigation requests (HTML) - Network First, allow offline fallback to index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return caches.match('/index.html');
        })
    );
    return;
  }

  // Asset requests - Cache First / Network Fallback
  event.respondWith(
    caches.match(request).then((cached) => {
      return cached || fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, clone);
        });
        return response;
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