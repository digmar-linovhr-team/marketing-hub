// Service worker: cache tampilan aplikasi agar cepat dibuka & bisa di-install.
// Data dari API selalu diambil langsung (tidak di-cache).
var CACHE = 'mhub-v9';
var ASSETS = ['./', './index.html', './styles.css', './app.js', './charts.js', './mock.js', './config.js', './manifest.json', './icons/icon-192.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // API & font lewat jaringan
  // network-first: selalu coba versi terbaru, pakai cache saat offline
  e.respondWith(
    fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      return res;
    }).catch(function () { return caches.match(e.request).then(function (r) { return r || caches.match('./index.html'); }); })
  );
});
