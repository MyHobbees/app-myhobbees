import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CommentRow } from '@/components/comment-row';
import { ThemedText } from '@/components/themed-text';
import { AppInput } from '@/components/ui/app-input';
import { Avatar } from '@/components/ui/avatar';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { themeById } from '@/lib/mock/themes';
import { presetAvatars } from '@/lib/mock/user';
import { timeAgo } from '@/lib/utils';
import { useForumStore } from '@/stores/use-forum-store';
import { useProfileStore } from '@/stores/use-profile-store';

export default function TopicScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const topic = useForumStore((s) => s.topics.find((t) => t.id === id));
  const toggleTopicLike = useForumStore((s) => s.toggleTopicLike);
  const toggleCommentLike = useForumStore((s) => s.toggleCommentLike);
  const addComment = useForumStore((s) => s.addComment);
  const profile = useProfileStore();

  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<{ commentId: string; author: string } | null>(null);

  if (!topic) {
    return (
      <View style={styles.missing}>
        <ThemedText type="small" themeColor="textSecondary">
          Sujet introuvable.
        </ThemedText>
      </View>
    );
  }

  const boxTheme = themeById(topic.boxTagId);
  const preset = presetAvatars.find((p) => p.id === profile.presetAvatarId);

  function submit() {
    if (!text.trim()) return;
    addComment(
      topic!.id,
      text.trim(),
      {
        name: `${profile.firstName} ${profile.lastName[0]}.`,
        avatarEmoji: preset?.emoji ?? '🙂',
        avatarBackground: preset?.background ?? '#CD6581',
      },
      replyTo?.commentId,
    );
    setText('');
    setReplyTo(null);
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.inner}>
          <View style={styles.header}>
            <Avatar emoji={topic.author.avatarEmoji} backgroundColor={topic.author.avatarBackground} size={40} />
            <View style={styles.headerText}>
              <ThemedText type="smallBold">{topic.author.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {timeAgo(topic.createdAt)} · {boxTheme.emoji} {boxTheme.name}
              </ThemedText>
            </View>
          </View>

          <ThemedText type="subtitle" style={styles.title}>
            {topic.title}
          </ThemedText>
          <ThemedText type="small">{topic.body}</ThemedText>

          {topic.imageUri && <Image source={{ uri: topic.imageUri }} style={styles.image} contentFit="cover" />}

          <Pressable onPress={() => toggleTopicLike(topic.id)} style={styles.likeRow} hitSlop={8}>
            <Text style={styles.likeIcon}>{topic.likedByMe ? '❤️' : '🤍'}</Text>
            <ThemedText type="small" themeColor={topic.likedByMe ? 'brand' : 'textSecondary'}>
              {topic.likes} j’aime
            </ThemedText>
          </Pressable>

          <View style={[styles.separator, { backgroundColor: theme.backgroundSelected }]} />

          <ThemedText type="smallBold" style={styles.commentsTitle}>
            Commentaires
          </ThemedText>

          <View style={styles.comments}>
            {topic.comments.map((comment) => (
              <View key={comment.id} style={styles.commentGroup}>
                <CommentRow
                  comment={comment}
                  onLike={() => toggleCommentLike(topic.id, comment.id)}
                  onReply={() => setReplyTo({ commentId: comment.id, author: comment.author.name })}
                />
                {comment.replies.map((reply) => (
                  <CommentRow
                    key={reply.id}
                    comment={reply}
                    nested
                    onLike={() => toggleCommentLike(topic.id, comment.id, reply.id)}
                  />
                ))}
              </View>
            ))}
            {topic.comments.length === 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                Soyez la première personne à commenter !
              </ThemedText>
            )}
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.inputBar,
          { backgroundColor: theme.background, borderTopColor: theme.backgroundSelected, paddingBottom: insets.bottom + Spacing.two },
        ]}>
        {replyTo && (
          <View style={[styles.replyBanner, { backgroundColor: theme.brandSoft }]}>
            <ThemedText type="small" style={{ color: theme.brand, flex: 1 }}>
              En réponse à {replyTo.author}
            </ThemedText>
            <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
              <ThemedText type="smallBold" style={{ color: theme.brand }}>
                ✕
              </ThemedText>
            </Pressable>
          </View>
        )}
        <View style={styles.inputRow}>
          <AppInput
            value={text}
            onChangeText={setText}
            placeholder="Écrire un commentaire…"
            style={styles.input}
          />
          <Pressable
            onPress={submit}
            disabled={!text.trim()}
            style={({ pressed }) => [
              styles.send,
              { backgroundColor: theme.brand },
              (!text.trim() || pressed) && styles.sendDisabled,
            ]}>
            <Text style={styles.sendIcon}>➤</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    padding: Spacing.three,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
  },
  image: {
    height: 200,
    borderRadius: Radius.lg,
    marginTop: Spacing.one,
  },
  likeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  likeIcon: {
    fontSize: 16,
  },
  separator: {
    height: 1,
    marginVertical: Spacing.two,
  },
  commentsTitle: {
    fontSize: 16,
  },
  comments: {
    gap: Spacing.three,
  },
  commentGroup: {
    gap: Spacing.two,
  },
  inputBar: {
    borderTopWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    borderRadius: Radius.full,
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.three,
  },

  send: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    opacity: 0.5,
  },
  sendIcon: {
    color: '#ffffff',
    fontSize: 16,
  },
});
