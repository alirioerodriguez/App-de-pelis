// Pruebas de tmdbDatos.js: vencimiento máximo de 6 meses para lo que se guarda de TMDB y enlace de reserva por país.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const T = require('../tmdbDatos.js');

const AHORA = Date.UTC(2026, 10, 10);

test('lo que se guarda vence antes de los 6 meses que permite TMDB', () => {
  assert.ok(T.VIDA_MS < T.MAX_MS);
  assert.ok(T.MAX_MS <= 183 * T.DIA);
  assert.equal(T.vigente(AHORA - 10 * T.DIA, AHORA), true);
  assert.equal(T.vigente(AHORA - 149 * T.DIA, AHORA), true);
  assert.equal(T.vigente(AHORA - 150 * T.DIA, AHORA), false);
  assert.equal(T.vigente(AHORA - 200 * T.DIA, AHORA), false);
});

test('sin fecha, con fecha rara o del futuro no se considera vigente', () => {
  assert.equal(T.vigente(undefined, AHORA), false);
  assert.equal(T.vigente('ayer', AHORA), false);
  assert.equal(T.vigente(AHORA + T.DIA, AHORA), false);
});

test('sellarYFiltrar: sella lo que no tenía fecha, borra lo vencido y conserva lo vigente', () => {
  const lista = [
    { nombre: 'Matrix', tipo: 'pelicula' }, // viejo, sin fecha: empieza a contar hoy
    { nombre: 'Keanu Reeves', tipo: 'persona', en: AHORA - 20 * T.DIA },
    { nombre: 'Vencido', tipo: 'pelicula', en: AHORA - 181 * T.DIA },
    null,
  ];
  const { lista: sal, cambio } = T.sellarYFiltrar(lista, AHORA);
  assert.equal(cambio, true);
  assert.deepEqual(sal.map((x) => x.nombre), ['Matrix', 'Keanu Reeves']);
  assert.equal(sal[0].en, AHORA);
  assert.equal(sal[1].en, AHORA - 20 * T.DIA);
  assert.equal(lista[0].en, undefined, 'no muta lo que recibe');
});

test('sellarYFiltrar: si no hay nada que cambiar, avisa que no hace falta volver a guardar', () => {
  const lista = [{ nombre: 'A', en: AHORA - T.DIA }];
  assert.equal(T.sellarYFiltrar(lista, AHORA).cambio, false);
  assert.deepEqual(T.sellarYFiltrar('roto', AHORA), { lista: [], cambio: false });
});

test('imágenes: se guardan por tandas de 60 días y se borran las anteriores a la tanda previa', () => {
  const actual = T.cacheImagenes('v6', AHORA);
  const previa = T.cacheImagenes('v6', AHORA - T.TANDA_MS);
  assert.notEqual(actual, previa);
  const viejo = T.cacheImagenes('v6', AHORA - 3 * T.TANDA_MS);
  const borrar = T.cachesAborrar([actual, previa, viejo, 'img-v5', 'shell-v6'], 'v6', AHORA);
  assert.deepEqual(borrar.sort(), [viejo, 'img-v5'].sort());
  // como mucho vive la tanda actual + la anterior: menos de 6 meses
  assert.ok(2 * T.TANDA_MS < T.MAX_MS);
});

test('enlace de reserva a TMDB por país', () => {
  assert.equal(T.enlaceTmdbPorPais('movie', 550, 'AR'), 'https://www.themoviedb.org/movie/550/watch?locale=AR');
  assert.equal(T.enlaceTmdbPorPais('tv', '1399', 'mx'), 'https://www.themoviedb.org/tv/1399/watch?locale=MX');
});

test('enlace de reserva: tipo, id o país raros devuelven null (por ejemplo, los programas propios de DNEWS)', () => {
  assert.equal(T.enlaceTmdbPorPais('dn', 5, 'AR'), null);
  assert.equal(T.enlaceTmdbPorPais('movie', '5/../x', 'AR'), null);
  assert.equal(T.enlaceTmdbPorPais('movie', 5, 'ARG'), null);
  assert.equal(T.enlaceTmdbPorPais('movie', 5, ''), null);
  assert.equal(T.enlaceTmdbPorPais('movie', undefined, 'AR'), null);
});
