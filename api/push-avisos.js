// Cron semanal (vercel.json): revisa en TMDB si algo de «Mi lista» de cada suscripción llegó a una plataforma y manda el aviso.
// Solo corre con `Authorization: Bearer <CRON_SECRET>` (Vercel lo manda solo si CRON_SECRET está configurada en el proyecto).
// Un mismo título se consulta una sola vez aunque lo tengan muchas personas. Las suscripciones vencidas (404 o 410) se borran.
const { configurado, cmd } = require('./_redis.js');
const { tmdb } = require('./_tmdb.js');
const A = require('../avisosWeb.js');

const SIMULTANEAS = 5;

async function enTandas(items, n, fn) {
  const salida = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const k = i++; salida[k] = await fn(items[k]); }
  }));
  return salida;
}

module.exports = async function handler(req, res) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || req.headers.authorization !== `Bearer ${secreto}`) return res.status(401).json({ error: 'No autorizado' });
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !configurado()) return res.status(503).json({ error: 'Avisos sin configurar' });

  let webpush;
  try { webpush = require('web-push'); } catch { return res.status(503).json({ error: 'Falta el paquete web-push' }); }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'https://donde-la-veo-app.vercel.app/', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

  const ids = (await cmd('SMEMBERS', 'push:ids')) || [];
  const subs = [];
  for (const id of ids) {
    const crudo = await cmd('GET', `push:s:${id}`);
    if (!crudo) { await cmd('SREM', 'push:ids', id); continue; }
    try { subs.push({ id, sub: JSON.parse(crudo) }); } catch { await cmd('SREM', 'push:ids', id); }
  }

  // Cada título (por país) se consulta una sola vez.
  const pedidos = new Map();
  for (const { sub } of subs) for (const t of sub.lista || []) pedidos.set(`${sub.region}|${A.clave(t)}`, { tipo: t.media_type, id: t.id });
  const respuestas = new Map();
  await enTandas([...pedidos.entries()], SIMULTANEAS, async ([k, t]) => {
    try { respuestas.set(k, await tmdb(`/${t.tipo}/${t.id}/watch/providers`)); } catch { respuestas.set(k, null); }
  });

  let enviados = 0, borrados = 0, fallidos = 0;
  for (const { id, sub } of subs) {
    const prov = {};
    for (const t of sub.lista || []) prov[A.clave(t)] = respuestas.get(`${sub.region}|${A.clave(t)}`) ?? null;
    const { avisos, disp } = A.revisar(sub, prov);
    const msg = A.mensaje(avisos, sub.region);
    let vigente = true;
    if (msg) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify(msg), { TTL: 86_400, urgency: 'low' });
        enviados++;
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) { vigente = false; borrados++; } else fallidos++;
      }
    }
    if (!vigente) { await cmd('DEL', `push:s:${id}`); await cmd('SREM', 'push:ids', id); continue; }
    await cmd('SET', `push:s:${id}`, JSON.stringify({ ...sub, disp }));
  }
  return res.status(200).json({ suscripciones: subs.length, titulos: pedidos.size, enviados, borrados, fallidos });
};
