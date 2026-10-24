// /sitemap.xml: las películas y series más vistas del momento, para que Google encuentre sus páginas /t/…
const { tmdb, esc, slug } = require('./_tmdb.js');

module.exports = async function handler(req, res) {
  const base = `https://${req.headers.host}`;
  const consultas = [];
  for (const tipo of ['movie', 'tv']) {
    for (let page = 1; page <= 5; page++) {
      consultas.push(tmdb(`/trending/${tipo}/week`, { language: 'es-AR', page }).then((r) => (r.results || []).map((x) => ({ ...x, tipo }))).catch(() => []));
      consultas.push(tmdb(`/discover/${tipo}`, { language: 'es-AR', page, watch_region: 'AR', with_watch_monetization_types: 'flatrate', sort_by: 'popularity.desc' }).then((r) => (r.results || []).map((x) => ({ ...x, tipo }))).catch(() => []));
    }
  }
  const vistos = new Map();
  for (const x of (await Promise.all(consultas)).flat()) {
    const k = x.tipo + x.id;
    if (!vistos.has(k)) vistos.set(k, `${base}/t/${x.tipo}/${x.id}-${slug(x.title || x.name)}`);
  }
  const urls = [base + '/', ...vistos.values()];
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=86400');
  return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${esc(u)}</loc></url>`).join('\n')}
</urlset>`);
};
