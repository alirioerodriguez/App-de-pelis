// Reglas de los avisos de «Mi lista» para la web cerrada (Web Push). Funciones puras: no tocan la red ni el disco.
// El servidor (api/push-avisos.js) las usa con lo que responde TMDB; las pruebas, con datos armados a mano.
//
// Una suscripción guarda: { region, mine: [ids de plataforma], lista: [{ id, media_type, title }], disp: { 'movie123': false } }.
// `disp[clave]` = ¿el título estaba en alguna plataforma de ese país la última vez que se miró? Solo se avisa el paso de
// «no estaba» (false) a «ya está». Si nunca se miró (undefined) se anota sin avisar: no hay con qué comparar.
//
// Sirve en el navegador (queda como `AvisosWeb`) y en Node (`require('./avisosWeb.js')`).
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.AvisosWeb = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  const MAX_TITULOS = 60;
  const clave = (t) => `${t.media_type}${t.id}`;

  /** Plataformas donde se ve sin pagar aparte (suscripción, gratis o con anuncios) en un país: [{ provider_id, provider_name }]. */
  function plataformasDe(respuestaProviders, region) {
    const r = respuestaProviders?.results?.[region];
    if (!r) return [];
    const vistos = new Set();
    return [...(r.flatrate || []), ...(r.free || []), ...(r.ads || [])].filter((p) => p && Number.isFinite(p.provider_id) && !vistos.has(p.provider_id) && vistos.add(p.provider_id));
  }

  /**
   * sub: la suscripción; proveedoresPorClave: { 'movie123': respuesta de TMDB /watch/providers o null si no se pudo consultar }.
   * Devuelve { avisos: [{ titulo, plataforma }], disp } con `disp` ya actualizado. Un título que no se pudo consultar no se toca.
   */
  function revisar(sub, proveedoresPorClave) {
    const disp = { ...(sub.disp || {}) };
    const avisos = [];
    const mias = new Set((sub.mine || []).filter(Number.isFinite));
    for (const t of (sub.lista || []).slice(0, MAX_TITULOS)) {
      const k = clave(t);
      const resp = proveedoresPorClave[k];
      if (!resp) continue;
      const plats = plataformasDe(resp, sub.region);
      const ahora = plats.length > 0;
      if (disp[k] === false && ahora) {
        // si la persona marcó sus plataformas, solo avisa de las suyas; si no marcó ninguna, de cualquiera
        const util = mias.size ? plats.filter((p) => mias.has(p.provider_id)) : plats;
        if (util.length) avisos.push({ titulo: t.title || '', plataforma: util[0].provider_name, id: t.id, media_type: t.media_type });
      }
      disp[k] = ahora;
    }
    return { avisos, disp };
  }

  /** Texto de la notificación: uno solo si es un título, un resumen si son varios (el teléfono no se llena de avisos). */
  function mensaje(avisos, region) {
    if (!avisos.length) return null;
    if (avisos.length === 1) {
      const a = avisos[0];
      return { title: 'Ya se puede ver', body: `«${a.titulo}» llegó a ${a.plataforma}.`, url: `/#t=${a.media_type}${a.id}`, tag: 'mi-lista' };
    }
    return { title: 'Novedades en tu lista', body: `${avisos.length} títulos de tu lista ya se pueden ver: «${avisos[0].titulo}», «${avisos[1].titulo}»${avisos.length > 2 ? ` y ${avisos.length - 2} más` : ''}.`, url: '/', tag: 'mi-lista' };
  }

  /** Lo que se acepta de una suscripción que llega del navegador (viene de afuera): se valida todo y se recorta. */
  function limpiarSuscripcion(x) {
    if (!x || typeof x !== 'object') return null;
    const ep = x.endpoint;
    if (typeof ep !== 'string' || ep.length > 600) return null;
    try { if (new URL(ep).protocol !== 'https:') return null; } catch { return null; }
    const k = x.keys;
    if (!k || typeof k.p256dh !== 'string' || typeof k.auth !== 'string' || k.p256dh.length > 200 || k.auth.length > 100) return null;
    const region = typeof x.region === 'string' && /^[A-Z]{2}$/.test(x.region) ? x.region : null;
    if (!region) return null;
    const mine = (Array.isArray(x.mine) ? x.mine : []).filter((n) => Number.isInteger(n) && n > 0).slice(0, 80);
    const lista = (Array.isArray(x.lista) ? x.lista : [])
      .filter((t) => t && Number.isInteger(t.id) && t.id > 0 && (t.media_type === 'movie' || t.media_type === 'tv'))
      .slice(0, MAX_TITULOS)
      .map((t) => ({ id: t.id, media_type: t.media_type, title: String(t.title || '').replace(/[\u0000-\u001f]/g, '').slice(0, 120) }));
    const disp = {};
    for (const [kk, v] of Object.entries(x.disp && typeof x.disp === 'object' ? x.disp : {})) if (/^(movie|tv)\d+$/.test(kk) && typeof v === 'boolean') disp[kk] = v;
    return { endpoint: ep, keys: { p256dh: k.p256dh, auth: k.auth }, region, mine, lista, disp };
  }

  return { plataformasDe, revisar, mensaje, limpiarSuscripcion, MAX_TITULOS, clave };
});
