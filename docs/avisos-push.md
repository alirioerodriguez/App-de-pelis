# Avisos con la web cerrada (Web Push) · cómo se activa

**Estado (10/11/2026): programado y probado con datos falsos; sin configurar y sin probar en un navegador real.** Mientras falten las claves, la web no muestra el botón y los dos servicios responden «sin configurar».

## Cómo funciona

1. En **Mi lista** aparece «🔔 Avisarme aunque la web esté cerrada» (solo si el navegador lo permite y el servidor tiene las claves). Pide permiso con un toque.
2. El navegador se suscribe y manda a `/api/push` la suscripción, el país, los ids de «Mis plataformas» y los títulos de «Mi lista» (hasta 60). **No se guarda nombre, mail ni cuenta.**
3. Una vez por semana (lunes 9:00 de Argentina, `vercel.json`) `/api/push-avisos` mira en TMDB cada título una sola vez, avisa lo que **pasó de «no estaba» a «ya está»** en una de las plataformas de la persona, y manda una notificación (una sola con resumen si son varios).
4. Las suscripciones vencidas (404 o 410) se borran solas. Cada cambio en la lista o en las plataformas actualiza lo que sabe el servidor.

Las reglas están en `avisosWeb.js` (con pruebas); los servicios, en `api/push.js` y `api/push-avisos.js`; el service worker, en `sw.js`.

## Qué hay que hacer una sola vez (lo hacés vos, en tus cuentas)

1. **Claves VAPID:** en una terminal, `npx web-push generate-vapid-keys`. Da una clave pública y una privada.
2. **Upstash Redis:** crear una base gratis (500.000 comandos por mes) y copiar la URL y el token REST.
3. **Vercel → Settings → Environment Variables** del proyecto:
   - `VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY` (las del paso 1; la privada no se comparte con nadie)
   - `VAPID_SUBJECT` (opcional): la web o un `mailto:` de contacto
   - `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`
   - `CRON_SECRET`: una cadena larga al azar (Vercel la manda sola en la llamada del cron)
4. Volver a publicar. Probar: abrir la web instalada, activar el aviso y, desde Vercel → Cron Jobs, correr `/api/push-avisos` a mano.

## Límites y cosas que no se pudieron comprobar

- **iPhone:** las notificaciones web solo andan con la web **instalada en la pantalla de inicio** (iOS 16.4 o más).
- **No probado en un navegador real:** el envío y la recepción necesitan las claves y un navegador con permisos.
- **Hobby de Vercel:** los crons corren como mucho una vez por día; uno semanal entra. Los lunes puede haber unos minutos de demora.
- **Uso comercial:** TMDB pide licencia comercial si hay publicidad o cobro, y el plan gratis de Upstash no aclara si se puede usar comercialmente.
- **Alternativa sin servidor propio:** OneSignal (web hasta 10.000 suscriptores en el plan gratis), ver `docs/apis-y-fuentes.md`.
