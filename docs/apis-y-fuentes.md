# VeoMás · APIs y fuentes que podrían sumarse (10/11/2026)

Lo que sigue sale de las páginas oficiales de cada servicio cuando pude abrirlas, y de resúmenes de terceros cuando no. **Cada dato dice cuál es el caso.** Antes de usar cualquiera con plata de por medio, confirmá el plan y los términos en la página del servicio.

## 1. Dónde ver películas y series

| Servicio | Qué da | Plan gratis | Comercial | Estado |
|---|---|---|---|---|
| **TMDB** (el que ya se usa) | Catálogo, y «dónde ver» con datos de JustWatch | Gratis para uso no comercial | **No**: la publicidad o el cobro piden licencia comercial | Ya integrado. Los borradores del pedido de licencia están en `docs/licencias-y-dgo.md` y no se mandaron |
| **Watchmode** ([página oficial](https://api.watchmode.com/)) | Fuentes de streaming en 54 países (Argentina, Brasil, Chile, Colombia, Ecuador, México, Panamá y Perú figuran), fechas de estreno, cambios y títulos que se van | **Developer: 2.500 créditos por mes**, solo uso no comercial y citando la fuente, fuentes en **hasta 3 países**, un adelanto de los próximos 10 títulos que se van | Desde **US$ 349 por mes** (Startup): 40.000 créditos, sin citar, 54 países, enlaces directos a las apps (deep links), calendario completo de salidas | Verificado en su página. Los links directos, que serían lo más útil, son del plan caro |
| **Streaming Availability** (Movie of the Night, por RapidAPI) | Disponibilidad en ~65 países, búsqueda por catálogo | Dice que el plan gratis trae todas las funciones | Precios y límites **sin verificar** (la página no los muestra) | No pude confirmar la lista de países ni si cubre Latinoamérica: pedirla en [su documentación](https://docs.movieofthenight.com/) |
| **JustWatch** (acuerdo de socios) | La fuente original de los datos de TMDB | — | Es lo que pide la licencia comercial | Borrador en `docs/licencias-y-dgo.md`, sin mandar |

**Recomendación:** seguir con TMDB mientras la app sea gratis y sin publicidad (etapa 1). Para tener **avisos de «llegó» y «se va»** de verdad, lo más barato es lo que ya hay: el cron semanal de Web Push compara con TMDB (ver `docs/avisos-push.md`). Watchmode solo compensa si se pasa a licencia comercial y se quieren los links directos a cada app.

## 2. Calificaciones y datos extra

| Servicio | Qué da | Límite | Estado |
|---|---|---|---|
| **MDBList** | Una sola consulta con IMDb, Rotten Tomatoes, Metacritic, Letterboxd y Trakt | 1.000 consultas por día en el plan gratis, **según una guía de terceros** (sin confirmar en su sitio) | Sirve para mostrar «qué tan buena es» sin pedir cinco APIs. Falta leer sus términos |
| **OMDb** | IMDb, Rotten Tomatoes y Metacritic por título | 1.000 por día (de terceros) | Sin verificar; los términos limitan el uso comercial |
| **TVmaze** | Calendario de series y de emisión, sin clave | Unas 20 consultas por 10 segundos por IP (de terceros) | Gratis para uso no comercial; la atribución **sin confirmar** |
| **Wikidata** | Premios, enlaces directos a plataformas | — | **Ya integrado** |

## 3. Deportes

| Servicio | Qué da | Límite | Estado |
|---|---|---|---|
| **ESPN (scoreboard público)** | Lo que usa la sección Deportes hoy | — | **No es una API oficial**: puede cambiar o cortarse sin aviso. Conviene tener un plan B |
| **football-data.org** ([página oficial](https://www.football-data.org/pricing)) | Fútbol: calendarios y resultados | **Gratis: 12 competencias, 10 consultas por minuto, resultados con demora.** Pagos desde €12 por mes | Verificado, pero la página no dice qué 12 son ni si hay sudamericanas; hay que mirar su [cobertura](https://www.football-data.org/coverage) |
| **TheSportsDB** ([términos](https://www.thesportsdb.com/docs_terms_of_use.php)) | Calendarios y programación de TV | Gratis: **no se puede publicar en tiendas**; pago para apps | Ya descartada para rugby y béisbol: la prueba con Argentina devolvió vacío |
| **API-Football** | Fútbol con datos por partido | — | Su página de precios bloqueó mi consulta (403): **sin verificar** |

**Ninguna de estas APIs trae «qué canal lo pasa» por país de forma confiable.** Por eso la tabla `derechos.js` es curada a mano, con fuente y fecha de verificación.

## 4. Avisos con la web cerrada

| Servicio | Qué da | Límite | Estado |
|---|---|---|---|
| **Web Push propio** (lo que se programó) | Notificaciones sin intermediarios | Gratis; necesita guardar las suscripciones | Programado y probado con datos falsos. Falta configurar las claves y probarlo en un navegador real (ver `docs/avisos-push.md`) |
| **Upstash Redis** ([plan gratis](https://upstash.com/pricing/redis)) | Dónde guardar las suscripciones | **500.000 comandos por mes y 250 MB** | Verificado en su página; no dice si se puede usar comercialmente |
| **OneSignal** ([precios](https://onesignal.com/pricing)) | Avisos web y móviles ya armados, con panel | **Web: hasta 10.000 suscriptores.** Móvil sin tope hasta 1.000 usuarios activos al mes. Pago desde US$ 19 por mes | Verificado. Es la alternativa si no se quiere mantener el servidor propio; su página no aclara el uso comercial |

## 5. Lo que no encontré

- Una API **pública y gratuita de derechos de TV deportivos por país**: no apareció ninguna.
- Los precios y la cobertura de Latinoamérica de **Streaming Availability**.
- Los términos comerciales de **MDBList**, **OMDb** y **TVmaze** en sus propios sitios.

## 6. Nombre, dominios y licencia de TMDB (10/11/2026)

- **Dominios** (consulta RDAP del 10/11/2026): `veomas.ar` y `veomas.app` **no figuran registrados**; `veomas.com.ar` **está registrado** (vence el 22/06/2027 según la consulta del 07/11). Si cambia el nombre: `modover.ar` y `miratodo.ar` tampoco figuran registrados. Que no figure no garantiza que esté libre: confirmalo en el registrador (NIC Argentina para `.ar`).
- **Nombre «VeoMás» en las tiendas:** una búsqueda web no mostró ninguna app con ese nombre en Google Play ni en la App Store. **No alcanza como prueba**: falta buscar adentro de cada tienda, en Instagram y en TikTok, y en la base de marcas del INPI (con búsqueda fonética).
- **Licencia comercial de TMDB:** los [términos oficiales](https://themoviedb.org:443/api-terms-of-use) dicen que cualquier uso comercial (la publicidad cuenta) necesita un **acuerdo escrito** con TMDB, que puede tener costo, y que TMDB decide qué es comercial. No encontré un formulario ni un precio oficial: un foro de TMDB muestra a alguien pidiéndola por mail a sales@themoviedb.org, y un directorio de terceros habla de US$ 149 por mes para empresas de menos de US$ 1 millón (**sin verificar**). Mientras la app sea gratis y sin publicidad, no hace falta.

## 7. Tabla de derechos: qué se verificó el 10/11/2026

Se revisó contra notas de medios de 2026 cada entrada que no tenía fuente. **Cambió lo siguiente** (cada entrada tiene ahora link y fecha en `derechos.js`; las que dicen «por confirmar» tienen fuentes que no coinciden o de una sola nota):

| Competencia | Antes | Ahora | Por qué |
|---|---|---|---|
| F1 en Argentina | Disney+, Fox Sports, F1 TV | ESPN, Disney+, F1 TV | Las guías de 2026 dicen ESPN y Disney+ Premium; Fox Sports no aparece |
| F1 en México | Sky, F1 TV | FOX, Sky, F1 TV | Las fuentes no coinciden: por confirmar |
| Libertadores (Sudamérica) | Disney+ | ESPN, Disney+ | Fuente: Vanguardia |
| Champions (Latinoamérica) | Disney+ | ESPN, Disney+ | México: FOX y HBO Max (última temporada del acuerdo); desde 2027-28 se suma Paramount+ |
| Premier League (Latinoamérica) | Disney+ | ESPN, Disney+ | ESPN tiene la licencia hasta 2027-28 |
| LaLiga (Sudamérica) | Disney+, DGO | ESPN, Disney+, DSports, DGO | ESPN y DSports se reparten los 380 partidos |
| NBA en México | Disney+, League Pass | ESPN, Disney+, Prime Video, League Pass | Cada partido sale por una señal distinta |
| Chile | TNT Sports, HBO Max | + Canal 13 | Un partido por fecha, gratis |
| Tenis (Latinoamérica) | Disney+ | ESPN, Disney+ | Wimbledon y Roland Garros; del US Open no hay fuente de 2026 |

Sin cambios pero **con fuente nueva**: Liga Profesional (ESPN Premium o TNT Sports según el partido), Liga BetPlay (Win Sports+ y Win Play), Liga 1 de Perú (L1 MAX) y Liga MX (ViX, FOX y TV abierta; Prime Video no apareció).

**Siguen sin fuente anotada** y la página lo avisa («sin fuente anotada: confirmalo antes de verlo»): MLB, NHL, Campeonato Uruguayo y Copa Sudamericana. No encontré resultados fiables para el Uruguayo.
