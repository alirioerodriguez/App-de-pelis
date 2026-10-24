// Revisión semanal de ¿Dónde la veo?
// Consulta 30 títulos de prueba en 4 países a través del intermediario publicado (api/tmdb) y avisa
// si el servicio no responde o si demasiados títulos quedaron sin ninguna plataforma.
// Se corre sola los lunes (GitHub Actions) o a mano: node scripts/revision-semanal.mjs

const BASE = process.env.SITIO || 'https://donde-la-veo-app.vercel.app';
const PAISES = ['AR', 'MX', 'CO', 'CL'];
const TITULOS = [
  ['movie', 'Matrix', 1999], ['movie', 'El origen', 2010], ['movie', 'Interestelar', 2014], ['movie', 'Oppenheimer', 2023],
  ['movie', 'Barbie', 2023], ['movie', 'Forrest Gump', 1994], ['movie', 'Pulp Fiction', 1994], ['movie', 'Relatos salvajes', 2014],
  ['movie', 'Nueve reinas', 2000], ['movie', 'El secreto de sus ojos', 2009], ['movie', 'Coco', 2017], ['movie', 'Shrek', 2001],
  ['movie', 'Titanic', 1997], ['movie', 'El padrino', 1972], ['movie', 'Toy Story', 1995],
  ['tv', 'Rick y Morty', 2013], ['tv', 'One Piece', 1999], ['tv', 'Breaking Bad', 2008], ['tv', 'Stranger Things', 2016],
  ['tv', 'Juego de tronos', 2011], ['tv', 'Arcane', 2021], ['tv', 'The Last of Us', 2023], ['tv', 'The Boys', 2019],
  ['tv', 'El juego del calamar', 2021], ['tv', 'Los Simpson', 1989], ['tv', 'Friends', 1994], ['tv', 'La casa de papel', 2017],
  ['tv', 'El Eternauta', 2025], ['tv', 'Merlina', 2022], ['tv', 'Dark', 2017],
];

async function api(path, params = {}) {
  const url = new URL('/api/tmdb', BASE);
  url.searchParams.set('p', path);
  url.searchParams.set('language', 'es-AR');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${path} respondió ${r.status}`);
  return r.json();
}

const problemas = [];
let consultas = 0, sinPlataforma = 0;

try {
  await api('/configuration');
} catch (e) {
  console.error('❌ El intermediario no responde:', e.message);
  process.exit(1);
}

for (const [tipo, nombre, anio] of TITULOS) {
  let id;
  try {
    const params = { query: nombre, include_adult: 'false' };
    params[tipo === 'movie' ? 'year' : 'first_air_date_year'] = String(anio);
    const r = await api(`/search/${tipo}`, params);
    id = r.results?.[0]?.id;
    if (!id) { problemas.push(`No encontré «${nombre}» (${anio})`); continue; }
  } catch (e) { problemas.push(`Búsqueda de «${nombre}»: ${e.message}`); continue; }

  try {
    const r = await api(`/${tipo}/${id}/watch/providers`);
    const fila = PAISES.map((p) => {
      consultas++;
      const x = r.results?.[p];
      const n = new Set([...(x?.flatrate || []), ...(x?.free || []), ...(x?.ads || []), ...(x?.rent || []), ...(x?.buy || [])].map((s) => s.provider_name)).size;
      if (!n) sinPlataforma++;
      return `${p}:${n}`;
    });
    console.log(`${tipo === 'movie' ? '🎬' : '📺'} ${nombre.padEnd(24)} ${fila.join('  ')}`);
  } catch (e) { problemas.push(`Plataformas de «${nombre}»: ${e.message}`); }
}

const porcentaje = consultas ? Math.round((sinPlataforma / consultas) * 100) : 100;
console.log(`\n${consultas} consultas · ${sinPlataforma} sin ninguna plataforma (${porcentaje} %)`);
problemas.forEach((p) => console.log('⚠️ ' + p));

// Que algunos títulos no estén en algún país es normal; que falte casi todo indica que algo se rompió
if (porcentaje > 35 || problemas.length > 5) {
  console.error('❌ Demasiados títulos sin datos: revisar el intermediario o la clave de TMDB.');
  process.exit(1);
}
console.log('✅ Todo en orden');
