/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#6D4D2E',
    background: '#FCF6E8',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#F3E9CF',
    textSecondary: '#9A845F',
    heading: '#4E6E58',
    hairline: '#EEE3C9',
    brand: '#EF476F',
    brandDeep: '#C93257',
    brandSoft: '#FBDCE4',
    brandSoftText: '#EF476F',
    primary: '#F9C74F',
    onPrimary: '#6D4D2E',
    secondary: '#92DCE5',
    onSecondary: '#215D66',
    success: '#4E6E58',
    warning: '#C79A2A',
    gold: '#F9C74F',
  },
  dark: {
    text: '#F6EFDF',
    background: '#1E170E',
    backgroundElement: '#2A2114',
    backgroundSelected: '#372C1B',
    textSecondary: '#BCAB8C',
    heading: '#A9CDB7',
    hairline: '#372C1B',
    brand: '#F0688A',
    brandDeep: '#EF476F',
    brandSoft: '#3F2430',
    brandSoftText: '#F5A0B6',
    primary: '#F9C74F',
    onPrimary: '#4A3413',
    secondary: '#92DCE5',
    onSecondary: '#0F3B44',
    success: '#8FBFA0',
    warning: '#F9C74F',
    gold: '#F9C74F',
  },
} as const;

export const BrandGradient = ['#F9C74F', '#F0A939'] as const;
export const BrandGradientDeep = ['#C79A2A', '#A87F1E'] as const;

export const Radius = {
  md: 12,
  lg: 20,
  xl: 28,
  full: 999,
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = {
  heading: 'Fredoka_600SemiBold',
  headingMedium: 'Fredoka_500Medium',
  sans: 'Hind_400Regular',
  sansMedium: 'Hind_500Medium',
  sansBold: 'Hind_700Bold',
  rounded: 'Fredoka_600SemiBold',
  mono: Platform.select({ ios: 'ui-monospace', default: 'monospace' }) ?? 'monospace',
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
