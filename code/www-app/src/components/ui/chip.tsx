import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BrandGradient, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ChipProps = {
  label: string;
  emoji?: string;
  selected?: boolean;
  onPress?: () => void;
};

export function Chip({ label, emoji, selected, onPress }: ChipProps) {
  const theme = useTheme();
  const content = emoji ? `${emoji} ${label}` : label;

  if (selected) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
        <LinearGradient colors={BrandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.chip}>
          <ThemedText type="small" style={styles.selectedText}>
            {content}
          </ThemedText>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, { backgroundColor: theme.backgroundSelected }, pressed && styles.pressed]}>
      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        {content}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: Spacing.two - 2,
    paddingHorizontal: Spacing.three - 2,
    borderRadius: Radius.full,
  },
  selectedText: {
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.8,
  },
});
