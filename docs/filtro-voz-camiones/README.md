# Filtro de voz para cabinas de camión (gandolas, grúas)

Investigación previa para que la voz del conductor se escuche limpia a pesar del ruido del camión, **escribiendo lo mínimo de código propio** y apoyándose en lo que ya existe en código abierto.

Fecha de la investigación: octubre de 2026. Cada dato lleva su fuente al final; lo que no se pudo confirmar está marcado como **(sin confirmar)**.

---

## 1. Conclusión corta

1. **No hay que inventar un filtro.** El problema ya está resuelto en código abierto (RNNoise, GTCRN, DeepFilterNet) y además el propio teléfono trae supresión de ruido. El trabajo real es **elegir, integrar y probar con ruido de camión de verdad**.
2. **Lo que más mejora el audio no es software:** es el micrófono cerca de la boca (manos libres / auricular Bluetooth). Con el teléfono en el tablero, ningún filtro hace milagros (ver sección 3).
3. **"Venderlo como open source" no tiene sentido tal cual:** el filtro en sí ya es gratis y existe. Lo que sí sería un aporte nuevo y valioso es **un conjunto de grabaciones de ruido de cabina de camión + un banco de pruebas + un modelo reentrenado con ese ruido**. Eso no existe hoy de forma abierta (no encontré ninguno) y es lo que daría reputación al repositorio. El dinero, si lo hay, sale de la app o de un servicio, no del filtro.

---

## 2. El problema: cómo suena un camión

| Dato | Valor | Fuente |
|---|---|---|
| Ruido en cabina, camiones nuevos (estudio UK) | ~84 dB(A) | [IOA] |
| Ruido en cabina, camiones viejos (mismo estudio) | ~88,5 dB(A) | [IOA] |
| Medido en puesto del conductor (EE. UU.) | 92–95 dB(A) antes de mejoras | [NTL] |
| Límite legal EE. UU. en asiento del conductor | 90 dB(A) | [CFR] |

Características que importan para el filtro:

- **Domina la baja frecuencia (20–200 Hz):** motor, escape, rodadura. La escala dB(A) la subestima, así que el ruido "real" es aún más grave de lo que dicen esas cifras [Chalmers][ARTSA].
- **Parte estacionaria** (motor a régimen constante, ventiladores): la atacan bien hasta los filtros clásicos.
- **Parte no estacionaria** (frenos de aire, freno motor, cambios, bocina, baches, radio, viento con ventana abierta): ahí los filtros clásicos fallan y hacen falta redes neuronales [Picovoice][Tampere].
- **Gandolas y camiones viejos en Venezuela/Argentina** probablemente estén en el extremo ruidoso de la tabla **(sin confirmar: no hay mediciones publicadas de esas flotas)**.

---

## 3. Por qué el micrófono pesa más que el algoritmo

Estimación aproximada, no medición:

- Una voz normal a 1 m ronda los 60 dB; levantando la voz, 70 dB. Con 85–95 dB de ruido, un teléfono en el tablero recibe **la voz 15–30 dB por debajo del ruido**.
- Los modelos de supresión se entrenan y se evalúan mayormente con relaciones señal/ruido de 0 a 20 dB. Por debajo de eso empiezan a comerse la voz o a dejar ruido.
- Un micrófono a 2–3 cm de la boca gana del orden de 20–30 dB sobre el mismo ruido. Ningún software gana eso.

**Recomendación para la app:** en el onboarding, sugerir manos libres o auricular con micrófono, y si se usa el teléfono, que esté en soporte cerca del conductor, no en la guantera ni en el tablero lejano.

---

## 4. Capas de solución, de menos a más código

### Capa 0 — Hardware (cero código)
Auricular Bluetooth con micrófono de brazo o con doble micrófono ("ENC"). Es lo que ya usan muchos camioneros para hablar por teléfono.

### Capa 1 — Lo que trae el sistema operativo (casi cero código)

**Android**
- Grabar con la fuente `VOICE_COMMUNICATION` (no `MIC`). Android exige a los fabricantes un cancelador de eco en esa ruta y suele activar supresión de ruido [AOSP].
- Activar `NoiseSuppressor` y `AcousticEchoCanceler` sobre la sesión de `AudioRecord`, y comprobar con `getEnabled()` si de verdad quedaron activos: depende del fabricante [Android AEC].
- Calidad variable según el teléfono. En gama baja (muy común en la flota) puede ser floja.

**iOS**
- Usar el modo de sesión de audio `.voiceChat` o el *voice processing* de `AVAudioEngine`.
- El modo **Aislamiento de voz** (iOS 15+, chip A12+) es muy bueno, pero **la app no puede activarlo sola**: solo puede abrir el selector del sistema (`showSystemUserInterface(.microphoneModes)`) y el usuario lo elige [Apple][Phenix].

**Si la app hace llamadas en vivo con WebRTC** (LiveKit, Jitsi, etc.): WebRTC ya trae su propio procesamiento (eco, ganancia, supresión de ruido) gratis y abierto [LiveKit]. Es clásico: bien para el zumbido constante del motor, flojo para golpes y frenos.

### Capa 2 — Filtro de baja frecuencia (unas pocas líneas)
Un filtro pasa-altos entre 80 y 120 Hz quita gran parte del retumbe del motor sin tocar la inteligibilidad. Cuidado: la voz masculina tiene su fundamental desde ~85 Hz, así que no subir de ~120 Hz o la voz suena "de radio". Es barato y complementa cualquier otra capa.

### Capa 3 — Supresión neuronal en el teléfono (integrar una librería)

| Proyecto | Licencia | Frecuencia | Tamaño / cómputo | Móvil | Comentario |
|---|---|---|---|---|---|
| **RNNoise** (Xiph) | BSD-3 | 48 kHz | Muy liviano, CPU sin GPU | Compila en C para Android/iOS; Jitsi lo usa en WebAssembly | El más probado en producción. v0.2 (2024) entrenado solo con datos públicos. **Se puede reentrenar con ruido propio.** [RNNoise][Jitsi] |
| **GTCRN** | MIT | 16 kHz | 48,2 K parámetros, 33 MMACs/s; versión streaming con RTF 0,07 en un i5 | Vía **sherpa-onnx** (tiene paquetes Flutter y React Native) | Lo más liviano de calidad decente. Ideal para gama baja. Soporte móvil de la mejora de voz en sherpa-onnx **sin confirmar** en los ejemplos oficiales. [GTCRN][sherpa-onnx][RN sherpa] |
| **DeepFilterNet 3** | MIT o Apache-2.0 (a elección) | 48 kHz | ~2,1 M parámetros (~4,2 MB en FP16); ~40 ms de latencia en modo baja latencia | Oficialmente solo Linux/macOS/Windows; existen ports a Core ML y a navegador hechos por terceros | Mejor calidad de los tres, más pesado. Mantenimiento del repo original poco activo **(sin confirmar)**. [DFN][DFN CoreML][DFN VST] |
| **DPDFNet** (Ceva) | Apache-2.0 | — | Cuatro modelos TFLite para móvil | TFLite | Derivado de DeepFilterNet2. No pude abrir la ficha para verificar detalles. [DPDFNet] |

### Capa 4 — Comercial (para comparar, no es open source)
**Krisp** a través de LiveKit: funciona en Web, Android e iOS; su disponibilidad por plan en LiveKit Cloud aparece contradictoria en la propia documentación [LiveKit ENC]. Sirve como vara de medición: si el stack abierto se acerca a Krisp en ruido de camión, está bien.

---

## 5. Advertencia: transcripción por voz

Si la app va a **transcribir** audio (notas de voz a texto, comandos), **no pasar el audio por el supresor antes del reconocedor sin probarlo**. Hay estudios donde RNNoise y otros limpiadores **empeoraron** la precisión de Whisper aunque el audio sonara mejor [ALE][arXiv]. Regla práctica: audio limpio para que lo escuche una persona; audio original (o solo con pasa-altos) para la máquina, salvo que una prueba con grabaciones reales diga lo contrario.

---

## 6. Qué usar según lo que haga la app

| Uso | Recomendación mínima |
|---|---|
| Llamadas en vivo entre conductores / central | WebRTC (LiveKit o similar) con su supresión de serie + RNNoise si no alcanza |
| Notas de voz tipo WhatsApp | Grabar con `VOICE_COMMUNICATION` (Android) / `.voiceChat` (iOS) + pasa-altos + GTCRN o RNNoise al reproducir/enviar |
| Comandos de voz o dictado | Audio crudo con pasa-altos al reconocedor; probar con y sin supresión |
| Teléfonos gama baja | GTCRN (16 kHz) antes que DeepFilterNet |

Antes de elegir framework de integración hay que saber en qué está hecha la app (Flutter, React Native, nativa o web/PWA), porque cambia qué librería es más fácil.

---

## 7. Plan para el aporte open source (lo que sí sería nuevo)

1. **Grabar ruido de cabina real** en gandolas y grúas de Buenos Aires y Venezuela: ralentí, ruta, frenos de aire, freno motor, bocina, ventana abierta. Teléfono en distintas posiciones. Con consentimiento escrito de los conductores y sin voces de terceros.
2. **Publicar el dataset** con licencia clara (CC BY 4.0 o CC0). Ojo al mezclar con datasets existentes: el ruido DEMAND que trae el DNS Challenge de Microsoft es **CC BY-SA 3.0**, que obliga a compartir derivados con la misma licencia [DNS].
3. **Banco de pruebas**: mezclar voz limpia en español con ese ruido a distintas relaciones señal/ruido y medir RNNoise, GTCRN, DeepFilterNet y la supresión nativa con métricas estándar (DNSMOS, PESQ) y, si aplica, la tasa de error de Whisper.
4. **Reentrenar RNNoise** (el repo explica cómo: ruido a 48 kHz, 16 bits, `dump_features` → `train_rnnoise.py` → `dump_rnnoise_weights.py`) y GTCRN con ese ruido. Publicar los pesos.
5. Publicar en un **repositorio propio**, separado de la app.

Esto no requiere programar un algoritmo nuevo: es datos + scripts de evaluación + entrenamiento con herramientas ya hechas.

---

## 8. Lo que no se pudo confirmar

- Mediciones de ruido de flotas de Venezuela o Argentina.
- Latencia medida de DeepFilterNet en teléfonos reales.
- Ejemplos oficiales de GTCRN en Android/iOS dentro de sherpa-onnx.
- Detalles de DPDFNet (no se pudo acceder a Hugging Face desde el entorno de investigación).
- Si el repositorio original de DeepFilterNet sigue mantenido activamente.

---

## Fuentes

- [IOA] Williams & Tempest, *Noise and the lorry driver*: https://www.ioa.org.uk/system/files/publications/D%20WILLIAMS%20W%20TEMPEST%20NOISE%20AND%20THE%20LORRY%20DRIVER.pdf
- [NTL] *Truck Noise XI*, US DOT: https://rosap.ntl.bts.gov/view/dot/10865
- [CFR] 49 CFR 393.94: https://www.law.cornell.edu/cfr/text/49/393.94
- [ARTSA] https://artsa.com.au/assets/articles/2016_10.pdf
- [Chalmers] *Components in evaluation of complex interior truck sounds*: https://research.chalmers.se/en/publication/102538
- [Picovoice] https://picovoice.ai/blog/complete-guide-to-noise-suppression/
- [Tampere] https://trepo.tuni.fi/handle/10024/139218
- [AOSP] https://source.android.com/docs/core/audio/implement-pre-processing
- [Android AEC] https://developer.android.com/reference/android/media/audiofx/AcousticEchoCanceler
- [Apple] https://developer.apple.com/documentation/avfoundation/avcapturedevice/microphonemode y https://developer.apple.com/forums/thread/844448
- [Phenix] https://phenixrts.com/docs/knowledge-base/how-to/ios-audio-pipelines/
- [RNNoise] https://github.com/xiph/rnnoise y https://archlinux.org/packages/extra/x86_64/rnnoise/
- [Jitsi] https://jitsi.org/blog/enhanced-noise-suppression-in-jitsi-meet y https://cdn.jsdelivr.net/npm/@jitsi/rnnoise-wasm@0.2.0/README.md
- [GTCRN] https://github.com/Xiaobin-Rong/gtcrn
- [sherpa-onnx] https://pub.dev/documentation/sherpa_onnx/latest/
- [RN sherpa] https://github.com/XDcobra/react-native-sherpa-onnx
- [DFN] https://github.com/Rikorose/DeepFilterNet
- [DFN CoreML] https://huggingface.co/aufklarer/DeepFilterNet3-CoreML
- [DFN VST] https://github.com/Shuichi346/DeepFilterNet3-VST3
- [DPDFNet] https://huggingface.co/Ceva-IP/DPDFNet
- [LiveKit] https://docs.livekit.io/home/client/tracks/noise-cancellation
- [LiveKit ENC] https://docs.livekit.io/recipes/enhanced-noise-cancellation
- [DNS] https://github.com/microsoft/DNS-Challenge/blob/master/README-DNS3.md
- [ALE] https://www.al-enterprise.com/en/blog/noise-reduction-study-asr
- [arXiv] https://arxiv.org/html/2603.04710v1
