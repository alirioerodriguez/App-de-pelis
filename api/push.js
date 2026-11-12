// Suscripciones de Web Push para «Avisarme cuando llegue a mis plataformas» con la web cerrada.
//   GET    → { clave }  la clave pública VAPID que necesita el navegador para suscribirse
//   POST   → guarda o actualiza la suscripción (y la lista y las plataformas de esa persona)
//   DELETE → la borra
// No guarda nombre, mail ni cuenta: solo la suscripción del navegador, el país, los ids de «Mis plataformas» y «Mi lista».
// Sin VAPID_PUBLIC_KEY o sin Upstash responde 503 y la web no muestra el botón.
const crypto = require('node:crypto');
const { configurado, cmd } = require('./_redis.js');
const A = require('../avisosWeb.js');

const MAX_BYTES = 30_000;
const idDe = (endpoint) => crypto.createHash('sha256').update(endpoint).digest('hex').slice(0, 32);

module.exports = async function handler(req, res) {
  const origen = req.headers.origin;
  if (origen && origen !== `https://${req.headers.host}`) return res.status(403).json({ error: 'Origen no permitido' });
  res.setHeader('Cache-Control', 'no-store');
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !configurado()) return res.status(503).json({ error: 'Avisos sin configurar' });

  try {
    if (req.method === 'GET') return res.status(200).json({ clave: process.env.VAPID_PUBLIC_KEY });
    if (req.method !== 'POST' && req.method !== 'DELETE') return res.status(405).json({ error: 'Método no permitido' });

    // Límite por IP: 20 cambios por hora. Frena a quien quiera llenar la lista de suscripciones.
    if (req.method !== 'GET') {
      const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim().slice(0, 64) || 'sin-ip';
      const clave = 'push:rl:' + crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
      const n = await cmd('INCR', clave);
      if (n === 1) await cmd('EXPIRE', clave, 3600);
      if (n > 20) return res.status(429).json({ error: 'Demasiados cambios seguidos. Probá en un rato.' });
    }

    const crudo = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
    if (crudo.length > MAX_BYTES) return res.status(413).json({ error: 'Demasiado grande' });
    const cuerpo = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    if (req.method === 'DELETE') {
      const ep = cuerpo?.endpoint;
      if (typeof ep !== 'string' || ep.length > 600) return res.status(400).json({ error: 'Falta el endpoint' });
      const id = idDe(ep);
      await cmd('DEL', `push:s:${id}`);
      await cmd('SREM', 'push:ids', id);
      return res.status(200).json({ ok: true });
    }

    const nueva = A.limpiarSuscripcion(cuerpo);
    if (!nueva) return res.status(400).json({ error: 'Suscripción inválida' });
    const id = idDe(nueva.endpoint);
    const previa = await cmd('GET', `push:s:${id}`);
    if (previa) {
      // lo que el servidor ya sabe de la disponibilidad manda: si no, volvería a avisar lo que ya avisó
      try { nueva.disp = { ...nueva.disp, ...(JSON.parse(previa).disp || {}) }; } catch { /* suscripción vieja rota: se pisa */ }
    }
    await cmd('SET', `push:s:${id}`, JSON.stringify(nueva));
    await cmd('SADD', 'push:ids', id);
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'No se pudo guardar' });
  }
};
