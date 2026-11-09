# Revisión de seguridad de VeoMás

Última revisión: 09/11/2026, sobre el código (web, funciones de Vercel en `api/`).

VeoMás no tiene cuentas ni base de datos: «Mi lista» y «Mis plataformas» se guardan en el dispositivo.

## Qué se probó y resultado

| Prueba | Resultado |
|---|---|
| Intermediario de TMDB (`api/tmdb.js`) | ✅ Solo rutas de lectura de una lista cerrada; la clave vive en Vercel; no da permisos a otros sitios. |
| Letterboxd, Wikipedia y ESPN (`letterboxd.js`, `sugerir.js`, `deporte.js`) | ✅ Siempre piden a una dirección fija; lo que manda la persona se valida (usuario, texto corto, liga y fechas). |
| Reportes «¿El dato está mal?» (`reporte.js`) | ✅ Solo valores permitidos y textos recortados; no se guarda nada que identifique a la persona. |
| Páginas de cada título (`/t/…`) | ✅ Todo lo que viene de TMDB se escapa; los datos estructurados no pueden cerrar la etiqueta `<script>`. |
| Textos en la app (búsqueda, nombres, avisos) | ✅ Van con `esc()` o `textContent`. |
| Claves secretas en la web | ✅ No hay. |

## Qué se corrigió

1. **Link de «Mi lista» que podía meter código.** El link `#importar=…` (para pasar la lista a otro dispositivo) guardaba los títulos tal cual vinieran, y las tarjetas usan el id, el tipo, el póster y la fecha sin escapar. Alguien podía armar un link que, al abrirlo, dejara guardado en el teléfono un código que se ejecutaba cada vez que se veía la lista. Ahora cada título se revisa al importarlo y al cargar la lista (`itemSeguro`): id numérico, tipo conocido, póster y fechas con su forma. Las plataformas importadas tienen que ser números.
2. **Ligas de deporte:** `deporte.js` aceptaba nombres como `constructor` (se colaban por ser propiedades de cualquier objeto). No llegaba a nada grave porque la dirección es fija, pero ahora solo pasan las ligas de la lista.
3. **Encabezados de seguridad en la web** (`vercel.json`), iguales a los de las otras apps.

## Pendiente

- El intermediario de TMDB acepta pedidos sin el encabezado de origen (por ejemplo, desde un programa). Son datos públicos y quedan en caché, así que el riesgo es solo de gastar cuota; si TMDB marca abuso, sumar un tope por IP.
