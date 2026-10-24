# ¿Dónde la veo?

Buscador de películas y series que muestra en qué plataforma de streaming están disponibles en tu país de Latinoamérica (suscripción, gratis, alquiler o compra). Arranca siempre en Argentina; el país se cambia desde la bandera del encabezado.

App publicada: **https://donde-la-veo-app.vercel.app** (la dirección vieja, `alirioerodriguez.github.io/App-de-pelis`, redirige acá y se lleva «Mis plataformas» y «Mi lista»).

## Uso
No pide ninguna clave. Las consultas a TMDB pasan por `api/tmdb.js`, una función de Vercel que agrega la clave del proyecto y guarda las respuestas en caché (búsquedas 1 h, el resto 6 h). Solo responde a su propia página.

Para publicarla en otro proyecto de Vercel: importar este repo y agregar la variable de entorno `TMDB_TOKEN` con el *Read Access Token* (v4) o la *API Key* (v3) de themoviedb.org → Configuración → API.

## Qué hace
- Búsqueda en vivo de películas y series.
- Logos de la plataforma directamente en cada resultado.
- Ficha con veredicto claro: dónde verla con suscripción, gratis, alquiler o compra en Argentina.
- Lista dinámica de plataformas disponibles en AR; tocás una y ves su catálogo.
- Responsive: grilla de 2 columnas y ficha tipo hoja inferior en celular.

## Fuente de datos
TMDB `/watch/providers` (por país), datos de **JustWatch**. Premios y enlaces directos a cada plataforma: **Wikidata**. Los catálogos cambian seguido; puede haber unos días de desfase.
