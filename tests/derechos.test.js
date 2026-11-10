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

test('revisión: las fuentes viejas se detectan para volver a verificarlas cada temporada', () => {
  assert.deepEqual(D.vencidas('2026-11-10'), []);
  const tarde = D.vencidas('2027-09-01');
  assert.ok(tarde.includes('rugby.test') && tarde.includes('voley'), tarde.join(','));
  assert.ok(D.sinFuente().includes('arg.1')); // lo de antes todavía no tiene fuente anotada
  assert.ok(!D.sinFuente().includes('rugby.test'));
});
