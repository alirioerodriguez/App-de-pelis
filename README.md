# ¿Dónde la veo?

Buscador de películas y series que muestra en qué plataforma de streaming están disponibles en tu país de Latinoamérica (suscripción, gratis, alquiler o compra). Arranca siempre en Argentina; el país se cambia desde la bandera del encabezado.

## Uso
1. Abrí `index.html` en el navegador (o publicalo en GitHub Pages / Vercel / Netlify).
2. La primera vez te pide una clave gratuita de TMDB: creá cuenta en themoviedb.org → Configuración → API. Sirve tanto la *API Key* (v3) como el *Read Access Token* (v4).
3. La clave queda guardada solo en tu navegador.

## Qué hace
- Búsqueda en vivo de películas y series.
- Logos de la plataforma directamente en cada resultado.
- Ficha con veredicto claro: dónde verla con suscripción, gratis, alquiler o compra en Argentina.
- Lista dinámica de plataformas disponibles en AR; tocás una y ves su catálogo.
- Responsive: grilla de 2 columnas y ficha tipo hoja inferior en celular.

## Fuente de datos
TMDB `/watch/providers` (por país), datos de **JustWatch**. Premios y enlaces directos a cada plataforma: **Wikidata**. Los catálogos cambian seguido; puede haber unos días de desfase.
