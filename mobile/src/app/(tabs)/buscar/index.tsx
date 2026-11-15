import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Stack } from 'expo-router';
import { Poster } from '../../../components/Poster';
import { tmdb, type Resultado } from '../../../lib/api';
import { useEstado } from '../../../lib/estado';
import { C } from '../../../lib/tema';

type Pagina = { results: Resultado[] };

// Busca en castellano de España y de Latinoamérica a la vez: así aparece con cualquiera de sus dos nombres
// («Duro de matar» y «La jungla de cristal»), igual que en la web.
async function buscar(q: string, region: string): Promise<Resultado[]> {
  const [es, mx] = await Promise.all(['es-ES', 'es-MX'].map(language =>
    tmdb<Pagina>('/search/multi', { query: q, region, include_adult: false, language }).catch(() => ({ results: [] as Resultado[] }))));
  const vistos = new Set<string>();
  const nombreMx = new Map(mx.results.map(r => [`${r.media_type}${r.id}`, r]));
  return [...es.results, ...mx.results]
    .filter(r => r.media_type === 'movie' || r.media_type === 'tv')
    .filter(r => { const k = `${r.media_type}${r.id}`; return !vistos.has(k) && !!vistos.add(k); })
    .map(r => nombreMx.get(`${r.media_type}${r.id}`) || r); // el nombre de Latinoamérica primero
}

export default function Buscar() {
  const e = useEstado();
  const { width } = useWindowDimensions();
  const [q, setQ] = useState('');
  const [res, setRes] = useState<Resultado[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const columnas = width > 600 ? 5 : 3;
  const ancho = Math.floor((width - 16 * 2 - 12 * (columnas - 1)) / columnas);

  useEffect(() => {
    const texto = q.trim();
    if (texto.length < 2) { setRes(null); setCargando(false); return; }
    setCargando(true);
    let vivo = true;
    const t = setTimeout(() => {
      buscar(texto, e.region).then(r => { if (vivo) { setRes(r); setCargando(false); } });
    }, 350);
    return () => { vivo = false; clearTimeout(t); };
  }, [q, e.region]);

  return (
    <>
      <Stack.Screen options={{
        headerSearchBarOptions: {
          placeholder: 'Peli o serie',
          autoCapitalize: 'none',
          hideWhenScrolling: false,
          onChangeText: ev => setQ(ev.nativeEvent.text),
          onCancelButtonPress: () => setQ(''),
        },
      }} />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        data={res || []}
        key={columnas}
        numColumns={columnas}
        keyExtractor={r => `${r.media_type}${r.id}`}
        renderItem={({ item }) => <Poster r={item} ancho={ancho} />}
        columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 }}
        ListEmptyComponent={
          cargando ? <ActivityIndicator style={{ marginTop: 40 }} color={C.suave} />
          : <Text style={s.vacio}>{res ? `No encontramos «${q.trim()}». Probá con el nombre original o en inglés.` : 'Escribí el nombre de una peli o serie y te decimos dónde verla.'}</Text>
        }
      />
    </>
  );
}

const s = StyleSheet.create({
  vacio: { color: C.suave, fontSize: 15, textAlign: 'center', marginTop: 40, paddingHorizontal: 32 },
});
