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
import { ArrowUp, ChevronDown, Keyboard as KeyboardIcon, Sparkles, X } from 'lucide-react-native';
import { useAppStore } from '@/store';
import { websocket } from '@/utils/websocket';
import { haptic } from '@/utils/haptics';
import { Orb, findOrbStyle, type OrbState } from '@/rafael/Orb';
import { refreshModels, useModels } from '@/rafael/models';
import { ModelSheet } from '@/components/ModelSheet';
import { speak, stopSpeaking, voiceReady } from '@/rafael/voice';

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

  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const micLevel = useRef(0);
  const lastSpoken = useRef('');
  const heardRef = useRef('');
  const sentRef = useRef(false);
  const sendTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const session = sessions.find((item) => item.id === activeSessionId);
  const running = session?.status === 'running';

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

  useEffect(() => {
    if (!activeSessionId) return;
    void websocket.setSessionAgent(activeSessionId, 'rafael');
  }, [activeSessionId]);

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
      const ok = await websocket.sendCommand(text, activeSessionId, agentModel || undefined);
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
    [activeSessionId, agentModel, close]
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

  const chosenModel = models.find((model) => model.value === agentModel);
  const modelLabel = agentModel ? chosenModel?.label ?? agentModel : 'modelo padrão';

  const openModels = useCallback(() => {
    haptic('light');
    setModelSheet(true);
    setModelsLoading(true);
    void refreshModels(true).finally(() => setModelsLoading(false));
  }, []);

  const selectModel = useCallback(
    (value: string) => {
      haptic('tap');
      setSettings({ rafaelAgentModel: value });
      setModelSheet(false);
    },
    [setSettings]
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
        onSelect={selectModel}
        onManual={() => {
          if (Platform.OS !== 'ios') return;
          Alert.prompt(
            'Modelo do OpenCode',
            'Ex.: anthropic/claude-sonnet-4. Deixe vazio para o padrão do agente.',
            (value) => {
              setSettings({ rafaelAgentModel: value.trim() });
              setModelSheet(false);
            },
            'plain-text',
            agentModel ?? ''
          );
        }}
        onRefresh={() => {
          setModelsLoading(true);
          void refreshModels(true).finally(() => setModelsLoading(false));
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
