export interface OpenCodeSession {
  id: string;
  name: string;
  status: 'running' | 'idle' | 'error' | 'connecting';
  workingDirectory: string;
  lastActivity: number;
  pid?: number;
}

export interface OpenCodeMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolResult?: unknown;
}

export interface OpenCodeTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface PairingData {
  sessionId: string;
  publicKey: string;
  endpoint: string;
  expiresAt: number;
}

export interface AppSettings {
  theme: 'system' | 'light' | 'dark';
  autoConnect: boolean;
  hapticsEnabled: boolean;
  fontSize: number;
  showLineNumbers: boolean;
  compactMode: boolean;
  autoScroll: boolean;
  keepAlive: boolean;
  serverUrl?: string;
}

export interface QRCodeData {
  type: 'pairing' | 'session';
  payload: PairingData;
  timestamp: number;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface TerminalOutput {
  type: 'stdout' | 'stderr' | 'system';
  data: string;
  timestamp: number;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  size?: number;
  modified?: number;
}