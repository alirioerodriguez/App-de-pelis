// Modo grupal «¿Qué vemos hoy?» y lector del RSS de Letterboxd.
// Correr con: node --test tests/*.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Q = require('../queVemosHoy.js');
const L = require('../api/letterboxd.js');

test('el link grupal se arma y se lee sin perder nada', () => {
  const token = Q.codificar({ pais: 'ar', plataformas: [8, 384], generos: [28, 35], menosDeDosHoras: true, miLista: [562, 771] });
  assert.match(token, /^[A-Za-z0-9_-]+$/); // seguro para pegar en una URL
  assert.deepEqual(Q.decodificar(token), { pais: 'AR', plataformas: [8, 384], generos: [28, 35], menosDeDosHoras: true, miLista: [562, 771] });
  assert.equal(Q.decodificar('esto-no-es-un-token'), null);
  assert.equal(Q.decodificar(''), null);
});

test('primero lo que está en Mi lista, y respeta «menos de 2 horas»', () => {
  const titulos = [
    { id: 100, runtime: 150, plataformas: [8], popularity: 99 },
    { id: 200, runtime: 105, plataformas: [8], popularity: 90 },
    { id: 300, runtime: 98, plataformas: [8], popularity: 40 },
    { id: 400, runtime: 90, plataformas: [119], popularity: 80 }, // solo la tiene la persona 1
  ];
  const r = Q.coincidencias({ titulos, p1: [8, 119], p2: [8, 337], menosDeDosHoras: true, lista1: [300] });
  assert.deepEqual(r.titulos.map((t) => t.id), [300, 200]);
  assert.equal(r.sinPlataformaEnComun, false);
  // En el mismo sillón vale cualquiera de las dos cuentas
  const juntos = Q.coincidencias({ titulos, p1: [8, 119], p2: [8, 337], juntos: true, menosDeDosHoras: true });
  assert.deepEqual(juntos.titulos.map((t) => t.id), [200, 400, 300]);
});

test('sin plataformas en común muestra todo y lo avisa', () => {
  const r = Q.coincidencias({ titulos: [{ id: 1, plataformas: [8] }, { id: 2, plataformas: [337] }], p1: [8], p2: [337] });
  assert.equal(r.sinPlataformaEnComun, true);
  assert.equal(r.titulos.length, 2);
});

test('Letterboxd: saca el id de TMDB de cada película del RSS, sin repetir', () => {
  const xml = `<rss><channel>
    <item><letterboxd:filmTitle>Die Hard</letterboxd:filmTitle><letterboxd:filmYear>1988</letterboxd:filmYear><tmdb:movieId>562</tmdb:movieId></item>
    <item><letterboxd:filmTitle>Die Hard</letterboxd:filmTitle><tmdb:movieId>562</tmdb:movieId></item>
    <item><title>Una lista</title></item>
  </channel></rss>`;
  assert.deepEqual(L.extraer(xml), [{ tmdbId: 562, titulo: 'Die Hard', anio: 1988 }]);
  assert.deepEqual(L.extraer(''), []);
});

test('Letterboxd: solo acepta nombres de usuario válidos', () => {
  assert.equal(L.usuarioValido('@alirio_cine'), 'alirio_cine');
  assert.equal(L.usuarioValido('../../etc'), null);
  assert.equal(L.usuarioValido('a'), null);
});
