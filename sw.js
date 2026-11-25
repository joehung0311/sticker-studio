/* 今天貼什麼？ Service Worker — 更新版本時請修改 VERSION */
const VERSION = 'v1.0.0';
const CACHE = 'sticker-studio-' + VERSION;
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './css/style.css',
  './js/data.js', './js/core.js', './js/views.js', './js/editor.js', './js/linetool.js', './js/collection.js', './js/app.js',
  './vendor/jszip.min.js', './vendor/qrcode.js',
  './assets/icons/icon-32.png', './assets/icons/icon-48.png', './assets/icons/icon-96.png', './assets/icons/icon-192.png',
  './assets/icons/icon-512.png', './assets/icons/maskable-512.png', './assets/icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});
self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('sticker-studio-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // 外部網站一律走網路
  if (req.mode === 'navigate') {
    // 頁面：網路優先，離線時用快取
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('./index.html', copy)); return res; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  // 靜態資源：快取優先
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  })));
});
