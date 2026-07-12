import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BrandGradient, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type AppButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function AppButton({ label, onPress, variant = 'primary', disabled, small, style }: AppButtonProps) {
  const theme = useTheme();
  const padding = small ? styles.small : styles.regular;

  if (variant === 'primary') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [styles.shadow, pressed && styles.pressed, disabled && styles.disabled, style]}>
        <LinearGradient colors={BrandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.base, padding]}>
          <ThemedText type="smallBold" style={styles.primaryLabel}>
            {label}
          </ThemedText>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        padding,
        variant === 'secondary' && { backgroundColor: theme.brandSoft },
        variant === 'ghost' && { borderWidth: 1.5, borderColor: theme.hairline },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      <ThemedText
        type="smallBold"
        style={{ color: variant === 'secondary' ? theme.brandSoftText : theme.textSecondary }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadow: {
    borderRadius: Radius.full,
    shadowColor: '#CD6581',
    shadowOpacity: 0.4,
    shadowRadius: 11,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  regular: {
    paddingVertical: Spacing.three - 2,
    paddingHorizontal: Spacing.four,
  },
  small: {
    paddingVertical: Spacing.two - 1,
    paddingHorizontal: Spacing.three,
  },
  primaryLabel: {
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
});
