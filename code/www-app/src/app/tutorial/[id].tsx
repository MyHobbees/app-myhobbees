import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RatingModal } from '@/components/rating-modal';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { boxById } from '@/lib/mock/boxes';
import { DifficultyLabels } from '@/lib/mock/gamification';
import { themeById } from '@/lib/mock/themes';
import { tutorialById } from '@/lib/mock/tutorials';
import { tutorialProgress, useProgressionStore } from '@/stores/use-progression-store';

export default function TutorialScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const tutorial = tutorialById(id ?? '');
  const box = tutorial ? boxById(tutorial.boxId) : undefined;

  const stepsDone = useProgressionStore((s) => s.stepsDone[id ?? ''] ?? []);
  const download = useProgressionStore((s) => s.downloads[id ?? '']);
  const toggleStep = useProgressionStore((s) => s.toggleStep);
  const startDownload = useProgressionStore((s) => s.startDownload);
  const rateBox = useProgressionStore((s) => s.rateBox);
  const alreadyRated = useProgressionStore((s) => Boolean(box && s.ratings[box.id]));

  const [ratingVisible, setRatingVisible] = useState(false);

  const player = useVideoPlayer(tutorial?.videoUrl ?? '', (p) => {
    p.loop = false;
  });

  if (!tutorial || !box) {
    return (
      <Screen withTabInset={false}>
        <ThemedText type="small" themeColor="textSecondary">
          Tutoriel introuvable.
        </ThemedText>
        <AppButton label="Retour" onPress={() => router.back()} />
      </Screen>
    );
  }

  const boxTheme = themeById(box.themeId);
  const progress = tutorialProgress({ [tutorial.id]: stepsDone }, tutorial.id);

  function onToggleStep(stepId: string) {
    const justCompleted = toggleStep(tutorial!.id, stepId);
    if (justCompleted && !alreadyRated) {
      setTimeout(() => setRatingVisible(true), 350);
    }
  }

  return (
    <Screen withTabInset={false}>
      <View style={styles.videoWrap}>
        <VideoView
          player={player}
          style={styles.video}
          nativeControls
          contentFit="cover"
          fullscreenOptions={{ enable: true }}
        />
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
      </View>

      <View style={styles.headerBlock}>
        <ThemedText type="small" style={{ color: theme.brand }}>
          {boxTheme.emoji} {box.title} · {box.monthLabel}
        </ThemedText>
        <ThemedText type="subtitle" style={styles.title}>
          {tutorial.title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {tutorial.description}
        </ThemedText>
        <View style={styles.metaRow}>
          {[`⏱ ${tutorial.durationMin} min`, DifficultyLabels[tutorial.level], `+${tutorial.xp} XP`].map((meta) => (
            <View key={meta} style={[styles.metaChip, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.metaText}>
                {meta}
              </ThemedText>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.downloadRow, { backgroundColor: theme.backgroundElement }]}>
        {download?.status === 'done' ? (
          <>
            <Text style={styles.downloadIcon}>📥</Text>
            <ThemedText type="small" style={{ color: theme.success, flex: 1 }}>
              Disponible hors ligne
            </ThemedText>
          </>
        ) : download?.status === 'downloading' ? (
          <>
            <Text style={styles.downloadIcon}>📥</Text>
            <View style={styles.downloadProgress}>
              <ThemedText type="small" themeColor="textSecondary">
                Téléchargement… {Math.round(download.progress * 100)}%
              </ThemedText>
              <ProgressBar progress={download.progress} height={4} />
            </View>
          </>
        ) : (
          <>
            <Text style={styles.downloadIcon}>📥</Text>
            <ThemedText type="small" themeColor="textSecondary" style={styles.downloadLabel}>
              Regarder sans connexion
            </ThemedText>
            <AppButton label="Télécharger" variant="secondary" small onPress={() => startDownload(tutorial.id)} />
          </>
        )}
      </View>

      <View style={styles.stepsBlock}>
        <View style={styles.stepsHeader}>
          <ThemedText type="smallBold" style={styles.stepsTitle}>
            Étapes ({stepsDone.length}/{tutorial.steps.length})
          </ThemedText>
          <View style={styles.stepsProgress}>
            <ProgressBar progress={progress} height={5} />
          </View>
        </View>

        {tutorial.steps.map((step, index) => {
          const done = stepsDone.includes(step.id);
          return (
            <Pressable
              key={step.id}
              onPress={() => onToggleStep(step.id)}
              style={({ pressed }) => [
                styles.step,
                { backgroundColor: theme.backgroundElement },
                done && { backgroundColor: theme.brandSoft },
                pressed && styles.pressed,
              ]}>
              <View
                style={[
                  styles.checkbox,
                  { borderColor: done ? theme.brand : theme.textSecondary },
                  done && { backgroundColor: theme.brand },
                ]}>
                {done && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.stepTexts}>
                <ThemedText type="smallBold" style={done ? { color: theme.brand } : undefined}>
                  {index + 1}. {step.title}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {step.description}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}
      </View>

      <RatingModal
        visible={ratingVisible}
        boxTitle={box.title}
        onSubmit={(stars, comment) => rateBox(box.id, stars, comment)}
        onClose={() => setRatingVisible(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  videoWrap: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
  },
  back: {
    position: 'absolute',
    top: Spacing.two,
    left: Spacing.two,
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0,0,0,0.45)',
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
  headerBlock: {
    gap: Spacing.two,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  metaChip: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.full,
  },
  metaText: {
    fontSize: 12,
  },
  downloadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  downloadIcon: {
    fontSize: 18,
  },
  downloadLabel: {
    flex: 1,
  },
  downloadProgress: {
    flex: 1,
    gap: Spacing.one,
  },
  stepsBlock: {
    gap: Spacing.two,
  },
  stepsHeader: {
    gap: Spacing.two,
    marginBottom: Spacing.one,
  },
  stepsTitle: {
    fontSize: 18,
  },
  stepsProgress: {
    width: '100%',
  },
  step: {
    flexDirection: 'row',
    gap: Spacing.three,
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  stepTexts: {
    flex: 1,
    gap: 2,
  },
});
