import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
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

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: selected ? theme.primary : theme.backgroundSelected },
        pressed && styles.pressed,
      ]}>
      <ThemedText
        type={selected ? 'smallBold' : 'small'}
        style={{ color: selected ? theme.onPrimary : theme.textSecondary }}>
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
  pressed: {
    opacity: 0.8,
  },
});
