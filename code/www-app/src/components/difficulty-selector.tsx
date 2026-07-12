import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  DifficultyDescriptions,
  DifficultyLabels,
  type Difficulty,
} from '@/lib/mock/gamification';
import { useProfileStore } from '@/stores/use-profile-store';

const options: Difficulty[] = ['decouverte', 'niveau1', 'approfondissement'];

export function DifficultySelector() {
  const theme = useTheme();
  const difficulty = useProfileStore((s) => s.difficulty);
  const setDifficulty = useProfileStore((s) => s.setDifficulty);

  return (
    <View style={styles.container}>
      {options.map((option) => {
        const selected = option === difficulty;
        return (
          <Pressable
            key={option}
            onPress={() => setDifficulty(option)}
            style={[
              styles.option,
              { backgroundColor: theme.backgroundElement },
              selected && { borderColor: theme.brand, borderWidth: 1.5, backgroundColor: theme.brandSoft },
            ]}>
            <View style={[styles.radio, { borderColor: selected ? theme.brand : theme.textSecondary }]}>
              {selected && <View style={[styles.radioDot, { backgroundColor: theme.brand }]} />}
            </View>
            <View style={styles.texts}>
              <ThemedText type="smallBold" style={selected ? { color: theme.brand } : undefined}>
                {DifficultyLabels[option]}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
                {DifficultyDescriptions[option]}
              </ThemedText>
            </View>
          </Pressable>
        );
      })}
      <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
        S’applique à votre prochaine box expédiée.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: Radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: Radius.full,
  },
  texts: {
    flex: 1,
    gap: 1,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
  },
  note: {
    fontSize: 12,
    marginTop: Spacing.one,
  },
});
