// Semáforo de disponibilidad (semaforo.js) y atribuciones obligatorias de JustWatch y TMDB en index.html.   Uso:  node --test
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { semaforo, clase } = require('../semaforo.js');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const prov = (id) => ({ provider_id: id, provider_name: `P${id}` });

test('semáforo: suscripción, gratis, alquiler y compra salen de las categorías de TMDB', () => {
  assert.equal(semaforo({ flatrate: [prov(8)] }), 'suscripcion');
  assert.equal(semaforo({ ads: [prov(9)] }), 'suscripcion');
  assert.equal(semaforo({ free: [prov(9)] }), 'suscripcion');
  assert.equal(semaforo({ rent: [prov(1)] }), 'pago');
  assert.equal(semaforo({ buy: [prov(1)] }), 'pago');
  assert.equal(semaforo({ flatrate: [prov(8)], rent: [prov(1)] }), 'suscripcion'); // la suscripción gana al alquiler
  assert.equal(semaforo({}), 'bloqueada');
  assert.equal(semaforo({ rent: [] }), 'bloqueada');
  assert.equal(semaforo(null), 'sin-datos');
});

test('semáforo: «tengo» solo si la plataforma de suscripción es una de las suyas (alquilar en la suya no cuenta)', () => {
  assert.equal(semaforo({ flatrate: [prov(8), prov(337)] }, { miasIds: new Set([337]) }), 'tengo');
  assert.equal(semaforo({ flatrate: [prov(8)] }, { miasIds: new Set([337]) }), 'suscripcion');
  assert.equal(semaforo({ rent: [prov(337)] }, { miasIds: new Set([337]) }), 'pago');
});

test('semáforo: cines y próximamente solo para películas y solo si no hay otra opción', () => {
  assert.equal(semaforo({}, { enCines: true }), 'cines');
  assert.equal(semaforo({}, { proximamente: true }), 'pronto');
  assert.equal(semaforo({}, { enCines: true, esPelicula: false }), 'bloqueada');
  assert.equal(semaforo({ rent: [prov(1)] }, { enCines: true }), 'pago');
});

test('colores: el rosa nunca es semáforo; con plataformas elegidas, la suscripción ajena es ámbar', () => {
  assert.equal(clase('tengo', true), 'yes');
  assert.equal(clase('suscripcion', true), 'sub');
  assert.equal(clase('suscripcion', false), 'yes');
  assert.equal(clase('pago', false), 'pay');
  assert.equal(clase('bloqueada', false), 'lockd');
  assert.equal(clase('sin-datos', false), 'no');
});

test('index.html usa el semáforo y sw.js lo guarda para usar sin conexión', () => {
  assert.match(html, /<script src="semaforo\.js"><\/script>/);
  assert.match(html, /SemaforoVeo\.semaforo\(/);
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8'), /'\.\/semaforo\.js'/);
});

test('atribución de JustWatch: logo y enlace bajo el veredicto', () => {
  assert.match(html, /class="jw-attr" href="\$\{jwUrl\(title\)\}"/);
  assert.match(html, /LOGO_JW = 'https:\/\/widget\.justwatch\.com\/assets\/JW_logo_color_10px\.svg'/);
  assert.ok(html.indexOf('${verdict}') < html.indexOf('class="jw-attr"'), 'el enlace va debajo del veredicto');
});

test('aviso de TMDB en «legal»: texto exacto y logo más chico que el propio', () => {
  assert.ok(html.includes('This product uses the TMDB API but is not endorsed or certified by TMDB.'));
  assert.match(html, /\.legal \.tmdb-aviso img \{ height: 12px/);
  assert.match(html, /themoviedb\.org\/assets\/2\/v4\/logos\/v2\/blue_short-[0-9a-f]+\.svg/);
});

// ---------- Semáforo: ícono + texto + contraste (pauta WCAG 1.4.1 y 1.4.3) ----------
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const mezcla = (fg, a, bg) => fg.map((v, i) => v * a + bg[i] * (1 - a));
const contraste = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

test('contraste: el texto de cada nivel del semáforo llega a 4,5:1 sobre su cajita en el fondo oscuro', () => {
  const vars = Object.fromEntries([...html.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6});/gi)].map((m) => [m[1], m[2]]));
  const fondo = hex(vars['bg-2']);
  for (const clase of ['yes', 'sub', 'pay', 'lockd', 'no']) {
    const css = new RegExp('\\.verdict\\.' + clase + ' \\{ background: rgba\\((\\d+),(\\d+),(\\d+),([.\\d]+)\\);[^}]*color: (#[0-9a-f]{6}|var\\(--[\\w-]+\\))', 'i').exec(html);
    assert.ok(css, `falta el estilo de .verdict.${clase}`);
    const color = css[5].startsWith('var(') ? vars[css[5].slice(6, -1)] : css[5];
    const cajita = mezcla([+css[1], +css[2], +css[3]], +css[4], fondo);
    assert.ok(contraste(hex(color), cajita) >= 4.5, `${clase}: ${contraste(hex(color), cajita).toFixed(2)}:1`);
  }
});

test('cada veredicto con datos lleva ícono y texto, no solo color', () => {
  const lineas = html.split('\n').filter((l) => l.includes('verdict = `<div class="verdict'));
  assert.equal(lineas.length, 6); // tengo, suscripción, pago, cines, próximamente, bloqueada
  for (const l of lineas) assert.match(l, /<span class="vi" aria-hidden="true">[^<]+<\/span><span class="vt">/, l.slice(0, 80));
});
