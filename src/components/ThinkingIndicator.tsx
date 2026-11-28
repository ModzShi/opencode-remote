import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/hooks/useTheme';

const WORDS = ['analisando', 'lendo o contexto', 'planejando', 'escrevendo'];

/**
 * Indicador de raciocínio no estilo Claude: faísca girando + palavra que
 * troca conforme o tempo passa. Puro Animated, roda na thread nativa.
 */
export function ThinkingIndicator() {
  const { colors } = useTheme();
  const [spin] = useState(() => new Animated.Value(0));
  const [breathe] = useState(() => new Animated.Value(0));
  const [shimmer] = useState(() => new Animated.Value(0.45));
  const [word, setWord] = useState(0);

  useEffect(() => {
    const rotate = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 2600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    const fade = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0.45,
          duration: 700,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    rotate.start();
    pulse.start();
    fade.start();
    const timer = setInterval(() => setWord((current) => (current + 1) % WORDS.length), 2100);
    return () => {
      rotate.stop();
      pulse.stop();
      fade.stop();
      clearInterval(timer);
    };
  }, [breathe, shimmer, spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const scale = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.08] });

  return (
    <View style={styles.row}>
      <Animated.View style={{ transform: [{ rotate }, { scale }] }}>
        <Svg width={16} height={16} viewBox="0 0 24 24">
          <Path
            d="M12 2.4c.9 5.2 3.5 8.1 9.1 9.6-5.6 1.5-8.2 4.4-9.1 9.6-.9-5.2-3.5-8.1-9.1-9.6 5.6-1.5 8.2-4.4 9.1-9.6Z"
            fill={colors.primary}
          />
        </Svg>
      </Animated.View>
      <Animated.Text style={[styles.text, { color: colors.mutedForeground, opacity: shimmer }]}>
        {WORDS[word]}
      </Animated.Text>
      <View style={styles.dots}>
        {[0, 1, 2].map((index) => (
          <Dot key={index} index={index} color={colors.primary} />
        ))}
      </View>
    </View>
  );
}

function Dot({ index, color }: { index: number; color: string }) {
  const [value] = useState(() => new Animated.Value(0.25));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(index * 160),
        Animated.timing(value, {
          toValue: 1,
          duration: 380,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0.25,
          duration: 380,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay((2 - index) * 160),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [index, value]);

  return <Animated.View style={[styles.dot, { backgroundColor: color, opacity: value }]} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 22 },
  text: { fontSize: 13, fontWeight: '600', letterSpacing: 0.1 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 1 },
  dot: { width: 3.5, height: 3.5, borderRadius: 2 },
});
