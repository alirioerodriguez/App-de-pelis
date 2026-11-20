// Consultas a TMDB a través del intermediario de la web (/api/tmdb): la clave queda en Vercel, nunca en el teléfono.
export const SITE = 'https://donde-la-veo-app.vercel.app/';
export const IMG = 'https://image.tmdb.org/t/p/';
export const IDIOMA = 'es-MX'; // el castellano de TMDB con más fichas traducidas para Latinoamérica

export type Tipo = 'movie' | 'tv';

export type Resultado = {
  id: number;
  media_type?: Tipo | 'person';
  title?: string;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
  vote_average?: number;
};

export type Proveedor = { provider_id: number; provider_name: string; logo_path: string; display_priority?: number };
export type Disponibilidad = { link?: string; flatrate?: Proveedor[]; free?: Proveedor[]; ads?: Proveedor[]; rent?: Proveedor[]; buy?: Proveedor[] };

const cache = new Map<string, Promise<any>>();

// En React Native, URLSearchParams no está completo: el armado de la dirección va a mano
function armar(p: string, params: Record<string, string | number | boolean | undefined>) {
  const partes = [`p=${encodeURIComponent(p)}`];
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') partes.push(`${k}=${encodeURIComponent(String(v))}`);
  return `${SITE}api/tmdb?${partes.join('&')}`;
}

// fresco: no usar lo que ya se pidió en esta sesión (para la revisión en segundo plano)
export function tmdb<T = any>(p: string, params: Record<string, string | number | boolean | undefined> = {}, fresco = false): Promise<T> {
  const url = armar(p, params);
  const guardado = fresco ? undefined : cache.get(url);
  if (guardado) return guardado;
  const ctrl = new AbortController();
  const corte = setTimeout(() => ctrl.abort(), 12000);
  const pedido = fetch(url, { signal: ctrl.signal, headers: { accept: 'application/json' } })
    .then(r => { if (!r.ok) throw new Error(`TMDB ${r.status}`); return r.json(); })
    .finally(() => clearTimeout(corte));
  pedido.catch(() => cache.delete(url)); // si falló, que la próxima vez se vuelva a pedir
  // Tope: cada búsqueda escrita es una consulta distinta; se olvidan las más viejas
  if (cache.size >= 300) cache.delete(cache.keys().next().value as string);
  cache.set(url, pedido);
  return pedido;
}

export const tituloDe = (r: Resultado) => r.title || r.name || '';
export const anioDe = (r: Resultado) => (r.release_date || r.first_air_date || '').slice(0, 4);
export const tipoDe = (r: Resultado): Tipo => (r.media_type === 'tv' || (!r.media_type && !r.title && !!r.name) ? 'tv' : 'movie');
export const imagen = (path: string | null | undefined, tam: 'w92' | 'w185' | 'w342' | 'w780' = 'w342') => (path ? `${IMG}${tam}${path}` : undefined);

// Dirección web de la ficha, para compartir (la web abre la ficha con #movie-123)
export const urlWeb = (tipo: Tipo, id: number) => `${SITE}#${tipo}-${id}`;
