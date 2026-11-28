import React from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Check, RefreshCw } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import type { AgentOption, ModelOption } from '@/types';

interface ModelSheetProps {
  visible: boolean;
  selected: string;
  models: ModelOption[];
  loading: boolean;
  /** De onde veio a lista ou o erro, para diagnosticar o PC. */
  probe?: string;
  agents: AgentOption[];
  selectedAgent: string;
  onSelectAgent: (agent: string) => void;
  onSelect: (model: ModelOption | null) => void;
  onManual: () => void;
  onRefresh: () => void;
  onClose: () => void;
}

export function ModelSheet({
  visible,
  selected,
  models,
  loading,
  probe,
  agents,
  selectedAgent,
  onSelectAgent,
  onSelect,
  onManual,
  onRefresh,
  onClose,
}: ModelSheetProps) {
  const { colors } = useTheme();

  const providers = Array.from(new Set(models.map((model) => model.provider)));

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: '#0b0b0d', borderColor: colors.border }]}
          onPress={() => undefined}
        >
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.foreground }]}>Modelo do OpenCode</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                {models.length > 0 ? `${models.length} modelos no seu PC` : 'O modelo que responde no seu PC'}
              </Text>
            </View>
            <Pressable onPress={onRefresh} hitSlop={10} style={styles.refresh}>
              {loading ? (
                <ActivityIndicator size="small" color={colors.mutedForeground} />
              ) : (
                <RefreshCw size={16} color={colors.mutedForeground} />
              )}
            </Pressable>
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <Pressable
              onPress={() => onSelect(null)}
              style={[styles.option, { borderColor: selected ? colors.primary : 'transparent' }]}
            >
              <View style={styles.optionText}>
                <Text style={[styles.optionName, { color: colors.foreground }]}>Padrão do agente</Text>
                <Text style={[styles.optionHint, { color: colors.mutedForeground }]}>
                  usa o modelo configurado no PC
                </Text>
              </View>
              {selected ? null : <Check size={18} color={colors.primary} strokeWidth={2.6} />}
            </Pressable>

            {models.length === 0 && !loading ? (
              <View style={styles.emptyBox}>
                <Text style={[styles.empty, { color: colors.mutedForeground }]}>
                  O PC não devolveu a lista de modelos. Toque em atualizar; se continuar vazio, use “Digitar
                  modelo…” ou “Padrão do agente”.
                </Text>
                {probe ? (
                  <Text style={[styles.probe, { color: colors.mutedForeground }]}>{probe}</Text>
                ) : null}
              </View>
            ) : null}

            {providers.map((provider) => (
              <View key={provider} style={styles.group}>
                <Text style={[styles.groupTitle, { color: colors.mutedForeground }]}>
                  {provider.toUpperCase()}
                </Text>
                {models
                  .filter((model) => model.provider === provider)
                  .map((model) => {
                    const active = model.value === selected;
                    return (
                      <Pressable
                        key={model.value}
                        onPress={() => onSelect(model)}
                        style={[styles.option, { borderColor: active ? colors.primary : 'transparent' }]}
                      >
                        <View style={styles.optionText}>
                          <Text style={[styles.optionName, { color: colors.foreground }]}>{model.label}</Text>
                          <Text numberOfLines={1} style={[styles.optionHint, { color: colors.mutedForeground }]}>
                            {model.value}
                          </Text>
                        </View>
                        {active ? <Check size={18} color={colors.primary} strokeWidth={2.6} /> : null}
                      </Pressable>
                    );
                  })}
              </View>
            ))}
            {agents.length > 0 ? (
              <View style={styles.group}>
                <Text style={[styles.groupTitle, { color: colors.mutedForeground }]}>AGENTE (QUEM EXECUTA)</Text>
                {agents.map((agent) => {
                  const active = agent.id === selectedAgent;
                  return (
                    <Pressable
                      key={agent.id}
                      onPress={() => onSelectAgent(agent.id)}
                      style={[styles.option, { borderColor: active ? colors.primary : 'transparent' }]}
                    >
                      <View style={styles.optionText}>
                        <Text style={[styles.optionName, { color: colors.foreground }]}>{agent.label}</Text>
                        <Text numberOfLines={1} style={[styles.optionHint, { color: colors.mutedForeground }]}>
                          {agent.description ?? agent.id}
                        </Text>
                      </View>
                      {active ? <Check size={18} color={colors.primary} strokeWidth={2.6} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </ScrollView>

          <Pressable onPress={onManual} style={[styles.manual, { borderColor: colors.border }]}>
            <Text style={[styles.manualText, { color: colors.mutedForeground }]}>Digitar modelo…</Text>
          </Pressable>

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
    maxHeight: '80%',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 30,
  },
  grabber: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  headerText: { flex: 1, gap: 3 },
  title: { fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { fontSize: 12.5 },
  refresh: { padding: 8 },
  list: { flexShrink: 1 },
  content: { gap: 4, paddingBottom: 8 },
  group: { gap: 2, marginTop: 8 },
  groupTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1.6, marginBottom: 4 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  optionText: { flex: 1, gap: 2 },
  optionName: { fontSize: 14.5, fontWeight: '700' },
  optionHint: { fontSize: 11.5 },
  emptyBox: { gap: 6, marginTop: 10 },
  empty: { fontSize: 12.5, lineHeight: 18 },
  probe: { fontSize: 11, lineHeight: 16, opacity: 0.7 },
  manual: {
    marginTop: 8,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  manualText: { fontSize: 12.5, fontWeight: '600' },
  done: {
    marginTop: 10,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  doneText: { fontSize: 14.5, fontWeight: '700' },
});
