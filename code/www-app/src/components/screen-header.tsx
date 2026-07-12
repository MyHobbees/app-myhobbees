import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { unreadCount, useNotificationsStore } from '@/stores/use-notifications-store';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
};

export function ScreenHeader({ title, subtitle }: ScreenHeaderProps) {
  const router = useRouter();
  const theme = useTheme();
  const items = useNotificationsStore((s) => s.items);
  const unread = unreadCount(items);

  return (
    <View style={styles.row}>
      <View style={styles.titles}>
        <ThemedText type="subtitle" style={styles.title}>
          {title}
        </ThemedText>
        {subtitle && (
          <ThemedText type="small" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        )}
      </View>
      <Pressable
        onPress={() => router.push('/notifications')}
        style={({ pressed }) => [styles.bell, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
        <Text style={styles.bellIcon}>🔔</Text>
        {unread > 0 && (
          <View style={[styles.badge, { backgroundColor: theme.brand }]}>
            <Text style={styles.badgeText}>{unread}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.four,
  },
  titles: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
  },
  bell: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellIcon: {
    fontSize: 20,
  },
  pressed: {
    opacity: 0.7,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
});
