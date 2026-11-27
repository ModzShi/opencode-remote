import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  PanResponder,
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

function distance(a: { pageX: number; pageY: number }, b: { pageX: number; pageY: number }): number {
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

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

  const scale = useMemo(() => new Animated.Value(1), []);
  const scaleValue = useRef(1);
  const pinchStart = useRef(0);
  const pinchBase = useRef(1);
  const moved = useRef(false);
  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);

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

  useEffect(() => {
    if (!activeSessionId) return;
    void websocket.setSessionAgent(activeSessionId, 'rafael');
  }, [activeSessionId]);

  const close = useCallback(() => {
    haptic('light');
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/terminal');
  }, [router]);

  const openInput = useCallback(() => {
    haptic('light');
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

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const panResponder = useMemo(
    () =>
      // Os handlers rodam fora do render; a regra não distingue isso.
      // eslint-disable-next-line react-hooks/refs
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          moved.current = false;
          const touches = event.nativeEvent.touches;
          if (touches.length >= 2) {
            pinchStart.current = distance(touches[0], touches[1]);
            pinchBase.current = scaleValue.current;
          } else {
            pinchStart.current = 0;
          }
        },
        onPanResponderMove: (event) => {
          const touches = event.nativeEvent.touches;
          if (touches.length < 2) return;
          const spread = distance(touches[0], touches[1]);
          if (pinchStart.current === 0) {
            pinchStart.current = spread;
            pinchBase.current = scaleValue.current;
            return;
          }
          const ratio = spread / pinchStart.current;
          const next = clamp(pinchBase.current * ratio, 0.55, 2.2);
          scaleValue.current = next;
          moved.current = true;
          scale.setValue(next);
        },
        onPanResponderRelease: () => {
          pinchStart.current = 0;
          if (!moved.current) openInput();
        },
        onPanResponderTerminate: () => {
          pinchStart.current = 0;
        },
      }),
    [openInput, scale]
  );

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
        <View style={styles.orbArea} {...panResponder.panHandlers}>
          <Animated.View style={{ transform: [{ scale }] }}>
            <ParticleOrb size={orbSize} state={orbState} />
          </Animated.View>
        </View>

        <View style={styles.captionArea}>
          <Text numberOfLines={5} adjustsFontSizeToFit style={styles.caption}>
            {subtitle}
          </Text>
          {!writing ? (
            <Text style={styles.hint}>
              toque para falar  ·  aproxime com dois dedos
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