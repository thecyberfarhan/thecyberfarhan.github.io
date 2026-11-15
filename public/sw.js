// The previous version of this site cached pages with a service worker. Browsers re-fetch
// this file on navigation, so replacing it with this one clears those caches, removes the
// worker and reloads open tabs onto the live site.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) await caches.delete(key);
    await self.registration.unregister();
    for (const client of await self.clients.matchAll({ type: 'window' })) client.navigate(client.url);
  })());
});
