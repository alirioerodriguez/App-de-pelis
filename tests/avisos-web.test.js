// Pruebas de las reglas de los avisos de «Mi lista» con la web cerrada (avisosWeb.js).   Uso:  node --test
const { test } = require('node:test');
const assert = require('node:assert/strict');
const A = require('../avisosWeb.js');

const resp = (region, tipos = {}) => ({ results: { [region]: tipos } });
const netflix = { provider_id: 8, provider_name: 'Netflix' };
const disney = { provider_id: 337, provider_name: 'Disney Plus' };
const alquiler = { provider_id: 2, provider_name: 'Apple TV' };

test('plataformas: suscripción, gratis y con anuncios cuentan; alquiler y compra no; sin repetir', () => {
  const r = resp('AR', { flatrate: [netflix], free: [netflix, disney], ads: [], rent: [alquiler], buy: [alquiler] });
  assert.deepEqual(A.plataformasDe(r, 'AR').map((p) => p.provider_id), [8, 337]);
  assert.deepEqual(A.plataformasDe(r, 'MX'), []);
  assert.deepEqual(A.plataformasDe(null, 'AR'), []);
});

test('avisa solo cuando pasa de «no estaba» a «ya está»', () => {
  const sub = { region: 'AR', mine: [], lista: [{ id: 1, media_type: 'movie', title: 'Matrix' }], disp: { movie1: false } };
  const r = A.revisar(sub, { movie1: resp('AR', { flatrate: [netflix] }) });
  assert.equal(r.avisos.length, 1);
  assert.equal(r.avisos[0].plataforma, 'Netflix');
  assert.equal(r.disp.movie1, true);
  // la próxima vez ya estaba: no vuelve a avisar
  assert.equal(A.revisar({ ...sub, disp: r.disp }, { movie1: resp('AR', { flatrate: [netflix] }) }).avisos.length, 0);
});

test('nunca visto antes: se anota sin avisar (no hay con qué comparar)', () => {
  const sub = { region: 'AR', mine: [], lista: [{ id: 2, media_type: 'tv', title: 'Dark' }], disp: {} };
  const r = A.revisar(sub, { tv2: resp('AR', { flatrate: [netflix] }) });
  assert.equal(r.avisos.length, 0);
  assert.equal(r.disp.tv2, true);
});

test('si la persona marcó sus plataformas, solo avisa de las suyas', () => {
  const base = { region: 'AR', lista: [{ id: 3, media_type: 'movie', title: 'Coco' }], disp: { movie3: false } };
  const prov = { movie3: resp('AR', { flatrate: [netflix] }) };
  assert.equal(A.revisar({ ...base, mine: [337] }, prov).avisos.length, 0); // tiene Disney+, no Netflix
  assert.equal(A.revisar({ ...base, mine: [8] }, prov).avisos.length, 1);
  assert.equal(A.revisar({ ...base, mine: [337] }, prov).disp.movie3, true); // igual se anota que ya está en alguna
});

test('un título que no se pudo consultar no se toca', () => {
  const sub = { region: 'AR', mine: [], lista: [{ id: 4, media_type: 'movie', title: 'X' }], disp: { movie4: false } };
  const r = A.revisar(sub, { movie4: null });
  assert.deepEqual(r.disp, { movie4: false });
  assert.equal(r.avisos.length, 0);
});

test('mensaje: uno solo o un resumen, nunca una notificación por título', () => {
  const av = (n) => ({ titulo: `T${n}`, plataforma: 'Netflix', id: n, media_type: 'movie' });
  assert.equal(A.mensaje([], 'AR'), null);
  assert.match(A.mensaje([av(1)], 'AR').body, /«T1» llegó a Netflix/);
  const m = A.mensaje([av(1), av(2), av(3), av(4)], 'AR');
  assert.match(m.body, /4 títulos.*«T1», «T2» y 2 más/);
  assert.equal(m.tag, 'mi-lista');
});

test('suscripción que llega de afuera: se valida y se recorta', () => {
  const buena = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: { p256dh: 'p', auth: 'a' }, region: 'AR', mine: [8, 'x', -1, 337], lista: [{ id: 1, media_type: 'movie', title: 'A\u0000B' }, { id: 'x', media_type: 'movie' }, { id: 2, media_type: 'persona' }], disp: { movie1: false, malo: true, tv2: 'si' } };
  const l = A.limpiarSuscripcion(buena);
  assert.deepEqual(l.mine, [8, 337]);
  assert.deepEqual(l.lista, [{ id: 1, media_type: 'movie', title: 'AB' }]);
  assert.deepEqual(l.disp, { movie1: false });
  assert.equal(A.limpiarSuscripcion({ ...buena, endpoint: 'http://inseguro.example/x' }), null);
  assert.equal(A.limpiarSuscripcion({ ...buena, region: 'arg' }), null);
  assert.equal(A.limpiarSuscripcion({ ...buena, keys: {} }), null);
  assert.equal(A.limpiarSuscripcion(null), null);
  assert.equal(A.limpiarSuscripcion({ ...buena, lista: Array.from({ length: 200 }, (_, i) => ({ id: i + 1, media_type: 'tv', title: 't' })) }).lista.length, A.MAX_TITULOS);
});
