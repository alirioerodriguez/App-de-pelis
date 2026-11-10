// Pruebas de api/push.js (suscribirse) y api/push-avisos.js (el cron), con Redis, TMDB y web-push falsos: sin red.   Uso:  node --test
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

// ---- Redis falso (Upstash REST) y TMDB falso, los dos por fetch ----
let memoria, tmdbRespuestas, enviadas, errorEnvio;
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u.startsWith('https://redis.test')) {
    const [c, ...a] = JSON.parse(init.body);
    let result = null;
    if (c === 'GET') result = memoria.get(a[0]) ?? null;
    else if (c === 'SET') { memoria.set(a[0], a[1]); result = 'OK'; }
    else if (c === 'DEL') { result = memoria.delete(a[0]) ? 1 : 0; }
    else if (c === 'SADD') { const s = memoria.get(a[0]) ?? new Set(); s.add(a[1]); memoria.set(a[0], s); result = 1; }
    else if (c === 'SREM') { memoria.get(a[0])?.delete(a[1]); result = 1; }
    else if (c === 'SMEMBERS') result = [...(memoria.get(a[0]) ?? [])];
    return { ok: true, json: async () => ({ result }) };
  }
  if (u.startsWith('https://api.themoviedb.org')) {
    const m = /\/(movie|tv)\/(\d+)\/watch\/providers/.exec(u);
    const r = tmdbRespuestas[`${m[1]}${m[2]}`];
    if (r === undefined) return { ok: false, status: 404, json: async () => ({}) };
    return { ok: true, json: async () => r };
  }
  throw new Error('fetch inesperado: ' + u);
};

// ---- web-push falso ----
const cargar = Module._load;
Module._load = function (pedido, ...resto) {
  if (pedido === 'web-push') {
    return {
      setVapidDetails() {},
      async sendNotification(sub, payload) {
        if (errorEnvio) throw Object.assign(new Error('x'), { statusCode: errorEnvio });
        enviadas.push({ sub, payload: JSON.parse(payload) });
      },
    };
  }
  return cargar.call(this, pedido, ...resto);
};

process.env.UPSTASH_REDIS_REST_URL = 'https://redis.test';
process.env.UPSTASH_REDIS_REST_TOKEN = 'token';
process.env.VAPID_PUBLIC_KEY = 'PUBLICA';
process.env.VAPID_PRIVATE_KEY = 'PRIVADA';
process.env.CRON_SECRET = 'secreto';
process.env.TMDB_TOKEN = 'eyJfalso';

const push = require('../api/push.js');
const cron = require('../api/push-avisos.js');

const res = () => { const r = { code: 0, body: null, headers: {}, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; }, setHeader(k, v) { r.headers[k] = v; } }; return r; };
const pedir = async (handler, { method = 'POST', body, headers = {} } = {}) => { const r = res(); await handler({ method, body, headers: { host: 'app.test', ...headers } }, r); return r; };
const buena = (extra = {}) => ({ endpoint: 'https://push.example/abc', keys: { p256dh: 'p', auth: 'a' }, region: 'AR', mine: [], lista: [{ id: 1, media_type: 'movie', title: 'Matrix' }], disp: { movie1: false }, ...extra });

beforeEach(() => { memoria = new Map(); tmdbRespuestas = {}; enviadas = []; errorEnvio = 0; });

test('suscribirse: GET da la clave pública; POST guarda; DELETE borra', async () => {
  assert.deepEqual((await pedir(push, { method: 'GET' })).body, { clave: 'PUBLICA' });
  assert.equal((await pedir(push, { body: buena() })).code, 200);
  assert.equal(memoria.get('push:ids').size, 1);
  assert.equal((await pedir(push, { method: 'DELETE', body: { endpoint: buena().endpoint } })).code, 200);
  assert.equal(memoria.get('push:ids').size, 0);
});

test('suscribirse: rechaza lo inválido, otros orígenes y lo demasiado grande', async () => {
  assert.equal((await pedir(push, { body: { ...buena(), endpoint: 'http://no-seguro' } })).code, 400);
  assert.equal((await pedir(push, { body: buena(), headers: { origin: 'https://otro.example' } })).code, 403);
  assert.equal((await pedir(push, { body: { ...buena(), relleno: 'x'.repeat(40_000) } })).code, 413);
  assert.equal((await pedir(push, { method: 'PUT' })).code, 405);
});

test('lo que el servidor ya sabe de la disponibilidad no se pisa al volver a suscribirse', async () => {
  await pedir(push, { body: buena({ disp: { movie1: true } }) });
  await pedir(push, { body: buena({ disp: { movie1: false } }) }); // el navegador manda un dato viejo
  const guardada = JSON.parse(memoria.get(`push:s:${[...memoria.get('push:ids')][0]}`));
  assert.equal(guardada.disp.movie1, true);
});

test('sin configurar (sin VAPID o sin Redis) responde 503 y no toca nada', async () => {
  const antes = process.env.VAPID_PRIVATE_KEY;
  delete process.env.VAPID_PRIVATE_KEY;
  assert.equal((await pedir(push, { method: 'GET' })).code, 503);
  process.env.VAPID_PRIVATE_KEY = antes;
});

test('cron: solo con el secreto', async () => {
  assert.equal((await pedir(cron, { method: 'GET' })).code, 401);
  assert.equal((await pedir(cron, { method: 'GET', headers: { authorization: 'Bearer otro' } })).code, 401);
});

test('cron: avisa lo que llegó, consulta cada título una vez y guarda lo visto', async () => {
  await pedir(push, { body: buena() });
  await pedir(push, { body: buena({ endpoint: 'https://push.example/def' }) }); // otra persona, el mismo título
  tmdbRespuestas.movie1 = { results: { AR: { flatrate: [{ provider_id: 8, provider_name: 'Netflix' }] } } };
  const r = await pedir(cron, { method: 'GET', headers: { authorization: 'Bearer secreto' } });
  assert.deepEqual(r.body, { suscripciones: 2, titulos: 1, enviados: 2, borrados: 0, fallidos: 0 });
  assert.match(enviadas[0].payload.body, /Matrix.*Netflix/);
  // segunda corrida: ya estaba, no avisa de nuevo
  enviadas = [];
  await pedir(cron, { method: 'GET', headers: { authorization: 'Bearer secreto' } });
  assert.equal(enviadas.length, 0);
});

test('cron: las suscripciones vencidas (410) se borran y un título que no responde no se toca', async () => {
  await pedir(push, { body: buena() });
  tmdbRespuestas.movie1 = { results: { AR: { ads: [{ provider_id: 9, provider_name: 'Pluto TV' }] } } };
  errorEnvio = 410;
  const r = await pedir(cron, { method: 'GET', headers: { authorization: 'Bearer secreto' } });
  assert.equal(r.body.borrados, 1);
  assert.equal(memoria.get('push:ids').size, 0);

  await pedir(push, { body: buena() });
  errorEnvio = 0;
  delete tmdbRespuestas.movie1; // TMDB responde 404
  const r2 = await pedir(cron, { method: 'GET', headers: { authorization: 'Bearer secreto' } });
  assert.equal(r2.body.enviados, 0);
  const guardada = JSON.parse(memoria.get(`push:s:${[...memoria.get('push:ids')][0]}`));
  assert.equal(guardada.disp.movie1, false); // sin cambios
});
