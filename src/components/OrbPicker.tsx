import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { Orb, ORB_STYLES, type OrbStyle } from '@/rafael/Orb';

interface OrbPickerProps {
  visible: boolean;
  value: OrbStyle;
  colorFrom: string;
  colorTo: string;
  cycle: boolean;
  onSelect: (style: OrbStyle) => void;
  onClose: () => void;
}

export function OrbPicker({ visible, value, colorFrom, colorTo, cycle, onSelect, onClose }: OrbPickerProps) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: '#0b0b0d', borderColor: colors.border }]}
          onPress={() => undefined}
        >
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />
          <Text style={[styles.title, { color: colors.foreground }]}>Orbe do Rafael</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            A forma que aparece quando você toca para falar
          </Text>

          {ORB_STYLES.map((style) => {
            const selected = style.id === value;
            return (
              <Pressable
                key={style.id}
                onPress={() => onSelect(style.id)}
                style={[
                  styles.option,
                  {
                    backgroundColor: selected ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)',
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}
              >
                <View style={styles.thumb}>
                  <Orb
                    size={48}
                    state="speaking"
                    style={style.id}
                    colorFrom={colorFrom}
                    colorTo={colorTo}
                    cycle={cycle}
                    animate={false}
                  />
                </View>
                <View style={styles.optionText}>
                  <Text style={[styles.optionName, { color: colors.foreground }]}>{style.name}</Text>
                  <Text style={[styles.optionHint, { color: colors.mutedForeground }]}>{style.hint}</Text>
                </View>
                {selected ? <Check size={18} color={colors.primary} strokeWidth={2.6} /> : null}
              </Pressable>
            );
          })}

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
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 30,
    gap: 10,
  },
  grabber: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  title: { fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { fontSize: 12.5, marginBottom: 6 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    paddingRight: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  thumb: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1, gap: 2 },
  optionName: { fontSize: 15, fontWeight: '700' },
  optionHint: { fontSize: 12 },
  done: {
    marginTop: 8,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  doneText: { fontSize: 14.5, fontWeight: '700' },
});
