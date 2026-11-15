// Plataformas: países, cómo abrir cada una y el «semáforo» de la ficha (misma lógica que la web).
import type { Disponibilidad, Proveedor } from './api';

export const PAISES: Record<string, string> = {
  AR: 'Argentina', BO: 'Bolivia', CL: 'Chile', CO: 'Colombia', CR: 'Costa Rica', EC: 'Ecuador', SV: 'El Salvador',
  GT: 'Guatemala', HN: 'Honduras', MX: 'México', PA: 'Panamá', PY: 'Paraguay', PE: 'Perú', DO: 'República Dominicana',
  UY: 'Uruguay', VE: 'Venezuela', US: 'Estados Unidos', ES: 'España',
};

// País del teléfono (por ejemplo «es-AR» → AR), si está en la lista
export function paisDelTelefono(): string {
  try {
    const loc = Intl.DateTimeFormat().resolvedOptions().locale || '';
    const m = /[-_]([A-Z]{2})\b/.exec(loc);
    if (m && PAISES[m[1]]) return m[1];
  } catch {}
  return 'AR';
}

// TMDB no da el enlace exacto del título en cada plataforma: se abre su búsqueda o su inicio.
// En iPhone y Android, los enlaces https de estas plataformas los abre su app si está instalada.
const ABRIR: [RegExp, (t: string) => string][] = [
  [/netflix/i, t => `https://www.netflix.com/search?q=${t}`],
  [/prime video|amazon video/i, t => `https://www.primevideo.com/search?phrase=${t}`],
  [/apple tv/i, t => `https://tv.apple.com/search?term=${t}`],
  [/crunchyroll/i, t => `https://www.crunchyroll.com/search?q=${t}`],
  [/disney/i, () => 'https://www.disneyplus.com/'],
  [/(^|\s)max(\s|$)|hbo/i, () => 'https://www.hbomax.com/'],
  [/paramount/i, () => 'https://www.paramountplus.com/'],
  [/mubi/i, () => 'https://mubi.com/'],
  [/youtube/i, t => `https://www.youtube.com/results?search_query=${t}`],
  [/google play/i, t => `https://play.google.com/store/search?q=${t}&c=movies`],
];

export function urlPlataforma(nombre: string, titulo: string): string | null {
  const t = encodeURIComponent(titulo);
  const hit = ABRIR.find(([re]) => re.test(nombre));
  return hit ? hit[1](t) : null;
}

// JustWatch exige citarlo con un enlace: va a su búsqueda en el país elegido
export const urlJustWatch = (region: string, titulo: string) =>
  `https://www.justwatch.com/${region.toLowerCase()}/${region === 'US' ? 'search' : 'buscar'}?q=${encodeURIComponent(titulo)}`;

// Canales que se pagan aparte dentro de otra app («MUBI Amazon Channel» = MUBI dentro de Prime Video)
export function canalDe(nombre: string): string | null {
  const m = /\s(amazon|apple tv) channel$/i.exec(nombre || '');
  return m ? (m[1].toLowerCase() === 'amazon' ? 'Prime Video' : 'Apple TV') : null;
}

export function sinRepetir(lista: Proveedor[]): Proveedor[] {
  const vistos = new Set<number>();
  return lista.filter(p => !vistos.has(p.provider_id) && !!vistos.add(p.provider_id));
}

export const incluidas = (d?: Disponibilidad | null) => sinRepetir([...(d?.flatrate || []), ...(d?.free || []), ...(d?.ads || [])]);

export type Semaforo = 'tengo' | 'suscripcion' | 'alquiler' | 'no';

export function semaforo(d: Disponibilidad | null | undefined, mias: Set<number>): Semaforo {
  const subs = incluidas(d);
  if (subs.some(s => mias.has(s.provider_id))) return 'tengo';
  if (subs.length) return 'suscripcion';
  if ((d?.rent || []).length || (d?.buy || []).length) return 'alquiler';
  return 'no';
}
