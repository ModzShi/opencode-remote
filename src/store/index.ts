import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings, OpenCodeSession, OpenCodeMessage, ConnectionStatus, PairingData, TerminalOutput, FileNode } from '@/types';

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
        set((state) => ({
          sessions: [...state.sessions, session],
        })),
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