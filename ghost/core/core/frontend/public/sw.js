const CACHE_NAME = 'ghost-frontend-v1';
const urlsToCache = [
    '/',
    '/manifest.json',
    '/assets/css/styles.css',
    '/assets/js/script.js'
    // Include other assets for Theme-One
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache for Theme-One');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => response || fetch(event.request))
    );
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// /// <reference lib="webworker" />

// const CACHE_NAME = 'ghost-frontend-v1';
// const OFFLINE_URL = '/offline';

// // Assets to cache
// const ASSETS_TO_CACHE = [
//     '/manifest.json',
//     '/public/ghost.css',
//     '/public/ghost.min.css',
// ];

// // Install event - cache basic assets
// self.addEventListener('install', (event) => {
//     const typedEvent = /** @type {ExtendableEvent} */ (event);
//     typedEvent.waitUntil(
//         caches.open(CACHE_NAME)
//             .then(cache => cache.addAll(ASSETS_TO_CACHE))
//     );
// });

// // Activate event - cleanup old caches
// self.addEventListener('activate', (event) => {
//     const typedEvent = /** @type {ExtendableEvent} */ (event);
//     typedEvent.waitUntil(
//         caches.keys().then(cacheNames => {
//             return Promise.all(
//                 cacheNames.map(cacheName => {
//                     if (cacheName !== CACHE_NAME) {
//                         return caches.delete(cacheName);
//                     }
//                     return null;
//                 })
//             );
//         })
//     );
// });

// // Fetch event - network first, then cache
// self.addEventListener('fetch', (event) => {
//     const typedEvent = /** @type {FetchEvent} */ (event);

//     // Skip cross-origin requests
//     if (!typedEvent.request.url.startsWith(self.location.origin)) {
//         return;
//     }

//     // Handle API requests
//     if (typedEvent.request.url.includes('/ghost/api/')) {
//         typedEvent.respondWith(
//             fetch(typedEvent.request)
//                 .catch(() => {
//                     return caches.match(OFFLINE_URL);
//                 })
//         );
//         return;
//     }

//     // For HTML requests - network first then cache
//     if (typedEvent.request.mode === 'navigate') {
//         typedEvent.respondWith(
//             fetch(typedEvent.request)
//                 .catch(() => {
//                     return caches.match(typedEvent.request)
//                         .then(response => {
//                             return response || caches.match(OFFLINE_URL);
//                         });
//                 })
//         );
//         return;
//     }

//     // For other requests - try cache first, then network
//     typedEvent.respondWith(
//         caches.match(typedEvent.request)
//             .then(response => {
//                 if (response) {
//                     return response;
//                 }

//                 return fetch(typedEvent.request)
//                     .then(response => {
//                         // Cache successful responses
//                         if (response.ok && response.type === 'basic') {
//                             const responseToCache = response.clone();
//                             caches.open(CACHE_NAME)
//                                 .then(cache => {
//                                     cache.put(typedEvent.request, responseToCache);
//                                 });
//                         }
//                         return response;
//                     })
//                     .catch(() => {
//                         // If both cache and network fail, show offline page
//                         if (typedEvent.request.mode === 'navigate') {
//                             return caches.match(OFFLINE_URL);
//                         }
//                         return null;
//                     });
//             })
//     );
// });

// // Handle push notifications
// self.addEventListener('push', (event) => {
//     const typedEvent = /** @type {PushEvent} */ (event);
//     if (typedEvent.data) {
//         const data = typedEvent.data.json();
//         const options = {
//             body: data.body,
//             icon: '/public/icons/icon-192x192.png',
//             badge: '/public/icons/icon-192x192.png'
//         };

//         typedEvent.waitUntil(
//             self.registration.showNotification(data.title, options)
//         );
//     }
// });
