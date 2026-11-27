import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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
import { ArrowUp, X } from 'lucide-react-native';
import { useAppStore } from '@/store';
import { websocket } from '@/utils/websocket';
import { haptic } from '@/utils/haptics';
import { ParticleOrb, OrbState } from '@/rafael/ParticleOrb';
import { speak, stopSpeaking, voiceReady } from '@/rafael/voice';

// O bridge do microfone só existe se o binário tiver o módulo nativo de áudio.
/* eslint-disable @typescript-eslint/no-require-imports */
const MicBridge = (() => {
  try {
    if (!voiceReady.mic) return null;
    return (require('@/rafael/MicBridge') as typeof import('@/rafael/MicBridge')).MicBridge;
  } catch {
    return null;
  }
})();
/* eslint-enable @typescript-eslint/no-require-imports */

const EXIT_WORDS = ['sair do modo rafael', 'sair do modo', 'desligar rafael', 'fechar rafael'];

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

  const [draft, setDraft] = useState('');
  const [writing, setWriting] = useState(false);
  const [sending, setSending] = useState(false);

  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const micLevel = useRef(0);
  const lastSpoken = useRef('');

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

  const orbState: OrbState =
    connectionStatus !== 'connected'
      ? 'connecting'
      : writing || sending
        ? 'listening'
        : running
          ? lastAssistant?.streaming
            ? 'speaking'
            : 'thinking'
          : 'idle';

  const subtitle = useMemo(() => {
    const spoken = (writing || sending) && draft.trim().length > 0 ? draft : null;
    if (spoken) return spoken;
    const text = lastAssistant?.content?.trim();
    if (text) return text;
    const mine = lastUser?.content?.trim();
    if (mine) return mine;
    return 'Estou aqui. Fale ou digite, e eu conduzo o resto.';
  }, [draft, lastAssistant, lastUser, sending, writing]);

  // O texto chega em fluxo: agrupa as atualizações para o texto não custar caro.
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

  // Rafael fala a resposta quando o streaming termina (só em build com voix nativa).
  useEffect(() => {
    if (!voiceReady.speech) return;
    if (!lastAssistant || lastAssistant.streaming) return;
    const text = lastAssistant.content?.trim();
    if (!text || text === lastSpoken.current) return;
    lastSpoken.current = text;
    speak(text);
  }, [lastAssistant]);

  useEffect(() => () => stopSpeaking(), []);

  const close = useCallback(() => {
    haptic('light');
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/terminal');
  }, [router]);

  const openInput = useCallback(() => {
    haptic('light');
    stopSpeaking();
    setWriting(true);
    setTimeout(() => inputRef.current?.focus(), 60);
  }, []);

  const submit = useCallback(async () => {
    const text = draft.trim();
    if (!text) {
      setWriting(false);
      Keyboard.dismiss();
      return;
    }

    const normalized = normalize(text);
    if (EXIT_WORDS.some((word) => normalized.includes(word))) {
      setDraft('');
      setWriting(false);
      Keyboard.dismiss();
      close();
      return;
    }

    if (!activeSessionId) {
      haptic('error');
      return;
    }

    setSending(true);
    setDraft('');
    haptic('tap');
    const ok = await websocket.sendCommand(text, activeSessionId);
    setSending(false);
    if (!ok) {
      haptic('error');
      setDraft(text);
      return;
    }
    setWriting(false);
    Keyboard.dismiss();
  }, [activeSessionId, close, draft]);

  const handleLevel = useCallback((value: number) => {
    micLevel.current = value;
  }, []);

  const orbSize = Math.min(Dimensions.get('window').width * 0.86, 380);
  const statusLabel =
    connectionStatus !== 'connected'
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
      {MicBridge ? (
        <MicBridge
          enabled={writing}
          onLevel={handleLevel}
        />
      ) : null}

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.brandRow}>
          <View style={styles.brandDot} />
          <Text style={styles.brand}>RAFAEL</Text>
          <Text style={styles.status}>{statusLabel}</Text>
        </View>
        <Pressable onPress={close} hitSlop={12} style={styles.close}>
          <X size={18} color="#7a7a7a" strokeWidth={2.2} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.orbArea} onPress={openInput}>
          <ParticleOrb size={orbSize} state={orbState} levelRef={micLevel} />
        </Pressable>

        <View style={styles.captionArea}>
          <Text numberOfLines={5} style={styles.caption}>
            {shownSubtitle}
          </Text>
          {!writing ? (
            <Text style={styles.hint}>
              toque para falar
            </Text>
          ) : null}
        </View>

        {writing ? (
          <View style={[styles.composer, { marginBottom: Math.max(insets.bottom, 14) }]}>
            <TextInput
              ref={inputRef}
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={submit}
              onBlur={() => setWriting(false)}
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
        ) : (
          <Text style={[styles.footer, { marginBottom: Math.max(insets.bottom, 14) }]}>
            diga “sair do modo rafael” para voltar ao chat
          </Text>
        )}
      </KeyboardAvoidingView>
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
  brandDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#ffffff' },
  brand: { color: '#ffffff', fontSize: 11, fontWeight: '800', letterSpacing: 5.5 },
  status: { color: '#5c5c5c', fontSize: 10.5, letterSpacing: 2.4, textTransform: 'uppercase' },
  close: { padding: 6 },
  body: { flex: 1, justifyContent: 'space-between' },
  orbArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  captionArea: { paddingHorizontal: 26, paddingBottom: 10, minHeight: 130, justifyContent: 'flex-end' },
  caption: {
    color: '#ffffff',
    fontSize: 27,
    lineHeight: 34,
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
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginHorizontal: 20,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 28,
    backgroundColor: '#101010',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#262626',
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
  footer: {
    color: '#3f3f3f',
    fontSize: 11,
    letterSpacing: 1.4,
    textAlign: 'center',
  },
});