// «Elegí por mí»: elige una película o serie al azar SIN repetir. Antes se evitaba solo la última elegida y se sacaba de unos 60
// títulos (3 páginas de TMDB): en 10 tiradas podía salir el mismo título tres veces.
// Ahora hay una memoria de los últimos 60 títulos que salieron (se guarda en el dispositivo y sobrevive a recargar la página):
//  - un título que salió no vuelve a salir hasta que pasaron 60 tiradas distintas (o hasta que ya no queda nada más);
//  - las páginas de TMDB se piden en orden aleatorio sin repetir (de la 1 a la 15), así el universo es de ~300 títulos y no de 60;
//  - si ya salió todo lo que hay con esos filtros, se vuelve a empezar, pero sin repetir lo más reciente.
// Funciones puras: el azar y el almacenamiento se pasan de afuera (las pruebas usan un azar fijo).
//
// Sirve en el navegador (queda como `AzarVeo`) y en Node (`require('./azar.js')`).
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.AzarVeo = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  const MEMORIA = 60;
  const PAGINAS = 15;
  const MAX_FIRMAS = 20;
  const CLAVE_GUARDADO = 'veomas_azar_v1';
  const clave = (t) => `${t.media_type}${t.id}`;

  /** Memoria de lo que ya salió. `estado`: { vistos: ['movie1', …], paginas: { firma: [1, 7] } } (lo que devolvió `estado()` antes). */
  function crear({ azar = Math.random, estado = {}, memoria = MEMORIA, paginasMax = PAGINAS } = {}) {
    let hist = (Array.isArray(estado.vistos) ? estado.vistos.filter((x) => typeof x === 'string') : []).slice(-memoria);
    const usadas = {};
    for (const [f, ps] of Object.entries(estado.paginas && typeof estado.paginas === 'object' ? estado.paginas : {}).slice(-MAX_FIRMAS)) {
      if (Array.isArray(ps)) usadas[f] = ps.filter((p) => Number.isInteger(p) && p >= 1 && p <= paginasMax);
    }

    /** Candidatos que todavía no salieron. */
    const libres = (candidatos) => { const s = new Set(hist); return candidatos.filter((c) => !s.has(clave(c))); };

    /** Elige uno. { elegida, reinicio } o null si no hay candidatos. */
    function elegir(candidatos) {
      if (!candidatos.length) return null;
      let pool = libres(candidatos);
      let reinicio = false;
      if (!pool.length) {
        // salió todo lo que hay: se vuelve a empezar, salvo lo más reciente (hasta 10 títulos o la mitad de lo que hay)
        reinicio = true;
        const recientes = new Set(hist.slice(-Math.min(10, Math.floor(candidatos.length / 2))));
        pool = candidatos.filter((c) => !recientes.has(clave(c)));
        if (!pool.length) pool = candidatos;
      }
      const elegida = pool[Math.min(pool.length - 1, Math.floor(azar() * pool.length))];
      hist = hist.filter((k) => k !== clave(elegida));
      hist.push(clave(elegida));
      if (hist.length > memoria) hist = hist.slice(-memoria);
      return { elegida, reinicio };
    }

    /** Página de TMDB que todavía no se usó para estos filtros (`firma`); cuando se usaron todas, empieza de nuevo. */
    function paginaNueva(firma) {
      const ya = new Set(usadas[firma] || []);
      let sin = [];
      for (let p = 1; p <= paginasMax; p++) if (!ya.has(p)) sin.push(p);
      if (!sin.length) { usadas[firma] = []; sin = Array.from({ length: paginasMax }, (_, i) => i + 1); }
      const p = sin[Math.min(sin.length - 1, Math.floor(azar() * sin.length))];
      usadas[firma] = [...(usadas[firma] || []), p];
      const firmas = Object.keys(usadas);
      if (firmas.length > MAX_FIRMAS) delete usadas[firmas[0]]; // no crece sin límite
      return p;
    }

    return { elegir, libres, paginaNueva, estado: () => ({ vistos: hist.slice(), paginas: JSON.parse(JSON.stringify(usadas)) }) };
  }

  /** Lee lo guardado (si no hay o está roto, empieza de cero). `almacen`: algo con getItem/setItem, como localStorage. */
  function cargar(almacen) {
    try { const j = JSON.parse(almacen.getItem(CLAVE_GUARDADO) || 'null'); return j && typeof j === 'object' ? j : {}; } catch { return {}; }
  }
  function guardar(almacen, estado) {
    try { almacen.setItem(CLAVE_GUARDADO, JSON.stringify(estado)); return true; } catch { return false; }
  }

  return { crear, cargar, guardar, clave, MEMORIA, PAGINAS };
});
