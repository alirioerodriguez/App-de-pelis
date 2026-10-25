// País del visitante según su IP (lo agrega Vercel), para elegir el país inicial de la app.
// Va aparte de /api/tmdb a propósito: esas respuestas se guardan en la caché compartida y no pueden
// llevar datos de cada visitante. Esta no se guarda en ninguna caché ni registra nada.
module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  const pais = String(req.headers['x-vercel-ip-country'] || '').toUpperCase();
  res.status(200).json({ pais: /^[A-Z]{2}$/.test(pais) ? pais : null });
};
