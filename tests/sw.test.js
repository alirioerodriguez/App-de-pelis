// Pruebas del service worker (sw.js) con un «self», cachés y fetch falsos: no hay red real.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const T = require('../tmdbDatos.js');
const ahoraFijo = Date.UTC(2026, 10, 10);
// La versión sale de sw.js: al subirla (cada cambio de la web) las pruebas no se rompen.
const V = /const VERSION = '([^']+)'/.exec(fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8'))[1];

function cargar({ cachesExistentes = [], fetchFn, hoy = ahoraFijo } = {}) {
  const manejadores = {};
  const almacen = new Map(cachesExistentes.map(n => [n, new Map()]));
  const borrados = [];
  const caches = {
    keys: async () => [...almacen.keys()],
    delete: async n => { borrados.push(n); return almacen.delete(n); },
    open: async n => {
      if (!almacen.has(n)) almacen.set(n, new Map());
      const m = almacen.get(n);
      return { match: async r => m.get(r.url), put: async (r, resp) => { m.set(r.url, resp); }, keys: async () => [...m.keys()].map(url => ({ url })), delete: async () => true };
    },
    match: async r => { for (const m of almacen.values()) if (m.has(r.url)) return m.get(r.url); return undefined; },
  };
  const FechaFalsa = class extends Date { static now() { return hoy; } };
  const ctx = {
    addEventListener: (t, f) => { manejadores[t] = f; }, skipWaiting: async () => {}, clients: { claim: async () => {} },
    caches, fetch: fetchFn || (async () => ({ ok: true, type: 'basic', clone() { return this; } })), URL, Date: FechaFalsa, Promise, console,
    location: { origin: 'https://app.test' },
    importScripts: f => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx),
  };
  ctx.self = ctx; // en un service worker, self es el global
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8'), ctx);
  const pedir = async url => {
    let resp, esperas = [];
    manejadores.fetch({ request: { url, method: 'GET' }, respondWith: p => { resp = p; }, waitUntil: p => esperas.push(p) });
    return { resp: resp === undefined ? undefined : await resp, esperas: await Promise.all(esperas) };
  };
  const activar = async () => { let p; manejadores.activate({ waitUntil: x => { p = x; } }); await p; };
  return { almacen, borrados, pedir, activar };
}

test('sw: la API de TMDB y de otros nunca pasa por el caché', async () => {
  const { pedir, almacen } = cargar();
  assert.equal((await pedir('https://app.test/api/tmdb?p=/movie/1')).resp, undefined);
  assert.equal((await pedir('https://api.wikidata.org/x')).resp, undefined);
  assert.equal(almacen.size, 0);
});

test('sw: las imágenes de TMDB se guardan en el caché de la tanda actual', async () => {
  const { pedir, almacen } = cargar();
  await pedir('https://image.tmdb.org/t/p/w342/a.jpg');
  const actual = T.cacheImagenes(V, ahoraFijo);
  assert.deepEqual([...almacen.keys()], [actual]);
  assert.equal(almacen.get(actual).size, 1);
});

test('sw: una imagen guardada en la tanda anterior se sigue usando sin pedirla de nuevo', async () => {
  const previa = T.cacheImagenes(V, ahoraFijo - T.TANDA_MS);
  let pedidos = 0;
  const { pedir, almacen } = cargar({ cachesExistentes: [previa], fetchFn: async () => { pedidos++; return { ok: true, clone() { return this; } }; } });
  const guardada = { ok: true, tag: 'vieja' };
  almacen.get(previa).set('https://image.tmdb.org/t/p/w342/a.jpg', guardada);
  const { resp } = await pedir('https://image.tmdb.org/t/p/w342/a.jpg');
  assert.equal(resp, guardada);
  assert.equal(pedidos, 0);
});

test('sw: al activarse borra los cachés de imágenes de hace más de 2 tandas y los de versiones viejas', async () => {
  const actual = T.cacheImagenes(V, ahoraFijo);
  const previa = T.cacheImagenes(V, ahoraFijo - T.TANDA_MS);
  const viejo = T.cacheImagenes(V, ahoraFijo - 4 * T.TANDA_MS);
  const { activar, almacen } = cargar({ cachesExistentes: [actual, previa, viejo, 'img-v0', 'shell-v0', `shell-${V}`] });
  await activar();
  assert.deepEqual([...almacen.keys()].sort(), [actual, previa, `shell-${V}`].sort());
});

test('sw: si el service worker sigue vivo meses sin reactivarse, igual limpia al primer pedido de imagen', async () => {
  const viejo = T.cacheImagenes(V, ahoraFijo - 5 * T.TANDA_MS);
  const { pedir, almacen } = cargar({ cachesExistentes: [viejo] });
  const { esperas } = await pedir('https://image.tmdb.org/t/p/w92/b.jpg');
  assert.equal(esperas.length, 1);
  assert.equal(almacen.has(viejo), false);
});

test('sw: tmdbDatos.js está en los archivos que se guardan para andar sin internet', () => {
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8'), /SHELL_FILES = \[[^\]]*tmdbDatos\.js/);
});
