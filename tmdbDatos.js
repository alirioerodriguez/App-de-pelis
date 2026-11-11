// Datos que vienen de TMDB: cuánto tiempo se pueden guardar y a dónde mandar a la persona.
//
// Los términos de uso de TMDB prohíben guardar su contenido más de 6 meses. Todo lo que VeoMás deja en el dispositivo
// con datos de TMDB (el vocabulario que aprende el corrector y las imágenes del service worker) vence antes de eso.
//
// Sirve en el navegador (`TmdbDatos`), en el service worker (`importScripts`) y en Node (`require`, para las pruebas).
(function (raiz, fabrica) {
  const api = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else raiz.TmdbDatos = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const DIA = 86400000;
  /** Máximo que permiten los términos de TMDB: 6 meses (se toma 182 días). */
  const MAX_MS = 182 * DIA;
  /** Lo guardado a propósito se renueva antes del máximo: vence a los 150 días. */
  const VIDA_MS = 150 * DIA;
  /** Las imágenes se guardan por tandas de 60 días: se conservan la tanda actual y la anterior (como mucho 120 días). */
  const TANDA_MS = 60 * DIA;

  /** ¿Sigue vigente algo guardado en `en` (ms)? Sin fecha o con fecha del futuro no se considera vigente. */
  const vigente = (en, ahora, vida = VIDA_MS) => Number.isFinite(en) && en <= ahora && ahora - en < vida;

  /**
   * Para listas guardadas con la marca `en` (ms): sella con `ahora` lo que no tiene marca (empieza a contar desde hoy)
   * y descarta lo vencido. Devuelve { lista, cambio }.
   */
  function sellarYFiltrar(lista, ahora, vida = VIDA_MS) {
    if (!Array.isArray(lista)) return { lista: [], cambio: false };
    let cambio = false;
    const salida = [];
    for (const x of lista) {
      if (!x || typeof x !== 'object') { cambio = true; continue; }
      if (!Number.isFinite(x.en)) { salida.push({ ...x, en: ahora }); cambio = true; }
      else if (vigente(x.en, ahora, vida)) salida.push(x);
      else cambio = true;
    }
    return { lista: salida, cambio };
  }

  /** Número de tanda de 60 días para `ahora`. */
  const tanda = (ahora) => Math.floor(ahora / TANDA_MS);
  const PREFIJO_IMAGENES = 'img-';
  /** Nombre del caché de imágenes de esta tanda: `img-v6-t312`. */
  const cacheImagenes = (version, ahora) => `${PREFIJO_IMAGENES}${version}-t${tanda(ahora)}`;
  /** De los cachés que existen, cuáles de imágenes hay que borrar: todos menos la tanda actual y la anterior. */
  function cachesAborrar(nombres, version, ahora) {
    const vivos = new Set([cacheImagenes(version, ahora), cacheImagenes(version, ahora - TANDA_MS)]);
    return nombres.filter((n) => n.startsWith(PREFIJO_IMAGENES) && !vivos.has(n));
  }

  /**
   * Enlace de reserva a la página «Dónde ver» de TMDB para ese país (TMDB no da enlaces directos a cada plataforma y
   * recomienda este). Devuelve null si el tipo, el id o el país no son válidos.
   */
  function enlaceTmdbPorPais(tipo, id, region) {
    if (tipo !== 'movie' && tipo !== 'tv') return null;
    if (!/^\d{1,9}$/.test(String(id))) return null;
    const cc = String(region || '').toUpperCase();
    if (!/^[A-Z]{2}$/.test(cc)) return null;
    return `https://www.themoviedb.org/${tipo}/${id}/watch?locale=${cc}`;
  }

  return { DIA, MAX_MS, VIDA_MS, TANDA_MS, vigente, sellarYFiltrar, tanda, cacheImagenes, cachesAborrar, enlaceTmdbPorPais };
});
