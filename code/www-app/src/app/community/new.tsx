import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { AppInput } from '@/components/ui/app-input';
import { Chip } from '@/components/ui/chip';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { currentBox } from '@/lib/mock/boxes';
import { boxThemes } from '@/lib/mock/themes';
import { presetAvatars } from '@/lib/mock/user';
import { useForumStore } from '@/stores/use-forum-store';
import { useProfileStore } from '@/stores/use-profile-store';
import { useProgressionStore } from '@/stores/use-progression-store';

export default function NewTopicScreen() {
  const router = useRouter();
  const theme = useTheme();
  const addTopic = useForumStore((s) => s.addTopic);
  const unlockBadge = useProgressionStore((s) => s.unlockBadge);
  const profile = useProfileStore();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [tagId, setTagId] = useState(currentBox.themeId);

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  }

  function publish() {
    const preset = presetAvatars.find((p) => p.id === profile.presetAvatarId);
    addTopic({
      title: title.trim(),
      body: body.trim(),
      imageUri: imageUri ?? undefined,
      boxTagId: tagId,
      authorName: `${profile.firstName} ${profile.lastName[0]}.`,
      authorEmoji: preset?.emoji ?? '🙂',
      authorBackground: preset?.background ?? '#CD6581',
    });
    unlockBadge('membre-actif');
    router.back();
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.scroll}>
      <View style={styles.inner}>
        <AppInput
          value={title}
          onChangeText={setTitle}
          placeholder="Titre de votre sujet"
          style={styles.titleInput}
        />
        <AppInput
          value={body}
          onChangeText={setBody}
          placeholder="Racontez votre création, posez votre question…"
          multiline
          style={styles.bodyInput}
        />

        {imageUri ? (
          <View>
            <Image source={{ uri: imageUri }} style={styles.preview} contentFit="cover" />
            <Pressable
              onPress={() => setImageUri(null)}
              style={[styles.removeImage, { backgroundColor: theme.background }]}>
              <ThemedText type="smallBold" style={{ color: theme.brand }}>
                ✕
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <AppButton label="📷 Ajouter une photo" variant="secondary" onPress={pickImage} style={styles.photoButton} />
        )}

        <ThemedText type="smallBold" style={styles.tagTitle}>
          Passion concernée
        </ThemedText>
        <View style={styles.tags}>
          {boxThemes.map((boxTheme) => (
            <Chip
              key={boxTheme.id}
              label={boxTheme.name}
              emoji={boxTheme.emoji}
              selected={tagId === boxTheme.id}
              onPress={() => setTagId(boxTheme.id)}
            />
          ))}
        </View>

        <AppButton label="Publier" disabled={!title.trim() || !body.trim()} onPress={publish} />
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
  titleInput: {
    fontSize: 17,
    fontWeight: '600',
  },
  bodyInput: {
    minHeight: 120,
  },
  preview: {
    height: 200,
    borderRadius: Radius.lg,
  },
  removeImage: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoButton: {
    alignSelf: 'flex-start',
  },
  tagTitle: {
    fontSize: 15,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
