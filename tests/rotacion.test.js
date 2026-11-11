// Pruebas de la rotación de «Estrenos recientes» (rotacion.js): que cambien entre visitas sin perder lo popular.   Uso:  node --test
const { test } = require('node:test');
const assert = require('node:assert/strict');
const R = require('../rotacion.js');

const semilla = (s) => () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const DIA = 86_400_000;
// 40 películas y 40 series, de más a menos populares, todas con imagen de fondo
const pool = [
  ...Array.from({ length: 40 }, (_, i) => ({ id: i + 1, media_type: 'movie', popularity: 1000 - i * 10, backdrop_path: '/b.jpg' })),
  ...Array.from({ length: 40 }, (_, i) => ({ id: i + 1, media_type: 'tv', popularity: 995 - i * 10, backdrop_path: '/b.jpg' })),
];
const claves = (l) => l.map(R.clave);

test('elige 8 distintos, sin repetir dentro de la misma tanda', () => {
  const l = R.elegirEstrenos({ candidatos: pool, azar: semilla(1) });
  assert.equal(l.length, 8);
  assert.equal(new Set(claves(l)).size, 8);
});

test('«Todo» mezcla películas y series (4 y 4)', () => {
  const l = R.elegirEstrenos({ candidatos: pool, azar: semilla(2) });
  assert.equal(l.filter((x) => x.media_type === 'movie').length, 4);
  assert.equal(l.filter((x) => x.media_type === 'tv').length, 4);
});

test('con un solo tipo (solo películas) elige las 8 de ese tipo', () => {
  const l = R.elegirEstrenos({ candidatos: pool.filter((x) => x.media_type === 'movie'), azar: semilla(3) });
  assert.equal(l.length, 8);
  assert.ok(l.every((x) => x.media_type === 'movie'));
});

test('antes eran siempre los mismos 8; ahora, en 20 visitas aparecen muchos más títulos', () => {
  let vistos = {};
  const todos = new Set();
  let ahora = Date.UTC(2026, 10, 10);
  for (let v = 0; v < 20; v++) {
    const l = R.elegirEstrenos({ candidatos: pool, vistos, ahora, azar: semilla(100 + v) });
    claves(l).forEach((k) => todos.add(k));
    vistos = R.anotar(vistos, l, ahora);
    ahora += 6 * 3_600_000; // una visita cada 6 horas
  }
  assert.ok(todos.size >= 45, `títulos distintos en 20 visitas: ${todos.size}`);
});

test('lo que se mostró recién casi no vuelve en la visita siguiente', () => {
  const ahora = Date.UTC(2026, 10, 10);
  let repetidos = 0, visitas = 0;
  for (let s = 1; s <= 200; s++) {
    const a = R.elegirEstrenos({ candidatos: pool, ahora, azar: semilla(s) });
    const vistos = R.anotar({}, a, ahora - 2 * 3_600_000);
    const b = R.elegirEstrenos({ candidatos: pool, vistos, ahora, azar: semilla(s + 5000) });
    repetidos += claves(b).filter((k) => claves(a).includes(k)).length;
    visitas++;
  }
  assert.ok(repetidos / visitas < 1, `repetidos por visita: ${repetidos / visitas}`); // de 8, menos de 1 en promedio
});

test('lo más popular sigue saliendo más seguido que lo del fondo', () => {
  const cuenta = new Map();
  for (let s = 1; s <= 400; s++) for (const k of claves(R.elegirEstrenos({ candidatos: pool, azar: semilla(s) }))) cuenta.set(k, (cuenta.get(k) || 0) + 1);
  assert.ok(cuenta.get('movie1') > cuenta.get('movie40') * 2, `${cuenta.get('movie1')} vs ${cuenta.get('movie40')}`);
  assert.ok(cuenta.get('movie40') > 0, 'los de abajo también entran');
});

test('los que no tienen imagen de fondo casi no salen y van al final', () => {
  const sin = pool.map((x) => (x.id % 2 ? { ...x, backdrop_path: null } : x));
  const l = R.elegirEstrenos({ candidatos: sin, azar: semilla(8) });
  const primerSin = l.findIndex((x) => !x.backdrop_path);
  assert.ok(primerSin === -1 || l.slice(primerSin).every((x) => !x.backdrop_path));
});

test('con pocos candidatos devuelve los que hay, y sin candidatos, nada', () => {
  assert.equal(R.elegirEstrenos({ candidatos: pool.slice(0, 3), azar: semilla(1) }).length, 3);
  assert.deepEqual(R.elegirEstrenos({ candidatos: [] }), []);
  assert.deepEqual(R.elegirEstrenos({ candidatos: undefined }), []);
  const rep = R.elegirEstrenos({ candidatos: [pool[0], pool[0], pool[1]], azar: semilla(1) });
  assert.equal(rep.length, 2); // el repetido cuenta una vez
});

test('la penalidad baja la probabilidad de lo reciente y vuelve a la normalidad después de una semana', () => {
  assert.equal(R.penalidad(null), 1);
  assert.ok(R.penalidad(DIA / 2) < R.penalidad(2 * DIA));
  assert.ok(R.penalidad(2 * DIA) < R.penalidad(5 * DIA));
  assert.equal(R.penalidad(8 * DIA), 1);
});

test('la memoria no crece sin límite y olvida lo de hace más de 30 días', () => {
  const ahora = Date.UTC(2026, 10, 10);
  const muchos = Array.from({ length: 500 }, (_, i) => ({ id: i, media_type: 'movie' }));
  assert.equal(Object.keys(R.anotar({}, muchos, ahora)).length, 200);
  const viejo = R.anotar({ movie1: ahora - 40 * DIA }, [{ id: 2, media_type: 'tv' }], ahora);
  assert.deepEqual(Object.keys(viejo), ['tv2']);
});

test('guardar y cargar, y lo roto no rompe nada', () => {
  const g = new Map();
  const almacen = { getItem: (k) => g.get(k) ?? null, setItem: (k, v) => g.set(k, v) };
  assert.equal(R.guardar(almacen, { movie1: 5 }), true);
  assert.deepEqual(R.cargar(almacen), { movie1: 5 });
  assert.deepEqual(R.cargar({ getItem: () => '[1,2]' }), {});
  assert.deepEqual(R.cargar({ getItem: () => 'no es json' }), {});
  assert.equal(R.guardar({ setItem() { throw new Error('lleno'); } }, {}), false);
});
