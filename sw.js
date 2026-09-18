const CACHE_NAME = 'ukousai2026-v3-crowd';
const ASSETS = [
  './',
  './index.html',
  './saiji.html',
  './crowd.css',
  './crowd-model.js',
  './crowd-view.js',
  './crowd-firebase.js',
  './firebase-config.js',
  './manifest.json',
  './events.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith('ukousai2026-') && k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Firebaseの通信・管理画面はキャッシュしない。公開HTMLとデータはネット優先。
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/crowd-admin.html') || url.pathname.endsWith('/crowd-admin.js')) return;
  const isLiveAsset = e.request.mode === 'navigate' || /\.(html|json|js|css)$/.test(url.pathname);
  if (isLiveAsset) {
    const cacheKey = new Request(url.origin + url.pathname);
    e.respondWith(
      fetch(e.request, {cache: 'no-store'})
        .then(async (res) => {
          if (res.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(cacheKey, res.clone());
          }
          return res;
        })
        .catch(async () => (await caches.match(cacheKey)) || Response.error())
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
