import { StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type BadgeMedalProps = {
  emoji: string;
  title: string;
  description?: string;
  unlocked: boolean;
};

export function BadgeMedal({ emoji, title, description, unlocked }: BadgeMedalProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundElement }, !unlocked && styles.locked]}>
      <View style={[styles.medal, { backgroundColor: unlocked ? theme.brandSoft : theme.backgroundSelected }]}>
        <Text style={styles.emoji}>{unlocked ? emoji : '🔒'}</Text>
      </View>
      <ThemedText type="smallBold" style={styles.title} numberOfLines={1}>
        {title}
      </ThemedText>
      {description && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.description} numberOfLines={2}>
          {description}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
    alignItems: 'center',
    gap: Spacing.one,
    flex: 1,
  },
  locked: {
    opacity: 0.45,
  },
  medal: {
    width: 52,
    height: 52,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 26,
  },
  title: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
  },
});
