import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Fila } from '../../../components/Fila';
import { IDIOMA, tmdb, type Resultado, type Tipo } from '../../../lib/api';
import { useEstado } from '../../../lib/estado';
import { PAISES } from '../../../lib/plataformas';
import { C } from '../../../lib/tema';

type Pagina = { results: Resultado[] };
const con = (tipo: Tipo) => (r: Pagina) => r.results.map(x => ({ ...x, media_type: tipo }));

// Lo que está incluido en las plataformas elegidas (suscripción, gratis o con anuncios), lo más visto primero
const enMisPlataformas = (tipo: Tipo, region: string, mine: number[]) =>
  tmdb<Pagina>(`/discover/${tipo}`, {
    watch_region: region, with_watch_providers: mine.join('|'), with_watch_monetization_types: 'flatrate|free|ads',
    sort_by: 'popularity.desc', language: IDIOMA, include_adult: false,
  }).then(con(tipo));

export default function Inicio() {
  const e = useEstado();
  const pais = PAISES[e.region] || e.region;
  const mias = e.mine.join(',');
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={s.contenido}>
      <Text style={s.bajada}>Dónde ver cada peli y serie en {pais}.</Text>

      {!e.mine.length && (
        <Pressable style={s.aviso} onPress={() => router.navigate('/ajustes')} accessibilityRole="button">
          <Text style={s.avisoTitulo}>Elegí tus plataformas</Text>
          <Text style={s.avisoTexto}>Así te mostramos primero lo que ya pagás y te marcamos ⭐ lo que tenés.</Text>
        </Pressable>
      )}

      {!!e.mine.length && <Fila titulo="Películas en tus plataformas" cargar={() => enMisPlataformas('movie', e.region, e.mine)} deps={[e.region, mias]} />}
      {!!e.mine.length && <Fila titulo="Series en tus plataformas" cargar={() => enMisPlataformas('tv', e.region, e.mine)} deps={[e.region, mias]} />}
      <Fila titulo="Lo más visto de la semana" cargar={() => tmdb<Pagina>('/trending/all/week', { language: IDIOMA }).then(r => r.results)} />
      <Fila titulo="En cines" cargar={() => tmdb<Pagina>('/movie/now_playing', { region: e.region, language: IDIOMA }).then(con('movie'))} deps={[e.region]} />
      <Fila titulo="Próximos estrenos" cargar={() => tmdb<Pagina>('/movie/upcoming', { region: e.region, language: IDIOMA }).then(con('movie'))} deps={[e.region]} />
      <Fila titulo="Series populares" cargar={() => tmdb<Pagina>('/tv/popular', { language: IDIOMA }).then(con('tv'))} />
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  contenido: { paddingBottom: 32 },
  bajada: { color: C.suave, fontSize: 15, paddingHorizontal: 16, marginTop: 4 },
  aviso: { marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 14, backgroundColor: C.tarjeta, borderWidth: 1, borderColor: C.acento },
  avisoTitulo: { color: C.texto, fontSize: 17, fontWeight: '700' },
  avisoTexto: { color: C.suave, fontSize: 14, marginTop: 4 },
});
