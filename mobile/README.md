# ¿Dónde la veo? · app para Android y iPhone

App nativa hecha con Expo 58 (la misma base que Savia). Muestra la web publicada en
`https://alirioerodriguez.github.io/App-de-pelis/`, así cada cambio que se publica en la web
llega solo a la app, sin volver a compilarla.

Lo que agrega la app sobre la web:
- **"▶ Ver en Netflix" (y Disney+, Prime Video, Max, Apple TV…)** se abre en la app de la plataforma si está instalada.
- **Botón atrás de Android**: cierra la ficha abierta en vez de salir de la app.
- **Compartir** usa el menú nativo del teléfono (WhatsApp, Instagram, etc.).
- Pantalla de carga, ícono propio y aviso de "Sin conexión" con Reintentar.

Identificador: `com.alirio.dondelaveo` (Android e iPhone).

## Compilar (desde tu compu)

Necesitás Node y una cuenta de Expo (la misma de Savia).

```bash
cd mobile
npm install
npx eas login          # si no iniciaste sesión
npx eas init           # la primera vez: crea el proyecto en Expo y guarda su ID en app.json
```

### Android (gratis)

```bash
npm run build:android  # = eas build --platform android --profile apk
```

Al terminar, EAS te da un link y un QR para descargar el `.apk`. Se instala en cualquier Android
(el teléfono pide permitir "instalar apps de origen desconocido"). Ese mismo `.apk` sirve para
probar en Firebase Test Lab (Robo test).

Para publicarla en Google Play: cuenta de desarrollador (25 dólares, una sola vez) y
`eas build --platform android --profile production` (genera el `.aab` que pide la tienda).

### iPhone

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
