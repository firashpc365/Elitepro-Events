// sw.js
const CACHE_NAME = 'kanchana-events-hub-v1';
const APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/index.tsx',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Opened cache and caching app shell');
      return cache.addAll(APP_SHELL_URLS);
    }).catch(err => {
        console.error('Failed to cache app shell:', err);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // We only want to handle GET requests and ignore browser extension requests
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // If we have a cached response, return it.
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // If we don't have a cached response, fetch from the network.
      return fetch(event.request).then(networkResponse => {

        // Check if we received a valid response.
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        // Clone the response because it's a stream and can be consumed only once.
        const responseToCache = networkResponse.clone();
        
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        
        return networkResponse;
      }).catch(error => {
        console.error('Fetch failed; app is running offline.', error);
        // In a more advanced app, you could return a fallback offline page:
        // return caches.match('/offline.html');
      });
    })
  );
});
