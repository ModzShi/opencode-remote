import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { ChevronDown, Cpu, Download, Plus, QrCode, RefreshCw, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store';
import { websocket } from '@/utils/websocket';
import { haptic } from '@/utils/haptics';
import { basename, formatCount } from '@/utils/format';
import { checkForUpdate } from '@/utils/updates';
import { AgentOption, ChatAttachment, ModelOption, OpenCodeMessage, PromptFile } from '@/types';
import { modelDisplayLabel, splitModelRef } from '@/utils/models';
import { MAX_ATTACHMENT_BYTES, formatBytes, guessMimeType, toPromptFile } from '@/utils/attachments';
import { MessageItem } from '@/components/MessageItem';
import { Composer } from '@/components/Composer';
import { ModelSheet } from '@/components/ModelSheet';
import { getDefaultModel, getModelProbe, refreshModels, useModels } from '@/rafael/models';
import { SessionPicker } from '@/components/SessionPicker';
import { radius, space } from '@/theme';

const SUGGESTIONS = ['Explique este projeto', 'Rode os testes', 'O que mudou no git?'];
const EMPTY_MESSAGES: OpenCodeMessage[] = [];

function usePulse(active: boolean) {
  const value = useMemo(() => new Animated.Value(1), []);

  useEffect(() => {
    if (!active) {
      value.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 0.35, duration: 700, useNativeDriver: true }),
        Animated.timing(value, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, value]);

  return value;
}

export function TerminalScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const pairedSession = useAppStore((state) => state.pairedSession);
  const sessions = useAppStore((state) => state.sessions);
  const activeSessionId = useAppStore((state) => state.activeSessionId);
  const connectionStatus = useAppStore((state) => state.connectionStatus);
  const connectionError = useAppStore((state) => state.connectionError);
  const storedMessages = useAppStore((state) =>
    activeSessionId ? state.messages[activeSessionId] : undefined
  );
  const messages = storedMessages ?? EMPTY_MESSAGES;
  const fontSize = useAppStore((state) => state.settings.fontSize);
  const updateInfo = useAppStore((state) => state.updateInfo);
  const setUpdateInfo = useAppStore((state) => state.setUpdateInfo);

  const [draft, setDraft] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [modelSheet, setModelSheet] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsProbe, setModelsProbe] = useState('');
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [picked, setPicked] = useState<{ session: string | null; value: string } | null>(null);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [attaching, setAttaching] = useState(false);
  const pendingPermission = useAppStore((state) => state.pendingPermission);
  const setSettings = useAppStore((state) => state.setSettings);

  const answerPermission = useCallback(
    async (decision: 'once' | 'always' | 'reject') => {
      const request = useAppStore.getState().pendingPermission;
      if (!request) return;
      haptic('tap');
      const ok = await websocket.replyPermission(request.sessionID || activeSessionId || '', request.id, decision);
      if (ok) {
        useAppStore.getState().setPendingPermission(null);
        setNotice(decision === 'reject' ? 'Permissão negada' : 'Permissão liberada');
      } else {
        setNotice('Não consegui responder a permissão');
      }
    },
    [activeSessionId]
  );

  const listRef = useRef<FlatList<OpenCodeMessage>>(null);
  const follow = useRef(true);
  const streamingRef = useRef(false);

  const activeSession = sessions.find((session) => session.id === activeSessionId);
  const running = activeSession?.status === 'running';
  const connected = connectionStatus === 'connected';
  const orbPulse = usePulse(running || connectionStatus === 'connecting' || connectionStatus === 'reconnecting');

  const subtitle = useMemo(() => {
    const parts = [
      activeSession ? basename(activeSession.workingDirectory) : null,
      activeSession?.model,
      activeSession?.tokens ? `${formatCount(activeSession.tokens.output)} tok` : null,
    ];
    return parts.filter(Boolean).join(' · ') || 'opencode remoto';
  }, [activeSession]);

  const models = useModels(connected);
  const preferredModel = useAppStore((state) => state.settings.rafaelAgentModel);
  const pickedValue = picked && picked.session === activeSessionId ? picked.value : '';
  const modelValue = pickedValue || activeSession?.model || preferredModel || '';
  const { base: modelBase, variant: modelVariant } = splitModelRef(modelValue);
  const currentModel = models.find((model) => model.value === modelBase);
  const modelLabel = currentModel
    ? modelDisplayLabel({ ...currentModel, variant: modelVariant })
    : modelValue
      ? `${modelBase.split('/').pop() ?? modelBase}${modelVariant ? ` · ${modelVariant}` : ''}`
      : 'modelo padrão';

  const openModels = useCallback(() => {
    haptic('light');
    setModelSheet(true);
    setModelsLoading(true);
    void Promise.all([refreshModels(true), websocket.fetchAgents()])
      .then(([, list]) => setAgents(list))
      .finally(() => {
        setModelsProbe(getModelProbe());
        setModelsLoading(false);
      });
  }, []);

  const applyModel = useCallback(
    async (option: ModelOption | null) => {
      setModelSheet(false);
      if (!activeSessionId) {
        setNotice('Pareie o app com o PC primeiro');
        return;
      }

      let target = option;
      if (!target) {
        target = getDefaultModel();
        if (!target) {
          await refreshModels(true);
          target = getDefaultModel();
        }
      }
      if (!target) {
        setNotice('O PC não informou o modelo padrão');
        return;
      }

      haptic('tap');
      setSettings({ rafaelAgentModel: target.value, rafaelAgentVariant: target.variant ?? '' });
      const ok = await websocket.setSessionModel(activeSessionId, target);
      if (!ok) {
        setNotice('O PC não aceitou trocar o modelo');
        return;
      }
      const stored = target.variant ? `${target.value}#${target.variant}` : target.value;
      setPicked({ session: activeSessionId, value: stored });
      setNotice(option ? `modelo: ${modelDisplayLabel(target)}` : `padrão: ${modelDisplayLabel(target)}`);
    },
    [activeSessionId, setSettings]
  );

  const selectAgent = useCallback(
    async (agent: string) => {
      haptic('tap');
      if (!activeSessionId) return;
      const ok = await websocket.setSessionAgent(activeSessionId, agent);
      setModelSheet(false);
      setNotice(ok ? `agente: ${agent}` : 'O PC não aceitou trocar o agente');
    },
    [activeSessionId]
  );

  const manualModel = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        void applyModel(null);
        return;
      }
      const slash = trimmed.indexOf('/');
      if (slash <= 0) {
        setNotice('digite no formato provedor/modelo');
        return;
      }
      void applyModel({
        value: trimmed,
        label: trimmed.slice(slash + 1),
        provider: trimmed.slice(0, slash),
        providerID: trimmed.slice(0, slash),
        modelID: trimmed.slice(slash + 1),
      });
    },
    [applyModel]
  );

  const addAttachment = useCallback((attachment: ChatAttachment) => {
    if (attachment.size > MAX_ATTACHMENT_BYTES) {
      haptic('error');
      setNotice(`${attachment.name} passa de ${formatBytes(MAX_ATTACHMENT_BYTES)}`);
      return;
    }
    setAttachments((current) => {
      if (current.length >= 4) {
        setNotice('Máximo de 4 anexos por mensagem');
        return current;
      }
      return [...current, attachment];
    });
  }, []);

  const pickImage = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setNotice('Permita o acesso às fotos nos ajustes do iPhone');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 0.7,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const name = asset.fileName || `foto-${Date.now()}.jpg`;
      addAttachment({
        id: `img-${Date.now()}`,
        name,
        uri: asset.uri,
        mimeType: asset.mimeType ?? guessMimeType(name, 'image/jpeg'),
        size: asset.fileSize ?? 0,
        kind: 'image',
      });
    } catch {
      setNotice('Não consegui abrir a galeria');
    }
  }, [addAttachment]);

  const pickDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      addAttachment({
        id: `doc-${Date.now()}`,
        name: asset.name,
        uri: asset.uri,
        mimeType: asset.mimeType ?? guessMimeType(asset.name),
        size: asset.size ?? 0,
        kind: 'file',
      });
    } catch {
      setNotice('Não consegui abrir os documentos');
    }
  }, [addAttachment]);

  const openAttachMenu = useCallback(() => {
    haptic('light');
    Alert.alert('Anexar ao chat', 'O arquivo vai junto com a sua mensagem para o PC.', [
      { text: 'Foto', onPress: () => void pickImage() },
      { text: 'Documento', onPress: () => void pickDocument() },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }, [pickDocument, pickImage]);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((current) => current.filter((item) => item.id !== id));
  }, []);

  const lastMessage = messages[messages.length - 1];

  useEffect(() => {
    if (!activeSessionId) return;
    void websocket.fetchMessages(activeSessionId);
  }, [activeSessionId]);

  useEffect(() => {
    let cancelled = false;
    void checkForUpdate().then((info) => {
      if (!cancelled && info) setUpdateInfo(info);
    });
    return () => {
      cancelled = true;
    };
  }, [setUpdateInfo]);

  useEffect(() => {
    if (lastMessage?.streaming) {
      streamingRef.current = true;
      return;
    }
    if (streamingRef.current) {
      streamingRef.current = false;
      haptic('success');
    }
  }, [lastMessage]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4500);
    return () => clearTimeout(timer);
  }, [notice]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    follow.current = contentSize.height - contentOffset.y - layoutMeasurement.height < 140;
  }, []);

  const handleContentSizeChange = useCallback(() => {
    if (follow.current) listRef.current?.scrollToEnd({ animated: true });
  }, []);

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    const pending = attachments;
    if (!text && pending.length === 0) return;
    if (!activeSessionId) {
      setNotice('Selecione ou crie uma sessão primeiro.');
      return;
    }
    if (useAppStore.getState().connectionStatus !== 'connected') {
      haptic('error');
      setNotice('Sem conexão com o PC. Tentando reconectar…');
      return;
    }

    setDraft('');
    setAttachments([]);
    haptic('tap');
    follow.current = true;

    let files: PromptFile[] = [];
    if (pending.length > 0) {
      setAttaching(true);
      try {
        files = await Promise.all(pending.map(toPromptFile));
      } catch (error) {
        setAttaching(false);
        haptic('error');
        setDraft(text);
        setAttachments(pending);
        setNotice(error instanceof Error ? error.message : 'Não consegui preparar o anexo');
        return;
      }
      setAttaching(false);
    }

    const ok = await websocket.sendCommand(text || 'Analise o anexo.', activeSessionId, files);
    if (!ok) {
      haptic('error');
      setDraft(text);
      setAttachments(pending);
      setNotice('Não foi possível enviar. Verifique a conexão com o PC.');
    }
  }, [draft, attachments, activeSessionId]);


  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeSessionId) {
      await websocket.fetchMessages(activeSessionId);
    }
    await websocket.fetchSessions();
    setRefreshing(false);
  }, [activeSessionId]);

  const handleCreate = useCallback(async () => {
    setCreating(true);
    const id = await websocket.createSession();
    setCreating(false);
    if (!id) {
      setNotice('Não foi possível criar a sessão.');
      return;
    }
    haptic('success');
    setPickerOpen(false);
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: OpenCodeMessage; index: number }) => {
      const previous = messages[index - 1];
      return (
        <MessageItem
          message={item}
          fontSize={fontSize}
          showAvatar={!previous || previous.role !== 'assistant'}
        />
      );
    },
    [messages, fontSize]
  );

  if (!pairedSession) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.centered}>
          <View style={[styles.bigIcon, { backgroundColor: colors.primaryMuted, borderColor: colors.border }]}>
            <QrCode size={34} color={colors.primary} strokeWidth={1.9} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Pareie seu PC</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Rode `opencode pair --remote` no terminal e escaneie o QR para começar.
          </Text>
          <Pressable
            onPress={() => router.replace('/(tabs)/pairing')}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={{ color: colors.primaryForeground, fontWeight: '700', fontSize: 14.5 }}>
              Escanear QR
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <Svg pointerEvents="none" style={styles.glow} width="100%" height={240}>
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="0%" rx="70%" ry="100%">
            <Stop offset="0%" stopColor={colors.primary} stopOpacity={isDark ? 0.20 : 0.12} />
            <Stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="240" fill="url(#glow)" />
      </Svg>

      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Animated.View
          style={[
            styles.orb,
            {
              backgroundColor: colors.primaryMuted,
              borderColor: connected ? colors.online : colors.border,
              opacity: orbPulse,
            },
          ]}
        />
        <View style={styles.headerText}>
          <Pressable onPress={() => setPickerOpen(true)} style={styles.titleRow} accessibilityRole="button">
            <Text numberOfLines={1} style={[styles.title, { color: colors.foreground }]}>
              {activeSession?.name ?? 'Nova conversa'}
            </Text>
            <ChevronDown size={15} color={colors.mutedForeground} strokeWidth={2.4} />
          </Pressable>
          <Text numberOfLines={1} style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {subtitle}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            haptic('light');
            router.push('/rafael');
          }}
          accessibilityRole="button"
          accessibilityLabel="Modo Rafael"
          style={({ pressed }) => [
            styles.iconButton,
            { backgroundColor: colors.primaryMuted, opacity: pressed ? 0.6 : 1, marginRight: 6 },
          ]}
        >
          <Sparkles size={16} color={colors.primary} strokeWidth={2.4} />
        </Pressable>

        <Pressable
          onPress={handleCreate}
          disabled={creating}
          accessibilityRole="button"
          accessibilityLabel="Nova sessão"
          style={({ pressed }) => [
            styles.iconButton,
            { backgroundColor: colors.secondary, opacity: pressed || creating ? 0.6 : 1 },
          ]}
        >
          <Plus size={17} color={colors.foreground} strokeWidth={2.4} />
        </Pressable>
      </View>

      {updateInfo ? (
        <Pressable
          onPress={() => Linking.openURL(updateInfo.url)}
          style={[
            styles.banner,
            { backgroundColor: colors.successSurface, borderColor: colors.success, marginTop: 8 },
          ]}
        >
          <Download size={13} color={colors.success} strokeWidth={2.4} />
          <Text style={{ flex: 1, color: colors.success, fontSize: 12 }}>
            Versão {updateInfo.version} disponível
          </Text>
          <Text style={{ color: colors.success, fontSize: 12, fontWeight: '700' }}>Baixar</Text>
        </Pressable>
      ) : null}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {pendingPermission ? (
          <View style={[styles.banner, { backgroundColor: colors.warnSurface, borderColor: colors.warning }]}>
            <Text numberOfLines={2} style={{ flex: 1, color: colors.foreground, fontSize: 12.5 }}>
              Permissão: {pendingPermission.action}
              {pendingPermission.resources.length > 0 ? ` · ${pendingPermission.resources[0]}` : ''}
            </Text>
            <Pressable onPress={() => answerPermission('once')} hitSlop={8}>
              <Text style={{ color: colors.warning, fontSize: 12, fontWeight: '800' }}>permitir</Text>
            </Pressable>
            <Pressable onPress={() => answerPermission('reject')} hitSlop={8}>
              <Text style={{ color: colors.destructive, fontSize: 12, fontWeight: '700' }}>negar</Text>
            </Pressable>
          </View>
        ) : null}

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onScroll={handleScroll}
          scrollEventThrottle={64}
          onContentSizeChange={handleContentSizeChange}
          contentContainerStyle={[
            styles.list,
            messages.length === 0 && styles.listEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.mutedForeground}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Pronto para começar</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                As respostas aparecem aqui em tempo real, com código, raciocínio e ferramentas.
              </Text>
              <View style={styles.chips}>
                {SUGGESTIONS.map((suggestion) => (
                  <Pressable
                    key={suggestion}
                    onPress={() => {
                      setDraft(suggestion);
                      haptic('light');
                    }}
                    style={({ pressed }) => [
                      styles.chip,
                      {
                        backgroundColor: colors.surfaceElevated,
                        borderColor: colors.border,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Text style={{ color: colors.foreground, fontSize: 12.5, fontWeight: '500' }}>
                      {suggestion}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          }
        />

        {connectionError && connectionStatus !== 'connected' ? (
          <Pressable
            onPress={() => websocket.connect(useAppStore.getState().pairedSession!)}
            style={[styles.banner, { backgroundColor: colors.errorSurface, borderColor: colors.destructive }]}
          >
            <RefreshCw size={13} color={colors.destructive} strokeWidth={2.4} />
            <Text numberOfLines={2} style={{ flex: 1, color: colors.destructive, fontSize: 12 }}>
              {connectionError}
            </Text>
            <Text style={{ color: colors.destructive, fontSize: 12, fontWeight: '700' }}>Tentar</Text>
          </Pressable>
        ) : null}

        {notice ? (
          <View style={[styles.banner, { backgroundColor: colors.warnSurface, borderColor: colors.warning }]}>
            <Text numberOfLines={2} style={{ flex: 1, color: colors.warning, fontSize: 12 }}>
              {notice}
            </Text>
          </View>
        ) : null}

        <View style={{ paddingBottom: Math.max(insets.bottom, 6) }}>
          <Pressable
            onPress={openModels}
            accessibilityRole="button"
            accessibilityLabel={`Modelo: ${modelLabel}. Toque para trocar`}
            style={({ pressed }) => [
              styles.modelChip,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
                opacity: pressed ? 0.65 : 1,
              },
            ]}
          >
            <Cpu size={12} color={colors.mutedForeground} strokeWidth={2.2} />
            <Text numberOfLines={1} style={[styles.modelChipText, { color: colors.mutedForeground }]}>
              {modelLabel}
            </Text>
            <ChevronDown size={11} color={colors.mutedForeground} strokeWidth={2.4} />
          </Pressable>
          <Composer
            value={draft}
            onChangeText={setDraft}
            onSend={handleSend}
            busy={running && !draft.trim() && attachments.length === 0}
            placeholder={connected ? 'Fale com o opencode…' : 'Sem conexão com o PC…'}
            attachments={attachments}
            onAttach={openAttachMenu}
            onRemoveAttachment={removeAttachment}
            attaching={attaching}
          />
        </View>
      </KeyboardAvoidingView>

      <SessionPicker
        visible={pickerOpen}
        sessions={sessions}
        activeId={activeSessionId}
        onClose={() => setPickerOpen(false)}
        creating={creating}
        onSelect={(id) => {
          useAppStore.getState().setActiveSession(id);
          haptic('light');
          setPickerOpen(false);
        }}
        onCreate={handleCreate}
      />

      <ModelSheet
        visible={modelSheet}
        onClose={() => setModelSheet(false)}
        selected={modelValue}
        models={models}
        loading={modelsLoading}
        probe={modelsProbe}
        agents={agents}
        selectedAgent={activeSession?.agent ?? ''}
        onSelectAgent={selectAgent}
        onSelect={applyModel}
        onManual={() => {
          if (Platform.OS !== 'ios') return;
          Alert.prompt(
            'Modelo do OpenCode',
            'Ex.: anthropic/claude-sonnet-4. Deixe vazio para o padrão do PC.',
            (value) => {
              setModelSheet(false);
              manualModel(value);
            },
            'plain-text',
            modelValue
          );
        }}
        onRefresh={() => {
          setModelsLoading(true);
          void Promise.all([refreshModels(true), websocket.fetchAgents()])
            .then(([, list]) => setAgents(list))
            .finally(() => {
              setModelsProbe(getModelProbe());
              setModelsLoading(false);
            });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  glow: { position: 'absolute', top: 0, left: 0, right: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: space.lg,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  orb: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5 },
  headerText: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  title: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2, maxWidth: '88%' },
  subtitle: { fontSize: 11.5, letterSpacing: 0.1 },
  iconButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  list: { paddingTop: 10, paddingBottom: 18 },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },
  emptyState: { paddingHorizontal: 32, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 19, fontWeight: '700', letterSpacing: -0.3 },
  emptyText: { fontSize: 13.5, lineHeight: 20, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 8 },
  chip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  modelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginLeft: 12,
    marginBottom: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: '78%',
  },
  modelChipText: { fontSize: 11.5, fontWeight: '600', flexShrink: 1 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 36 },
  bigIcon: {
    width: 80,
    height: 80,
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  primaryButton: {
    marginTop: 10,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: radius.lg,
  },
});

export default TerminalScreen;
