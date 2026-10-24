// «¿El dato está mal?»: la ficha manda acá qué título, país y motivo reportó alguien.
// Cada reporte queda como una línea «REPORTE {...}» en los registros del proyecto en Vercel
// (Logs), sin base de datos ni cuentas. No se guarda nada que identifique a la persona.

const MOTIVOS = new Set(['no-esta', 'otra-plataforma', 'temporadas', 'otro']);

module.exports = async function handler(req, res) {
  const origen = req.headers.origin;
  if (origen && origen !== `https://${req.headers.host}`) return res.status(403).json({ error: 'Origen no permitido' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Solo POST' });

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
  if (!b || typeof b !== 'object') return res.status(400).json({ error: 'Datos inválidos' });

  const id = Number(b.id);
  const tipo = b.tipo === 'movie' || b.tipo === 'tv' ? b.tipo : null;
  const pais = /^[A-Z]{2}$/.test(b.pais || '') ? b.pais : null;
  const motivo = MOTIVOS.has(b.motivo) ? b.motivo : null;
  if (!Number.isInteger(id) || id <= 0 || !tipo || !pais || !motivo) return res.status(400).json({ error: 'Datos inválidos' });

  const reporte = {
    fecha: new Date().toISOString(),
    tipo, id, pais, motivo,
    titulo: String(b.titulo || '').slice(0, 120),
    plataformas: Array.isArray(b.plataformas) ? b.plataformas.slice(0, 15).map((x) => String(x).slice(0, 40)) : [],
    nota: String(b.nota || '').replace(/\s+/g, ' ').slice(0, 300),
    tmdb: `https://www.themoviedb.org/${tipo}/${id}/watch?locale=${pais}`,
  };
  console.log('REPORTE ' + JSON.stringify(reporte));
  return res.status(200).json({ ok: true });
};
