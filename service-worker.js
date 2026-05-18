// FitTracker AI - Service Worker
const CACHE_NAME = 'fittracker-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/profile.html',
  '/daily-log.html',
  '/workout.html',
  '/reports.html',
  '/goals.html',
  '/chat.html',
  '/settings.html',
  '/css/global.css',
  '/css/dashboard.css',
  '/css/profile.css',
  '/css/daily-log.css',
  '/css/workout.css',
  '/css/reports.css',
  '/css/goals.css',
  '/css/chat.css',
  '/css/settings.css',
  '/js/app.js',
  '/js/db.js',
  '/js/dashboard.js',
  '/js/profile.js',
  '/js/daily-log.js',
  '/js/workout.js',
  '/js/reports.js',
  '/js/goals.js',
  '/js/chat.js',
  '/js/settings.js',
  '/js/charts.js',
  '/js/ai.js',
  '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and API calls
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('generativelanguage.googleapis.com')) return;
  if (event.request.url.includes('cdn.')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version but update cache in background
        event.waitUntil(
          fetch(event.request).then((response) => {
            if (response && response.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, response);
              });
            }
          }).catch(() => {})
        );
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200) return response;
        const cloned = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
        return response;
      }).catch(() => {
        // Offline fallback
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// Push notification support
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'FitTracker AI', body: 'Time to check your fitness!' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/assets/icons/icon-192.png',
      badge: '/assets/icons/icon-72.png',
      vibrate: [200, 100, 200]
    })
  );
});
