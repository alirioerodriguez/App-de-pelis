import { FlatList, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Poster } from '../../../components/Poster';
import { useEstado } from '../../../lib/estado';
import { C } from '../../../lib/tema';

export default function MiLista() {
  const e = useEstado();
  const { width } = useWindowDimensions();
  const columnas = width > 600 ? 5 : 3;
  const ancho = Math.floor((width - 16 * 2 - 12 * (columnas - 1)) / columnas);
  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      data={e.items}
      key={columnas}
      numColumns={columnas}
      keyExtractor={t => `${t.media_type}${t.id}`}
      renderItem={({ item }) => <Poster r={{ id: item.id, media_type: item.media_type, title: item.title, poster_path: item.poster_path, release_date: item.year }} ancho={ancho} />}
      columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
      ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
      contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 }}
      ListHeaderComponent={e.items.length ? <Text style={s.nota}>Te avisamos cuando algo de tu lista llegue a una plataforma.</Text> : undefined}
      ListEmptyComponent={
        <View style={s.vacio}>
          <Text style={s.vacioTitulo}>Tu lista está vacía</Text>
          <Text style={s.vacioTexto}>Tocá «Guardar» en cualquier peli o serie. Si todavía no está en ninguna plataforma, te avisamos cuando llegue.</Text>
        </View>
      }
    />
  );
}

const s = StyleSheet.create({
  nota: { color: C.suave, fontSize: 14, paddingHorizontal: 16, marginBottom: 14 },
  vacio: { alignItems: 'center', marginTop: 60, paddingHorizontal: 32 },
  vacioTitulo: { color: C.texto, fontSize: 20, fontWeight: '700' },
  vacioTexto: { color: C.suave, fontSize: 15, textAlign: 'center', marginTop: 8, lineHeight: 21 },
});
