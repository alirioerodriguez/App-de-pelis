// Service worker de "¿Dónde la veo?".
// - La página siempre se pide primero a la red (así cada publicación se ve enseguida);
//   si no hay conexión, se usa la última copia guardada.
// - Pósters y logos de TMDB se guardan a medida que se ven, para que carguen más rápido.
// - Las consultas a las APIs (TMDB, Wikidata) nunca se guardan: la disponibilidad tiene que estar al día.
const VERSION = 'v1';
const SHELL = `shell-${VERSION}`;
const IMAGES = `img-${VERSION}`;
const SHELL_FILES = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== SHELL && k !== IMAGES).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Página y archivos propios: red primero, copia guardada si no hay conexión
  if (url.origin === location.origin) {
    e.respondWith(fetch(req)
      .then(res => { if (res.ok) caches.open(SHELL).then(c => c.put(req, res.clone())); return res; })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
    return;
  }

  // Imágenes de TMDB y banderas: lo guardado primero (no cambian), con un tope de tamaño
  if (url.hostname === 'image.tmdb.org' || url.hostname === 'flagcdn.com') {
    e.respondWith(caches.open(IMAGES).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') {
        c.put(req, res.clone());
        c.keys().then(keys => { if (keys.length > 400) keys.slice(0, keys.length - 400).forEach(k => c.delete(k)); });
      }
      return res;
    }));
  }
  // Todo lo demás (APIs) va directo a la red
});
