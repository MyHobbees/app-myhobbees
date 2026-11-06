import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { TutorialCard } from '@/components/tutorial-card';
import { Chip } from '@/components/ui/chip';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { boxes } from '@/lib/mock/boxes';
import { boxThemes, themeById } from '@/lib/mock/themes';
import { tutorials } from '@/lib/mock/tutorials';
import { useProgressionStore } from '@/stores/use-progression-store';

export default function TutosScreen() {
  const [filter, setFilter] = useState<string | null>(null);
  const downloads = useProgressionStore((s) => s.downloads);

  const availableThemes = useMemo(() => {
    const themeIds = new Set(
      tutorials.map((t) => boxes.find((b) => b.id === t.boxId)?.themeId).filter(Boolean),
    );
    return boxThemes.filter((t) => themeIds.has(t.id));
  }, []);

  const downloaded = tutorials.filter((t) => downloads[t.id]?.status === 'done');

  const groups = boxes
    .filter((box) => box.tutorialIds.length > 0)
    .filter((box) => !filter || box.themeId === filter)
    .sort((a, b) => (a.status === 'current' ? -1 : b.status === 'current' ? 1 : 0));

  return (
    <Screen>
      <ScreenHeader title="Tutoriels" subtitle="Tout le catalogue, débloqué avec votre box" />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label="Tous" selected={filter === null} onPress={() => setFilter(null)} />
        {availableThemes.map((theme) => (
          <Chip
            key={theme.id}
            label={theme.name}
            emoji={theme.emoji}
            selected={filter === theme.id}
            onPress={() => setFilter(filter === theme.id ? null : theme.id)}
          />
        ))}
      </ScrollView>

      {downloaded.length > 0 && !filter && (
        <View style={styles.group}>
          <SectionHeader title="Hors ligne 📥" />
          <View style={styles.list}>
            {downloaded.map((tutorial) => (
              <TutorialCard key={tutorial.id} tutorial={tutorial} wide />
            ))}
          </View>
        </View>
      )}

      {groups.map((box) => {
        const boxTheme = themeById(box.themeId);
        return (
          <View key={box.id} style={styles.group}>
            <SectionHeader title={`${boxTheme.emoji} ${box.title}`} />
            <ThemedText type="small" themeColor="textSecondary" style={styles.groupMeta}>
              {box.monthLabel} · {boxTheme.name}
            </ThemedText>
            <View style={styles.list}>
              {box.tutorialIds
                .map((id) => tutorials.find((t) => t.id === id))
                .filter(Boolean)
                .map((tutorial) => (
                  <TutorialCard key={tutorial!.id} tutorial={tutorial!} wide />
                ))}
            </View>
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: {
    gap: Spacing.two,
  },
  group: {
    gap: Spacing.two,
  },
  groupMeta: {
    marginTop: -Spacing.two,
  },
  list: {
    gap: Spacing.three,
  },
});
