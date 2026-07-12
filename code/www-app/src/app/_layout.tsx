import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerTintColor: theme.brand,
          headerBackTitle: 'Retour',
          headerStyle: { backgroundColor: theme.background },
          headerTitleStyle: { color: theme.text },
          contentStyle: { backgroundColor: theme.background },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Accueil' }} />
        <Stack.Screen name="tutorial/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="box/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="community/topic/[id]" options={{ title: 'Discussion' }} />
        <Stack.Screen name="community/new" options={{ presentation: 'modal', title: 'Nouveau sujet' }} />
        <Stack.Screen name="notifications" options={{ presentation: 'modal', title: 'Notifications' }} />
        <Stack.Screen name="profile/edit" options={{ presentation: 'modal', title: 'Mes informations' }} />
      </Stack>
    </ThemeProvider>
  );
}
