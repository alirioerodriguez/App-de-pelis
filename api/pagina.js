// Página propia de cada película o serie: /t/movie/603-matrix (y ?pais=MX)
// - Al compartir el link, WhatsApp, Instagram y redes muestran póster, título y dónde verla.
// - Google puede indexar «dónde ver …» con datos reales.
// - Las personas pasan directo a la app con la ficha abierta.
const { tmdb, esc, slug, PAISES } = require('./_tmdb.js');

const IMG = 'https://image.tmdb.org/t/p/';
const BOTS = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|twitterbot|linkedin|discord|embedly|preview|lighthouse|bing|google/i;

module.exports = async function handler(req, res) {
  const tipo = req.query.tipo === 'tv' ? 'tv' : req.query.tipo === 'movie' ? 'movie' : null;
  const id = parseInt(String(req.query.id || ''), 10);
  const pais = PAISES[String(req.query.pais || '').toUpperCase()] ? String(req.query.pais).toUpperCase() : 'AR';
  if (!tipo || !id) return res.redirect(302, '/');

  let d, p;
  try {
    [d, p] = await Promise.all([
      tmdb(`/${tipo}/${id}`, { language: 'es-AR' }),
      tmdb(`/${tipo}/${id}/watch/providers`).then((x) => x.results?.[pais] || {}),
    ]);
  } catch (e) {
    return res.redirect(302, e.status === 404 ? '/' : `/#${tipo}-${id}`);
  }

  const titulo = d.title || d.name || 'Sin título';
  const anio = (d.release_date || d.first_air_date || '').slice(0, 4);
  const nombrePais = PAISES[pais];
  const unicos = (l) => [...new Map((l || []).map((s) => [s.provider_id, s])).values()];
  const subs = unicos([...(p.flatrate || []), ...(p.free || []), ...(p.ads || [])]);
  const alquiler = unicos([...(p.rent || []), ...(p.buy || [])]);
  const veredicto = subs.length
    ? `En ${nombrePais} está en ${subs.map((s) => s.provider_name).join(', ')}.`
    : alquiler.length ? `En ${nombrePais} no está en ninguna suscripción, pero se puede alquilar o comprar.`
      : `Por ahora no está en ninguna plataforma de ${nombrePais}.`;
  const descripcion = `${veredicto} ${d.overview ? d.overview.slice(0, 180) + (d.overview.length > 180 ? '…' : '') : ''}`.trim();
  const canonica = `https://${req.headers.host}/t/${tipo}/${id}-${slug(titulo)}${pais !== 'AR' ? '?pais=' + pais : ''}`;
  const app = `/#${tipo}-${id}`;
  const poster = d.poster_path ? IMG + 'w500' + d.poster_path : '';
  const fondo = d.backdrop_path ? IMG + 'w1280' + d.backdrop_path : poster;
  const esBot = BOTS.test(req.headers['user-agent'] || '');
  const fila = (l) => l.map((s) => `<li><img src="${IMG}w92${s.logo_path}" alt="">${esc(s.provider_name)}</li>`).join('');

  const ld = {
    '@context': 'https://schema.org',
    '@type': tipo === 'movie' ? 'Movie' : 'TVSeries',
    name: titulo,
    ...(anio ? { datePublished: d.release_date || d.first_air_date } : {}),
    ...(poster ? { image: poster } : {}),
    ...(d.overview ? { description: d.overview } : {}),
    ...(subs.length ? { potentialAction: subs.map((s) => ({ '@type': 'WatchAction', target: { '@type': 'EntryPoint', urlTemplate: canonica, actionPlatform: 'https://schema.org/DesktopWebPlatform' }, name: `Ver en ${s.provider_name}` })) } : {}),
  };

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=86400');
  return res.status(200).send(`<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dónde ver ${esc(titulo)}${anio ? ` (${anio})` : ''} en ${esc(nombrePais)} · ¿Dónde la veo?</title>
<meta name="description" content="${esc(descripcion)}">
<link rel="canonical" href="${esc(canonica)}">
<meta property="og:type" content="${tipo === 'movie' ? 'video.movie' : 'video.tv_show'}">
<meta property="og:site_name" content="¿Dónde la veo?">
<meta property="og:title" content="Dónde ver ${esc(titulo)} en ${esc(nombrePais)}">
<meta property="og:description" content="${esc(descripcion)}">
<meta property="og:url" content="${esc(canonica)}">
${fondo ? `<meta property="og:image" content="${esc(fondo)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#000000">
<link rel="icon" href="/icons/icon-192.png">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
${esBot ? '' : `<script>location.replace(${JSON.stringify(app)});</script>`}
<style>
  body { margin: 0; background: #000; color: #f5f5f7; font: 16px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 760px; margin: 0 auto; padding: 32px 20px; display: grid; gap: 20px; grid-template-columns: 160px 1fr; }
  img.p { width: 160px; border-radius: 12px; }
  h1 { margin: 0 0 6px; font-size: 1.6rem; }
  .v { background: #1c1c1e; border-radius: 12px; padding: 12px 14px; }
  ul { list-style: none; padding: 0; margin: 10px 0 0; display: flex; flex-wrap: wrap; gap: 10px; }
  li { display: flex; align-items: center; gap: 8px; background: #2c2c2e; border-radius: 10px; padding: 6px 10px; font-size: .9rem; }
  li img { width: 28px; height: 28px; border-radius: 7px; }
  a.btn { display: inline-block; margin-top: 16px; background: #0a84ff; color: #fff; text-decoration: none; padding: 10px 18px; border-radius: 980px; font-weight: 600; }
  small { color: #8e8e93; }
  @media (max-width: 560px) { main { grid-template-columns: 1fr; } img.p { width: 140px; } }
</style>
</head>
<body>
<main>
  ${poster ? `<img class="p" src="${esc(poster)}" alt="Póster de ${esc(titulo)}">` : '<div></div>'}
  <div>
    <h1>${esc(titulo)}${anio ? ` <small>(${anio})</small>` : ''}</h1>
    <div class="v"><b>${esc(veredicto)}</b>
      ${subs.length ? `<ul>${fila(subs)}</ul>` : ''}
      ${!subs.length && alquiler.length ? `<ul>${fila(alquiler)}</ul>` : ''}
    </div>
    ${d.overview ? `<p>${esc(d.overview)}</p>` : ''}
    <a class="btn" href="${esc(app)}">Abrir en ¿Dónde la veo?</a>
    <p><small>Disponibilidad en ${esc(nombrePais)} provista por JustWatch vía TMDB. Este producto usa la API de TMDB pero no está respaldado ni certificado por TMDB.</small></p>
  </div>
</main>
</body>
</html>`);
};
