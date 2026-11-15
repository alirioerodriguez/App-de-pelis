import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C } from '../lib/tema';

// Oscurece el borde de abajo de la imagen de fondo para que el título se lea bien
export function Degradado() {
  return <LinearGradient pointerEvents="none" colors={['transparent', C.fondo]} locations={[0.35, 1]} style={StyleSheet.absoluteFill} />;
}
