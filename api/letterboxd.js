// Importar desde Letterboxd con solo el nombre de usuario: lee el RSS público del perfil, que trae el id de TMDB
// de cada película (<tmdb:movieId>). Ojo: el RSS es la actividad reciente (diario y reseñas, unas 50), no la
// watchlist completa. Pasa por acá para que el navegador no le pida nada a otro sitio; no se guarda nada.

const extraer = (xml) => {
  if (!xml || typeof xml !== 'string') return [];
  const vistos = new Set();
  const salida = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const item = m[1];
    const id = /<tmdb:movieId>(\d+)<\/tmdb:movieId>/i.exec(item);
    if (!id) continue; // series, listas y otras cosas que no son películas
    const tmdbId = Number(id[1]);
    if (vistos.has(tmdbId)) continue;
    vistos.add(tmdbId);
    const titulo = /<letterboxd:filmTitle>([\s\S]*?)<\/letterboxd:filmTitle>/i.exec(item);
    const anio = /<letterboxd:filmYear>(\d{4})<\/letterboxd:filmYear>/i.exec(item);
    salida.push({ tmdbId, titulo: titulo ? titulo[1].trim() : '', anio: anio ? Number(anio[1]) : null });
  }
  return salida;
};

/** Usuario de Letterboxd válido (letras, números, guion y guion bajo), sin @. */
const usuarioValido = (u) => {
  const limpio = String(u || '').trim().replace(/^@/, '');
  return /^[A-Za-z0-9_-]{2,40}$/.test(limpio) ? limpio : null;
};

async function handler(req, res) {
  const origen = req.headers.origin;
  if (origen && origen !== `https://${req.headers.host}`) return res.status(403).json({ error: 'Origen no permitido' });
  if (req.method !== 'GET') return res.status(405).json({ error: 'Solo GET' });

  const usuario = usuarioValido(req.query.user);
  if (!usuario) return res.status(400).json({ error: 'Escribe un usuario de Letterboxd válido.' });

  try {
    const r = await fetch(`https://letterboxd.com/${usuario}/rss/`, {
      headers: { 'User-Agent': 'DondeLaVeo/1.0 (https://donde-la-veo-app.vercel.app)' },
    });
    if (r.status === 404) return res.status(404).json({ error: `No encontramos el perfil público @${usuario} en Letterboxd.` });
    if (!r.ok) throw new Error(String(r.status));
    const peliculas = extraer(await r.text());
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({ usuario, peliculas });
  } catch (_) {
    return res.status(502).json({ error: 'No pudimos leer Letterboxd ahora. Prueba en un rato.' });
  }
}

module.exports = handler;
module.exports.extraer = extraer;
module.exports.usuarioValido = usuarioValido;
