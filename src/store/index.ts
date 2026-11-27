import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AppSettings,
  OpenCodeSession,
  OpenCodeMessage,
  ConnectionStatus,
  PairingData,
  TerminalOutput,
  FileNode,
  MessagePart,
  TextPart,
} from '@/types';
import type { UpdateInfo } from '@/utils/updates';

interface AppState {
  // Settings
  settings: AppSettings;
  setSettings: (settings: Partial<AppSettings>) => void;
  resetSettings: () => void;

  // Connection
  connectionStatus: ConnectionStatus;
  setConnectionStatus: (status: ConnectionStatus) => void;
  connectionError: string | null;
  setConnectionError: (error: string | null) => void;
  pairedSession: PairingData | null;
  setPairedSession: (session: PairingData | null) => void;
  clearPairing: () => void;

  // Sessions
  sessions: OpenCodeSession[];
  activeSessionId: string | null;
  setSessions: (sessions: OpenCodeSession[]) => void;
  addSession: (session: OpenCodeSession) => void;
  updateSession: (id: string, updates: Partial<OpenCodeSession>) => void;
  removeSession: (id: string) => void;
  setActiveSession: (id: string | null) => void;

  // Messages
  messages: Record<string, OpenCodeMessage[]>;
  addMessage: (sessionId: string, message: OpenCodeMessage) => void;
  setMessages: (sessionId: string, messages: OpenCodeMessage[]) => void;
  clearMessages: (sessionId: string) => void;
  updateMessage: (sessionId: string, messageId: string, updates: Partial<OpenCodeMessage>) => void;
  upsertMessage: (sessionId: string, message: OpenCodeMessage) => void;
  patchMessage: (
    sessionId: string,
    messageId: string,
    patch: (message: OpenCodeMessage) => Partial<OpenCodeMessage>
  ) => void;
  appendPart: (
    sessionId: string,
    messageId: string,
    kind: 'text' | 'reasoning',
    delta: string
  ) => void;

  // Terminal
  terminalOutput: TerminalOutput[];
  addTerminalOutput: (output: TerminalOutput) => void;
  clearTerminal: () => void;

  // File tree
  fileTree: FileNode[];
  setFileTree: (tree: FileNode[]) => void;
  expandPath: (path: string) => void;
  collapsePath: (path: string) => void;

  // UI State
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Input
  pendingInput: string;
  setPendingInput: (input: string) => void;

  // Atualizações
  updateInfo: UpdateInfo | null;
  setUpdateInfo: (info: UpdateInfo | null) => void;
}

const defaultSettings: AppSettings = {
  theme: 'system',
  autoConnect: true,
  hapticsEnabled: true,
  fontSize: 14,
  showLineNumbers: true,
  compactMode: false,
  autoScroll: true,
  keepAlive: true,
  rafaelVoiceId: undefined,
  rafaelVoiceName: undefined,
  rafaelTtsModel: 's2.1-pro-free',
  rafaelOrb: 'particles',
  rafaelSummary: 'auto',
  rafaelAgentModel: '',
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Settings
      settings: defaultSettings,
      setSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
      resetSettings: () => set({ settings: defaultSettings }),

      // Connection
      connectionStatus: 'disconnected',
      setConnectionStatus: (status) => set({ connectionStatus: status }),
      connectionError: null,
      setConnectionError: (error) => set({ connectionError: error }),
      pairedSession: null,
      setPairedSession: (session) => set({ pairedSession: session }),
      clearPairing: () =>
        set({ pairedSession: null, connectionStatus: 'disconnected', connectionError: null }),

      // Sessions
      sessions: [],
      activeSessionId: null,
      setSessions: (sessions) => set({ sessions }),
      addSession: (session) =>
        set((state) => {
          const existing = state.sessions.findIndex((item) => item.id === session.id);
          if (existing === -1) {
            return { sessions: [...state.sessions, session] };
          }
          const sessions = [...state.sessions];
          sessions[existing] = { ...sessions[existing], ...session };
          return { sessions };
        }),
      updateSession: (id, updates) =>
        set((state) => ({
          sessions: state.sessions.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        })),
      removeSession: (id) =>
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== id),
          activeSessionId: state.activeSessionId === id ? null : state.activeSessionId,
        })),
      setActiveSession: (id) => set({ activeSessionId: id }),

      // Messages
      messages: {},
      addMessage: (sessionId, message) =>
        set((state) => ({
          messages: {
            ...state.messages,
            [sessionId]: [...(state.messages[sessionId] || []), message],
          },
        })),
      setMessages: (sessionId, messages) =>
        set((state) => ({
          messages: { ...state.messages, [sessionId]: messages },
        })),
      clearMessages: (sessionId) =>
        set((state) => {
          const newMessages = { ...state.messages };
          delete newMessages[sessionId];
          return { messages: newMessages };
        }),
      updateMessage: (sessionId, messageId, updates) =>
        set((state) => ({
          messages: {
            ...state.messages,
            [sessionId]: state.messages[sessionId]?.map((m) =>
              m.id === messageId ? { ...m, ...updates } : m
            ) || [],
          },
        })),
      upsertMessage: (sessionId, message) =>
        set((state) => {
          const list = state.messages[sessionId] ?? [];
          const index = list.findIndex((item) => item.id === message.id);
          if (index === -1) {
            return { messages: { ...state.messages, [sessionId]: [...list, message] } };
          }
          const next = [...list];
          next[index] = { ...next[index], ...message };
          return { messages: { ...state.messages, [sessionId]: next } };
        }),
      patchMessage: (sessionId, messageId, patch) =>
        set((state) => {
          const list = state.messages[sessionId];
          if (!list) return {};
          let touched = false;
          const next = list.map((item) => {
            if (item.id !== messageId) return item;
            touched = true;
            return { ...item, ...patch(item) };
          });
          if (!touched) return {};
          return { messages: { ...state.messages, [sessionId]: next } };
        }),
      appendPart: (sessionId, messageId, kind, delta) =>
        set((state) => {
          const list = state.messages[sessionId];
          if (!list) return {};
          const index = list.findIndex((item) => item.id === messageId);
          if (index === -1) return {};

          const message = list[index];
          const parts: MessagePart[] = message.parts
            ? [...message.parts]
            : [{ type: 'text', text: message.content }];

          const partIndex = parts.findIndex((part) => part.type === kind);
          if (partIndex === -1) {
            parts.push(kind === 'reasoning' ? { type: 'reasoning', text: delta } : { type: 'text', text: delta });
          } else {
            const part = parts[partIndex];
            if (part.type === 'text' || part.type === 'reasoning') {
              parts[partIndex] = { ...part, text: part.text + delta };
            }
          }

          const content = parts
            .filter((part): part is TextPart => part.type === 'text')
            .map((part) => part.text)
            .join('');

          const next = [...list];
          next[index] = { ...message, parts, content, streaming: true };
          return { messages: { ...state.messages, [sessionId]: next } };
        }),

      // Terminal
      terminalOutput: [],
      addTerminalOutput: (output) =>
        set((state) => ({
          terminalOutput: [...state.terminalOutput.slice(-1000), output],
        })),
      clearTerminal: () => set({ terminalOutput: [] }),

      // File tree
      fileTree: [],
      setFileTree: (tree) => set({ fileTree: tree }),
      expandPath: (path) =>
        set((state) => ({
          fileTree: expandPathInTree(state.fileTree, path),
        })),
      collapsePath: (path) =>
        set((state) => ({
          fileTree: collapsePathInTree(state.fileTree, path),
        })),

      // UI
      isSidebarOpen: false,
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSidebarOpen: (open) => set({ isSidebarOpen: open }),

      // Input
      pendingInput: '',
      setPendingInput: (input) => set({ pendingInput: input }),

      // Atualizações
      updateInfo: null,
      setUpdateInfo: (info) => set({ updateInfo: info }),
    }),
    {
      name: 'opencode-remote-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        settings: state.settings,
        pairedSession: state.pairedSession,
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
        fileTree: state.fileTree,
      }),
    }
  )
);

function expandPathInTree(tree: FileNode[], path: string): FileNode[] {
  return tree.map((node) => {
    if (path.startsWith(node.path)) {
      return { ...node, children: node.children ? expandPathInTree(node.children, path) : undefined };
    }
    return node;
  });
}

function collapsePathInTree(tree: FileNode[], path: string): FileNode[] {
  return tree.map((node) => {
    if (path.startsWith(node.path)) {
      return { ...node, children: node.children ? collapsePathInTree(node.children, path) : undefined };
    }
    return node;
  });
}