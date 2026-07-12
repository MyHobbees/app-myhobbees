import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ScreenProps = {
  children: React.ReactNode;
  withTabInset?: boolean;
};

export function Screen({ children, withTabInset = true }: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const nativeInsets = withTabInset && Platform.OS === 'ios';
  const paddingTop = nativeInsets ? Spacing.three : insets.top + Spacing.three;
  const paddingBottom = nativeInsets
    ? Spacing.five
    : (withTabInset ? BottomTabInset : 0) + insets.bottom + Spacing.five;

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.content, { paddingTop, paddingBottom }]}>
      <View style={styles.inner}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.four,
  },
});
