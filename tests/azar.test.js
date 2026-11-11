// Pruebas de «Elegí por mí» (azar.js): que no se repita nunca un título en pocas tiradas.   Uso:  node --test
const { test } = require('node:test');
const assert = require('node:assert/strict');
const A = require('../azar.js');

// Azar fijo y repetible (mulberry32): las pruebas no dependen de la suerte.
const semilla = (s) => () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const catalogo = (n, tipo = 'movie') => Array.from({ length: n }, (_, i) => ({ id: i + 1, media_type: tipo }));

test('en 10 tiradas seguidas nunca sale el mismo título dos veces (mil sesiones distintas)', () => {
  for (let s = 1; s <= 1000; s++) {
    const a = A.crear({ azar: semilla(s) });
    const salidos = [];
    for (let i = 0; i < 10; i++) salidos.push(A.clave(a.elegir(catalogo(60)).elegida));
    assert.equal(new Set(salidos).size, 10, `sesión ${s}: ${salidos.join(',')}`);
  }
});

test('sigue sin repetir mientras haya títulos nuevos: 60 tiradas sobre 60 títulos salen todos una vez', () => {
  const a = A.crear({ azar: semilla(7) });
  const salidos = new Set();
  for (let i = 0; i < 60; i++) salidos.add(A.clave(a.elegir(catalogo(60)).elegida));
  assert.equal(salidos.size, 60);
});

test('cuando ya salió todo se vuelve a empezar, pero sin repetir lo más reciente', () => {
  const a = A.crear({ azar: semilla(3) });
  const poco = catalogo(8);
  const orden = [];
  for (let i = 0; i < 8; i++) orden.push(a.elegir(poco).elegida.id);
  assert.equal(new Set(orden).size, 8);
  const r = a.elegir(poco);
  assert.equal(r.reinicio, true);
  assert.ok(!orden.slice(-4).includes(r.elegida.id), 'no repite uno de los últimos 4');
  assert.equal(a.elegir([]), null);
});

test('con un solo candidato lo devuelve igual (no se queda sin respuesta)', () => {
  const a = A.crear({ azar: semilla(1) });
  assert.equal(a.elegir(catalogo(1)).elegida.id, 1);
  assert.equal(a.elegir(catalogo(1)).elegida.id, 1);
});

test('lo que salió se acuerda aunque se recargue la página', () => {
  const guardado = new Map();
  const almacen = { getItem: (k) => guardado.get(k) ?? null, setItem: (k, v) => guardado.set(k, v) };
  let a = A.crear({ azar: semilla(11), estado: A.cargar(almacen) });
  const primeros = [];
  for (let i = 0; i < 5; i++) primeros.push(A.clave(a.elegir(catalogo(60)).elegida));
  A.guardar(almacen, a.estado());
  a = A.crear({ azar: semilla(11), estado: A.cargar(almacen) }); // «recarga»: mismo azar, pero con memoria
  const despues = [];
  for (let i = 0; i < 5; i++) despues.push(A.clave(a.elegir(catalogo(60)).elegida));
  assert.equal(new Set([...primeros, ...despues]).size, 10);
});

test('lo guardado roto o raro no rompe nada', () => {
  assert.deepEqual(A.cargar({ getItem: () => '{no es json', setItem() {} }), {});
  assert.deepEqual(A.cargar({ getItem: () => null }), {});
  assert.equal(A.guardar({ setItem() { throw new Error('lleno'); } }, {}), false);
  const a = A.crear({ estado: { vistos: [1, null, 'movie1'], paginas: { f: ['x', 3, 99, 0] } } });
  assert.deepEqual(a.estado().vistos, ['movie1']);
  assert.deepEqual(a.estado().paginas.f, [3]);
});

test('páginas de TMDB: no repite hasta usar todas, y después empieza de nuevo', () => {
  const a = A.crear({ azar: semilla(5), paginasMax: 6 });
  const usadas = Array.from({ length: 6 }, () => a.paginaNueva('f1'));
  assert.deepEqual([...usadas].sort(), [1, 2, 3, 4, 5, 6]);
  const siguiente = a.paginaNueva('f1');
  assert.ok(siguiente >= 1 && siguiente <= 6);
  assert.deepEqual(a.estado().paginas.f1, [siguiente]);
  assert.notDeepEqual(a.paginaNueva('f2'), undefined); // otros filtros llevan su propia cuenta
});

test('el universo es mucho más grande que antes: 15 páginas en vez de 3', () => {
  assert.equal(A.PAGINAS, 15);
  assert.equal(A.MEMORIA, 60);
});

test('lo guardado no crece sin límite aunque haya muchos filtros distintos', () => {
  const a = A.crear({ azar: semilla(9) });
  for (let i = 0; i < 100; i++) a.paginaNueva('filtro' + i);
  assert.ok(Object.keys(a.estado().paginas).length <= 20);
});
