import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Search, X } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { radius } from '@/theme';
import { FISH_VOICES } from '@/rafael/voices';

interface VoicePickerProps {
  visible: boolean;
  selectedId?: string;
  onSelect: (voice: { id: string; name: string }) => void;
  onClose: () => void;
}

export function VoicePicker({ visible, selectedId, onSelect, onClose }: VoicePickerProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [preview, setPreview] = useState<string | null>(null);

  const voices = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return FISH_VOICES;
    return FISH_VOICES.filter(
      (voice) =>
        voice.name.toLowerCase().includes(term) || voice.lang.toLowerCase().includes(term)
    );
  }, [query]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.foreground }]}>Voz do Rafael</Text>
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                {FISH_VOICES.length} vozes do Fish Audio
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.close}>
              <X size={19} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <View style={[styles.search, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Search size={15} color={colors.mutedForeground} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar voz"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.searchInput, { color: colors.foreground }]}
              autoCorrect={false}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>

          <FlatList
            data={voices}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const active = item.id === selectedId || item.id === preview;
              return (
                <Pressable
                  onPress={() => {
                    setPreview(item.id);
                    onSelect({ id: item.id, name: item.name });
                  }}
                  style={({ pressed }) => [
                    styles.voiceRow,
                    {
                      backgroundColor: active ? colors.primaryMuted : 'transparent',
                      borderColor: active ? colors.primary : 'transparent',
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <View style={styles.voiceText}>
                    <Text style={[styles.voiceName, { color: colors.foreground }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[styles.voiceLang, { color: colors.mutedForeground }]}>
                      {item.lang.toUpperCase()}
                    </Text>
                  </View>
                  {active ? <Check size={17} color={colors.primary} /> : null}
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    maxHeight: '82%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  hint: {
    fontSize: 11.5,
  },
  close: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  list: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  voiceText: {
    flex: 1,
    gap: 1,
  },
  voiceName: {
    fontSize: 14,
    fontWeight: '500',
  },
  voiceLang: {
    fontSize: 10,
    letterSpacing: 0.4,
  },
});
