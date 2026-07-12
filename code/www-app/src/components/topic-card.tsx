import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type Topic } from '@/lib/mock/forum';
import { themeById } from '@/lib/mock/themes';
import { timeAgo } from '@/lib/utils';
import { useForumStore } from '@/stores/use-forum-store';

export function TopicCard({ topic }: { topic: Topic }) {
  const router = useRouter();
  const theme = useTheme();
  const toggleTopicLike = useForumStore((s) => s.toggleTopicLike);
  const boxTheme = themeById(topic.boxTagId);
  const commentCount = topic.comments.reduce((sum, c) => sum + 1 + c.replies.length, 0);

  return (
    <Pressable
      onPress={() => router.push(`/community/topic/${topic.id}`)}
      style={({ pressed }) => [styles.card, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
      <View style={styles.header}>
        <Avatar emoji={topic.author.avatarEmoji} backgroundColor={topic.author.avatarBackground} size={36} />
        <View style={styles.headerText}>
          <ThemedText type="smallBold">{topic.author.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {timeAgo(topic.createdAt)}
          </ThemedText>
        </View>
        <View style={[styles.tag, { backgroundColor: theme.brandSoft }]}>
          <ThemedText type="small" style={{ color: theme.brand, fontSize: 12 }}>
            {boxTheme.emoji} {boxTheme.name}
          </ThemedText>
        </View>
      </View>

      <ThemedText type="smallBold" style={styles.title}>
        {topic.title}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
        {topic.body}
      </ThemedText>

      {topic.imageUri && <Image source={{ uri: topic.imageUri }} style={styles.image} contentFit="cover" />}

      <View style={styles.footer}>
        <Pressable onPress={() => toggleTopicLike(topic.id)} hitSlop={8} style={styles.action}>
          <Text style={styles.actionIcon}>{topic.likedByMe ? '❤️' : '🤍'}</Text>
          <ThemedText type="small" themeColor={topic.likedByMe ? 'brand' : 'textSecondary'}>
            {topic.likes}
          </ThemedText>
        </Pressable>
        <View style={styles.action}>
          <Text style={styles.actionIcon}>💬</Text>
          <ThemedText type="small" themeColor="textSecondary">
            {commentCount}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.85,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerText: {
    flex: 1,
  },
  tag: {
    paddingVertical: 3,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.full,
  },
  title: {
    fontSize: 16,
  },
  image: {
    height: 160,
    borderRadius: Radius.md,
    marginTop: Spacing.one,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.four,
    marginTop: Spacing.one,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  actionIcon: {
    fontSize: 14,
  },
});
