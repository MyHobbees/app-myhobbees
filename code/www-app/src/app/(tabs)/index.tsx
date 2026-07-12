import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ScreenHeader } from '@/components/screen-header';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { TutorialCard } from '@/components/tutorial-card';
import { BadgeMedal } from '@/components/ui/badge-medal';
import { GradientCard } from '@/components/ui/gradient-card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ProgressRing } from '@/components/ui/progress-ring';
import { SectionHeader } from '@/components/ui/section-header';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { currentBox, nextBox, pastBoxes } from '@/lib/mock/boxes';
import { badges, DifficultyLabels, LEVEL_STEP } from '@/lib/mock/gamification';
import { themeById } from '@/lib/mock/themes';
import { tutorialsByBox } from '@/lib/mock/tutorials';
import { useProfileStore } from '@/stores/use-profile-store';
import {
  boxCompletion,
  levelForXp,
  useProgressionStore,
  xpIntoLevel,
} from '@/stores/use-progression-store';

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const firstName = useProfileStore((s) => s.firstName);
  const difficulty = useProfileStore((s) => s.difficulty);
  const xp = useProgressionStore((s) => s.xp);
  const streakDays = useProgressionStore((s) => s.streakDays);
  const stepsDone = useProgressionStore((s) => s.stepsDone);
  const unlockedBadgeIds = useProgressionStore((s) => s.unlockedBadgeIds);

  const currentTheme = themeById(currentBox.themeId);
  const nextTheme = themeById(nextBox.themeId);
  const completion = boxCompletion(stepsDone, currentBox.id);

  return (
    <Screen>
      <ScreenHeader title={`Bonjour, ${firstName} 👋`} subtitle="Prête pour votre passion du mois ?" />

      <Animated.View entering={FadeInDown.duration(400)}>
        <GradientCard>
          <View style={styles.gamificationRow}>
            <View style={styles.gamificationLeft}>
              <ThemedText type="smallBold" style={styles.onGradientMuted}>
                Niveau {levelForXp(xp)}
              </ThemedText>
              <ThemedText type="subtitle" style={[styles.onGradient, styles.rounded]}>
                {xp} XP
              </ThemedText>
              <ProgressBar
                progress={xpIntoLevel(xp) / LEVEL_STEP}
                color="#ffffff"
                trackColor="rgba(255,255,255,0.25)"
              />
              <ThemedText type="small" style={styles.onGradientMuted}>
                🔥 {streakDays} jours d’affilée
              </ThemedText>
            </View>
            <ProgressRing progress={completion} size={84}>
              <ThemedText type="smallBold" style={[styles.onGradient, styles.rounded]}>
                {Math.round(completion * 100)}%
              </ThemedText>
              <ThemedText type="small" style={[styles.onGradientMuted, styles.ringLabel]}>
                box
              </ThemedText>
            </ProgressRing>
          </View>
        </GradientCard>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(400)}>
        <SectionHeader title="Ma box du mois" />
        <GradientCard colors={currentTheme.gradient} onPress={() => router.push(`/box/${currentBox.id}`)}>
          <View style={styles.boxRow}>
            <Text style={styles.boxEmoji}>{currentTheme.emoji}</Text>
            <View style={styles.boxTexts}>
              <ThemedText type="small" style={styles.onGradientMuted}>
                {currentBox.monthLabel} · {currentTheme.name}
              </ThemedText>
              <ThemedText type="smallBold" style={[styles.onGradient, styles.boxTitle]}>
                {currentBox.title}
              </ThemedText>
              <ThemedText type="small" style={styles.onGradientMuted}>
                {tutorialsByBox(currentBox.id).length} tutoriels · Voir la box →
              </ThemedText>
            </View>
          </View>
        </GradientCard>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(160).duration(400)}>
        <SectionHeader title="Continuer un tutoriel" actionLabel="Tout voir" onAction={() => router.push('/tutos')} />
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={tutorialsByBox(currentBox.id)}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.tutorialList}
          renderItem={({ item }) => <TutorialCard tutorial={item} />}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(240).duration(400)}>
        <SectionHeader title="Prochaine box" />
        <View style={[styles.nextBox, { backgroundColor: theme.backgroundElement }]}>
          <Text style={styles.nextEmoji}>{nextTheme.emoji}</Text>
          <View style={styles.boxTexts}>
            <ThemedText type="smallBold">
              {nextBox.monthLabel} · {nextTheme.name} 🔒
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Difficulté : {DifficultyLabels[difficulty]}
            </ThemedText>
            <Pressable onPress={() => router.push('/profil')} hitSlop={6}>
              <ThemedText type="small" style={{ color: theme.brand }}>
                Modifier la difficulté
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(320).duration(400)}>
        <SectionHeader title="Mes badges" actionLabel="Tout voir" onAction={() => router.push('/profil')} />
        <View style={styles.badgeRow}>
          {badges.slice(0, 3).map((badge) => (
            <BadgeMedal
              key={badge.id}
              emoji={badge.emoji}
              title={badge.title}
              unlocked={unlockedBadgeIds.includes(badge.id)}
            />
          ))}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(400).duration(400)}>
        <SectionHeader title="Mon parcours" />
        <View style={styles.timeline}>
          {pastBoxes.map((box) => {
            const boxTheme = themeById(box.themeId);
            const done = boxCompletion(stepsDone, box.id);
            return (
              <Pressable
                key={box.id}
                onPress={() => router.push(`/box/${box.id}`)}
                style={({ pressed }) => [
                  styles.timelineItem,
                  { backgroundColor: theme.backgroundElement },
                  pressed && styles.pressed,
                ]}>
                <View style={[styles.timelineEmoji, { backgroundColor: theme.brandSoft }]}>
                  <Text style={styles.timelineEmojiText}>{boxTheme.emoji}</Text>
                </View>
                <View style={styles.boxTexts}>
                  <ThemedText type="smallBold">{box.title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {box.monthLabel} · {boxTheme.name}
                  </ThemedText>
                </View>
                <ThemedText type="smallBold" style={{ color: done >= 1 ? theme.success : theme.textSecondary }}>
                  {done >= 1 ? '✓' : `${Math.round(done * 100)}%`}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gamificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  gamificationLeft: {
    flex: 1,
    gap: Spacing.two,
  },
  onGradient: {
    color: '#ffffff',
  },
  onGradientMuted: {
    color: 'rgba(255,255,255,0.85)',
  },
  rounded: {
    fontFamily: Fonts.rounded,
    fontWeight: '800',
  },
  ringLabel: {
    fontSize: 11,
    lineHeight: 13,
  },
  boxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  boxEmoji: {
    fontSize: 52,
  },
  boxTexts: {
    flex: 1,
    gap: 2,
  },
  boxTitle: {
    fontSize: 19,
    lineHeight: 24,
  },
  tutorialList: {
    gap: Spacing.three,
  },
  nextBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  nextEmoji: {
    fontSize: 36,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  timeline: {
    gap: Spacing.two,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  timelineEmoji: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineEmojiText: {
    fontSize: 22,
  },
  pressed: {
    opacity: 0.8,
  },
});
