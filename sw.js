const CACHE_NAME = 'ukousai2026-v2';
const ASSETS = [
  './',
  './index.html',
  './saiji.html',
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
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// events.json はネット優先→失敗時にキャッシュ（当日の更新を反映しやすくする）
// それ以外は キャッシュ優先→なければネット
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  if (url.pathname.endsWith('events.json')) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
