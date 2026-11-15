// Avisos de «Mi lista»: con la app cerrada, el teléfono revisa de vez en cuando si algo guardado
// llegó a una plataforma (suscripción, gratis o con anuncios) y manda una notificación.
import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { tmdb, type Disponibilidad, type Tipo } from './api';
import { clave, guardar, leer, type Guardado } from './estado';
import { incluidas } from './plataformas';
import type { Proveedor } from './api';

const TAREA = 'revisar-mi-lista';
const MAX_TITULOS = 60; // iOS da unos 30 segundos por tanda: alcanza de sobra

async function plataformas(t: Guardado, region: string): Promise<Proveedor[] | null> {
  try {
    const r = await tmdb<{ results?: Record<string, Disponibilidad> }>(`/${t.media_type}/${t.id}/watch/providers`, {}, true);
    return incluidas(r.results?.[region]);
  } catch { return null; }
}

// Revisa la lista y avisa lo que llegó. Devuelve cuántos avisos mandó.
export async function revisarMiLista(): Promise<number> {
  const e = await leer();
  if (!e || !e.items?.length) return 0;
  const lista = e.items.slice(0, MAX_TITULOS);
  const llegaron: { t: Guardado; subs: Proveedor[] }[] = [];
  const aprendido: Record<string, boolean> = {};
  for (let i = 0; i < lista.length; i += 6) {
    const tanda = lista.slice(i, i + 6);
    const res = await Promise.all(tanda.map(t => plataformas(t, e.region)));
    tanda.forEach((t, j) => {
      const subs = res[j];
      if (!subs) return; // no se pudo consultar: no se toca
      const k = clave(e.region, t);
      const ahora = subs.length > 0;
      if (e.disp?.[k] === false && ahora) llegaron.push({ t, subs });
      aprendido[k] = ahora;
    });
  }
  // La lista pudo cambiar mientras se revisaba: se guarda solo lo aprendido sobre la disponibilidad
  const actual = (await leer()) || e;
  await guardar({ ...actual, disp: { ...actual.disp, ...aprendido } });

  const mias = new Set(e.mine || []);
  for (const { t, subs } of llegaron) {
    const orden = [...subs].sort((a, b) => Number(mias.has(b.provider_id)) - Number(mias.has(a.provider_id)));
    const donde = orden[0].provider_name + (mias.has(orden[0].provider_id) ? ' (la tenés)' : '');
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🎉 ${t.title || 'Algo de tu lista'} ya se puede ver`,
        body: `Llegó a ${donde}. Tocá para ver dónde.`,
        data: { tipo: t.media_type, id: t.id },
      },
      trigger: null,
    }).catch(() => {});
  }
  return llegaron.length;
}

// Ficha que abre un aviso tocado (también los de la versión anterior, que traían la dirección web)
export function fichaDelAviso(r: Notifications.NotificationResponse | null): { tipo: Tipo; id: number } | null {
  const data = r?.notification.request.content.data as Record<string, unknown> | undefined;
  if (!data) return null;
  if ((data.tipo === 'movie' || data.tipo === 'tv') && typeof data.id === 'number') return { tipo: data.tipo, id: data.id };
  const m = typeof data.url === 'string' ? /#(movie|tv)-(\d+)/.exec(data.url) : null;
  return m ? { tipo: m[1] as Tipo, id: Number(m[2]) } : null;
}

// Se pide permiso la primera vez que se guarda algo (justo después de tocar «Guardar»)
export async function pedirPermiso() {
  try {
    const p = await Notifications.getPermissionsAsync();
    if (p.granted || !p.canAskAgain) return;
    await Notifications.requestPermissionsAsync();
  } catch {}
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
