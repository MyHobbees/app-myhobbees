import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { DifficultySelector } from '@/components/difficulty-selector';
import { ScreenHeader } from '@/components/screen-header';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { Avatar } from '@/components/ui/avatar';
import { BadgeMedal } from '@/components/ui/badge-medal';
import { SectionHeader } from '@/components/ui/section-header';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { badges } from '@/lib/mock/gamification';
import { presetAvatars } from '@/lib/mock/user';
import { useProfileStore } from '@/stores/use-profile-store';
import {
  completedTutorialsCount,
  levelForXp,
  useProgressionStore,
} from '@/stores/use-progression-store';

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();
  const profile = useProfileStore();
  const xp = useProgressionStore((s) => s.xp);
  const streakDays = useProgressionStore((s) => s.streakDays);
  const stepsDone = useProgressionStore((s) => s.stepsDone);
  const unlockedBadgeIds = useProgressionStore((s) => s.unlockedBadgeIds);

  const preset = presetAvatars.find((p) => p.id === profile.presetAvatarId);
  const stats = [
    { label: 'XP', value: String(xp) },
    { label: 'Série', value: `${streakDays} j 🔥` },
    { label: 'Tutos terminés', value: String(completedTutorialsCount(stepsDone)) },
  ];

  return (
    <Screen>
      <ScreenHeader title="Profil" />

      <View style={styles.identity}>
        <Avatar uri={profile.avatarUri} emoji={preset?.emoji} backgroundColor={preset?.background} size={84} />
        <ThemedText type="subtitle" style={styles.name}>
          {profile.firstName} {profile.lastName}
        </ThemedText>
        <View style={[styles.levelChip, { backgroundColor: theme.brandSoft }]}>
          <ThemedText type="smallBold" style={{ color: theme.brand }}>
            Niveau {levelForXp(xp)}
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary" style={styles.bio}>
          {profile.bio}
        </ThemedText>
      </View>

      <View style={styles.statsRow}>
        {stats.map((stat) => (
          <View key={stat.label} style={[styles.stat, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold" style={styles.statValue}>
              {stat.value}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {stat.label}
            </ThemedText>
          </View>
        ))}
      </View>

      <View>
        <SectionHeader title="Mes badges" />
        <View style={styles.badgeGrid}>
          {badges.map((badge) => (
            <View key={badge.id} style={styles.badgeCell}>
              <BadgeMedal
                emoji={badge.emoji}
                title={badge.title}
                description={badge.description}
                unlocked={unlockedBadgeIds.includes(badge.id)}
              />
            </View>
          ))}
        </View>
      </View>

      <View>
        <SectionHeader title="Difficulté de ma prochaine box" />
        <DifficultySelector />
      </View>

      <AppButton label="Modifier mes informations" variant="secondary" onPress={() => router.push('/profile/edit')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  name: {
    fontSize: 24,
    lineHeight: 30,
  },
  levelChip: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.full,
  },
  bio: {
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.three,
    gap: 2,
  },
  statValue: {
    fontSize: 17,
    fontFamily: Fonts.rounded,
    fontWeight: '800',
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  badgeCell: {
    flexBasis: '31%',
    flexGrow: 1,
  },
});
