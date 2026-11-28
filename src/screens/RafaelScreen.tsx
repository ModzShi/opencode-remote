import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowUp, ChevronDown, Keyboard as KeyboardIcon, ShieldAlert, Sparkles, X } from 'lucide-react-native';
import { useAppStore } from '@/store';
import { websocket } from '@/utils/websocket';
import { haptic } from '@/utils/haptics';
import { Orb, findOrbStyle, type OrbState } from '@/rafael/Orb';
import { getDefaultModel, getModelProbe, refreshModels, useModels } from '@/rafael/models';
import { ModelSheet } from '@/components/ModelSheet';
import { speak, stopSpeaking, voiceReady } from '@/rafael/voice';
import type { AgentOption, ModelOption } from '@/types';

// A escuta nativa só existe se o binário tiver o módulo instalado.
/* eslint-disable @typescript-eslint/no-require-imports */
const VoiceListener = (() => {
  try {
    require('expo-speech-recognition');
    return (require('@/rafael/VoiceListener') as typeof import('@/rafael/VoiceListener')).VoiceListener;
  } catch {
    return null;
  }
})();
/* eslint-enable @typescript-eslint/no-require-imports */

const EXIT_WORDS = ['sair do modo rafael', 'sair do modo', 'desligar rafael', 'fechar rafael'];
const LISTEN_TIMEOUT = 20000;
const SEND_DELAY = 220;

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[áàâãä]/g, 'a')
    .replace(/[éèêë]/g, 'e')
    .replace(/[íìîï]/g, 'i')
    .replace(/[óòôõö]/g, 'o')
    .replace(/[úùûü]/g, 'u')
    .replace(/ç/g, 'c')
    .trim();
}

// "troca para o modelo opus", "usa o modelo gpt", "qual é o seu modelo?"
const MODEL_SWITCH = /(?:troca|trocar|muda|mudar|usa|usar|seleciona|selecionar|escolhe|escolher|ativa|ativar|configura|configurar|coloca|colocar|poe|por)\s+(?:para|pro|pra|de|em)?\s*(?:o\s+)?modelo\s*(?:para|pro|pra|de|em|:)?\s*(.+)$/;

type ModelIntent = { kind: 'query' } | { kind: 'switch'; target: string };

function parseModelIntent(text: string): ModelIntent | null {
  const value = normalize(text);
  if (!value.includes('modelo')) return null;

  // Pergunta sobre o modelo só quando a frase começa perguntando.
  if (
    /^(qual|quais|que|diz|diga|fala|fale|me\s+diz|me\s+fala)\b[^?]{0,48}\bmodelo\b/.test(value) ||
    /modelo\s+(voce\s+)?(esta|ta)\s+(usando|usa)/.test(value)
  ) {
    return { kind: 'query' };
  }

  const match = value.match(MODEL_SWITCH);
  if (!match) {
    // Sem verbo de troca, só vale algo curto ("modelo opus").
    // Frases como "o modelo diz que não tem acesso" não são comando.
    if (value.split(/\s+/).length > 3) return null;
    const short = value.replace(/^.*?modelo\s*/, '').trim();
    return short ? { kind: 'switch', target: short } : null;
  }

  const target = match[1]
    .replace(/^(chamado|chamada|que\s+e|que\s+se\s+chama)\s+/, '')
    .trim();

  if (!target || target.length > 48) return null;
  return { kind: 'switch', target };
}

function modelScore(target: string, model: ModelOption): number {
  const label = normalize(model.label);
  const value = normalize(model.value);
  if (label === target || value === target) return 100;
  if (label.startsWith(target) || value.endsWith('/' + target)) return 80;
  if (label.includes(target) || value.includes(target)) return 60;

  const words = target.split(/\s+/).filter((word) => word.length > 2);
  if (words.length === 0) return 0;
  const hits = words.filter((word) => label.includes(word) || value.includes(word)).length;
  return (hits / words.length) * 40;
}

function bestModelMatch(target: string, models: ModelOption[]): ModelOption | null {
  let best: ModelOption | null = null;
  let score = 0;
  for (const model of models) {
    const next = modelScore(target, model);
    if (next > score) {
      score = next;
      best = model;
    }
  }
  return score >= 40 ? best : null;
}

export function RafaelScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const activeSessionId = useAppStore((state) => state.activeSessionId);
  const sessions = useAppStore((state) => state.sessions);
  const storedMessages = useAppStore((state) => (state.activeSessionId ? state.messages[state.activeSessionId] : undefined));
  const messages = useMemo(() => storedMessages ?? [], [storedMessages]);
  const connectionStatus = useAppStore((state) => state.connectionStatus);
  const orbStyle = findOrbStyle(useAppStore((state) => state.settings.rafaelOrb));
  const colorFrom = useAppStore((state) => state.settings.rafaelColorFrom) ?? '#7EE7FF';
  const colorTo = useAppStore((state) => state.settings.rafaelColorTo) ?? '#9D8BFF';
  const cycle = useAppStore((state) => state.settings.rafaelColorCycle) ?? true;
  const agentModel = useAppStore((state) => state.settings.rafaelAgentModel);
  const setSettings = useAppStore((state) => state.setSettings);

  const [draft, setDraft] = useState('');
  const [writing, setWriting] = useState(false);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [modelSheet, setModelSheet] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const models = useModels(connectionStatus === 'connected');
  const [modelsProbe, setModelsProbe] = useState('');
  const [agents, setAgents] = useState<AgentOption[]>([]);

  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const micLevel = useRef(0);
  const lastSpoken = useRef('');
  const heardRef = useRef('');
  const sentRef = useRef(false);
  const sendTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const session = sessions.find((item) => item.id === activeSessionId);
  const running = session?.status === 'running';
  const pendingPermission = useAppStore((state) => state.pendingPermission);
  const chosenModel = models.find((model) => model.value === agentModel);
  const modelLabel = agentModel ? chosenModel?.label ?? agentModel : 'modelo padrão';

  const lastAssistant = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index].role === 'assistant') return messages[index];
    }
    return undefined;
  }, [messages]);

  const lastUser = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index].role === 'user') return messages[index];
    }
    return undefined;
  }, [messages]);

  const orbState: OrbState = !VoiceListener
    ? 'error'
    : connectionStatus !== 'connected'
      ? 'connecting'
      : listening || writing || sending
        ? 'listening'
        : running
          ? lastAssistant?.streaming
            ? 'speaking'
            : 'thinking'
          : 'idle';

  const subtitle = useMemo(() => {
    if (notice) return notice;
    if (listening) return heard.trim() || 'Pode falar…';
    if (writing && draft.trim().length > 0) return draft.trim();
    const text = lastAssistant?.content?.trim();
    if (text) return text;
    const mine = lastUser?.content?.trim();
    if (mine) return mine;
    return VoiceListener ? 'Toque no orbe e fale comigo.' : 'Digite: o ditado precisa da versão mais nova.';
  }, [draft, heard, lastAssistant, lastUser, listening, notice, writing]);

  // O texto chega em fluxo: agrupa as atualizações para não custar caro.
  const [shownSubtitle, setShownSubtitle] = useState(subtitle);
  useEffect(() => {
    if (subtitle === shownSubtitle) return;
    const id = setTimeout(() => setShownSubtitle(subtitle), 90);
    return () => clearTimeout(id);
  }, [shownSubtitle, subtitle]);

  // O modelo vive no PC: reaplica o escolhido quando entra na sessão.
  // (Não trocamos o agente: o agente padrão é o que tem as ferramentas.)
  const appliedModel = useRef('');
  useEffect(() => {
    if (!activeSessionId || !agentModel) return;
    const key = `${activeSessionId}:${agentModel}`;
    if (appliedModel.current === key) return;
    appliedModel.current = key;
    void websocket.setSessionModel(activeSessionId, { value: agentModel });
  }, [activeSessionId, agentModel]);

  // Um pedido de permissão pode já estar aberto (agente parado esperando).
  useEffect(() => {
    if (!activeSessionId) return;
    void websocket.fetchPendingPermission(activeSessionId);
  }, [activeSessionId]);

  // Versões antigas do app forçavam o agente "rafael" na sessão; se ele ficou
  // para trás, volta para um agente com ferramentas (build).
  const repairedAgent = useRef(false);
  useEffect(() => {
    if (repairedAgent.current || !activeSessionId) return;
    const current = sessions.find((item) => item.id === activeSessionId)?.agent;
    if (current !== 'rafael') return;
    repairedAgent.current = true;
    void websocket.fetchAgents().then((list) => {
      const target = list.find((agent) => agent.id === 'build') ?? list.find((agent) => agent.id !== 'rafael');
      if (!target) return;
      void websocket.setSessionAgent(activeSessionId, target.id).then((ok) => {
        if (ok) setNotice(`agente: ${target.label}`);
      });
    });
  }, [activeSessionId, sessions]);

  // Rafael fala a resposta quando o streaming termina.
  useEffect(() => {
    if (!voiceReady.speech) return;
    if (!lastAssistant || lastAssistant.streaming || listening) return;
    const text = lastAssistant.content?.trim();
    if (!text || text === lastSpoken.current) return;
    lastSpoken.current = text;
    speak(text);
  }, [lastAssistant, listening]);

  useEffect(() => () => {
    stopSpeaking();
    if (sendTimer.current) clearTimeout(sendTimer.current);
  }, []);

  const close = useCallback(() => {
    haptic('light');
    stopSpeaking();
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/terminal');
  }, [router]);

  const answerPermission = useCallback(
    async (decision: 'once' | 'always' | 'reject') => {
      const request = useAppStore.getState().pendingPermission;
      if (!request) return;
      haptic('tap');
      const ok = await websocket.replyPermission(request.sessionID || activeSessionId || '', request.id, decision);
      if (ok) {
        useAppStore.getState().setPendingPermission(null);
        setNotice(decision === 'reject' ? 'Permissão negada.' : 'Permissão liberada.');
      } else {
        haptic('error');
        setNotice('O PC não aceitou a resposta da permissão.');
      }
    },
    [activeSessionId]
  );

  const applyModel = useCallback(
    async (option: ModelOption | null) => {
      haptic('tap');
      setSettings({ rafaelAgentModel: option?.value ?? '' });
      if (!activeSessionId) {
        setNotice(null);
        return;
      }

      // "Padrão" = modelo padrão que o próprio PC informou.
      let target = option;
      if (!target) {
        target = getDefaultModel();
        if (!target) {
          await refreshModels(true);
          target = getDefaultModel();
        }
      }

      if (!target) {
        setNotice('o PC não informou o modelo padrão.');
        if (voiceReady.speech) speak('Não descobri o modelo padrão do PC.');
        return;
      }

      const ok = await websocket.setSessionModel(activeSessionId, target);
      if (!ok) {
        setNotice('O PC não aceitou trocar o modelo.');
        if (voiceReady.speech) speak('Não consegui trocar o modelo no PC.');
        return;
      }

      setNotice(option ? `modelo: ${target.label}` : `padrão: ${target.label}`);
      if (voiceReady.speech) {
        speak(option ? `Modelo trocado para ${target.label}.` : `Voltei para ${target.label}.`);
      }
    },
    [activeSessionId, setSettings]
  );

  const handleModelIntent = useCallback(
    async (intent: ModelIntent) => {
      if (intent.kind === 'query') {
        const label = agentModel ? modelLabel : 'o modelo padrão do agente';
        setNotice(`modelo: ${label}`);
        if (voiceReady.speech) speak(`Estou usando ${label}.`);
        return;
      }

      const list = models.length > 0 ? models : await refreshModels(true);
      const option = bestModelMatch(intent.target, list);
      if (!option) {
        haptic('error');
        setNotice(list.length > 0 ? `não achei “${intent.target}”` : 'a lista de modelos está vazia');
        if (voiceReady.speech) {
          speak(
            list.length > 0
              ? `Não achei esse modelo. Você tem ${list.length} modelos.`
              : 'Não consegui listar os modelos do PC.'
          );
        }
        return;
      }

      await applyModel(option);
    },
    [agentModel, applyModel, modelLabel, models]
  );

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text) return;

      const normalized = normalize(text);
      if (EXIT_WORDS.some((word) => normalized.includes(word))) {
        setHeard('');
        heardRef.current = '';
        close();
        return;
      }

      // Com uma permissão aberta, "sim" e "não" respondem o pedido do PC.
      if (useAppStore.getState().pendingPermission) {
        if (/^(sim|pode|pode ser|permitir|permite|autoriza|autorizar|ok|claro|manda|vai|aceito|aceitar|liberar|libera)\b/.test(normalized)) {
          await answerPermission('once');
          return;
        }
        if (/^(nao|nega|negar|recusa|recusar|bloqueia|bloquear|pare|espera|deixa)\b/.test(normalized)) {
          await answerPermission('reject');
          return;
        }
      }

      // "troca para o modelo X" é resolvido aqui, sem ir para o agente.
      const modelIntent = parseModelIntent(text);
      if (modelIntent) {
        await handleModelIntent(modelIntent);
        return;
      }

      if (!activeSessionId) {
        haptic('error');
        setNotice('Pareie o app com o PC primeiro.');
        return;
      }

      haptic('tap');
      setSending(true);
      setHeard('');
      heardRef.current = '';
      stopSpeaking();
      const ok = await websocket.sendCommand(text, activeSessionId);
      setSending(false);
      if (!ok) {
        haptic('error');
        setNotice('Não consegui enviar. Verifique a conexão.');
        setDraft(text);
        setWriting(true);
      } else {
        setNotice(null);
        setDraft('');
      }
    },
    [activeSessionId, answerPermission, close, handleModelIntent]
  );

  const stopListening = useCallback(() => {
    setListening(false);
    if (sendTimer.current) {
      clearTimeout(sendTimer.current);
      sendTimer.current = null;
    }
  }, []);

  const onPartial = useCallback((text: string) => {
    heardRef.current = text;
    setHeard(text);
    setNotice(null);
    if (sendTimer.current) {
      clearTimeout(sendTimer.current);
      sendTimer.current = null;
    }
  }, []);

  const onFinal = useCallback(
    (text: string) => {
      heardRef.current = text;
      setHeard(text);
      if (sendTimer.current) clearTimeout(sendTimer.current);
      sendTimer.current = setTimeout(() => {
        sendTimer.current = null;
        if (sentRef.current) return;
        sentRef.current = true;
        setListening(false);
        void send(text);
      }, SEND_DELAY);
    },
    [send]
  );

  const onListenEnd = useCallback(() => {
    const text = heardRef.current.trim();
    if (sendTimer.current) return;
    if (sentRef.current || !text) {
      setListening(false);
      return;
    }
    sentRef.current = true;
    setListening(false);
    void send(text);
  }, [send]);

  const onListenError = useCallback((code: string) => {
    setListening(false);
    if (code === 'permission') {
      setNotice('Permita o microfone e o ditado nos ajustes do iOS.');
      haptic('error');
    } else if (code !== 'no-speech') {
      setNotice('Não consegui ouvir. Toque e tente de novo.');
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (writing) {
      setWriting(false);
      Keyboard.dismiss();
      return;
    }
    if (listening) {
      const text = heardRef.current.trim();
      stopListening();
      if (text && !sentRef.current) {
        sentRef.current = true;
        void send(text);
      }
      return;
    }

    if (!VoiceListener) {
      setWriting(true);
      return;
    }

    haptic('light');
    stopSpeaking();
    if (sendTimer.current) {
      clearTimeout(sendTimer.current);
      sendTimer.current = null;
    }
    setNotice(null);
    setHeard('');
    heardRef.current = '';
    sentRef.current = false;
    setListening(true);
  }, [listening, send, stopListening, writing]);

  // Encerra a escuta sozinho se ninguém falar.
  useEffect(() => {
    if (!listening) return;
    const id = setTimeout(() => {
      setListening(false);
      const text = heardRef.current.trim();
      if (text && !sentRef.current) {
        sentRef.current = true;
        void send(text);
      }
    }, LISTEN_TIMEOUT);
    return () => clearTimeout(id);
  }, [listening, send]);

  const openKeyboard = useCallback(() => {
    haptic('light');
    stopListening();
    setWriting(true);
  }, [stopListening]);

  const closeInput = useCallback(() => {
    setWriting(false);
  }, []);

  const submit = useCallback(async () => {
    const text = draft.trim();
    if (!text) {
      closeInput();
      Keyboard.dismiss();
      return;
    }
    setDraft('');
    closeInput();
    Keyboard.dismiss();
    await send(text);
  }, [closeInput, draft, send]);

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

  const selectAgent = useCallback(
    async (agent: string) => {
      haptic('tap');
      if (!activeSessionId) return;
      const ok = await websocket.setSessionAgent(activeSessionId, agent);
      setModelSheet(false);
      setNotice(ok ? `agente: ${agent}` : 'O PC não aceitou trocar o agente.');
      if (voiceReady.speech) {
        speak(ok ? `Agora usando o agente ${agent}.` : 'Não consegui trocar o agente.');
      }
    },
    [activeSessionId]
  );

  const selectModel = useCallback(
    (option: ModelOption | null) => {
      setModelSheet(false);
      void applyModel(option);
    },
    [applyModel]
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
        // Sem "provedor/modelo", tenta casar pelo nome com a lista do PC.
        const match = models.find(
          (model) => normalize(model.modelID ?? '') === normalize(trimmed) || normalize(model.label) === normalize(trimmed)
        );
        if (!match) {
          setNotice('digite no formato provedor/modelo (ex.: anthropic/claude-sonnet-4)');
          if (voiceReady.speech) speak('Digite o provedor e o modelo, separados por barra.');
          return;
        }
        void applyModel(match);
        return;
      }

      const providerID = trimmed.slice(0, slash);
      const modelID = trimmed.slice(slash + 1);
      void applyModel({
        value: trimmed,
        label: modelID,
        provider: providerID,
        providerID,
        modelID,
      });
    },
    [applyModel, models]
  );

  const orbSize = Math.min(Dimensions.get('window').width * 0.82, 340);
  const statusLabel = !VoiceListener
    ? 'sem ditado'
    : connectionStatus !== 'connected'
      ? 'reconectando'
      : orbState === 'listening'
        ? 'ouvindo'
        : orbState === 'thinking'
          ? 'pensando'
          : orbState === 'speaking'
            ? 'falando'
            : 'pronto';

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {VoiceListener ? (
        <VoiceListener
          active={listening}
          onPartial={onPartial}
          onFinal={onFinal}
          onError={onListenError}
          onEnd={onListenEnd}
        />
      ) : null}

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.brandRow}>
          <View style={styles.brandDot} />
          <Text style={styles.brand}>RAFAEL</Text>
          <Text style={styles.status}>{statusLabel}</Text>
        </View>
        <Pressable onPress={close} hitSlop={12} style={styles.close}>
          <X size={18} color="#8a8f9c" strokeWidth={2.2} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <Pressable style={styles.orbArea} onPress={toggleListening}>
          <Orb
            size={orbSize}
            state={orbState}
            style={orbStyle}
            colorFrom={colorFrom}
            colorTo={colorTo}
            cycle={cycle}
            levelRef={micLevel}
          />
        </Pressable>

        <View style={styles.captionArea}>
          <Text numberOfLines={5} style={styles.caption}>
            {shownSubtitle}
          </Text>
          {!writing && !listening ? <Text style={styles.hint}>toque para falar</Text> : null}
        </View>

        {pendingPermission ? (
          <View style={styles.perm}>
            <View style={styles.permHead}>
              <ShieldAlert size={13} color="#ffd166" strokeWidth={2.2} />
              <Text style={styles.permTitle}>o rafael precisa de permissão</Text>
            </View>
            <Text numberOfLines={3} style={styles.permText}>
              {pendingPermission.action}
              {pendingPermission.resources.length > 0
                ? `\n${pendingPermission.resources.slice(0, 2).join('  ·  ')}`
                : ''}
            </Text>
            <View style={styles.permRow}>
              <Pressable onPress={() => answerPermission('once')} style={[styles.permButton, styles.permAllow]}>
                <Text style={styles.permAllowText}>permitir</Text>
              </Pressable>
              <Pressable onPress={() => answerPermission('always')} style={styles.permButton}>
                <Text style={styles.permButtonText}>sempre</Text>
              </Pressable>
              <Pressable onPress={() => answerPermission('reject')} style={styles.permButton}>
                <Text style={[styles.permButtonText, styles.permDeny]}>negar</Text>
              </Pressable>
            </View>
            <Text style={styles.permHint}>ou diga “sim” / “não”</Text>
          </View>
        ) : null}

        <Pressable onPress={openModels} style={styles.modelChip} hitSlop={8}>
          <Sparkles size={12} color="#8a8f9c" strokeWidth={2.2} />
          <Text numberOfLines={1} style={styles.modelLabel}>
            {modelLabel}
          </Text>
          <ChevronDown size={13} color="#6b6b6b" strokeWidth={2.4} />
        </Pressable>

        {writing ? (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.composer, { marginBottom: Math.max(insets.bottom, 14) }]}>
              <TextInput
                ref={inputRef}
                value={draft}
                onChangeText={setDraft}
                onSubmitEditing={submit}
                onBlur={closeInput}
                autoFocus
                placeholder="fale com o Rafael"
                placeholderTextColor="#4a4a4a"
                style={styles.input}
                multiline
                blurOnSubmit
                returnKeyType="send"
              />
              <Pressable onPress={submit} style={styles.send} hitSlop={10}>
                <ArrowUp size={18} color="#000" strokeWidth={3} />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        ) : (
          <View style={[styles.footerRow, { marginBottom: Math.max(insets.bottom, 14) }]}>
            <Pressable onPress={openKeyboard} hitSlop={10} style={styles.keyboardButton}>
              <KeyboardIcon size={16} color="#8a8f9c" strokeWidth={2} />
              <Text style={styles.keyboardLabel}>digitar</Text>
            </Pressable>
            <Text style={styles.footer}>“sair do modo rafael” encerra</Text>
          </View>
        )}
      </View>

      <ModelSheet
        visible={modelSheet}
        selected={agentModel ?? ''}
        models={models}
        loading={modelsLoading}
        probe={modelsProbe}
        agents={agents}
        selectedAgent={session?.agent ?? ''}
        onSelectAgent={selectAgent}
        onSelect={selectModel}
        onManual={() => {
          if (Platform.OS !== 'ios') return;
          Alert.prompt(
            'Modelo do OpenCode',
            'Ex.: anthropic/claude-sonnet-4. Deixe vazio para o padrão do agente.',
            (value) => {
              setModelSheet(false);
              manualModel(value);
            },
            'plain-text',
            agentModel ?? ''
          );
        }}
        onRefresh={() => {
          setModelsLoading(true);
          void refreshModels(true).finally(() => {
            setModelsProbe(getModelProbe());
            setModelsLoading(false);
          });
        }}
        onClose={() => setModelSheet(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingBottom: 4,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#7ee7ff' },
  brand: { color: '#ffffff', fontSize: 11, fontWeight: '800', letterSpacing: 5.5 },
  status: { color: '#5c5c5c', fontSize: 10.5, letterSpacing: 2.4, textTransform: 'uppercase' },
  close: { padding: 6 },
  body: { flex: 1, justifyContent: 'space-between' },
  orbArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  captionArea: { paddingHorizontal: 26, paddingBottom: 10, minHeight: 118, justifyContent: 'flex-end' },
  caption: {
    color: '#ffffff',
    fontSize: 25,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  hint: {
    color: '#4d4d4d',
    fontSize: 11,
    letterSpacing: 1.6,
    textAlign: 'center',
    marginTop: 14,
    textTransform: 'uppercase',
  },
  perm: {
    marginHorizontal: 22,
    marginBottom: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,209,102,0.07)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,209,102,0.30)',
    gap: 8,
  },
  permHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  permTitle: {
    color: '#ffd166',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  permText: { color: '#e8e8e8', fontSize: 12.5, lineHeight: 18 },
  permRow: { flexDirection: 'row', gap: 8 },
  permButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  permButtonText: { color: '#cfcfcf', fontSize: 11.5, fontWeight: '700', letterSpacing: 0.4 },
  permAllow: { backgroundColor: '#ffd166' },
  permAllowText: { color: '#000000', fontSize: 11.5, fontWeight: '800', letterSpacing: 0.4 },
  permDeny: { color: '#ff6b6b' },
  permHint: { color: '#6d6d6d', fontSize: 10, letterSpacing: 0.8, textAlign: 'right' },
  modelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
    marginBottom: 10,
    maxWidth: '78%',
  },
  modelLabel: { color: '#9a9a9a', fontSize: 11.5, fontWeight: '600', maxWidth: 220 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginHorizontal: 20,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    maxHeight: 110,
    minHeight: 34,
    paddingTop: 8,
    paddingBottom: 8,
  },
  send: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    gap: 12,
  },
  keyboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  keyboardLabel: { color: '#8a8f9c', fontSize: 11.5, fontWeight: '600' },
  footer: { color: '#3f3f3f', fontSize: 10.5, letterSpacing: 0.6 },
});
