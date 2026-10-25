// Partidos, carreras y torneos para la sección Deportes, tomados del marcador público de ESPN.
// La app consulta /api/deporte?l=arg.1&d=20261025 y esta función pide a ESPN, achica la respuesta a lo que
// se muestra y la deja en la caché de Vercel (poco tiempo si hay algo en vivo). ESPN no dice en qué
// plataforma se ve cada partido: eso lo arma la página con su propia tabla por país.

const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/';

// Solo estas competencias (clave que usa la app → ruta de ESPN)
const LIGAS = {
  'arg.1': 'soccer/arg.1', 'mex.1': 'soccer/mex.1', 'col.1': 'soccer/col.1', 'chi.1': 'soccer/chi.1',
  'per.1': 'soccer/per.1', 'uru.1': 'soccer/uru.1', 'conmebol.libertadores': 'soccer/conmebol.libertadores',
  'conmebol.sudamericana': 'soccer/conmebol.sudamericana', 'uefa.champions': 'soccer/uefa.champions',
  'eng.1': 'soccer/eng.1', 'esp.1': 'soccer/esp.1',
  f1: 'racing/f1', nba: 'basketball/nba', atp: 'tennis/atp', wta: 'tennis/wta',
};

const estadoDe = s => ({ estado: s?.type?.state || 'pre', detalle: s?.type?.shortDetail || s?.type?.detail || '', reloj: s?.displayClock || '' });

function equipo(c) {
  const t = c.team || {};
  return { nombre: t.shortDisplayName || t.displayName || '', abrev: t.abbreviation || '', logo: t.logo || '', tanto: c.score ?? null, ganador: !!c.winner };
}

function partido(e) {
  const c = (e.competitions || [])[0] || {};
  const cs = c.competitors || [];
  return {
    id: e.id, tipo: 'partido', fecha: e.date, ...estadoDe(e.status),
    local: equipo(cs.find(x => x.homeAway === 'home') || cs[0] || {}),
    visita: equipo(cs.find(x => x.homeAway === 'away') || cs[1] || {}),
    sede: c.venue?.fullName || '',
  };
}

function carrera(e) {
  return {
    id: e.id, tipo: 'carrera', nombre: e.name, fecha: e.date, fin: e.endDate || e.date, sede: e.circuit?.fullName || '',
    sesiones: (e.competitions || []).map(c => ({
      nombre: c.type?.abbreviation || c.type?.text || '', fecha: c.date, ...estadoDe(c.status),
      podio: (c.competitors || []).filter(x => x.order >= 1 && x.order <= 3).sort((a, b) => a.order - b.order)
        .map(x => x.athlete?.shortName || x.athlete?.displayName || ''),
    })),
  };
}

function torneo(e) {
  const partidos = [];
  for (const g of e.groupings || []) {
    const singles = /single|individual/i.test(g.grouping?.displayName || g.grouping?.slug || '') || !/doble|double/i.test(g.grouping?.displayName || '');
    if (!singles) continue;
    for (const c of g.competitions || []) {
      const [a, b] = c.competitors || [];
      if (!a || !b) continue;
      const jug = x => ({ nombre: x.athlete?.shortName || x.athlete?.displayName || '', pais: x.athlete?.flag?.href || '', ganador: !!x.winner, sets: (x.linescores || []).map(l => l.value) });
      partidos.push({ fecha: c.date, ...estadoDe(c.status), ronda: c.round?.displayName || '', j1: jug(a), j2: jug(b) });
    }
  }
  return { id: e.id, tipo: 'torneo', nombre: e.name, fecha: e.date, fin: e.endDate || e.date, partidos: partidos.slice(-200) };
}

module.exports = async function handler(req, res) {
  const origen = req.headers.origin;
  if (origen && origen !== `https://${req.headers.host}`) return res.status(403).json({ error: 'Origen no permitido' });
  if (req.method !== 'GET') return res.status(405).json({ error: 'Solo GET' });

  const l = String(req.query.l || '');
  const d = String(req.query.d || '');
  if (!LIGAS[l]) return res.status(400).json({ error: 'Competencia no permitida' });
  if (d && !/^\d{8}$/.test(d)) return res.status(400).json({ error: 'Fecha inválida' });

  const url = new URL(ESPN + LIGAS[l] + '/scoreboard');
  url.searchParams.set('lang', 'es');
  url.searchParams.set('region', 'ar');
  url.searchParams.set('limit', '100');
  if (d) url.searchParams.set('dates', d);

  let datos;
  try {
    const r = await fetch(url, { headers: { accept: 'application/json' } });
    if (!r.ok) throw new Error(String(r.status));
    datos = await r.json();
  } catch {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: 'ESPN no respondió' });
  }

  const liga = (datos.leagues || [])[0] || {};
  const eventos = (datos.events || []).map(e => l === 'f1' ? carrera(e) : (l === 'atp' || l === 'wta') ? torneo(e) : partido(e));
  const calendario = l === 'f1' ? (liga.calendar || []).map(c => ({ nombre: c.label, fecha: c.startDate, fin: c.endDate })) : undefined;

  // En vivo: 30 s. Días pasados: 1 h. Lo que viene: 10 min.
  const enVivo = JSON.stringify(eventos).includes('"estado":"in"');
  const hoy = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const segundos = enVivo ? 30 : d && d < hoy ? 3600 : 600;
  res.setHeader('Cache-Control', `public, s-maxage=${segundos}, stale-while-revalidate=${segundos}`);
  return res.status(200).json({ liga: { clave: l, nombre: liga.name || '', logo: liga.logos?.[0]?.href || '' }, eventos, calendario });
};
