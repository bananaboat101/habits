const VERSION = 'habits-3.0.0';
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/app.js',
  'js/backup.js',
  'js/data.js',
  'js/db.js',
  'js/logic.js',
  'js/settings.js',
  'js/state.js',
  'js/stats.js',
  'js/tile.js',
  'js/today.js',
  'js/ui.js',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))));
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(e.request, { ignoreSearch: true });
    if (hit) return hit;
    if (e.request.mode === 'navigate') {
      const shell = await cache.match('index.html');
      if (shell) return shell;
    }
    return fetch(e.request);
  })());
});
