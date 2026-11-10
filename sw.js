// Service worker de "VeoMás".
// - La página siempre se pide primero a la red (así cada publicación se ve enseguida);
//   si no hay conexión, se usa la última copia guardada.
// - Pósters y logos de TMDB se guardan a medida que se ven, para que carguen más rápido. Por los términos de TMDB
//   no pueden quedar más de 6 meses: se guardan por tandas de 60 días y solo viven la actual y la anterior (tmdbDatos.js).
// - Las consultas a las APIs (TMDB, Wikidata) nunca se guardan: la disponibilidad tiene que estar al día.
importScripts('./tmdbDatos.js');
const VERSION = 'v11';
const SHELL = `shell-${VERSION}`;
const imagenes = () => TmdbDatos.cacheImagenes(VERSION, Date.now()); // caché de imágenes de la tanda actual
const SHELL_FILES = ['./', './index.html', './corrector.js', './tmdbDatos.js', './derechos.js', './avisosWeb.js', './azar.js', './rotacion.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

// Borra todo lo que no sea el shell de esta versión ni una tanda de imágenes vigente (actual o anterior)
function limpiar() {
  return caches.keys().then(keys => {
    const vencidos = new Set(TmdbDatos.cachesAborrar(keys, VERSION, Date.now()));
    return Promise.all(keys.filter(k => k !== SHELL && (!k.startsWith('img-') || vencidos.has(k))).map(k => caches.delete(k)));
  });
}
let limpiado = false; // el service worker puede quedar meses sin reactivarse: también se limpia al primer pedido

self.addEventListener('activate', e => {
  e.waitUntil(limpiar().then(() => { limpiado = true; return self.clients.claim(); }));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // El intermediario de TMDB (api/tmdb en Vercel) es una consulta: nunca se guarda
  if (url.pathname.includes('/api/')) return;

  // Página y archivos propios: red primero, copia guardada si no hay conexión
  if (url.origin === location.origin) {
    e.respondWith(fetch(req)
      .then(res => { if (res.ok) caches.open(SHELL).then(c => c.put(req, res.clone())); return res; })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
    return;
  }

  // Imágenes de TMDB y banderas: lo guardado primero (no cambian), con un tope de tamaño
  if (url.hostname === 'image.tmdb.org' || url.hostname === 'flagcdn.com') {
    if (!limpiado) { limpiado = true; e.waitUntil(limpiar().catch(() => { limpiado = false; })); }
    e.respondWith(caches.open(imagenes()).then(async c => {
      const hit = (await c.match(req)) || (await caches.match(req)); // tanda actual o la anterior
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

// Avisos de «Mi lista» con la web cerrada (Web Push). El servidor manda { title, body, url, tag }.
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { /* sin datos: se muestra el aviso genérico */ }
  e.waitUntil(self.registration.showNotification(String(d.title || 'VeoMás').slice(0, 80), {
    body: String(d.body || '').slice(0, 200),
    tag: String(d.tag || 'veomas').slice(0, 40),
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    data: { url: String(d.url || '/') },
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  // Solo se abren direcciones de esta misma web: un aviso nunca manda a otro sitio.
  let destino = new URL('./', self.location.href).href;
  try { const u = new URL(e.notification.data && e.notification.data.url, self.location.origin); if (u.origin === self.location.origin) destino = u.href; } catch { /* queda la portada */ }
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ventanas => {
    for (const v of ventanas) if ('focus' in v) { if ('navigate' in v) v.navigate(destino).catch(() => {}); return v.focus(); }
    return self.clients.openWindow(destino);
  }));
});
