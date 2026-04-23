// Kill-switch: deregister old SW and clear all caches
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Delete all caches
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    // Unregister self
    await self.registration.unregister();
    // Reload all client tabs so they drop SW reference
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((client) => client.navigate(client.url));
  })());
});

// No fetch handler — browser falls back to normal network requests
