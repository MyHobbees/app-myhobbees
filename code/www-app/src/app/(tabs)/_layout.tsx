import { SplashScreen } from 'expo-router';

import AppTabs from '@/components/app-tabs';

SplashScreen.hideAsync();

export default function TabsLayout() {
  return <AppTabs />;
}
