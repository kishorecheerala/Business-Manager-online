// Cache-busting service worker - PRODUCTION HOTFIX
// This version forces a complete cache clear to resolve "White Screen" / Freeze issues.
const CACHE_VERSION = 'v-production-hotfix-1';
const CACHE_NAME = `business-manager-${CACHE_VERSION}`;

console.log('[SW] Hotfix Active:', CACHE_NAME);

self.addEventListener('install', (event) => {
  console.log('[SW] Installing - Forcing activation...');
  self.skipWaiting(); // Force activation immediately
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating - Clearing ALL old caches...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // DELETE EVERYTHING to ensure no stale data
          console.log('[SW] Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('[SW] Clients Claimed - Taking control.');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  // NETWORK ONLY STRATEGY
  // We explicitly bypass cache to prevent the "stale/freeze" issue.
  // This ensures the user always gets the latest Vercel deployment.
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request).catch((error) => {
      console.error('[SW] Fetch failed:', error);
      // Optional: return a fallback offline page here if needed in future
      throw error;
    })
  );
});