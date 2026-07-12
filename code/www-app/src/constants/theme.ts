/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1A1A1C',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E7E7EC',
    textSecondary: '#60646C',
    hairline: '#EDEDF0',
    brand: '#CD6581',
    brandDeep: '#854768',
    brandSoft: '#F7DCE4',
    brandSoftText: '#CD6581',
    success: '#4CC38A',
    warning: '#F5B759',
    gold: '#E5B567',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2C2D30',
    textSecondary: '#A9AAB2',
    hairline: '#1E1F22',
    brand: '#CD6581',
    brandDeep: '#854768',
    brandSoft: '#3A2530',
    brandSoftText: '#F2A8BC',
    success: '#4CC38A',
    warning: '#F5B759',
    gold: '#E5B567',
  },
} as const;

export const BrandGradient = ['#CD6581', '#8E5AA8'] as const;
export const BrandGradientDeep = ['#854768', '#4C2F5E'] as const;

export const Radius = {
  md: 12,
  lg: 20,
  xl: 28,
  full: 999,
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

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
