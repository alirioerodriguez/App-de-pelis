import { Stack } from 'expo-router';
import { C } from '../../../lib/tema';

export default function Pila() {
  return (
    <Stack screenOptions={{ headerLargeTitle: true, headerTransparent: true, headerBlurEffect: 'systemChromeMaterialDark', headerLargeTitleShadowVisible: false, headerTintColor: C.texto, contentStyle: { backgroundColor: C.fondo } }}>
      <Stack.Screen name="index" options={{ title: 'VeoMás' }} />
    </Stack>
  );
}
