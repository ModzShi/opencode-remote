import React, { useCallback, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store';
import { Button } from '@/components/ui';
import { websocket } from '@/utils/websocket';
import {
  Eraser,
  FolderOpen,
  Layers,
  Send,
  Settings,
  Terminal,
  Zap,
} from 'lucide-react-native';
import { fonts, radius } from '@/theme';

const STATUS_LABEL: Record<string, string> = {
  connected: 'Conectado',
  connecting: 'Conectando…',
  reconnecting: 'Reconectando…',
  disconnected: 'Desconectado',
  error: 'Sem conexão',
};

export default function TerminalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const pairedSession = useAppStore((state) => state.pairedSession);
  const connectionStatus = useAppStore((state) => state.connectionStatus);
  const activeSessionId = useAppStore((state) => state.activeSessionId);
  const sessions = useAppStore((state) => state.sessions);
  const messages = useAppStore((state) => state.messages);
  const terminalOutput = useAppStore((state) => state.terminalOutput);
  const addTerminalOutput = useAppStore((state) => state.addTerminalOutput);
  const clearTerminal = useAppStore((state) => state.clearTerminal);
  const setActiveSession = useAppStore((state) => state.setActiveSession);
  const settings = useAppStore((state) => state.settings);

  const [input, setInput] = useState('');
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const session = sessions.find((item) => item.id === activeSessionId);
  const sessionMessages = messages[activeSessionId ?? ''] ?? [];

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const sendText = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text) return;

      addTerminalOutput({ type: 'stdout', data: `› ${text}`, timestamp: Date.now() });

      if (connectionStatus === 'connected') {
        websocket.sendCommand(text, activeSessionId ?? pairedSession?.sessionId ?? '');
      } else {
        addTerminalOutput({
          type: 'system',
          data: 'Sem conexão com o PC. Verifique o pareamento.',
          timestamp: Date.now(),
        });
      }

      setInput('');
    },
    [
      activeSessionId,
      addTerminalOutput,
      connectionStatus,
      pairedSession?.sessionId,
    ]
  );

  const handleSend = () => {
    sendText(input);
    Keyboard.dismiss();
  };

  const quickCommands = [
    { label: 'Arquivos', cmd: 'ls -la', icon: FolderOpen },
    { label: 'Git status', cmd: 'git status', icon: Terminal },
    { label: 'Processos', cmd: 'ps aux', icon: Zap },
    { label: 'Limpar', cmd: 'clear', icon: Eraser },
  ];

  if (!pairedSession) {
    return (
      <View
        style={[
          styles.emptyScreen,
          { backgroundColor: colors.background, paddingTop: insets.top + 40 },
        ]}
      >
        <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
          <Terminal size={30} color={colors.mutedForeground} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
          Nenhum PC conectado
        </Text>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          Escaneie o QR Code do OpenCode para começar a usar o terminal remoto.
        </Text>
        <Button
          size="lg"
          onPress={() => router.replace('/(tabs)/pairing')}
          style={styles.emptyButton}
        >
          Parear agora
        </Button>
      </View>
    );
  }

  const statusColor =
    connectionStatus === 'connected'
      ? colors.success
      : connectionStatus === 'error'
        ? colors.destructive
        : colors.warning;

  const lineHeight = settings.compactMode ? 17 : 20;
  const visibleOutput = terminalOutput.slice(-400);
  const visibleMessages = sessionMessages.slice(-100);

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.terminalBackground }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 6,
            borderBottomColor: colors.border,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <View style={styles.headerText}>
            <Text
              numberOfLines={1}
              style={[styles.sessionName, { color: colors.foreground }]}
            >
              {session?.name ?? 'Sessão principal'}
            </Text>
            <Text style={[styles.connectionText, { color: colors.mutedForeground }]}>
              {STATUS_LABEL[connectionStatus] ?? connectionStatus}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <IconButton onPress={() => setSessionsOpen(true)} label="Sessões">
            <Layers size={18} color={colors.mutedForeground} />
          </IconButton>
          <IconButton onPress={clearTerminal} label="Limpar terminal">
            <Eraser size={18} color={colors.mutedForeground} />
          </IconButton>
          <IconButton
            onPress={() => router.push('/(tabs)/settings')}
            label="Ajustes"
          >
            <Settings size={18} color={colors.mutedForeground} />
          </IconButton>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.output}
        contentContainerStyle={styles.outputContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={settings.autoScroll ? scrollToBottom : undefined}
      >
        {visibleOutput.length === 0 && visibleMessages.length === 0 ? (
          <View style={styles.outputEmpty}>
            <Text style={[styles.outputEmptyTitle, { color: colors.foreground }]}>
              Terminal pronto
            </Text>
            <Text style={[styles.outputEmptyText, { color: colors.mutedForeground }]}>
              Envie um comando abaixo ou use um atalho.
            </Text>
          </View>
        ) : null}

        {visibleOutput.map((output, index) => (
          <View key={`out-${output.timestamp}-${index}`} style={styles.lineRow}>
            {settings.showLineNumbers ? (
              <Text
                style={[
                  styles.lineNumber,
                  { color: colors.mutedForeground, lineHeight },
                ]}
              >
                {index + 1}
              </Text>
            ) : null}
            <Text
              selectable
              style={[
                styles.lineText,
                {
                  color:
                    output.type === 'stderr'
                      ? colors.destructive
                      : output.type === 'system'
                        ? colors.mutedForeground
                        : colors.terminalForeground,
                  fontSize: settings.fontSize,
                  lineHeight,
                  fontStyle: output.type === 'system' ? 'italic' : 'normal',
                },
              ]}
            >
              {output.data}
            </Text>
          </View>
        ))}

        {visibleMessages.map((message) => (
          <View key={message.id} style={styles.lineRow}>
            <Text
              style={[
                styles.messagePrefix,
                {
                  color: message.role === 'user' ? colors.primary : colors.success,
                  lineHeight,
                },
              ]}
            >
              {message.role === 'user' ? '›' : '◆'}
            </Text>
            <Text
              selectable
              style={[
                styles.lineText,
                {
                  color: colors.terminalForeground,
                  fontSize: settings.fontSize,
                  lineHeight,
                },
              ]}
            >
              {message.content}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.quickBar, { borderTopColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickContent}
          keyboardShouldPersistTaps="handled"
        >
          {quickCommands.map((command) => (
            <Pressable
              key={command.label}
              onPress={() => sendText(command.cmd)}
              style={({ pressed }) => [
                styles.quickChip,
                { backgroundColor: colors.muted },
                pressed && { opacity: 0.6 },
              ]}
            >
              <command.icon size={13} color={colors.mutedForeground} />
              <Text style={[styles.quickLabel, { color: colors.mutedForeground }]}>
                {command.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View
        style={[
          styles.inputBar,
          { borderTopColor: colors.border, backgroundColor: colors.surface },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              color: colors.foreground,
              backgroundColor: colors.muted,
              fontSize: settings.fontSize,
              fontFamily: fonts.mono,
              maxHeight: settings.compactMode ? 84 : 110,
            },
          ]}
          value={input}
          onChangeText={setInput}
          placeholder="Digite um comando…"
          placeholderTextColor={colors.mutedForeground}
          multiline
          maxLength={4000}
          keyboardAppearance={isDark ? 'dark' : 'light'}
          returnKeyType="send"
          blurOnSubmit={false}
        />
        <Pressable
          onPress={handleSend}
          disabled={!input.trim()}
          style={({ pressed }) => [
            styles.sendButton,
            {
              backgroundColor: colors.primary,
              opacity: !input.trim() ? 0.35 : pressed ? 0.75 : 1,
            },
          ]}
          accessibilityLabel="Enviar comando"
        >
          <Send size={18} color={colors.primaryForeground} />
        </Pressable>
      </View>

      <Modal
        visible={sessionsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSessionsOpen(false)}
      >
        <Pressable
          style={[styles.backdrop, { backgroundColor: colors.overlay }]}
          onPress={() => setSessionsOpen(false)}
        >
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surface,
                paddingBottom: insets.bottom + 14,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Sessões</Text>

            {sessions.length === 0 ? (
              <Text style={[styles.sheetEmpty, { color: colors.mutedForeground }]}>
                Nenhuma sessão recebida do servidor ainda.
              </Text>
            ) : (
              sessions.map((item) => {
                const active = item.id === activeSessionId;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      setActiveSession(item.id);
                      setSessionsOpen(false);
                    }}
                    style={[
                      styles.sessionRow,
                      { borderTopColor: colors.border },
                      active && { backgroundColor: colors.primaryMuted },
                    ]}
                  >
                    <Terminal
                      size={15}
                      color={active ? colors.primary : colors.mutedForeground}
                    />
                    <View style={styles.sessionInfo}>
                      <Text
                        style={[
                          styles.sessionItemName,
                          { color: active ? colors.primary : colors.foreground },
                        ]}
                      >
                        {item.name}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[styles.sessionPath, { color: colors.mutedForeground }]}
                      >
                        {item.workingDirectory}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.sessionStatus,
                        {
                          backgroundColor:
                            item.status === 'running' ? colors.success : colors.border,
                        },
                      ]}
                    />
                  </Pressable>
                );
              })
            )}
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function IconButton({
  onPress,
  label,
  children,
}: {
  onPress: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.55 }]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    flex: 1,
  },
  headerText: {
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sessionName: {
    fontSize: 14.5,
    fontWeight: '600',
  },
  connectionText: {
    fontSize: 11,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  output: {
    flex: 1,
  },
  outputContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    gap: 2,
  },
  outputEmpty: {
    paddingTop: 28,
    gap: 4,
  },
  outputEmptyTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  outputEmptyText: {
    fontSize: 12.5,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  lineNumber: {
    fontFamily: fonts.mono,
    fontSize: 10,
    minWidth: 24,
    textAlign: 'right',
    opacity: 0.55,
    paddingTop: 2,
  },
  lineText: {
    flex: 1,
    fontFamily: fonts.mono,
  },
  messagePrefix: {
    fontFamily: fonts.mono,
    fontSize: 12,
    paddingTop: 2,
  },
  quickBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
  },
  quickContent: {
    paddingHorizontal: 14,
    gap: 6,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  quickLabel: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    minHeight: 40,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyScreen: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 6,
  },
  emptyButton: {
    marginTop: 18,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 10,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  sheetEmpty: {
    fontSize: 13,
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionItemName: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  sessionPath: {
    fontSize: 11,
    marginTop: 1,
  },
  sessionStatus: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
