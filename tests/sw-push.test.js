// Pruebas de los avisos en el service worker (sw.js): mostrar la notificación y abrir solo direcciones de la propia web.   Uso:  node --test
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function cargar() {
  const manejadores = {};
  const mostradas = [];
  const abiertas = [];
  const navegadas = [];
  let ventanas = [];
  const ctx = {
    addEventListener: (t, f) => { manejadores[t] = f; },
    skipWaiting: async () => {},
    registration: { showNotification: async (titulo, op) => { mostradas.push({ titulo, ...op }); } },
    clients: { claim: async () => {}, matchAll: async () => ventanas, openWindow: async (u) => { abiertas.push(u); } },
    caches: {}, fetch: async () => ({}), URL, Date, Promise, console, location: { origin: 'https://app.test' },
    importScripts: (f) => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx),
  };
  ctx.self = ctx;
  ctx.self.location = { origin: 'https://app.test', href: 'https://app.test/sw.js' };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8'), ctx);
  const push = async (datos) => { let p; manejadores.push({ data: datos === undefined ? null : { json: () => datos }, waitUntil: (x) => { p = x; } }); await p; };
  const tocar = async (url) => { let cerrada = false, p; manejadores.notificationclick({ notification: { close: () => { cerrada = true; }, data: { url } }, waitUntil: (x) => { p = x; } }); await p; return cerrada; };
  return { push, tocar, mostradas, abiertas, navegadas, ponerVentanas: (v) => { ventanas = v; } };
}

test('push: muestra el aviso con título, texto y la etiqueta que no se repite', async () => {
  const t = cargar();
  await t.push({ title: 'Ya se puede ver', body: '«Matrix» llegó a Netflix.', url: '/#t=movie1', tag: 'mi-lista' });
  assert.equal(t.mostradas.length, 1);
  assert.equal(t.mostradas[0].titulo, 'Ya se puede ver');
  assert.equal(t.mostradas[0].tag, 'mi-lista');
  assert.equal(t.mostradas[0].data.url, '/#t=movie1');
});

test('push: sin datos o con texto largo igual muestra algo razonable', async () => {
  const t = cargar();
  await t.push(undefined);
  assert.equal(t.mostradas[0].titulo, 'VeoMás');
  await t.push({ title: 'x'.repeat(500), body: 'y'.repeat(900) });
  assert.equal(t.mostradas[1].titulo.length, 80);
  assert.equal(t.mostradas[1].body.length, 200);
});

test('tocar el aviso: abre la web si no estaba abierta, y la cierra el aviso', async () => {
  const t = cargar();
  assert.equal(await t.tocar('/#t=movie1'), true);
  assert.deepEqual(t.abiertas, ['https://app.test/#t=movie1']);
});

test('tocar el aviso: nunca abre una dirección de otro sitio', async () => {
  const t = cargar();
  await t.tocar('https://evil.example/robar');
  assert.equal(new URL(t.abiertas[0]).origin, 'https://app.test');
  await t.tocar('javascript:alert(1)');
  assert.equal(new URL(t.abiertas[1]).origin, 'https://app.test');
});

test('tocar el aviso: si la web ya está abierta, la enfoca y la lleva ahí', async () => {
  const t = cargar();
  const visitas = [];
  t.ponerVentanas([{ focus: async () => { visitas.push('focus'); }, navigate: async (u) => { visitas.push(u); } }]);
  await t.tocar('/#t=tv2');
  assert.deepEqual(visitas, ['https://app.test/#t=tv2', 'focus']);
  assert.equal(t.abiertas.length, 0);
});
