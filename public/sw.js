// Robust Cache-busting service worker
const CACHE_NAME = 'business-manager-v2-robust';

console.log('[SW] Service Worker loading with cache:', CACHE_NAME);

// Install - don't wait, skip immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate - clear all old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Clean up old caches from previous versions
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

// Fetch - Network First strategy for reliability, falling back to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  if (request.method !== 'GET') return;
  
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Return valid response
        if (!response || response.status !== 200) {
          return response;
        }
        // Clone and cache
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, clone);
        });
        return response;
      })
      .catch(() => {
        // Network failed, look in cache
        return caches.match(request).then((cached) => {
          return cached || new Response("Offline - Content not cached", { status: 503, statusText: "Offline" });
        });
      })
  );
});