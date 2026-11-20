# VeoMás · app para Android y iPhone

App nativa hecha con Expo 58 y Expo Router (la misma base que Savia). Desde el 15/11/2026 las pantallas son
nativas (antes mostraba la web dentro de un WebView, y Apple rechaza eso por la regla 4.2). Los datos salen de la
misma función de la web (`/api/tmdb` en Vercel), así la clave de TMDB nunca está en el teléfono.

Pantallas (`src/app/`):
- **Inicio** `(tabs)/(inicio)`: lo que está en tus plataformas, lo más visto, en cines, próximos estrenos y series populares.
- **Buscar** `(tabs)/buscar`: barra de búsqueda del sistema; busca en castellano de España y de Latinoamérica a la vez.
- **Mi lista** `(tabs)/lista`: lo guardado, con avisos cuando llega a una plataforma.
- **Plataformas** `(tabs)/ajustes`: país, «Mis plataformas» y créditos de TMDB y JustWatch.
- **Ficha** `titulo/[tipo]/[id]`: semáforo (la tenés / suscripción / alquiler / no está), plataformas que abren su app,
  guardar, tráiler, compartir y recomendadas.

Lógica en `src/lib/`: `api.ts` (consultas), `plataformas.ts` (países, enlaces y semáforo), `estado.ts` (lo guardado en el
teléfono) y `avisos.ts` (revisión de «Mi lista» en segundo plano, mínimo cada 6 h; en Expo Go no corre).

Identificador: `ar.alirio.dondelaveo` (Android e iPhone), el mismo de la versión web empaquetada (TWA, firmada y con `assetlinks.json`). En Google Play el paquete no se puede cambiar después de subirlo: así la app nativa reemplaza a la TWA como una actualización, sin perder la ficha ni las reseñas.

## Compilar (desde tu compu)

Necesitás Node y una cuenta de Expo (la misma de Savia).

```bash
npm install -g eas-cli # una sola vez por compu (en Mac, si da EACCES: sudo npm install -g eas-cli)
cd mobile
npm install
eas login              # si no iniciaste sesión
eas init               # la primera vez: crea el proyecto en Expo y guarda su ID en app.json
```

`npx eas …` no funciona: el paquete se llama `eas-cli`, no `eas`.

### Android (gratis)

```bash
npm run build:android  # = eas build --platform android --profile apk
```

Al terminar, EAS te da un link y un QR para descargar el `.apk`. Se instala en cualquier Android
(el teléfono pide permitir "instalar apps de origen desconocido"). Ese mismo `.apk` sirve para
probar en Firebase Test Lab (Robo test).

Para publicarla en Google Play: cuenta de desarrollador (25 dólares, una sola vez) y
`eas build --platform android --profile production` (genera el `.aab` que pide la tienda).

### iPhone con Xcode (en la Mac)

```bash
npm ci
npx expo prebuild -p ios
open ios/VeoMas.xcworkspace
```

En Xcode: Signing & Capabilities → tu equipo de la cuenta paga (la app usa avisos, y eso no se puede firmar con la
cuenta gratis) → ▶ con el iPhone conectado. Para la tienda: Any iOS Device → Product → Archive → Distribute App.

### iPhone con EAS

Requiere la cuenta de Apple Developer (99 dólares por año): sin ella, Apple no deja instalar apps
fuera de la App Store.

```bash
npm run build:ios      # = eas build --platform ios --profile iphone
```

EAS te guía para registrar tu iPhone y firmar la app; después la instalás desde el link que te da.
Para la App Store: `eas build --platform ios --profile production` y `eas submit --platform ios`.

## Probar mientras se desarrolla

```bash
npx expo start         # escaneá el QR con la app Expo Go
npm run typecheck      # chequeo de tipos
```
