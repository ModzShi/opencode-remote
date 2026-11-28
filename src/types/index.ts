export interface ModelOption {
  /** provider/model — identificador único desta lista. */
  value: string;
  /** nome amigável para mostrar. */
  label: string;
  /** nome do provedor para agrupar na lista. */
  provider: string;
  /** id do provedor no servidor (ex.: 'anthropic'). */
  providerID?: string;
  /** id do modelo no servidor (ex.: 'claude-sonnet-4'). */
  modelID?: string;
  /** true quando é o modelo padrão do servidor. */
  isDefault?: boolean;
}

/** Agente do OpenCode (quem executa: build tem ferramentas, plan só lê...). */
export interface AgentOption {
  id: string;
  label: string;
  description?: string;
}

/** Pedido de permissão que o agente do PC está esperando para continuar. */
export interface PendingPermission {
  id: string;
  sessionID: string;
  action: string;
  resources: string[];
  message?: string;
  save?: string[];
}

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
  /** Voz do Fish Audio escolhida para o Rafael. */
  rafaelVoiceId?: string;
  /** Nome da voz (só para exibição). */
  rafaelVoiceName?: string;
  /** Modelo de TTS do Fish (s2.1-pro-free, s2-pro, s1...). */
  rafaelTtsModel?: string;
  /** Estilo do orbe (id do catálogo de orbes). */
  /** 'particles' (original) | 'siri' | 'mercury' */
  rafaelOrb?: string;
  rafaelColorFrom?: string;
  rafaelColorTo?: string;
  /** true = o orbe troca de cor sozinho; false = usa as duas cores escolhidas. */
  rafaelColorCycle?: boolean;
  /** Resumo falado quando a resposta é longa. */
  rafaelSummary?: 'auto' | 'full' | 'off';
  /** Velocidade da voz (1 = normal, 0.5–2.0). */
  rafaelVoiceSpeed?: number;
  /** Volume extra da voz em dB (0 = original). */
  rafaelVoiceVolume?: number;
  /** Modelo do agente escolhido no app (Rafael e chat). */
  rafaelAgentModel?: string;
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