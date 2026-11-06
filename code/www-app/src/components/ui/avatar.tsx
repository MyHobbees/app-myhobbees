import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type AvatarProps = {
  uri?: string | null;
  emoji?: string;
  size?: number;
  backgroundColor?: string;
};

export function Avatar({ uri, emoji, size = 40, backgroundColor }: AvatarProps) {
  const theme = useTheme();

  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: Radius.full }} />;
  }

  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          backgroundColor: backgroundColor ?? theme.brandSoft,
        },
      ]}>
      <Text style={{ fontSize: size * 0.5 }}>{emoji ?? '🙂'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
