import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Degradado } from '../../../components/Degradado';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { Poster } from '../../../components/Poster';
import { anioDe, IDIOMA, imagen, tituloDe, tmdb, urlWeb, type Disponibilidad, type Proveedor, type Resultado, type Tipo } from '../../../lib/api';
import { pedirPermiso } from '../../../lib/avisos';
import { alternarEnLista, estaEnLista, useEstado } from '../../../lib/estado';
import { canalDe, incluidas, PAISES, semaforo, sinRepetir, urlJustWatch, urlPlataforma } from '../../../lib/plataformas';
import { C } from '../../../lib/tema';

type Detalle = Resultado & {
  runtime?: number;
  number_of_seasons?: number;
  genres?: { id: number; name: string }[];
  tagline?: string;
  videos?: { results: { key: string; site: string; type: string; iso_639_1: string }[] };
  recommendations?: { results: Resultado[] };
  credits?: { cast: { id: number; name: string; character?: string }[]; crew: { id: number; name: string; job: string }[] };
  created_by?: { id: number; name: string }[];
};

export default function Ficha() {
  const { tipo: t, id: idTexto } = useLocalSearchParams<{ tipo: string; id: string }>();
  const tipo: Tipo = t === 'tv' ? 'tv' : 'movie';
  const id = Number(idTexto);
  const e = useEstado();
  const [d, setD] = useState<Detalle | null>(null);
  const [disp, setDisp] = useState<Record<string, Disponibilidad> | null>(null);
  const [error, setError] = useState(false);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vivo = true;
    setError(false);
    tmdb<Detalle>(`/${tipo}/${id}`, { language: IDIOMA, append_to_response: 'videos,recommendations,credits', include_video_language: 'es,en' })
      .then(r => { if (vivo) setD(r); }, () => { if (vivo) setError(true); });
    tmdb<{ results: Record<string, Disponibilidad> }>(`/${tipo}/${id}/watch/providers`)
      .then(r => { if (vivo) setDisp(r.results || {}); }, () => { if (vivo) setDisp({}); });
    return () => { vivo = false; };
  }, [tipo, id, intento]);

  if (error) return (
    <View style={s.centro}>
      <Text style={s.titulo}>Sin conexión</Text>
      <Text style={s.suave}>Revisá tu internet y probá de nuevo.</Text>
      <Pressable style={s.boton} onPress={() => setIntento(i => i + 1)} accessibilityRole="button"><Text style={s.botonTexto}>Reintentar</Text></Pressable>
    </View>
  );
  if (!d) return <View style={s.centro}><ActivityIndicator color={C.suave} /></View>;

  const titulo = tituloDe(d);
  const anio = anioDe(d);
  const region = e.region;
  const pais = PAISES[region] || region;
  const aca = disp?.[region];
  const mias = new Set(e.mine);
  const subs = incluidas(aca).sort((a, b) => Number(mias.has(b.provider_id)) - Number(mias.has(a.provider_id)));
  const estado = disp ? semaforo(aca, mias) : null;
  const guardado = estaEnLista(e, tipo, id);
  const duracion = d.runtime ? `${Math.floor(d.runtime / 60)} h ${d.runtime % 60} min` : d.number_of_seasons ? `${d.number_of_seasons} temporada${d.number_of_seasons > 1 ? 's' : ''}` : '';
  const vids = d.videos?.results || [];
  const trailer = vids.find(v => v.site === 'YouTube' && v.type === 'Trailer' && v.iso_639_1 === 'es') || vids.find(v => v.site === 'YouTube' && v.type === 'Trailer') || vids.find(v => v.site === 'YouTube');
  const direccion = (d.credits?.crew || []).filter(c => c.job === 'Director').slice(0, 2).map(c => c.name);
  const creacion = (d.created_by || []).slice(0, 2).map(c => c.name);
  const elenco = (d.credits?.cast || []).slice(0, 6).map(c => c.name);
  const recomendadas = (d.recommendations?.results || []).filter(r => r.media_type === 'movie' || r.media_type === 'tv').slice(0, 12);

  const guardar = () => {
    const ahora = alternarEnLista({ id, media_type: tipo, title: titulo, poster_path: d.poster_path, year: anio }, subs.length > 0);
    Haptics.notificationAsync(ahora ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning).catch(() => {});
    if (ahora) pedirPermiso();
  };
  const compartir = () => {
    const donde = subs.length ? `Está en ${subs.slice(0, 3).map(p => p.provider_name).join(', ')} (${pais}).` : `Mirá dónde verla en ${pais}.`;
    Share.share({ message: `${titulo}${anio ? ` (${anio})` : ''}. ${donde}\n${urlWeb(tipo, id)}`, url: urlWeb(tipo, id) }).catch(() => {});
  };

  const veredicto = estado === 'tengo' ? { color: C.verde, icono: '✅', texto: `¡La tenés! Incluida en ${subs.filter(p => mias.has(p.provider_id)).map(p => p.provider_name).join(', ')}.` }
    : estado === 'suscripcion' ? { color: e.mine.length ? C.ambar : C.verde, icono: e.mine.length ? '💳' : '✅', texto: `En ${pais} está con suscripción en ${subs.map(p => p.provider_name).join(', ')}${e.mine.length ? ' (ninguna de las tuyas)' : ''}.` }
    : estado === 'alquiler' ? { color: C.naranja, icono: '💸', texto: `En ${pais} solo se puede alquilar o comprar.` }
    : estado === 'no' ? { color: C.suave, icono: '🔎', texto: `Por ahora no está en ninguna plataforma de ${pais}. Guardala y te avisamos cuando llegue.` }
    : null;

  return (
    <ScrollView style={{ backgroundColor: C.fondo }} contentContainerStyle={{ paddingBottom: 48 }}>
      <View>
        {d.backdrop_path
          ? <Image source={{ uri: imagen(d.backdrop_path, 'w780') }} style={s.fondo} contentFit="cover" transition={200} />
          : <View style={[s.fondo, { backgroundColor: C.tarjeta }]} />}
        <Degradado />
      </View>

      <View style={s.cabecera}>
        {d.poster_path && <Image source={{ uri: imagen(d.poster_path, 'w342') }} style={s.poster} contentFit="cover" />}
        <View style={{ flex: 1 }}>
          <Text style={s.titulo} accessibilityRole="header">{titulo}</Text>
          <Text style={s.suave}>{[tipo === 'tv' ? 'Serie' : 'Película', anio, duracion].filter(Boolean).join(' · ')}</Text>
          {!!d.genres?.length && <Text style={s.suave} numberOfLines={2}>{d.genres.map(g => g.name).join(', ')}</Text>}
          {!!d.vote_average && <Text style={s.suave}>★ {d.vote_average.toFixed(1)} en TMDB</Text>}
        </View>
      </View>

      <View style={s.acciones}>
        <Pressable style={[s.accion, guardado && s.accionActiva]} onPress={guardar} accessibilityRole="button" accessibilityState={{ selected: guardado }}>
          <Text style={s.accionTexto}>{guardado ? '✓ En mi lista' : '＋ Guardar'}</Text>
        </Pressable>
        {trailer && (
          <Pressable style={s.accion} onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${trailer.key}`).catch(() => {})} accessibilityRole="button">
            <Text style={s.accionTexto}>▶ Tráiler</Text>
          </Pressable>
        )}
        <Pressable style={s.accion} onPress={compartir} accessibilityRole="button" accessibilityLabel="Compartir">
          <Text style={s.accionTexto}>Compartir</Text>
        </Pressable>
      </View>

      <View style={s.bloque}>
        <Text style={s.subtitulo}>Dónde verla en {pais}</Text>
        {!veredicto ? <ActivityIndicator color={C.suave} style={{ marginVertical: 12 }} /> : (
          <View style={[s.veredicto, { borderColor: veredicto.color }]}>
            <Text style={s.veredictoIcono}>{veredicto.icono}</Text>
            <Text style={s.veredictoTexto}>{veredicto.texto}</Text>
          </View>
        )}
        <Grupo titulo="Incluida en" color={C.verde} lista={subs} mias={mias} nombre={titulo} />
        <Grupo titulo="Alquiler" color={C.naranja} lista={sinRepetir(aca?.rent || [])} mias={mias} nombre={titulo} />
        <Grupo titulo="Compra" color={C.naranja} lista={sinRepetir(aca?.buy || [])} mias={mias} nombre={titulo} />
        <Pressable onPress={() => Linking.openURL(urlJustWatch(region, titulo)).catch(() => {})} accessibilityRole="link">
          <Text style={s.fuente}>Datos de JustWatch ↗</Text>
        </Pressable>
      </View>

      {!!d.overview && (
        <View style={s.bloque}>
          <Text style={s.subtitulo}>De qué se trata</Text>
          <Text style={s.texto}>{d.overview}</Text>
        </View>
      )}

      {(direccion.length > 0 || creacion.length > 0 || elenco.length > 0) && (
        <View style={s.bloque}>
          {direccion.length > 0 && <Text style={s.texto}><Text style={s.negrita}>Dirección: </Text>{direccion.join(', ')}</Text>}
          {direccion.length === 0 && creacion.length > 0 && <Text style={s.texto}><Text style={s.negrita}>Creación: </Text>{creacion.join(', ')}</Text>}
          {elenco.length > 0 && <Text style={[s.texto, { marginTop: 6 }]}><Text style={s.negrita}>Elenco: </Text>{elenco.join(', ')}</Text>}
        </View>
      )}

      {recomendadas.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <Text style={[s.subtitulo, { paddingHorizontal: 16 }]}>Si te gustó, mirá también</Text>
          <FlatList horizontal data={recomendadas} keyExtractor={r => `${r.media_type}${r.id}`} renderItem={({ item }) => <Poster r={item} ancho={110} />}
            ItemSeparatorComponent={() => <View style={{ width: 12 }} />} contentContainerStyle={{ paddingHorizontal: 16 }} showsHorizontalScrollIndicator={false} />
        </View>
      )}
      <Text style={s.legal}>Fichas e imágenes de TMDB. Este producto usa la API de TMDB, pero TMDB no lo respalda ni lo certifica.</Text>
    </ScrollView>
  );
}

// Lista de plataformas: cada una abre su app (o su web) con la búsqueda del título
function Grupo({ titulo, color, lista, mias, nombre }: { titulo: string; color: string; lista: Proveedor[]; mias: Set<number>; nombre: string }) {
  if (!lista.length) return null;
  return (
    <View style={{ marginTop: 14 }}>
      <View style={s.grupoCabecera}><View style={[s.punto, { backgroundColor: color }]} /><Text style={s.grupoTitulo}>{titulo}</Text></View>
      {lista.map(p => {
        const url = urlPlataforma(p.provider_name, nombre);
        const canal = canalDe(p.provider_name);
        const mia = mias.has(p.provider_id);
        return (
          <Pressable key={p.provider_id} disabled={!url} onPress={() => url && Linking.openURL(url).catch(() => {})}
            style={({ pressed }) => [s.plat, mia && s.platMia, pressed && { opacity: 0.6 }]} accessibilityRole={url ? 'link' : 'text'}
            accessibilityLabel={`${p.provider_name}${mia ? ', la tenés' : ''}${url ? ', abrir' : ''}`}>
            <Image source={{ uri: imagen(p.logo_path, 'w92') }} style={s.platLogo} />
            <View style={{ flex: 1 }}>
              <Text style={s.platNombre}>{p.provider_name}{mia ? '  ⭐' : ''}</Text>
              {canal && <Text style={s.platNota}>Canal que se paga aparte dentro de {canal}</Text>}
            </View>
            {url && <Text style={s.abrir}>Abrir ↗</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: C.fondo },
  fondo: { width: '100%', aspectRatio: 16 / 9 },
  cabecera: { flexDirection: 'row', gap: 14, paddingHorizontal: 16, marginTop: -60 },
  poster: { width: 110, height: 165, borderRadius: 10, backgroundColor: C.tarjeta },
  titulo: { color: C.texto, fontSize: 24, fontWeight: '800', marginTop: 60, marginBottom: 4 },
  suave: { color: C.suave, fontSize: 14, marginTop: 2 },
  acciones: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 18, flexWrap: 'wrap' },
  accion: { backgroundColor: C.tarjeta, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  accionActiva: { backgroundColor: C.acento },
  accionTexto: { color: C.texto, fontWeight: '700', fontSize: 15 },
  bloque: { paddingHorizontal: 16, marginTop: 24 },
  subtitulo: { color: C.texto, fontSize: 20, fontWeight: '700', marginBottom: 10 },
  veredicto: { flexDirection: 'row', gap: 10, borderWidth: 1.5, borderRadius: 14, padding: 14, backgroundColor: C.tarjeta, alignItems: 'center' },
  veredictoIcono: { fontSize: 22 },
  veredictoTexto: { color: C.texto, fontSize: 15, flex: 1, lineHeight: 21 },
  grupoCabecera: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  punto: { width: 8, height: 8, borderRadius: 4 },
  grupoTitulo: { color: C.suave, fontSize: 14, fontWeight: '600' },
  plat: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.tarjeta, borderRadius: 12, padding: 10, marginBottom: 8, borderWidth: 1.5, borderColor: 'transparent' },
  platMia: { borderColor: C.verde },
  platLogo: { width: 40, height: 40, borderRadius: 9 },
  platNombre: { color: C.texto, fontSize: 16, fontWeight: '600' },
  platNota: { color: C.suave, fontSize: 12, marginTop: 2 },
  abrir: { color: C.acento, fontSize: 14, fontWeight: '600' },
  fuente: { color: C.suave, fontSize: 13, marginTop: 6 },
  texto: { color: C.texto, fontSize: 15, lineHeight: 22 },
  negrita: { fontWeight: '700' },
  boton: { backgroundColor: C.acento, borderRadius: 999, paddingHorizontal: 22, paddingVertical: 12, marginTop: 20 },
  botonTexto: { color: '#fff', fontWeight: '700', fontSize: 15 },
  legal: { color: C.suave, fontSize: 12, paddingHorizontal: 16, marginTop: 28, lineHeight: 17 },
});
