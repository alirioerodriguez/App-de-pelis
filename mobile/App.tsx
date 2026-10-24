import { useCallback, useEffect, useRef, useState, type ComponentType, type Ref } from 'react';
import { ActivityIndicator, BackHandler, Linking, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewProps } from 'react-native-webview';
import type { ShouldStartLoadRequest, WebViewMessageEvent, WebViewNavigation, WebViewOpenWindowEvent } from 'react-native-webview/lib/WebViewTypes';

// Los tipos de react-native-webview 14 declaran el componente con un parámetro que por defecto anula
// todas las props (WebViewProps & undefined). Se declara el tipo correcto una sola vez acá.
type WebViewHandle = WebView<{}>;
const RNWebView = WebView as unknown as ComponentType<WebViewProps & { ref?: Ref<WebViewHandle> }>;

// La app muestra la web publicada: cada cambio que se publica llega solo, sin volver a compilar.
const SITE = 'https://alirioerodriguez.github.io/App-de-pelis/';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Lo que es de la web se queda adentro; cualquier otro enlace (Netflix, Disney+, YouTube…) se abre afuera,
// así el teléfono lo manda a la app de esa plataforma si está instalada.
function isInternal(url: string) {
  return url.startsWith(SITE) || url.startsWith('about:') || url.startsWith('data:') || url.startsWith('blob:');
}

// Enlaces "intent://" de Android: se abre la URL https equivalente, que Android manda a la app.
function fromIntent(url: string) {
  const fallback = /S\.browser_fallback_url=([^;]+)/.exec(url);
  if (fallback) return decodeURIComponent(fallback[1]);
  const m = /^intent:\/\/([^#]+)#Intent;.*scheme=([^;]+)/.exec(url);
  return m ? `${m[2]}://${m[1]}` : null;
}

function openOutside(url: string) {
  const target = url.startsWith('intent://') ? fromIntent(url) : url;
  if (target) Linking.openURL(target).catch(() => {});
}

export default function App() {
  const web = useRef<WebViewHandle>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  // Respaldo: si la web tarda o falla sin avisar, la pantalla de carga no se queda para siempre
  useEffect(() => {
    const t = setTimeout(() => { setLoading(false); SplashScreen.hideAsync().catch(() => {}); }, 8000);
    return () => clearTimeout(t);
  }, []);

  // Botón "atrás" de Android: vuelve dentro de la app (cierra la ficha abierta) antes de salir
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack) { web.current?.goBack(); return true; }
      return false;
    });
    return () => sub.remove();
  }, [canGoBack]);

  const onShouldStart = useCallback((req: ShouldStartLoadRequest) => {
    // isTopFrame solo llega en iPhone: si es false, es un recuadro interno de la página y se deja cargar
    if (req.isTopFrame === false || isInternal(req.url)) return true;
    openOutside(req.url);
    return false;
  }, []);

  const onOpenWindow = useCallback((e: WebViewOpenWindowEvent) => openOutside(e.nativeEvent.targetUrl), []);

  // La web pide cosas nativas por mensaje: por ahora, el menú de compartir del teléfono
  const onMessage = useCallback((e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === 'share') Share.share({ title: msg.title, message: `${msg.text}\n${msg.url}`, url: msg.url }).catch(() => {});
    } catch {}
  }, []);

  const retry = () => { setFailed(false); setLoading(true); web.current?.reload(); };

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
        <RNWebView
          ref={web}
          source={{ uri: SITE }}
          style={styles.web}
          applicationNameForUserAgent="DondeLaVeoApp/1.0"
          originWhitelist={['*']}
          onShouldStartLoadWithRequest={onShouldStart}
          onOpenWindow={onOpenWindow}
          setSupportMultipleWindows
          onMessage={onMessage}
          onNavigationStateChange={(s: WebViewNavigation) => setCanGoBack(s.canGoBack)}
          onLoadEnd={() => { setLoading(false); SplashScreen.hideAsync().catch(() => {}); }}
          onError={() => { setFailed(true); setLoading(false); SplashScreen.hideAsync().catch(() => {}); }}
          onContentProcessDidTerminate={() => web.current?.reload()}
          onRenderProcessGone={() => web.current?.reload()}
          domStorageEnabled
          javaScriptEnabled
          allowsBackForwardNavigationGestures
          pullToRefreshEnabled
          allowsInlineMediaPlayback
          decelerationRate="normal"
          overScrollMode="never"
        />
        {loading && !failed && (
          <View style={styles.cover} pointerEvents="none"><ActivityIndicator color="#ffffff" /></View>
        )}
        {failed && (
          <View style={styles.cover}>
            <Text style={styles.title}>Sin conexión</Text>
            <Text style={styles.text}>Revisá tu internet y probá de nuevo.</Text>
            <Pressable style={styles.btn} onPress={retry}><Text style={styles.btnText}>Reintentar</Text></Pressable>
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  web: { flex: 1, backgroundColor: '#000000' },
  cover: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: '#f5f5f7', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  text: { color: '#98989d', fontSize: 15, textAlign: 'center', marginBottom: 20 },
  btn: { backgroundColor: '#0a84ff', borderRadius: 999, paddingHorizontal: 22, paddingVertical: 12 },
  btnText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
});
