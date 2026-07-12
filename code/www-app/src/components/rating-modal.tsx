import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { AppInput } from '@/components/ui/app-input';
import { StarRating } from '@/components/ui/star-rating';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type RatingModalProps = {
  visible: boolean;
  boxTitle: string;
  onSubmit: (stars: number, comment: string) => void;
  onClose: () => void;
};

export function RatingModal({ visible, boxTitle, onSubmit, onClose }: RatingModalProps) {
  const theme = useTheme();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function close() {
    setStars(0);
    setComment('');
    setSubmitted(false);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          {submitted ? (
            <View style={styles.thanks}>
              <Text style={styles.thanksEmoji}>🎉</Text>
              <ThemedText type="subtitle" style={styles.thanksTitle}>
                Merci !
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
                Votre avis nous aide à composer les prochaines box.
              </ThemedText>
              <View style={[styles.xpChip, { backgroundColor: theme.brandSoft }]}>
                <ThemedText type="smallBold" style={{ color: theme.brandSoftText }}>
                  +20 XP
                </ThemedText>
              </View>
              <AppButton label="Fermer" onPress={close} style={styles.fullWidth} />
            </View>
          ) : (
            <>
              <Text style={styles.headerEmoji}>🏆</Text>
              <ThemedText type="smallBold" style={styles.title}>
                Tutoriel terminé, bravo !
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
                Que pensez-vous de la box « {boxTitle} » ?
              </ThemedText>
              <View style={styles.stars}>
                <StarRating value={stars} onChange={setStars} />
              </View>
              <AppInput
                value={comment}
                onChangeText={setComment}
                placeholder="Un commentaire ? (facultatif)"
                multiline
                style={styles.input}
              />
              <AppButton
                label="Envoyer mon avis"
                disabled={stars === 0}
                onPress={() => {
                  onSubmit(stars, comment);
                  setSubmitted(true);
                }}
                style={styles.fullWidth}
              />
              <Pressable onPress={close} hitSlop={8}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
                  Plus tard
                </ThemedText>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  sheet: {
    width: '100%',
    maxWidth: 380,
    borderRadius: Radius.xl,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
  },
  headerEmoji: {
    fontSize: 40,
  },
  title: {
    fontSize: 18,
  },
  center: {
    textAlign: 'center',
  },
  stars: {
    marginVertical: Spacing.one,
  },
  input: {
    width: '100%',
    minHeight: 72,
  },
  xpChip: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.full,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  thanks: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  thanksEmoji: {
    fontSize: 48,
  },
  thanksTitle: {
    fontSize: 24,
  },
});
