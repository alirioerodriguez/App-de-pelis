import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import type { Resultado } from '../lib/api';
import { C } from '../lib/tema';
import { Poster } from './Poster';

// Fila horizontal de pósters con título. «cargar» trae los resultados; se vuelve a llamar si cambian las «deps».
export function Fila({ titulo, cargar, deps = [] }: { titulo: string; cargar: () => Promise<Resultado[]>; deps?: unknown[] }) {
  const [items, setItems] = useState<Resultado[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let vivo = true;
    setItems(null); setError(false);
    cargar().then(r => { if (vivo) setItems(r.filter(x => x.media_type !== 'person')); }, () => { if (vivo) setError(true); });
    return () => { vivo = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  if (items && !items.length) return null;
  return (
    <View style={s.caja}>
      <Text style={s.titulo} accessibilityRole="header">{titulo}</Text>
      {error ? <Text style={s.error}>No se pudo cargar. Revisá tu conexión.</Text>
        : !items ? <ActivityIndicator style={s.cargando} color={C.suave} />
        : <FlatList
            horizontal
            data={items}
            keyExtractor={r => `${r.media_type || ''}${r.id}`}
            renderItem={({ item }) => <Poster r={item} />}
            ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            showsHorizontalScrollIndicator={false}
          />}
    </View>
  );
}

const s = StyleSheet.create({
  caja: { marginTop: 20 },
  titulo: { color: C.texto, fontSize: 20, fontWeight: '700', marginBottom: 10, paddingHorizontal: 16 },
  cargando: { height: 220 },
  error: { color: C.suave, paddingHorizontal: 16, height: 60 },
});
