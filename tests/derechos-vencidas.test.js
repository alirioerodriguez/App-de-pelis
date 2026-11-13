// Prueba del aviso semanal de fuentes vencidas de la tabla de derechos (scripts/derechos-vencidas.mjs).   Uso:  node --test
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const cargar = () => import(pathToFileURL(path.join(__dirname, '..', 'scripts', 'derechos-vencidas.mjs')).href);

test('hoy no hay fuentes vencidas, y dentro de dos años sí', async () => {
  const { informe } = await cargar();
  const hoy = informe('2026-11-14');
  assert.deepEqual(hoy.vencidas, []);
  assert.match(hoy.texto, /Ninguna fuente tiene más de 9 meses/);
  const despues = informe('2028-11-14');
  assert.ok(despues.vencidas.length > 0);
  assert.match(despues.texto, /hay que volver a verificarlas/);
});
