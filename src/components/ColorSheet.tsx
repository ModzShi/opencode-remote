import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Orb, type OrbStyle } from '@/rafael/Orb';
import { ORB_PRESETS } from '@/rafael/colors';

const SWATCHES = [
  '#7EE7FF',
  '#4FA8FF',
  '#9D8BFF',
  '#FF6BD6',
  '#FF4D6D',
  '#FF9A3D',
  '#FFD166',
  '#B4FF6B',
  '#5CFFB0',
  '#12C99B',
  '#FFFFFF',
  '#8A8F9C',
];

interface ColorSheetProps {
  visible: boolean;
  orb: OrbStyle;
  colorFrom: string;
  colorTo: string;
  cycle: boolean;
  onChangeFrom: (color: string) => void;
  onChangeTo: (color: string) => void;
  onChangeCycle: (cycle: boolean) => void;
  onClose: () => void;
}

export function ColorSheet({
  visible,
  orb,
  colorFrom,
  colorTo,
  cycle,
  onChangeFrom,
  onChangeTo,
  onChangeCycle,
  onClose,
}: ColorSheetProps) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: '#0b0b0d', borderColor: colors.border }]}
          onPress={() => undefined}
        >
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />
          <Text style={[styles.title, { color: colors.foreground }]}>Cores do orbe</Text>

          <View style={styles.preview}>
            <Orb size={124} state="listening" style={orb} colorFrom={colorFrom} colorTo={colorTo} cycle={cycle} />
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>PALETAS</Text>
            <View style={styles.presets}>
              {ORB_PRESETS.map((preset) => {
                const active = !cycle && preset.from === colorFrom && preset.to === colorTo;
                return (
                  <Pressable
                    key={preset.id}
                    onPress={() => {
                      onChangeFrom(preset.from);
                      onChangeTo(preset.to);
                      onChangeCycle(false);
                    }}
                    style={[styles.preset, { borderColor: active ? colors.primary : colors.border }]}
                  >
                    <View style={styles.presetDots}>
                      <View style={[styles.dot, { backgroundColor: preset.from }]} />
                      <View style={[styles.dot, { backgroundColor: preset.to, marginLeft: -6 }]} />
                    </View>
                    <Text style={[styles.presetName, { color: colors.foreground }]}>{preset.name}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={[styles.switchRow, { borderColor: colors.border }]}>
              <View style={styles.switchText}>
                <Text style={[styles.switchLabel, { color: colors.foreground }]}>Cor automática</Text>
                <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                  O orbe troca de cor devagar, como sempre fez
                </Text>
              </View>
              <Switch
                value={cycle}
                onValueChange={onChangeCycle}
                trackColor={{ false: '#2a2a2e', true: colors.primary }}
                thumbColor="#ffffff"
              />
            </View>

            <Text style={[styles.label, { color: colors.mutedForeground, opacity: cycle ? 0.4 : 1 }]}>
              COR DE DENTRO
            </Text>
            <View style={styles.swatches}>
              {SWATCHES.map((color) => (
                <Pressable
                  key={'from-' + color}
                  disabled={cycle}
                  onPress={() => onChangeFrom(color)}
                  style={[
                    styles.swatch,
                    { backgroundColor: color, opacity: cycle ? 0.35 : 1 },
                    colorFrom.toLowerCase() === color.toLowerCase() && styles.swatchActive,
                  ]}
                />
              ))}
            </View>

            <Text style={[styles.label, { color: colors.mutedForeground, opacity: cycle ? 0.4 : 1 }]}>
              COR DE FORA
            </Text>
            <View style={styles.swatches}>
              {SWATCHES.map((color) => (
                <Pressable
                  key={'to-' + color}
                  disabled={cycle}
                  onPress={() => onChangeTo(color)}
                  style={[
                    styles.swatch,
                    { backgroundColor: color, opacity: cycle ? 0.35 : 1 },
                    colorTo.toLowerCase() === color.toLowerCase() && styles.swatchActive,
                  ]}
                />
              ))}
            </View>
          </ScrollView>

          <Pressable onPress={onClose} style={[styles.done, { borderColor: colors.border }]}>
            <Text style={[styles.doneText, { color: colors.foreground }]}>Pronto</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
  },
  grabber: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  title: { fontSize: 19, fontWeight: '800', letterSpacing: -0.3, marginBottom: 4 },
  preview: { alignItems: 'center', paddingVertical: 6 },
  list: { flexShrink: 1 },
  content: { gap: 10, paddingBottom: 8 },
  label: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.8, marginTop: 6 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preset: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 13,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  presetDots: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  presetName: { fontSize: 12, fontWeight: '600' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  switchText: { flex: 1, gap: 3 },
  switchLabel: { fontSize: 14, fontWeight: '700' },
  hint: { fontSize: 11.5, lineHeight: 15 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 34, height: 34, borderRadius: 12 },
  swatchActive: { borderWidth: 2, borderColor: '#ffffff' },
  done: {
    marginTop: 10,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  doneText: { fontSize: 14.5, fontWeight: '700' },
});
