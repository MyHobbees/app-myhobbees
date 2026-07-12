import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { Screen } from '@/components/screen';
import { TopicCard } from '@/components/topic-card';
import { AppButton } from '@/components/ui/app-button';
import { Chip } from '@/components/ui/chip';
import { Spacing } from '@/constants/theme';
import { boxThemes } from '@/lib/mock/themes';
import { useForumStore } from '@/stores/use-forum-store';

export default function CommunityScreen() {
  const router = useRouter();
  const topics = useForumStore((s) => s.topics);
  const [filter, setFilter] = useState<string | null>(null);

  const usedThemes = boxThemes.filter((t) => topics.some((topic) => topic.boxTagId === t.id));
  const filtered = filter ? topics.filter((t) => t.boxTagId === filter) : topics;

  return (
    <Screen>
      <ScreenHeader title="Communauté" subtitle="Partagez vos créations et vos astuces" />

      <AppButton label="+ Nouveau sujet" onPress={() => router.push('/community/new')} style={styles.newButton} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label="Tous" selected={filter === null} onPress={() => setFilter(null)} />
        {usedThemes.map((theme) => (
          <Chip
            key={theme.id}
            label={theme.name}
            emoji={theme.emoji}
            selected={filter === theme.id}
            onPress={() => setFilter(filter === theme.id ? null : theme.id)}
          />
        ))}
      </ScrollView>

      <View style={styles.list}>
        {filtered.map((topic) => (
          <TopicCard key={topic.id} topic={topic} />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  newButton: {
    alignSelf: 'flex-start',
  },
  chips: {
    gap: Spacing.two,
  },
  list: {
    gap: Spacing.three,
  },
});
