// Punto de entrada. La revisión de «Mi lista» en segundo plano (lib/avisos) se registra antes que las pantallas:
// cuando el sistema despierta la app cerrada para correrla, puede no cargar ninguna pantalla.
import './src/lib/avisos';
import 'expo-router/entry';
