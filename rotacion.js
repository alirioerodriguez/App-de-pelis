// Rotación de los «Estrenos recientes» (el carrusel de arriba). Antes se tomaban los 8 más populares de la primera página de
// TMDB: eran siempre los mismos. Ahora se arma un conjunto más grande (3 páginas por tipo) y se eligen 8 con un sorteo que:
//  - favorece lo popular (para que siga habiendo estrenos que la gente conoce) pero deja entrar a los que están más abajo;
//  - le baja la probabilidad a lo que ya se mostró hace poco (se acuerda en el dispositivo, así que cambia entre visitas);
//  - con «Todo» mezcla películas y series; prefiere los que traen imagen de fondo (se ven mejor en el carrusel).
// Funciones puras: el azar y la hora se pasan de afuera, las pruebas usan un azar fijo.
//
// Sirve en el navegador (queda como `Rotacion`) y en Node (`require('./rotacion.js')`).
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.Rotacion = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  const DIA = 86_400_000;
  const CLAVE_GUARDADO = 'veomas_estrenos_v1';
  const MAX_VISTOS = 200;
  const clave = (t) => `${t.media_type}${t.id}`;

  /** Cuánto pesa haber sido mostrado hace `ms` milisegundos: lo de hoy casi no vuelve, lo de hace una semana ya es normal. */
  function penalidad(ms) {
    if (ms == null || !Number.isFinite(ms) || ms < 0) return 1;
    if (ms < DIA) return 0.04;
    if (ms < 3 * DIA) return 0.2;
    if (ms < 7 * DIA) return 0.55;
    return 1;
  }

  /** Muestreo con pesos y sin repetir (Efraimidis–Spirakis): cada uno recibe una «clave» u^(1/peso) y se toman las mayores. */
  function muestrear(items, pesos, n, azar) {
    return items
      .map((x, i) => ({ x, k: Math.pow(Math.max(azar(), 1e-12), 1 / Math.max(pesos[i], 1e-9)) }))
      .sort((a, b) => b.k - a.k)
      .slice(0, n)
      .map((o) => o.x);
  }

  /**
   * candidatos: [{ id, media_type, popularity, backdrop_path }] (da igual el orden); vistos: { clave: ms de la última vez que se mostró }.
   * Devuelve hasta `n` títulos, sin repetir, con los que traen imagen primero.
   */
  function elegirEstrenos({ candidatos, vistos = {}, n = 8, azar = Math.random, ahora = Date.now() }) {
    const unicos = [];
    const ya = new Set();
    for (const c of candidatos || []) { const k = clave(c); if (c && c.id != null && !ya.has(k)) { ya.add(k); unicos.push(c); } }
    if (!unicos.length) return [];
    const porPop = unicos.slice().sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    const rango = new Map(porPop.map((c, i) => [clave(c), i]));
    const peso = (c) => (1 / (1 + 0.06 * rango.get(clave(c)))) * (c.backdrop_path ? 1 : 0.2) * penalidad(vistos[clave(c)] == null ? null : ahora - vistos[clave(c)]);

    const tipos = [...new Set(unicos.map((c) => c.media_type))];
    let elegidos;
    if (tipos.length > 1) {
      // «Todo»: la mitad de cada tipo (si un tipo tiene menos, el otro completa)
      const grupos = tipos.map((t) => unicos.filter((c) => c.media_type === t));
      const cuota = grupos.map((g) => Math.min(g.length, Math.ceil(n / grupos.length)));
      elegidos = grupos.flatMap((g, i) => muestrear(g, g.map(peso), cuota[i], azar));
      if (elegidos.length < n) {
        const resto = unicos.filter((c) => !elegidos.includes(c));
        elegidos = elegidos.concat(muestrear(resto, resto.map(peso), n - elegidos.length, azar));
      }
      elegidos = muestrear(elegidos, elegidos.map(() => 1), n, azar); // se mezclan los tipos
    } else elegidos = muestrear(unicos, unicos.map(peso), n, azar);
    // con imagen de fondo primero (se ven mejor), sin perder el sorteo
    return elegidos.filter((c) => c.backdrop_path).concat(elegidos.filter((c) => !c.backdrop_path));
  }

  /** Anota lo que se mostró y tira lo viejo (más de 30 días) o lo que sobra (se queda con los 200 más recientes). */
  function anotar(vistos, mostrados, ahora = Date.now()) {
    const nuevo = { ...vistos };
    for (const c of mostrados) nuevo[clave(c)] = ahora;
    const lista = Object.entries(nuevo).filter(([, t]) => Number.isFinite(t) && ahora - t < 30 * DIA).sort((a, b) => b[1] - a[1]).slice(0, MAX_VISTOS);
    return Object.fromEntries(lista);
  }

  function cargar(almacen) {
    try { const j = JSON.parse(almacen.getItem(CLAVE_GUARDADO) || 'null'); return j && typeof j === 'object' && !Array.isArray(j) ? j : {}; } catch { return {}; }
  }
  function guardar(almacen, vistos) {
    try { almacen.setItem(CLAVE_GUARDADO, JSON.stringify(vistos)); return true; } catch { return false; }
  }

  return { elegirEstrenos, anotar, cargar, guardar, penalidad, clave };
});
