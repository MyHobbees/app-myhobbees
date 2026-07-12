import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { boxById } from '@/lib/mock/boxes';
import { DifficultyLabels } from '@/lib/mock/gamification';
import { themeById } from '@/lib/mock/themes';
import { type Tutorial } from '@/lib/mock/tutorials';
import { tutorialProgress, useProgressionStore } from '@/stores/use-progression-store';

type TutorialCardProps = {
  tutorial: Tutorial;
  wide?: boolean;
};

export function TutorialCard({ tutorial, wide }: TutorialCardProps) {
  const router = useRouter();
  const theme = useTheme();
  const stepsDone = useProgressionStore((s) => s.stepsDone);
  const download = useProgressionStore((s) => s.downloads[tutorial.id]);
  const boxTheme = themeById(boxById(tutorial.boxId)?.themeId ?? '');
  const progress = tutorialProgress(stepsDone, tutorial.id);

  return (
    <Pressable
      onPress={() => router.push(`/tutorial/${tutorial.id}`)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundElement },
        wide ? styles.wide : styles.narrow,
        pressed && styles.pressed,
      ]}>
      <LinearGradient colors={boxTheme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.thumb}>
        <Text style={styles.thumbEmoji}>{boxTheme.emoji}</Text>
        <View style={styles.playBubble}>
          <Text style={styles.playIcon}>▶</Text>
        </View>
        {download?.status === 'done' && (
          <View style={styles.downloadedBubble}>
            <Text style={styles.downloadedIcon}>📥</Text>
          </View>
        )}
      </LinearGradient>
      <View style={styles.body}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {tutorial.title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {tutorial.durationMin} min · {DifficultyLabels[tutorial.level]} · +{tutorial.xp} XP
        </ThemedText>
        <ProgressBar progress={progress} height={4} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  narrow: {
    width: 220,
  },
  wide: {
    width: '100%',
  },
  pressed: {
    opacity: 0.85,
  },
  thumb: {
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbEmoji: {
    fontSize: 44,
  },
  playBubble: {
    position: 'absolute',
    right: Spacing.two,
    bottom: Spacing.two,
    width: 30,
    height: 30,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    color: '#ffffff',
    fontSize: 12,
    marginLeft: 2,
  },
  downloadedBubble: {
    position: 'absolute',
    left: Spacing.two,
    top: Spacing.two,
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadedIcon: {
    fontSize: 13,
  },
  body: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
});
