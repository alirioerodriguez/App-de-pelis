// Revisión de la tabla de derechos deportivos (derechos.js): avisa qué fuentes tienen más de 9 meses y hay que volver a verificar.
// Corre sola los lunes junto con la revisión semanal (GitHub Actions); si hay vencidas, el paso falla y GitHub manda el mail.
// A mano: node scripts/derechos-vencidas.mjs [AAAA-MM-DD]
import { appendFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const D = createRequire(import.meta.url)('../derechos.js');

export function informe(hoy) {
  const vencidas = D.vencidas(hoy);
  const sinFuente = D.sinFuente();
  const lineas = [`## Tabla de derechos deportivos (${hoy})`, ''];
  lineas.push(vencidas.length ? `❌ Fuentes con más de 9 meses, hay que volver a verificarlas: ${vencidas.join(', ')}` : '✅ Ninguna fuente tiene más de 9 meses.');
  if (sinFuente.length) lineas.push(`⚠️ Siguen sin fuente anotada (de antes del 10/11/2026): ${sinFuente.join(', ')}`);
  return { vencidas, sinFuente, texto: lineas.join('\n') };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const hoy = process.argv[2] || new Date().toISOString().slice(0, 10);
  const r = informe(hoy);
  console.log(r.texto);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, r.texto + '\n');
  if (r.vencidas.length) process.exit(1);
}
