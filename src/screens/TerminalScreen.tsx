import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Keyboard, TouchableOpacity, FlatList, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store';
import { Button, Card, Input } from '@/components/ui';
import { Send, Terminal, FolderOpen, Settings, RotateCcw, Zap } from 'lucide-react-native';

export default function TerminalScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const {
    pairedSession,
    connectionStatus,
    activeSessionId,
    sessions,
    messages,
    terminalOutput,
    pendingInput,
    setPendingInput,
    addMessage,
    addTerminalOutput,
    setActiveSession,
    updateSession,
    clearPairing,
    settings,
  } = useAppStore();

  const [input, setInput] = useState('');
  const [showSessions, setShowSessions] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const messagesEndRef = useRef<View>(null);

  const session = sessions.find(s => s.id === activeSessionId);
  const sessionMessages = messages[activeSessionId || ''] || [];

  useEffect(() => {
    if (settings.autoScroll) {
      scrollToBottom();
    }
  }, [sessionMessages, terminalOutput]);

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  const handleSend = () => {
    if (!input.trim() || !pairedSession) return;
    
    const message = {
      id: `msg-${Date.now()}`,
      sessionId: activeSessionId || '',
      role: 'user' as const,
      content: input,
      timestamp: Date.now(),
    };
    
    addMessage(activeSessionId || '', message);
    addTerminalOutput({ type: 'stdout', data: `> ${input}\n`, timestamp: Date.now() });
    
    // Simulate assistant response
    simulateResponse(input);
    
    setInput('');
    setPendingInput('');
    Keyboard.dismiss();
  };

  const simulateResponse = (userInput: string) => {
    const responses = [
      `Entendido. Executando: ${userInput}`,
      `Comando processado com sucesso.`,
      `✓ Operação concluída.`,
    ];
    
    let delay = 500;
    responses.forEach((response, i) => {
      setTimeout(() => {
        const msg = {
          id: `msg-${Date.now()}-${i}`,
          sessionId: activeSessionId || '',
          role: 'assistant' as const,
          content: response,
          timestamp: Date.now(),
        };
        addMessage(activeSessionId || '', msg);
        addTerminalOutput({ type: 'stdout', data: `${response}\n`, timestamp: Date.now() });
        if (settings.autoScroll) scrollToBottom();
      }, delay);
      delay += 800;
    });
  };

  const handleQuickCommand = (cmd: string) => {
    setInput(cmd);
    handleSend();
  };

  const quickCommands = [
    { label: 'Listar arquivos', cmd: 'ls -la', icon: FolderOpen },
    { label: 'Status git', cmd: 'git status', icon: Terminal },
    { label: 'Ver processos', cmd: 'ps aux', icon: Zap },
    { label: 'Limpar terminal', cmd: 'clear', icon: RotateCcw },
  ];

  if (!pairedSession) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyState}>
          <Terminal size={64} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Não Conectado</Text>
          <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
            Faça o pareamento primeiro para acessar o terminal
          </Text>
          <Button variant="primary" onPress={() => router.replace('/(tabs)/pairing')} size="lg">
            Ir para Pareamento
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => setShowSessions(!showSessions)} style={styles.headerButton}>
            <Terminal size={20} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.sessionInfo}>
            <Text style={[styles.sessionName, { color: colors.foreground }]}>
              {session?.name || 'Sessão Principal'}
            </Text>
            <View style={styles.statusRow}>
              <View style={[
                styles.statusDot,
                { backgroundColor: connectionStatus === 'connected' ? colors.success : colors.warning }
              ]} />
              <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
                {connectionStatus === 'connected' ? 'Conectado' : connectionStatus}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setShowCommandPalette(true)} style={styles.headerButton}>
            <Zap size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(tabs)/settings')} style={styles.headerButton}>
            <Settings size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sessions Dropdown */}
      {showSessions && (
        <View style={[styles.sessionsDropdown, { borderBottomColor: colors.border }]}>
          <FlatList
            data={sessions}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.sessionItem,
                  activeSessionId === item.id && styles.sessionItemActive,
                  { backgroundColor: activeSessionId === item.id ? colors.primary + '20' : 'transparent' }
                ]}
                onPress={() => { setActiveSession(item.id); setShowSessions(false); }}
              >
                <View style={styles.sessionItemLeft}>
                  <Terminal size={16} color={activeSessionId === item.id ? colors.primary : colors.mutedForeground} />
                  <Text style={[
                    styles.sessionItemName,
                    { color: activeSessionId === item.id ? colors.primary : colors.foreground }
                  ]}>
                    {item.name}
                  </Text>
                </View>
                <View style={styles.sessionItemRight}>
                  <Text style={[
                    styles.sessionItemStatus,
                    { color: item.status === 'running' ? colors.success : colors.mutedForeground }
                  ]}>
                    {item.status}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
            ListHeaderComponent={() => (
              <View style={styles.sessionsHeader}>
                <Text style={[styles.sessionsHeaderTitle, { color: colors.foreground }]}>Sessões</Text>
                <Button variant="ghost" size="sm" onPress={() => {}}>
                  <Zap size={14} color={colors.foreground} />
                  Nova
                </Button>
              </View>
            )}
          />
        </View>
      )}

      {/* Terminal Output */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.terminalArea}
        contentContainerStyle={styles.terminalContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={settings.autoScroll ? scrollToBottom : undefined}
      >
        {terminalOutput.map((output, index) => (
          <Text
            key={index}
            style={[
              styles.terminalLine,
              { color: output.type === 'stderr' ? colors.destructive : colors.terminalForeground },
              { fontFamily: 'monospace', fontSize: settings.fontSize }
            ]}
          >
            {output.data}
          </Text>
        ))}
        {sessionMessages.map((msg) => (
          <View key={msg.id} style={styles.messageWrapper}>
            <Text style={[
              styles.messagePrefix,
              { color: msg.role === 'user' ? colors.primary : colors.success }
            ]}>
              {msg.role === 'user' ? '▶' : '●'}
            </Text>
            <Text style={[
              styles.messageText,
              { color: colors.terminalForeground, fontSize: settings.fontSize }
            ]}>
              {msg.content}
            </Text>
          </View>
        ))}
        <View ref={messagesEndRef} />
      </ScrollView>

      {/* Quick Commands */}
      <View style={[styles.quickCommands, { borderTopColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickCommandsContent}>
          {quickCommands.map((cmd, i) => (
            <TouchableOpacity
              key={i}
              style={styles.quickCommandBtn}
              onPress={() => handleQuickCommand(cmd.cmd)}
            >
              <cmd.icon size={14} color={colors.mutedForeground} />
              <Text style={[styles.quickCommandText, { color: colors.mutedForeground }]}>{cmd.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Input Area */}
      <View style={[styles.inputArea, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={[
              styles.textInput,
              { color: colors.foreground, fontSize: settings.fontSize, fontFamily: 'monospace' }
            ]}
            value={input}
            onChangeText={(text) => { setInput(text); setPendingInput(text); }}
            onSubmitEditing={handleSend}
            placeholder="Digite um comando..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            maxLength={5000}
            autoFocus
            blurOnSubmit={false}
          />
        </View>
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: colors.primary }
          ]}
          onPress={handleSend}
          disabled={!input.trim()}
        >
          <Send size={20} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    backgroundColor: 'rgba(0,0,0,0)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
  },
  sessionInfo: {
    gap: 2,
  },
  sessionName: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  sessionsDropdown: {
    maxHeight: 200,
    backgroundColor: 'rgba(0,0,0,0)',
  },
  sessionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sessionsHeaderTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sessionItemActive: {},
  sessionItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sessionItemName: {
    fontSize: 14,
    fontWeight: '500',
  },
  sessionItemRight: {},
  sessionItemStatus: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  separator: {
    height: 1,
    marginLeft: 44,
  },
  terminalArea: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  terminalContent: {
    gap: 2,
    paddingBottom: 20,
  },
  terminalLine: {
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  messageWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 4,
  },
  messagePrefix: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 1,
  },
  messageText: {
    flex: 1,
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  quickCommands: {
    borderTopWidth: 1,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0)',
  },
  quickCommandsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  quickCommandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(128,128,128,0.1)',
  },
  quickCommandText: {
    fontSize: 12,
    fontWeight: '500',
  },
  inputArea: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: 'rgba(128,128,128,0.1)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    minHeight: 44,
    maxHeight: 120,
  },
  textInput: {
    flex: 1,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: 'center',
  },
});