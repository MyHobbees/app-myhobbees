import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { TutorialCard } from '@/components/tutorial-card';
import { AppButton } from '@/components/ui/app-button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { SectionHeader } from '@/components/ui/section-header';
import { StarRating } from '@/components/ui/star-rating';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { boxById } from '@/lib/mock/boxes';
import { themeById } from '@/lib/mock/themes';
import { tutorialsByBox } from '@/lib/mock/tutorials';
import { boxCompletion, useProgressionStore } from '@/stores/use-progression-store';

export default function BoxScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const box = boxById(id ?? '');

  const stepsDone = useProgressionStore((s) => s.stepsDone);
  const rating = useProgressionStore((s) => (box ? s.ratings[box.id] : undefined));

  if (!box) {
    return (
      <Screen withTabInset={false}>
        <ThemedText type="small" themeColor="textSecondary">
          Box introuvable.
        </ThemedText>
        <AppButton label="Retour" onPress={() => router.back()} />
      </Screen>
    );
  }

  const boxTheme = themeById(box.themeId);
  const completion = boxCompletion(stepsDone, box.id);
  const boxTutorials = tutorialsByBox(box.id);

  return (
    <Screen withTabInset={false}>
      <LinearGradient colors={boxTheme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.heroEmoji}>{boxTheme.emoji}</Text>
        <ThemedText type="small" style={styles.onGradientMuted}>
          {box.monthLabel} · {boxTheme.name}
        </ThemedText>
        <ThemedText type="subtitle" style={styles.heroTitle}>
          {box.title}
        </ThemedText>
        <View style={styles.heroProgress}>
          <ProgressBar progress={completion} color="#ffffff" trackColor="rgba(255,255,255,0.25)" />
          <ThemedText type="small" style={styles.onGradientMuted}>
            {Math.round(completion * 100)}% terminé
          </ThemedText>
        </View>
      </LinearGradient>

      {rating && (
        <View style={[styles.ratingCard, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="smallBold">Votre avis</ThemedText>
          <StarRating value={rating.stars} size={20} />
          {rating.comment ? (
            <ThemedText type="small" themeColor="textSecondary">
              « {rating.comment} »
            </ThemedText>
          ) : null}
        </View>
      )}

      <View>
        <SectionHeader title="Les tutoriels de cette box" />
        <View style={styles.list}>
          {boxTutorials.map((tutorial) => (
            <TutorialCard key={tutorial.id} tutorial={tutorial} wide />
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: Radius.xl,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.one,
  },
  back: {
    position: 'absolute',
    top: Spacing.three,
    left: Spacing.three,
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: '#ffffff',
    fontSize: 18,
  },
  pressed: {
    opacity: 0.75,
  },
  heroEmoji: {
    fontSize: 64,
    marginTop: Spacing.three,
  },
  onGradientMuted: {
    color: 'rgba(255,255,255,0.85)',
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 26,
    lineHeight: 32,
    textAlign: 'center',
  },
  heroProgress: {
    width: '100%',
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  ratingCard: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  list: {
    gap: Spacing.three,
  },
});
