// Semáforo de disponibilidad de un título, a partir de las categorías que devuelve TMDB en watch/providers
// (flatrate = suscripción, free/ads = gratis, rent = alquiler, buy = compra). Es el único dato oficial de tipo de acceso que da TMDB.
//
//   'tengo'       verde   está en una plataforma que la usuaria marcó como suya
//   'suscripcion' verde (o ámbar si ya eligió plataformas y ninguna es esa): hay suscripción o es gratis, pero no en las suyas
//   'pago'        naranja: no está en ninguna suscripción, solo se alquila o se compra
//   'cines'       naranja: está en cines y todavía no llegó a ninguna plataforma (solo películas)
//   'pronto'      naranja: se estrena en cines (solo películas)
//   'bloqueada'   gris: no está en ninguna plataforma del país
//   'sin-datos'   no se pudo consultar
// Funciones puras. Sirve en el navegador (`SemaforoVeo`) y en Node.
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.SemaforoVeo = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  const hay = (l) => Array.isArray(l) && l.length > 0;

  /** `p`: respuesta de watch/providers para el país (o null si no se pudo consultar). `miasIds`: Set de provider_id que la usuaria tiene. */
  function semaforo(p, { miasIds = new Set(), enCines = false, proximamente = false, esPelicula = true } = {}) {
    if (!p) return 'sin-datos';
    const subs = [...(p.flatrate || []), ...(p.free || []), ...(p.ads || [])];
    if (subs.some((s) => miasIds.has(s.provider_id))) return 'tengo';
    if (subs.length) return 'suscripcion';
    if (hay(p.rent) || hay(p.buy)) return 'pago';
    if (esPelicula && enCines) return 'cines';
    if (esPelicula && proximamente) return 'pronto';
    return 'bloqueada';
  }

  /** Color de la cajita: el rosa nunca es semáforo. Con plataformas elegidas, «suscripcion» es ámbar; sin elegir, verde. */
  function clase(estado, eligioPlataformas) {
    if (estado === 'tengo') return 'yes';
    if (estado === 'suscripcion') return eligioPlataformas ? 'sub' : 'yes';
    if (estado === 'pago' || estado === 'cines' || estado === 'pronto') return 'pay';
    if (estado === 'bloqueada') return 'lockd';
    return 'no';
  }

  return { semaforo, clase };
});
