// Lo que guarda la persona en el teléfono: país, «Mis plataformas» y «Mi lista».
// Mismo lugar y formato que usaba la versión anterior (mi_lista_v1), así la revisión en segundo plano lo sigue leyendo.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import type { Tipo } from './api';
import { paisDelTelefono } from './plataformas';

export type Guardado = { id: number; media_type: Tipo; title: string; poster_path?: string | null; year?: string };
export type Estado = {
  region: string;
  mine: number[];
  items: Guardado[];
  // ¿estaba en alguna plataforma? por país y título: { 'AR:movie123': true }
  disp: Record<string, boolean>;
};

const CLAVE = 'mi_lista_v1';
export const clave = (region: string, t: { media_type: string; id: number }) => `${region}:${t.media_type}${t.id}`;

let estado: Estado = { region: paisDelTelefono(), mine: [], items: [], disp: {} };
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach(f => f());

export async function leer(): Promise<Estado | null> {
  try { return JSON.parse((await AsyncStorage.getItem(CLAVE)) || 'null'); } catch { return null; }
}
export const guardar = (e: Estado) => AsyncStorage.setItem(CLAVE, JSON.stringify(e)).catch(() => {});

export async function cargarEstado() {
  const e = await leer();
  if (e) estado = { ...estado, ...e, items: e.items || [], mine: e.mine || [], disp: e.disp || {} };
  avisar();
}

function cambiar(f: (e: Estado) => Estado) {
  estado = f(estado);
  avisar();
  guardar(estado);
}

export const useEstado = () => useSyncExternalStore(
  (f: () => void) => { oyentes.add(f); return () => { oyentes.delete(f); }; },
  () => estado,
);

export const estaEnLista = (e: Estado, tipo: Tipo, id: number) => e.items.some(t => t.id === id && t.media_type === tipo);

// Guarda o saca un título. «disponible» es si hoy está en alguna plataforma: así la revisión en segundo plano
// sabe avisar cuando llega.
export function alternarEnLista(t: Guardado, disponible: boolean): boolean {
  const ya = estaEnLista(estado, t.media_type, t.id);
  cambiar(e => ya
    ? { ...e, items: e.items.filter(x => !(x.id === t.id && x.media_type === t.media_type)) }
    : { ...e, items: [t, ...e.items], disp: { ...e.disp, [clave(e.region, t)]: disponible } });
  return !ya;
}

export function elegirPais(region: string) { cambiar(e => ({ ...e, region })); }

export function alternarPlataforma(id: number) {
  cambiar(e => ({ ...e, mine: e.mine.includes(id) ? e.mine.filter(x => x !== id) : [...e.mine, id] }));
}

// Lo que aprende la revisión en segundo plano, sin pisar cambios hechos mientras tanto
export function sumarDisponibilidad(disp: Record<string, boolean>) {
  cambiar(e => ({ ...e, disp: { ...e.disp, ...disp } }));
}
