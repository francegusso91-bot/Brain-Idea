import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { StoreProvider } from '@/lib/store';
import { useTheme } from '@/lib/theme';

export default function RootLayout() {
  const t = useTheme();
  return (
    <StoreProvider>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: t.bg },
          headerTintColor: t.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: t.bg },
        }}>
        <Stack.Screen name="index" options={{ title: 'Le mie idee' }} />
        <Stack.Screen name="folder/[id]" options={{ title: '' }} />
        <Stack.Screen name="settings" options={{ title: 'Impostazioni', presentation: 'modal' }} />
      </Stack>
    </StoreProvider>
  );
}
