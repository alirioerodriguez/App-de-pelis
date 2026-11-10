// Acceso mínimo a Upstash Redis por su API REST (sin dependencias). Guarda las suscripciones de Web Push.
// Variables de entorno (Vercel): UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN. Sin ellas, todo responde «sin configurar».
// Plan gratis de Upstash: 500.000 comandos por mes y 250 MB (consultado el 10/11/2026; no dice si se puede usar comercialmente).

const configurado = () => !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

/** Corre un comando: cmd('SET', 'clave', 'valor') → resultado. Lanza si Upstash responde con error. */
async function cmd(...args) {
  const r = await fetch(process.env.UPSTASH_REDIS_REST_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(8000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error('Redis: ' + (j.error || r.status));
  return j.result;
}

module.exports = { configurado, cmd };
