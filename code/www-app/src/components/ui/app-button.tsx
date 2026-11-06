import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
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

  const background =
    variant === 'primary' ? theme.primary : variant === 'secondary' ? theme.secondary : 'transparent';
  const labelColor =
    variant === 'primary' ? theme.onPrimary : variant === 'secondary' ? theme.onSecondary : theme.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        padding,
        { backgroundColor: background },
        variant === 'primary' && styles.primaryShadow,
        variant === 'ghost' && { borderWidth: 1.5, borderColor: theme.hairline },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      <ThemedText type="smallBold" style={{ color: labelColor }}>
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
  primaryShadow: {
    shadowColor: '#F9C74F',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  regular: {
    paddingVertical: Spacing.three - 2,
    paddingHorizontal: Spacing.four,
  },
  small: {
    paddingVertical: Spacing.two - 1,
    paddingHorizontal: Spacing.three,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
});
