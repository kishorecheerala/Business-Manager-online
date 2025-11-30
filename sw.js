const CACHE_NAME = 'business-manager-v4'; // Bump version to trigger new install
const STATIC_ASSETS = [
  './index.html',
  './manifest.json', // Must be correct path
  './vite.svg'
  // The root './' is implicitly handled by the fetch handler for navigation.
];

// On install, cache the app shell
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Caching app shell');
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// On activate, clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('SW: Deleting old cache', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => {
      console.log('SW: Claiming clients');
      return self.clients.claim();
    })
  );
});

// On fetch, serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Serve the app shell (index.html) with a Cache First, then Network strategy.
  // This is critical for PWA installability and offline functionality.
  // This handles direct navigation to the app's root.
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then(cachedResponse => {
        // Return from cache if available.
        if (cachedResponse) {
          // In the background, fetch a fresh version to update the cache for next time
          fetch('./index.html').then(networkResponse => {
            if (networkResponse.ok) {
              caches.open(CACHE_NAME).then(cache => {
                cache.put('./index.html', networkResponse);
              });
            }
          });
          return cachedResponse;
        }
        // If not in cache, fetch from network.
        return fetch('./index.html');
      })
    );
    return;
  }

  // For other requests (JS from CDN, fonts, etc.), use a Stale-While-Revalidate strategy.
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(request).then(cachedResponse => {
        const fetchPromise = fetch(request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        });

        // Return from cache if available, otherwise wait for the network.
        return cachedResponse || fetchPromise;
      });
    })
  );
});