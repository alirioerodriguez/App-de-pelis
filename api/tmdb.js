// Intermediario de TMDB para ¿Dónde la veo?
// La app consulta /api/tmdb?p=/search/multi&query=… y esta función agrega la clave (variable de entorno
// TMDB_TOKEN en Vercel, nunca en el código) y deja la respuesta en la caché de Vercel. Así nadie tiene que
// sacar su propia clave y miles de consultas iguales cuentan como una sola para la cuota de TMDB.

const API = 'https://api.themoviedb.org/3';

// Solo lo que usa la app, y solo lectura
const RUTA_OK = /^\/(configuration|search\/(multi|movie|tv|keyword)|watch\/providers\/(regions|movie|tv)|(movie|tv)\/(\d+(\/watch\/providers)?|popular|top_rated|now_playing|upcoming|on_the_air|airing_today)|discover\/(movie|tv)|trending\/(all|movie|tv)\/(day|week))$/;

const ORIGENES = [/^https:\/\/alirioerodriguez\.github\.io$/, /^https:\/\/[a-z0-9-]+\.vercel\.app$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];

module.exports = async function handler(req, res) {
  const origen = req.headers.origin;
  if (origen && ORIGENES.some((r) => r.test(origen))) {
    res.setHeader('Access-Control-Allow-Origin', origen);
    res.setHeader('Vary', 'Origin');
  } else if (origen) {
    return res.status(403).json({ error: 'Origen no permitido' });
  }
  if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Methods', 'GET'); return res.status(204).end(); }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Solo GET' });

  const token = process.env.TMDB_TOKEN;
  if (!token) return res.status(503).json({ error: 'Falta configurar TMDB_TOKEN en Vercel' });

  const { p, ...params } = req.query;
  if (typeof p !== 'string' || !RUTA_OK.test(p)) return res.status(400).json({ error: 'Consulta no permitida' });

  const url = new URL(API + p);
  for (const [k, v] of Object.entries(params)) {
    if (k === 'api_key' || v == null || v === '') continue;
    url.searchParams.set(k, Array.isArray(v) ? v[0] : String(v).slice(0, 200));
  }
  // El token v4 (JWT) va como Bearer; una API key v3 va como parámetro
  const headers = { accept: 'application/json' };
  if (token.startsWith('eyJ')) headers.Authorization = 'Bearer ' + token;
  else url.searchParams.set('api_key', token);

  let r;
  try { r = await fetch(url, { headers }); }
  catch { return res.status(502).json({ error: 'TMDB no respondió' }); }
  const cuerpo = await r.text();

  // Búsquedas: 1 hora; disponibilidad y fichas: 6 horas; si TMDB falla, nada en caché
  const segundos = p.startsWith('/search') ? 3600 : 21600;
  res.setHeader('Cache-Control', r.ok ? `public, s-maxage=${segundos}, stale-while-revalidate=86400` : 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(r.status).send(cuerpo);
}
