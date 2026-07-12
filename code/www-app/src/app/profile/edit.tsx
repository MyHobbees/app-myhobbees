import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { AppInput } from '@/components/ui/app-input';
import { Avatar } from '@/components/ui/avatar';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { presetAvatars } from '@/lib/mock/user';
import { useProfileStore } from '@/stores/use-profile-store';

export default function EditProfileScreen() {
  const router = useRouter();
  const theme = useTheme();
  const profile = useProfileStore();

  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [email, setEmail] = useState(profile.email);
  const [bio, setBio] = useState(profile.bio);

  const preset = presetAvatars.find((p) => p.id === profile.presetAvatarId);

  async function pickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      profile.setAvatarUri(result.assets[0].uri);
    }
  }

  function save() {
    profile.updateInfo({ firstName, lastName, email, bio });
    router.back();
  }

  const field = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    multiline = false,
  ) => (
    <View style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <AppInput value={value} onChangeText={onChange} multiline={multiline} />
    </View>
  );

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.scroll}>
      <View style={styles.inner}>
        <View style={styles.avatarBlock}>
          <Avatar uri={profile.avatarUri} emoji={preset?.emoji} backgroundColor={preset?.background} size={92} />
          <View style={styles.presets}>
            {presetAvatars.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => profile.setPresetAvatar(p.id)}
                style={[
                  styles.preset,
                  profile.presetAvatarId === p.id && !profile.avatarUri && { borderColor: theme.brand, borderWidth: 2 },
                ]}>
                <Avatar emoji={p.emoji} backgroundColor={p.background} size={44} />
              </Pressable>
            ))}
          </View>
          <AppButton label="📷 Choisir une photo" variant="secondary" small onPress={pickAvatar} />
        </View>

        {field('Prénom', firstName, setFirstName)}
        {field('Nom', lastName, setLastName)}
        {field('Email', email, setEmail)}
        {field('Bio', bio, setBio, true)}

        <AppButton label="Enregistrer" onPress={save} />
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
    gap: Spacing.three,
  },
  avatarBlock: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    justifyContent: 'center',
  },
  preset: {
    borderRadius: Radius.full,
    padding: 2,
  },
  field: {
    gap: Spacing.one,
  },
});
