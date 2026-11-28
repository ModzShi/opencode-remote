import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bot,
  ChevronRight,
  Puzzle,
  RefreshCw,
  Search,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store';
import { websocket } from '@/utils/websocket';
import { haptic } from '@/utils/haptics';
import { Markdown } from '@/components/Markdown';
import { radius } from '@/theme';
import type { AgentOption, PluginInfo, SkillInfo } from '@/types';

type Segment = 'skills' | 'plugins' | 'agents';

const SEGMENTS: { id: Segment; label: string; icon: typeof Sparkles }[] = [
  { id: 'skills', label: 'Skills', icon: Sparkles },
  { id: 'plugins', label: 'Plugins', icon: Puzzle },
  { id: 'agents', label: 'Subagentes', icon: Bot },
];

export function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const pairedSession = useAppStore((state) => state.pairedSession);
  const connectionStatus = useAppStore((state) => state.connectionStatus);
  const connected = connectionStatus === 'connected';

  const [segment, setSegment] = useState<Segment>('skills');
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [openSkill, setOpenSkill] = useState<SkillInfo | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', instructions: '' });

  const load = useCallback(async () => {
    if (!useAppStore.getState().pairedSession) return;
    setLoading(true);
    setError('');
    try {
      const [nextSkills, nextPlugins, nextAgents] = await Promise.all([
        websocket.fetchSkills(),
        websocket.fetchPlugins(),
        websocket.fetchAllAgents(),
      ]);
      setSkills(nextSkills);
      setPlugins(nextPlugins);
      setAgents(nextAgents);
      if (nextSkills.length === 0 && nextPlugins.length === 0 && nextAgents.length === 0) {
        setError('O PC não devolveu skills, plugins nem agentes. Confira a versão do opencode.');
      }
    } catch {
      setError('Não consegui ler a biblioteca do PC.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load, connected]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    haptic('light');
    await load();
  }, [load]);

  const filteredSkills = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return skills;
    return skills.filter(
      (skill) =>
        skill.name.toLowerCase().includes(term) ||
        (skill.description ?? '').toLowerCase().includes(term)
    );
  }, [query, skills]);

  const filteredAgents = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return agents;
    return agents.filter(
      (agent) =>
        agent.label.toLowerCase().includes(term) ||
        agent.id.toLowerCase().includes(term) ||
        (agent.description ?? '').toLowerCase().includes(term)
    );
  }, [agents, query]);

  const createSubagent = useCallback(async () => {
    const name = form.name.trim();
    const description = form.description.trim();
    const instructions = form.instructions.trim();
    if (!name || !description || !instructions) {
      Alert.alert('Falta preencher', 'Nome, descrição e instruções são obrigatórios.');
      return;
    }
    setCreating(true);
    haptic('tap');
    const result = await websocket.createSubagent({ name, description, instructions });
    setCreating(false);
    if (!result.ok) {
      haptic('error');
      Alert.alert('Não deu', result.error ?? 'O PC recusou criar o subagente.');
      return;
    }
    haptic('success');
    setCreateOpen(false);
    setForm({ name: '', description: '', instructions: '' });
    await load();
    Alert.alert(
      'Subagente criado',
      `Salvo em ${result.path ?? 'agent/'}. No chat, mencione @${name.split(/\s+/)[0].toLowerCase()} para chamar.`
    );
  }, [form, load]);

  const counts: Record<Segment, number> = {
    skills: skills.length,
    plugins: plugins.length,
    agents: agents.length,
  };

  if (!pairedSession) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.centered}>
          <View style={[styles.bigIcon, { backgroundColor: colors.primaryMuted }]}>
            <Sparkles size={30} color={colors.primary} strokeWidth={1.9} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Biblioteca</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Pareie com o PC para ver skills, plugins e subagentes.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top + 10 }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>Biblioteca</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            O que o seu PC sabe fazer
          </Text>
        </View>
        <Pressable onPress={refresh} hitSlop={10} style={styles.iconButton}>
          {loading && !refreshing ? (
            <ActivityIndicator size="small" color={colors.mutedForeground} />
          ) : (
            <RefreshCw size={18} color={colors.mutedForeground} />
          )}
        </Pressable>
      </View>

      <View style={[styles.segmentRow, { backgroundColor: colors.muted }]}>
        {SEGMENTS.map(({ id, label, icon: Icon }) => {
          const active = segment === id;
          return (
            <Pressable
              key={id}
              onPress={() => {
                haptic('light');
                setSegment(id);
                setQuery('');
              }}
              style={[
                styles.segment,
                { backgroundColor: active ? colors.card : 'transparent' },
              ]}
            >
              <Icon size={14} color={active ? colors.primary : colors.mutedForeground} strokeWidth={2.2} />
              <Text
                style={[
                  styles.segmentLabel,
                  { color: active ? colors.foreground : colors.mutedForeground },
                ]}
              >
                {label}
                {counts[id] > 0 ? ` · ${counts[id]}` : ''}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {segment !== 'plugins' ? (
        <View style={[styles.search, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Search size={15} color={colors.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={segment === 'skills' ? 'Buscar skill…' : 'Buscar subagente…'}
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <X size={14} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
        }
      >
        {error ? (
          <Text style={[styles.error, { color: colors.mutedForeground }]}>{error}</Text>
        ) : null}

        {segment === 'skills' ? (
          <View style={styles.list}>
            {filteredSkills.map((skill) => (
              <Pressable
                key={skill.id}
                onPress={() => {
                  haptic('light');
                  setOpenSkill(skill);
                }}
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={[styles.cardIcon, { backgroundColor: colors.primaryMuted }]}>
                  <Sparkles size={18} color={colors.primary} strokeWidth={2} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={styles.cardTitleRow}>
                    <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>
                      {skill.name}
                    </Text>
                    {skill.autoinvoke ? (
                      <View style={[styles.badge, { backgroundColor: colors.primaryMuted }]}>
                        <Text style={[styles.badgeText, { color: colors.primary }]}>auto</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text
                    numberOfLines={3}
                    style={[styles.cardText, { color: colors.mutedForeground }]}
                  >
                    {skill.description ?? 'Skill sem descrição.'}
                  </Text>
                </View>
                <ChevronRight size={16} color={colors.mutedForeground} />
              </Pressable>
            ))}
            {!loading && filteredSkills.length === 0 ? (
              <Empty
                icon={Sparkles}
                title="Nenhuma skill encontrada"
                text="Skills ficam em .agents/skills ou na pasta global do opencode. Crie uma e atualize."
                colors={colors}
              />
            ) : null}
          </View>
        ) : null}

        {segment === 'plugins' ? (
          <View style={styles.list}>
            {plugins.map((plugin, index) => (
              <View
                key={plugin.id ?? `${plugin.source}-${index}`}
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={[styles.cardIcon, { backgroundColor: colors.secondary }]}>
                  <Puzzle size={18} color={colors.accent} strokeWidth={2} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>
                    {plugin.source.split('/').pop() ?? plugin.source}
                  </Text>
                  <Text style={[styles.cardText, { color: colors.mutedForeground }]} numberOfLines={2}>
                    {plugin.source}
                  </Text>
                  <View style={styles.featureRow}>
                    <View style={[styles.badge, { backgroundColor: colors.muted }]}>
                      <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>
                        {plugin.state}
                      </Text>
                    </View>
                    {plugin.features.slice(0, 4).map((feature) => (
                      <View key={feature} style={[styles.badge, { backgroundColor: colors.primaryMuted }]}>
                        <Text style={[styles.badgeText, { color: colors.primary }]}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            ))}
            {!loading && plugins.length === 0 ? (
              <Empty
                icon={Puzzle}
                title="Nenhum plugin instalado"
                text="Instale plugins no opencode do PC; eles aparecem aqui com as features de cada um."
                colors={colors}
              />
            ) : null}
          </View>
        ) : null}

        {segment === 'agents' ? (
          <View style={styles.list}>
            <Pressable
              onPress={() => {
                haptic('light');
                setCreateOpen(true);
              }}
              style={[styles.createCard, { borderColor: colors.primary, backgroundColor: colors.primaryMuted }]}
            >
              <View style={[styles.cardIcon, { backgroundColor: colors.card }]}>
                <Wand2 size={18} color={colors.primary} strokeWidth={2.1} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.cardTitle, { color: colors.primary }]}>Criar subagente</Text>
                <Text style={[styles.cardText, { color: colors.mutedForeground }]}>
                  nome, descrição e instruções — salvo na pasta do PC
                </Text>
              </View>
              <ChevronRight size={16} color={colors.primary} />
            </Pressable>

            {filteredAgents.map((agent) => (
              <View
                key={agent.id}
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={[styles.cardIcon, { backgroundColor: colors.secondary }]}>
                  <Bot size={18} color={colors.accent} strokeWidth={2} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={styles.cardTitleRow}>
                    <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>
                      {agent.label}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: colors.muted }]}>
                      <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>
                        {agent.mode ?? 'agente'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.cardText, { color: colors.mutedForeground }]} numberOfLines={3}>
                    {agent.description ?? agent.id}
                  </Text>
                  <Text style={[styles.cardHint, { color: colors.mutedForeground }]}>
                    @{agent.id} no chat
                  </Text>
                </View>
              </View>
            ))}
            {!loading && filteredAgents.length === 0 ? (
              <Empty
                icon={Bot}
                title="Nenhum subagente"
                text="Crie o primeiro com o botão acima. Ele vira um arquivo .md na pasta de agentes do PC."
                colors={colors}
              />
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <SkillModal skill={openSkill} onClose={() => setOpenSkill(null)} colors={colors} />

      <Modal visible={createOpen} animationType="slide" transparent onRequestClose={() => setCreateOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Novo subagente</Text>
              <Pressable onPress={() => setCreateOpen(false)} hitSlop={10}>
                <X size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <Text style={[styles.sheetHint, { color: colors.mutedForeground }]}>
              O agente principal pode delegar tarefas para ele. O arquivo é criado na pasta de
              configuração do opencode no PC.
            </Text>

            <Field label="Nome" colors={colors}>
              <TextInput
                value={form.name}
                onChangeText={(name) => setForm((prev) => ({ ...prev, name }))}
                placeholder="revisor"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
              />
            </Field>
            <Field label="Quando usar (descrição)" colors={colors}>
              <TextInput
                value={form.description}
                onChangeText={(description) => setForm((prev) => ({ ...prev, description }))}
                placeholder="Revisa código em busca de bugs e riscos"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
              />
            </Field>
            <Field label="Instruções" colors={colors}>
              <TextInput
                value={form.instructions}
                onChangeText={(instructions) => setForm((prev) => ({ ...prev, instructions }))}
                placeholder="Você é um revisor rigoroso. Leia o diff, aponte bugs reais e sugira testes."
                placeholderTextColor={colors.mutedForeground}
                multiline
                textAlignVertical="top"
                style={[
                  styles.input,
                  styles.multiline,
                  { color: colors.foreground, borderColor: colors.border },
                ]}
              />
            </Field>

            <Pressable
              onPress={() => void createSubagent()}
              disabled={creating}
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primary, opacity: creating ? 0.7 : 1 },
              ]}
            >
              {creating ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.primaryText, { color: colors.primaryForeground }]}>
                  Criar no PC
                </Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function Field({
  label,
  colors,
  children,
}: {
  label: string;
  colors: ReturnType<typeof useTheme>['colors'];
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      {children}
    </View>
  );
}

function SkillModal({
  skill,
  onClose,
  colors,
}: {
  skill: SkillInfo | null;
  onClose: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={Boolean(skill)} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View
          style={[
            styles.skillSheet,
            { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: insets.bottom + 16 },
          ]}
        >
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{skill?.name}</Text>
              <Text style={[styles.sheetHint, { color: colors.mutedForeground }]}>
                {skill?.description ?? 'Skill do seu PC'}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <X size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>
          {skill?.path ? (
            <Text style={[styles.path, { color: colors.mutedForeground }]} numberOfLines={2}>
              {skill.path}
            </Text>
          ) : null}
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            <Markdown text={skill?.content || 'Esta skill não publicou o conteúdo.'} fontSize={13.5} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Empty({
  icon: Icon,
  title,
  text,
  colors,
}: {
  icon: typeof Sparkles;
  title: string;
  text: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={[styles.emptyCard, { borderColor: colors.border }]}>
      <Icon size={26} color={colors.mutedForeground} strokeWidth={1.6} />
      <Text style={[styles.emptyCardTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.emptyCardText, { color: colors.mutedForeground }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { fontSize: 12.5, marginTop: 1 },
  iconButton: { padding: 8 },
  segmentRow: { flexDirection: 'row', padding: 4, borderRadius: 14, marginBottom: 10 },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 11,
  },
  segmentLabel: { fontSize: 11.5, fontWeight: '700' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 11,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  searchInput: { flex: 1, paddingVertical: 9, fontSize: 13.5 },
  list: { gap: 8 },
  error: { fontSize: 12, marginBottom: 8, lineHeight: 17 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 12,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  createCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  cardTitle: { fontSize: 14.5, fontWeight: '700', flexShrink: 1 },
  cardText: { fontSize: 12, lineHeight: 17 },
  cardHint: { fontSize: 10.5, fontWeight: '600', opacity: 0.8 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.2 },
  featureRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 2 },
  emptyCard: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
  emptyCardTitle: { fontSize: 14.5, fontWeight: '700' },
  emptyCardText: { fontSize: 12.5, textAlign: 'center', lineHeight: 18 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 22 },
  bigIcon: { width: 70, height: 70, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '800' },
  emptyText: { fontSize: 13.5, textAlign: 'center', lineHeight: 20 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 18,
    gap: 12,
  },
  skillSheet: {
    height: '82%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 18,
    gap: 10,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  sheetTitle: { fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
  sheetHint: { fontSize: 12, lineHeight: 17, flexShrink: 1 },
  path: { fontSize: 10.5, lineHeight: 15, opacity: 0.75 },
  fieldLabel: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.4 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  multiline: { minHeight: 100 },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  primaryText: { fontSize: 14.5, fontWeight: '800' },
});
