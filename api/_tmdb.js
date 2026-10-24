// Ayudas compartidas por las funciones de Vercel (los archivos que empiezan con _ no son rutas).
const API = 'https://api.themoviedb.org/3';

async function tmdb(path, params = {}) {
  const token = process.env.TMDB_TOKEN;
  if (!token) throw new Error('Falta TMDB_TOKEN');
  const url = new URL(API + path);
  const headers = { accept: 'application/json' };
  if (token.startsWith('eyJ')) headers.Authorization = 'Bearer ' + token;
  else url.searchParams.set('api_key', token);
  for (const [k, v] of Object.entries(params)) if (v != null && v !== '') url.searchParams.set(k, String(v));
  const r = await fetch(url, { headers });
  if (!r.ok) throw Object.assign(new Error('TMDB ' + r.status), { status: r.status });
  return r.json();
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// «El Eternauta» -> «el-eternauta»
const slug = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

const PAISES = { AR: 'Argentina', BO: 'Bolivia', CL: 'Chile', CO: 'Colombia', CR: 'Costa Rica', EC: 'Ecuador', SV: 'El Salvador', GT: 'Guatemala', HN: 'Honduras', MX: 'México', PA: 'Panamá', PY: 'Paraguay', PE: 'Perú', DO: 'República Dominicana', UY: 'Uruguay', VE: 'Venezuela', US: 'Estados Unidos', ES: 'España' };

module.exports = { tmdb, esc, slug, PAISES };
