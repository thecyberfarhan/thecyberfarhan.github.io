/* caches the site on the first visit so repeat visits load from the device */
var V = '89', CORE = ['./', 'assets/app.js?v=89', 'assets/cpent-medal.webp', 'assets/avatar.jpg', 'assets/contributions.svg', 'assets/contributions-m.svg', 'assets/contributions-light.svg', 'assets/contributions-m-light.svg', 'manifest.webmanifest', 'assets/icons/icon-192.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(V).then(function (c) { return Promise.all(CORE.map(function (u) { return c.add(u).catch(function () {}); })); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(function (r) { var cp = r.clone(); caches.open(V).then(function (c) { c.put('./', cp); }); return r; }).catch(function () { return caches.match('./'); }));
    return;
  }
  var versioned = /[?&]v=\d+/.test(url.search);
  e.respondWith(caches.match(req).then(function (hit) {
    var net = fetch(req).then(function (r) { if (r && r.ok) { var cp = r.clone(); caches.open(V).then(function (c) { c.put(req, cp); }); } return r; }).catch(function () { return hit; });
    return hit && versioned ? hit : (hit || net);
  }));
});
