import { NativeTabs } from 'expo-router/native-tabs';
import { C } from '../../lib/tema';

// Barra de pestañas del sistema (la de iPhone y la de Android)
export default function Pestanas() {
  return (
    <NativeTabs tintColor={C.acento}>
      <NativeTabs.Trigger name="(inicio)">
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
        <NativeTabs.Trigger.Label>Inicio</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="buscar" role="search">
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
        <NativeTabs.Trigger.Label>Buscar</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="lista">
        <NativeTabs.Trigger.Icon sf={{ default: 'bookmark', selected: 'bookmark.fill' }} md="bookmark" />
        <NativeTabs.Trigger.Label>Mi lista</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="ajustes">
        <NativeTabs.Trigger.Icon sf={{ default: 'slider.horizontal.3', selected: 'slider.horizontal.3' }} md="tune" />
        <NativeTabs.Trigger.Label>Plataformas</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
