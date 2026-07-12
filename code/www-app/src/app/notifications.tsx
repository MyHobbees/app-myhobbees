import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type NotificationType } from '@/lib/mock/notifications';
import { timeAgo } from '@/lib/utils';
import { useNotificationsStore } from '@/stores/use-notifications-store';

const typeIcons: Record<NotificationType, string> = {
  expedition: '📦',
  like: '❤️',
  reponse: '💬',
  rappel: '🔥',
};

export default function NotificationsScreen() {
  const theme = useTheme();
  const items = useNotificationsStore((s) => s.items);
  const markRead = useNotificationsStore((s) => s.markRead);
  const markAllRead = useNotificationsStore((s) => s.markAllRead);

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.scroll}>
      <View style={styles.inner}>
        <Pressable onPress={markAllRead} hitSlop={8} style={styles.markAll}>
          <ThemedText type="small" style={{ color: theme.brand }}>
            Tout marquer comme lu
          </ThemedText>
        </Pressable>

        {items.map((notification) => (
          <Pressable
            key={notification.id}
            onPress={() => markRead(notification.id)}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: notification.read ? theme.backgroundElement : theme.brandSoft },
              pressed && styles.pressed,
            ]}>
            <Text style={styles.icon}>{typeIcons[notification.type]}</Text>
            <View style={styles.texts}>
              <ThemedText type="smallBold">{notification.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                {notification.body}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.time}>
                {timeAgo(notification.createdAt)}
              </ThemedText>
            </View>
            {!notification.read && <View style={[styles.dot, { backgroundColor: theme.brand }]} />}
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.three,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.two,
  },
  markAll: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    alignItems: 'flex-start',
  },
  pressed: {
    opacity: 0.8,
  },
  icon: {
    fontSize: 22,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  time: {
    fontSize: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: Radius.full,
    marginTop: 6,
  },
});
