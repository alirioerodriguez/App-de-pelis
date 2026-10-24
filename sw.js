// La app se mudó a https://donde-la-veo-app.vercel.app/.
// Este service worker reemplaza al anterior, se da de baja y recarga las pestañas abiertas,
// así nadie queda viendo la copia vieja guardada para usar sin internet.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(clients => clients.forEach(c => c.navigate(c.url)))
  );
});
