import { useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function AppInput({ style, multiline, ...props }: TextInputProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <TextInput
      placeholderTextColor={theme.textSecondary}
      multiline={multiline}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[
        styles.input,
        {
          backgroundColor: theme.background,
          color: theme.text,
          borderColor: focused ? theme.brand : theme.hairline,
        },
        multiline && styles.multiline,
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: Spacing.three,
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
