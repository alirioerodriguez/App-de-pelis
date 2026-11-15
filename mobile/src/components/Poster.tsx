import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { anioDe, imagen, tipoDe, tituloDe, type Resultado } from '../lib/api';
import { C } from '../lib/tema';

// Póster que abre la ficha. «ancho» define el tamaño; el alto sale de la proporción 2:3 de TMDB.
export function Poster({ r, ancho = 120, conTexto = true }: { r: Resultado; ancho?: number; conTexto?: boolean }) {
  const titulo = tituloDe(r);
  const uri = imagen(r.poster_path, ancho > 160 ? 'w342' : 'w185');
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/titulo/[tipo]/[id]', params: { tipo: tipoDe(r), id: String(r.id) } })}
      style={({ pressed }) => [{ width: ancho, opacity: pressed ? 0.7 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={`${titulo}${anioDe(r) ? `, ${anioDe(r)}` : ''}`}
    >
      {uri
        ? <Image source={{ uri }} style={[s.img, { width: ancho, height: ancho * 1.5 }]} contentFit="cover" transition={150} recyclingKey={String(r.id)} />
        : <View style={[s.img, s.vacio, { width: ancho, height: ancho * 1.5 }]}><Text style={s.vacioTxt} numberOfLines={4}>{titulo}</Text></View>}
      {conTexto && <Text style={s.titulo} numberOfLines={2}>{titulo}</Text>}
      {conTexto && !!anioDe(r) && <Text style={s.anio}>{anioDe(r)}</Text>}
    </Pressable>
  );
}

const s = StyleSheet.create({
  img: { borderRadius: 10, backgroundColor: C.tarjeta },
  vacio: { alignItems: 'center', justifyContent: 'center', padding: 8 },
  vacioTxt: { color: C.suave, fontSize: 13, textAlign: 'center' },
  titulo: { color: C.texto, fontSize: 13, fontWeight: '600', marginTop: 6 },
  anio: { color: C.suave, fontSize: 12, marginTop: 1 },
});
