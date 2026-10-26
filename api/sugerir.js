// Corrector de búsqueda para ¿Dónde la veo?: cuando lo que escribió la persona no aparece en TMDB (faltas de
// ortografía, nombres mal escritos), se le pregunta a la búsqueda de Wikipedia en español, que sugiere la
// palabra bien escrita («stranger tings» → «stranger things») y devuelve los artículos que más se parecen.
// Pasa por acá (y no desde el navegador) para que las búsquedas de la gente no salgan a otro sitio, y queda
// en la caché de Vercel. No se guarda nada.

const WIKI = 'https://es.wikipedia.org/w/api.php';
const limpiar = t => String(t || '').replace(/\s*\([^)]*\)\s*$/, '').trim(); // «Parque Jurásico (película)» → «Parque Jurásico»

module.exports = async function handler(req, res) {
  const origen = req.headers.origin;
  if (origen && origen !== `https://${req.headers.host}`) return res.status(403).json({ error: 'Origen no permitido' });
  if (req.method !== 'GET') return res.status(405).json({ error: 'Solo GET' });

  const q = String(req.query.q || '').trim().slice(0, 80);
  if (q.length < 2) return res.status(400).json({ error: 'Falta la búsqueda' });

  const url = new URL(WIKI);
  for (const [k, v] of Object.entries({ action: 'query', list: 'search', srsearch: q, srinfo: 'suggestion', srlimit: '5', srprop: '', format: 'json' })) url.searchParams.set(k, v);
  try {
    // Wikipedia pide identificarse con un User-Agent que diga quién consulta
    const r = await fetch(url, { headers: { 'User-Agent': 'DondeLaVeo/1.0 (https://donde-la-veo-app.vercel.app)' } });
    if (!r.ok) throw new Error(String(r.status));
    const d = await r.json();
    const sugerencia = d.query?.searchinfo?.suggestion || null;
    const titulos = [...new Set((d.query?.search || []).map(x => limpiar(x.title)).filter(Boolean))].slice(0, 5);
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).json({ sugerencia, titulos });
  } catch {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ sugerencia: null, titulos: [] });
  }
};
