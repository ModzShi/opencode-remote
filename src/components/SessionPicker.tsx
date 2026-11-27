import React from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Plus } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { OpenCodeSession } from '@/types';
import { basename, relativeTime } from '@/utils/format';

interface SessionPickerProps {
  visible: boolean;
  sessions: OpenCodeSession[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
  onCreate: () => void;
  creating?: boolean;
}

export function SessionPicker({
  visible,
  sessions,
  activeId,
  onSelect,
  onClose,
  onCreate,
  creating = false,
}: SessionPickerProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: isDark ? colors.surface : colors.card,
            paddingBottom: Math.max(insets.bottom, 12) + 8,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Sessões</Text>
          <Pressable
            onPress={onCreate}
            disabled={creating}
            style={({ pressed }) => [
              styles.newButton,
              { backgroundColor: colors.primaryMuted, opacity: pressed || creating ? 0.6 : 1 },
            ]}
          >
            <Plus size={14} color={colors.primary} strokeWidth={2.6} />
            <Text style={{ color: colors.primary, fontSize: 12.5, fontWeight: '700' }}>Nova</Text>
          </Pressable>
        </View>

        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          style={{ maxHeight: 380 }}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8, gap: 6 }}
          ListEmptyComponent={
            <Text style={{ color: colors.mutedForeground, padding: 20, textAlign: 'center', fontSize: 13 }}>
              Nenhuma sessão. Crie uma nova para começar.
            </Text>
          }
          renderItem={({ item }) => {
            const active = item.id === activeId;
            const dot =
              item.status === 'running' ? colors.warning : item.status === 'error' ? colors.destructive : colors.online;
            return (
              <Pressable
                onPress={() => onSelect(item.id)}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: active ? colors.primaryMuted : colors.muted,
                    borderColor: active ? colors.primary : 'transparent',
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <View style={{ flex: 1, gap: 3 }}>
                  <Text numberOfLines={1} style={{ color: colors.foreground, fontSize: 14, fontWeight: '600' }}>
                    {item.name}
                  </Text>
                  <Text numberOfLines={1} style={{ color: colors.mutedForeground, fontSize: 11.5 }}>
                    {[basename(item.workingDirectory), relativeTime(item.lastActivity)].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <View style={[styles.dot, { backgroundColor: dot }]} />
                {active ? <Check size={15} color={colors.primary} strokeWidth={2.6} /> : null}
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  handle: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 10 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  title: { fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
});