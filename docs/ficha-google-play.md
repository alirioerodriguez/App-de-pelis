# Ficha de Google Play — VeoMás

Textos para pegar en Play Console (**Crecer → Presencia en la tienda → Ficha principal**). Escritos el 07/11/2026 a partir de lo que la app hace hoy. Límites de Google: título 30 caracteres, descripción breve 80, descripción completa 4.000. La app es una TWA (`ar.alirio.dondelaveo`): los cambios de la web llegan solos.

**Nombre:** VeoMás (desde el 09/11/2026; antes «VeoMás»). El paquete `ar.alirio.dondelaveo` no cambia.

## Título (30)
VeoMás Pelis y series

## Descripción breve (80)
Busca una película o serie y mira en qué plataforma está en tu país.

## Descripción completa

¿Quieres ver una película y no sabes si está en Netflix, Disney+, Max, Prime Video o dónde? Búscala y listo.

**Saber dónde verla**
• Búsqueda en vivo de películas, series, documentales y programas.
• Veredicto claro: incluida en tus plataformas, con suscripción, gratis, en alquiler o para comprar.
• En las series, qué temporadas tiene cada plataforma.
• Los dos nombres de cada título, el de España y el de Latinoamérica.
• Busca por actores, actrices y directores.
• El país se detecta solo, y lo puedes cambiar.

**Hecho para ti**
• «Mis plataformas»: marca las que pagas y ve primero lo que ya tienes.
• «Mi lista»: guarda lo que quieres ver y mira de un vistazo dónde está cada título.
• «Elige por mí» cuando no sabes qué ver.
• Tráiler en la ficha y tarjeta para compartir por WhatsApp o en historias.
• Deportes: qué partidos se ven en vivo y dónde.

**Sin vueltas**
• No necesitas cuenta. Lo que eliges queda en tu teléfono.
• Sin publicidad.

Datos de películas de TMDB. Datos de disponibilidad de JustWatch. Esta app usa la API de TMDB, pero TMDB no la avala ni certifica.

## Categoría y datos de contacto
- **Categoría:** Entretenimiento.
- **Correo de contacto:** alirioerodriguez@gmail.com
- **Sitio web:** https://donde-la-veo-app.vercel.app
- **Política de privacidad:** https://donde-la-veo-app.vercel.app/privacidad.html

## Contenido de la app (Play Console)
- **Eliminación de cuenta:** la app no tiene cuentas. Se responde que no permite crear cuentas.
- **Seguridad de los datos:** no recopila datos personales. Lo que la persona elige (plataformas, lista, país) queda en el teléfono. Las búsquedas pasan por el servidor para consultar TMDB y no se guardan.
- **Público objetivo:** para todo público mayor de 13 (los pósters y tráileres son de películas de cualquier calificación). Sin anuncios.
- **Clasificación de contenido:** app de referencia o información. Muestra pósters y tráileres de terceros.
- **Notificaciones:** los avisos de «Mi lista» son de la app nativa; en la TWA de Play no están (en `twa-manifest.json`, `enableNotifications` es falso).

## Antes de pegar
- **Decidir el nombre** antes de publicar para todos (para la prueba cerrada no hace falta).
- **Licencias:** TMDB permite su API gratis en apps no comerciales. Si algún día hay publicidad o cobro, hace falta su licencia comercial y revisar las condiciones de JustWatch (sin verificar).
- Cada punto tiene que estar en la versión publicada. Si algo se saca de la app, se saca de acá.
