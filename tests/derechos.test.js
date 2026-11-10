// Pruebas de la tabla de derechos de TV (derechos.js): que cada plataforma exista en la página, que lo nuevo tenga fuente y fecha,
// y que no se invente un canal donde no hay dato.   Uso:  node --test
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const D = require('../derechos.js');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
// claves de PLAT en index.html: las líneas «    clave: { n: '…'» dentro de `const PLAT = {`
const bloque = html.slice(html.indexOf('const PLAT = {'), html.indexOf('const GRAND_SLAM'));
const PLAT = new Set([...bloque.matchAll(/^\s{4}(\w+): \{ n: /gm)].map((m) => m[1]));

test('todas las plataformas de la tabla existen en PLAT (si no, el chip no se dibuja)', () => {
  assert.ok(PLAT.size > 20, `PLAT leído: ${PLAT.size} claves`);
  for (const [liga, paises] of Object.entries(D.DERECHOS)) {
    for (const [pais, plats] of Object.entries(paises)) for (const k of plats) assert.ok(PLAT.has(k), `${liga}/${pais}: falta la plataforma «${k}»`);
  }
  for (const o of D.OTROS) for (const k of o.donde.plats) assert.ok(PLAT.has(k), `${o.id}: falta la plataforma «${k}»`);
});

test('lo nuevo tiene fuente https y fecha, y cada fuente corresponde a una entrada de la tabla', () => {
  for (const [clave, f] of Object.entries(D.FUENTES)) {
    assert.ok(D.DERECHOS[clave], `${clave}: hay fuente pero no hay entrada`);
    assert.match(f.url, /^https:\/\//, clave);
    assert.match(f.fecha, /^\d{4}-\d{2}-\d{2}$/, clave);
  }
  for (const o of D.OTROS) {
    assert.match(o.fuente.url, /^https:\/\//, o.id);
    assert.match(o.fuente.fecha, /^\d{4}-\d{2}-\d{2}$/, o.id);
  }
});

test('Rugby, Super Rugby y Serie del Caribe: solo los países con fuente, el resto queda «sin datos»', () => {
  assert.deepEqual(Object.keys(D.DERECHOS['rugby.test']), ['AR']);
  assert.deepEqual(Object.keys(D.DERECHOS['rugby.super']), ['AR']);
  assert.deepEqual(Object.keys(D.DERECHOS['beisbol.caribe']), ['MX']);
  for (const clave of ['rugby.6n', 'rugby.mundial', 'rugby.urc', 'rugby.prem', 'beisbol.dom', 'beisbol.clasico']) assert.equal(D.DERECHOS[clave], undefined, `${clave} no tiene fuente: no se inventa`);
});

test('otros deportes: vóley en Sudamérica, ciclismo en Latinoamérica, boxeo sin canal fijo', () => {
  const o = Object.fromEntries(D.OTROS.map((x) => [x.id, x]));
  assert.deepEqual(D.dondeOtro(o.voley, 'AR'), { plats: ['dsports', 'vbtv'], sinDato: false });
  assert.deepEqual(D.dondeOtro(o.voley, 'MX'), { plats: [], sinDato: true }); // la fuente es de Sudamérica
  assert.deepEqual(D.dondeOtro(o.ciclismo, 'CL').plats, ['espn', 'disney']);
  assert.equal(D.dondeOtro(o.boxeo, 'AR').sinDato, true);
  assert.match(o.boxeo.sin, /confirmalo/);
});

test('Libertadores, Champions y F1 se actualizaron con fuente: ESPN y Disney+ (y lo dudoso queda marcado)', () => {
  assert.deepEqual(D.DERECHOS['conmebol.libertadores'].CL, ['espn', 'disney']);
  assert.ok(D.DERECHOS['uefa.champions'].AR.includes('espn'));
  assert.deepEqual(D.DERECHOS['uefa.champions'].MX, ['fox', 'max']);
  assert.ok(!D.DERECHOS.f1.AR.includes('foxar'), 'F1 en Argentina es ESPN y Disney+, no Fox Sports');
  assert.ok(D.DERECHOS.f1.AR.includes('f1tv'));
  for (const k of ['arg.1', 'conmebol.libertadores', 'uefa.champions', 'f1']) assert.equal(D.FUENTES[k].porConfirmar, true, k);
});

test('LaLiga, Premier, NBA y Liga MX: actualizados con fuente, con lo dudoso marcado', () => {
  assert.deepEqual(D.DERECHOS['esp.1'].AR, ['espn', 'disney', 'dsports', 'dgo']);
  assert.ok(D.DERECHOS['eng.1'].CL.includes('espn'));
  assert.deepEqual(D.DERECHOS.nba.MX, ['espn', 'disney', 'prime', 'leaguepass']);
  assert.deepEqual(D.DERECHOS.nba.AR, ['disney', 'leaguepass']); // sin dato nuevo para Argentina
  assert.ok(D.DERECHOS['mex.1'].MX.includes('vix') && D.DERECHOS['mex.1'].MX.includes('fox'));
  assert.equal(D.FUENTES.nba.porConfirmar, true);
  assert.equal(D.FUENTES['esp.1'].porConfirmar, undefined); // LaLiga en Sudamérica tiene fuente clara
});

test('ligas locales y tenis: con fuente (Win, TNT Sports y Canal 13, L1 MAX, ESPN)', () => {
  assert.deepEqual(D.DERECHOS['chi.1'].CL, ['tntcl', 'max', 'canal13']);
  assert.deepEqual(D.DERECHOS['col.1'].CO, ['win']);
  assert.deepEqual(D.DERECHOS['per.1'].PE, ['l1max']);
  assert.ok(D.DERECHOS.tenis.AR.includes('espn') && D.DERECHOS.tenis.MX.join() === 'disney');
  assert.equal(D.FUENTES.tenis.porConfirmar, true);
  for (const k of ['col.1', 'chi.1', 'per.1']) assert.ok(D.FUENTES[k], k);
});

test('revisión: las fuentes viejas se detectan para volver a verificarlas cada temporada', () => {
  assert.deepEqual(D.vencidas('2026-11-10'), []);
  const tarde = D.vencidas('2027-09-01');
  assert.ok(tarde.includes('rugby.test') && tarde.includes('voley'), tarde.join(','));
  assert.deepEqual(D.sinFuente().sort(), ['conmebol.sudamericana', 'mlb', 'nhl', 'uru.1']); // lo único que sigue sin fuente anotada
  void 0; // lo de antes (MLB, NHL, tenis y las ligas chicas) todavía no tiene fuente anotada
  assert.ok(!D.sinFuente().includes('rugby.test'));
});
