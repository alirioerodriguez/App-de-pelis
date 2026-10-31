// Avisos de «Mi lista»: con la app cerrada, el teléfono revisa de vez en cuando si algo guardado
// llegó a una plataforma (suscripción, gratis o con anuncios) y manda una notificación.
// La web le pasa a la app lo que hay en «Mi lista» con un mensaje { type: 'lista', … }.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

export const SITE = 'https://donde-la-veo-app.vercel.app/';
const TAREA = 'revisar-mi-lista';
const GUARDADO = 'mi_lista_v1';
const MAX_TITULOS = 60; // iOS da unos 30 segundos por tanda: alcanza de sobra

type Titulo = { id: number; media_type: 'movie' | 'tv'; title: string };
type Estado = {
  region: string;
  mine: number[];
  items: Titulo[];
  // ¿estaba en alguna plataforma? por país y título: { 'AR:movie123': true }
  disp: Record<string, boolean>;
};
type Proveedor = { provider_id: number; provider_name: string };

const clave = (region: string, t: { media_type: string; id: number }) => `${region}:${t.media_type}${t.id}`;

async function leer(): Promise<Estado | null> {
  try { return JSON.parse((await AsyncStorage.getItem(GUARDADO)) || 'null'); } catch { return null; }
}
const guardar = (e: Estado) => AsyncStorage.setItem(GUARDADO, JSON.stringify(e)).catch(() => {});

// Lo que manda la web cada vez que cambia «Mi lista», «Mis plataformas» o el país
export async function recibirDeLaWeb(msg: any) {
  if (!msg || typeof msg.region !== 'string' || !Array.isArray(msg.lista)) return;
  const previo = await leer();
  const region = msg.region;
  const items: Titulo[] = [];
  const disp: Record<string, boolean> = {};
  for (const x of msg.lista) {
    if (!x || typeof x.id !== 'number' || (x.media_type !== 'movie' && x.media_type !== 'tv')) continue;
    const t: Titulo = { id: x.id, media_type: x.media_type, title: String(x.title || x.name || '') };
    items.push(t);
    const k = clave(region, t);
    // Lo que ya sabía la app gana; si no, se toma lo que sabe la web
    const antes = previo?.disp[k] ?? x._disp?.[region];
    if (typeof antes === 'boolean') disp[k] = antes;
  }
  await guardar({ region, mine: Array.isArray(msg.mine) ? msg.mine.filter((n: unknown) => typeof n === 'number') : [], items, disp });
  if (items.length) await pedirPermiso();
}

// Se pide permiso la primera vez que hay algo en la lista (justo después de tocar «Guardar»)
async function pedirPermiso() {
  try {
    const p = await Notifications.getPermissionsAsync();
    if (p.granted || !p.canAskAgain) return;
    await Notifications.requestPermissionsAsync();
  } catch {}
}

async function plataformas(t: Titulo, region: string): Promise<Proveedor[] | null> {
  const ctrl = new AbortController();
  const corte = setTimeout(() => ctrl.abort(), 10000);
  try {
    const r = await fetch(`${SITE}api/tmdb?p=/${t.media_type}/${t.id}/watch/providers`, { signal: ctrl.signal });
    if (!r.ok) return null;
    const reg = (await r.json()).results?.[region] || {};
    const todas: Proveedor[] = [...(reg.flatrate || []), ...(reg.free || []), ...(reg.ads || [])];
    const vistas = new Set<number>();
    return todas.filter(p => !vistas.has(p.provider_id) && vistas.add(p.provider_id));
  } catch { return null; } finally { clearTimeout(corte); }
}

// Revisa la lista y avisa lo que llegó. Devuelve cuántos avisos mandó.
export async function revisarMiLista(): Promise<number> {
  const e = await leer();
  if (!e || !e.items.length) return 0;
  const lista = e.items.slice(0, MAX_TITULOS);
  const llegaron: { t: Titulo; subs: Proveedor[] }[] = [];
  for (let i = 0; i < lista.length; i += 6) {
    const tanda = lista.slice(i, i + 6);
    const res = await Promise.all(tanda.map(t => plataformas(t, e.region)));
    tanda.forEach((t, j) => {
      const subs = res[j];
      if (!subs) return; // no se pudo consultar: no se toca
      const k = clave(e.region, t);
      const ahora = subs.length > 0;
      if (e.disp[k] === false && ahora) llegaron.push({ t, subs });
      e.disp[k] = ahora;
    });
  }
  // La lista pudo cambiar mientras se revisaba: se guarda solo lo aprendido sobre la disponibilidad
  const actual = (await leer()) || e;
  await guardar({ ...actual, disp: { ...actual.disp, ...e.disp } });

  const mias = new Set(e.mine);
  for (const { t, subs } of llegaron) {
    const orden = [...subs].sort((a, b) => Number(mias.has(b.provider_id)) - Number(mias.has(a.provider_id)));
    const donde = orden[0].provider_name + (mias.has(orden[0].provider_id) ? ' (la tenés)' : '');
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🎉 ${t.title || 'Algo de tu lista'} ya se puede ver`,
        body: `Llegó a ${donde}. Tocá para ver dónde.`,
        data: { url: `${SITE}#${t.media_type}-${t.id}` },
      },
      trigger: null,
    }).catch(() => {});
  }
  return llegaron.length;
}

// La tarea tiene que quedar definida al cargar la app (también cuando el sistema la despierta en segundo plano)
TaskManager.defineTask(TAREA, async () => {
  try { await revisarMiLista(); return BackgroundTask.BackgroundTaskResult.Success; }
  catch { return BackgroundTask.BackgroundTaskResult.Failed; }
});

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

// Cada 6 horas como mínimo; el sistema decide el momento exacto (en iPhone, suele ser de noche o cargando)
export async function activarRevision() {
  try {
    if (await TaskManager.isTaskRegisteredAsync(TAREA)) return;
    if ((await BackgroundTask.getStatusAsync()) !== BackgroundTask.BackgroundTaskStatus.Available) return;
    await BackgroundTask.registerTaskAsync(TAREA, { minimumInterval: 6 * 60 });
  } catch { /* Expo Go o sin permiso de segundo plano: los avisos llegan solo al abrir la app */ }
}
