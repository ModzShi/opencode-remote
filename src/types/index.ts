export interface OpenCodeSession {
  id: string;
  name: string;
  status: 'running' | 'idle' | 'error' | 'connecting';
  workingDirectory: string;
  lastActivity: number;
  pid?: number;
  model?: string;
  agent?: string;
  cost?: number;
  tokens?: { input: number; output: number; reasoning?: number };
}

export interface ReasoningPart {
  type: 'reasoning';
  text: string;
}

export interface TextPart {
  type: 'text';
  text: string;
}

export interface ToolPart {
  type: 'tool';
  name: string;
  status: 'running' | 'done' | 'error';
  input?: string;
  output?: string;
}

export type MessagePart = TextPart | ReasoningPart | ToolPart;

export interface OpenCodeMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  /** Texto principal (mantido para compatibilidade com telas antigas). */
  content: string;
  timestamp: number;
  parts?: MessagePart[];
  streaming?: boolean;
  error?: string;
  model?: string;
  agent?: string;
  cost?: number;
  tokens?: { input: number; output: number; reasoning?: number };
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
  /** Server auth token obtained from /auth/connect/{code} */
  token?: string;
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