import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type ForumComment } from '@/lib/mock/forum';
import { timeAgo } from '@/lib/utils';

type CommentRowProps = {
  comment: ForumComment;
  nested?: boolean;
  onLike: () => void;
  onReply?: () => void;
};

export function CommentRow({ comment, nested, onLike, onReply }: CommentRowProps) {
  const theme = useTheme();

  return (
    <View style={[styles.row, nested && { marginLeft: Spacing.five, borderLeftColor: theme.backgroundSelected, borderLeftWidth: 2, paddingLeft: Spacing.three }]}>
      <Avatar emoji={comment.author.avatarEmoji} backgroundColor={comment.author.avatarBackground} size={30} />
      <View style={styles.body}>
        <View style={styles.meta}>
          <ThemedText type="smallBold" style={styles.name}>
            {comment.author.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.time}>
            {timeAgo(comment.createdAt)}
          </ThemedText>
        </View>
        <ThemedText type="small">{comment.body}</ThemedText>
        <View style={styles.actions}>
          <Pressable onPress={onLike} hitSlop={8} style={styles.action}>
            <Text style={styles.icon}>{comment.likedByMe ? '❤️' : '🤍'}</Text>
            <ThemedText type="small" themeColor={comment.likedByMe ? 'brand' : 'textSecondary'}>
              {comment.likes}
            </ThemedText>
          </Pressable>
          {onReply && (
            <Pressable onPress={onReply} hitSlop={8}>
              <ThemedText type="small" style={{ color: theme.brand }}>
                Répondre
              </ThemedText>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
  },
  name: {
    fontSize: 13,
  },
  time: {
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: 2,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  icon: {
    fontSize: 12,
  },
});
