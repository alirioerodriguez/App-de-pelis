import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { imagen, SITE, tmdb, type Proveedor } from '../../../lib/api';
import { alternarPlataforma, elegirPais, useEstado } from '../../../lib/estado';
import { PAISES } from '../../../lib/plataformas';
import { C } from '../../../lib/tema';

// Plataformas del país: las de pelis y series juntas, en el orden en que las muestra JustWatch
async function plataformasDe(region: string): Promise<Proveedor[]> {
  const [m, t] = await Promise.all(['movie', 'tv'].map(tipo =>
    tmdb<{ results: (Proveedor & { display_priorities?: Record<string, number> })[] }>(`/watch/providers/${tipo}`, { watch_region: region, language: 'es-MX' })
      .then(r => r.results, () => [])));
  const porId = new Map<number, Proveedor>();
  [...m, ...t].forEach(p => porId.has(p.provider_id) || porId.set(p.provider_id, { ...p, display_priority: p.display_priorities?.[region] ?? p.display_priority }));
  return [...porId.values()].sort((a, b) => (a.display_priority ?? 999) - (b.display_priority ?? 999)).slice(0, 40);
}

export default function Ajustes() {
  const e = useEstado();
  const [lista, setLista] = useState<Proveedor[] | null>(null);
  const [verPaises, setVerPaises] = useState(false);
  useEffect(() => { setLista(null); plataformasDe(e.region).then(setLista); }, [e.region]);
  const mias = new Set(e.mine);
  // Las elegidas arriba, así se ven sin buscarlas
  const orden = lista ? [...lista.filter(p => mias.has(p.provider_id)), ...lista.filter(p => !mias.has(p.provider_id))] : null;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={s.contenido}>
      <Text style={s.seccion}>País</Text>
      <Pressable style={s.fila} onPress={() => setVerPaises(v => !v)} accessibilityRole="button" accessibilityState={{ expanded: verPaises }}>
        <Text style={s.filaTexto}>{PAISES[e.region] || e.region}</Text>
        <Text style={s.filaDato}>{verPaises ? 'Cerrar' : 'Cambiar'}</Text>
      </Pressable>
      {verPaises && (
        <View style={s.grupo}>
          {Object.entries(PAISES).map(([cod, nombre]) => (
            <Pressable key={cod} style={s.opcion} onPress={() => { elegirPais(cod); setVerPaises(false); Haptics.selectionAsync().catch(() => {}); }}
              accessibilityRole="radio" accessibilityState={{ checked: cod === e.region }}>
              <Text style={s.filaTexto}>{nombre}</Text>
              {cod === e.region && <Text style={s.check}>✓</Text>}
            </Pressable>
          ))}
        </View>
      )}

      <Text style={s.seccion}>Mis plataformas</Text>
      <Text style={s.ayuda}>Marcá las que pagás. En cada ficha te decimos si ya la tenés incluida.</Text>
      {!orden ? <ActivityIndicator style={{ marginTop: 20 }} color={C.suave} /> : (
        <View style={s.grilla}>
          {orden.map(p => {
            const sel = mias.has(p.provider_id);
            return (
              <Pressable key={p.provider_id} style={[s.plat, sel && s.platSel]}
                onPress={() => { alternarPlataforma(p.provider_id); Haptics.selectionAsync().catch(() => {}); }}
                accessibilityRole="checkbox" accessibilityState={{ checked: sel }} accessibilityLabel={p.provider_name}>
                <Image source={{ uri: imagen(p.logo_path, 'w92') }} style={s.logo} />
                <Text style={s.platNombre} numberOfLines={2}>{p.provider_name}</Text>
                {sel && <Text style={s.estrella}>⭐</Text>}
              </Pressable>
            );
          })}
        </View>
      )}

      <Text style={s.seccion}>Acerca de</Text>
      <View style={s.grupo}>
        <Text style={s.legal}>Datos de disponibilidad: JustWatch. Fichas e imágenes: TMDB. Este producto usa la API de TMDB, pero TMDB no lo respalda ni lo certifica.</Text>
        <Pressable style={s.opcion} onPress={() => Linking.openURL('https://www.justwatch.com').catch(() => {})} accessibilityRole="link">
          <Text style={s.link}>JustWatch</Text>
        </Pressable>
        <Pressable style={s.opcion} onPress={() => Linking.openURL('https://www.themoviedb.org').catch(() => {})} accessibilityRole="link">
          <Text style={s.link}>The Movie Database (TMDB)</Text>
        </Pressable>
        <Pressable style={s.opcion} onPress={() => Linking.openURL(`${SITE}privacidad.html`).catch(() => {})} accessibilityRole="link">
          <Text style={s.link}>Política de privacidad</Text>
        </Pressable>
        <Text style={s.version}>VeoMás {Constants.expoConfig?.version || ''}</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  contenido: { padding: 16, paddingBottom: 48 },
  seccion: { color: C.suave, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginTop: 24, marginBottom: 8, letterSpacing: 0.5 },
  ayuda: { color: C.suave, fontSize: 14, marginBottom: 12 },
  fila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.tarjeta, borderRadius: 12, padding: 14 },
  filaTexto: { color: C.texto, fontSize: 16 },
  filaDato: { color: C.acento, fontSize: 16 },
  grupo: { backgroundColor: C.tarjeta, borderRadius: 12, marginTop: 8, overflow: 'hidden' },
  opcion: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.linea },
  check: { color: C.acento, fontSize: 17, fontWeight: '700' },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  plat: { width: '31%', backgroundColor: C.tarjeta, borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  platSel: { borderColor: C.verde },
  logo: { width: 44, height: 44, borderRadius: 10 },
  platNombre: { color: C.texto, fontSize: 12, textAlign: 'center', marginTop: 6 },
  estrella: { position: 'absolute', top: 4, right: 6, fontSize: 12 },
  legal: { color: C.suave, fontSize: 13, lineHeight: 18, padding: 14 },
  link: { color: C.acento, fontSize: 16 },
  version: { color: C.suave, fontSize: 12, padding: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.linea },
});
