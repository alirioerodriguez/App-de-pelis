import { useEffect } from 'react';
import { DarkTheme, router, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { activarRevision, fichaDelAviso } from '../lib/avisos';
import { cargarEstado } from '../lib/estado';
import { C } from '../lib/tema';

SplashScreen.preventAutoHideAsync().catch(() => {});

const tema = { ...DarkTheme, colors: { ...DarkTheme.colors, background: C.fondo, card: C.fondo, primary: C.acento, text: C.texto, border: C.linea } };

function abrirAviso(r: Notifications.NotificationResponse | null) {
  const f = fichaDelAviso(r);
  if (f) router.push({ pathname: '/titulo/[tipo]/[id]', params: { tipo: f.tipo, id: String(f.id) } });
}

export default function Raiz() {
  useEffect(() => {
    cargarEstado().finally(() => SplashScreen.hideAsync().catch(() => {}));
    activarRevision();
    // La app se abrió tocando un aviso, o se tocó uno con la app abierta: va directo a esa ficha
    const inicial = Notifications.getLastNotificationResponse();
    if (inicial) { Notifications.clearLastNotificationResponse(); setTimeout(() => abrirAviso(inicial), 300); }
    const sub = Notifications.addNotificationResponseReceivedListener(abrirAviso);
    return () => sub.remove();
  }, []);

  return (
    <ThemeProvider value={tema}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerTintColor: C.texto, contentStyle: { backgroundColor: C.fondo } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="titulo/[tipo]/[id]" options={{ title: '', headerTransparent: true, headerBackButtonDisplayMode: 'minimal' }} />
      </Stack>
    </ThemeProvider>
  );
}
