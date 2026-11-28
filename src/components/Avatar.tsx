import React from 'react';
import { Image, StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

/*
 * Avatar do app. Usa a arte "no profile" certa para cada tema: o orbe preto
 * brilhante no escuro e o orbe claro no tema claro.
 */
const AVATAR_DARK = require('../../assets/avatar-dark.jpg');
const AVATAR_LIGHT = require('../../assets/avatar-light.jpg');

interface AvatarProps {
  size?: number;
  style?: ViewStyle;
}

export function Avatar({ size = 24, style }: AvatarProps) {
  const { isDark } = useTheme();
  return (
    <View
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
    >
      <Image
        source={isDark ? AVATAR_DARK : AVATAR_LIGHT}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.06)' },
});
