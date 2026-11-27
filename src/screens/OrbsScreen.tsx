import React, { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store';
import { OrbView } from '@/rafael/OrbView';
import { ORBS, findOrb } from '@/rafael/orbs';
import { haptic } from '@/utils/haptics';

export default function OrbsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const selected = useAppStore((state) => state.settings.rafaelOrb);
  const setSettings = useAppStore((state) => state.setSettings);

  const active = findOrb(selected);
  const tileWidth = (width - 32 - 12) / 2;

  const select = useCallback(
    (id: string) => {
      haptic('tap');
      setSettings({ rafaelOrb: id });
    },
    [setSettings]
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlatList
        data={ORBS}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>Orbes</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              A forma do Rafael em modo voz
            </Text>

            <View
              style={[
                styles.hero,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
            >
              <OrbView size={176} state="speaking" variant={active.id} levelRef={undefined} />
              <Text style={[styles.heroName, { color: colors.foreground }]}>{active.name}</Text>
              <Text style={[styles.heroHint, { color: colors.mutedForeground }]}>
                Toque em um orbe para trocar
              </Text>
            </View>

            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>GALERIA</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isActive = item.id === active.id;
          return (
            <Pressable
              onPress={() => select(item.id)}
              style={({ pressed }) => [
                styles.tile,
                {
                  width: tileWidth,
                  borderColor: isActive ? item.accent : colors.border,
                  backgroundColor: isActive ? 'rgba(255,255,255,0.05)' : colors.surface,
                },
                pressed && { opacity: 0.78 },
              ]}
            >
              <OrbView size={tileWidth - 40} state={isActive ? 'speaking' : 'idle'} variant={item.id} preview />
              <View style={styles.tileFooter}>
                <Text
                  numberOfLines={1}
                  style={[styles.tileName, { color: isActive ? colors.foreground : colors.foregroundMuted }]}
                >
                  {item.name}
                </Text>
                {isActive ? <Check size={14} color={item.accent} /> : null}
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16 },
  header: { gap: 4 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { fontSize: 13, marginBottom: 14 },
  hero: {
    alignItems: 'center',
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 18,
    gap: 2,
    overflow: 'hidden',
  },
  heroName: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
  heroHint: { fontSize: 11.5 },
  sectionLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginTop: 22,
    marginBottom: 10,
    marginLeft: 2,
  },
  column: { gap: 12, marginBottom: 12 },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    gap: 4,
  },
  tileFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    maxWidth: '100%',
  },
  tileName: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
});
