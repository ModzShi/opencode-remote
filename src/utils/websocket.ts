import { useAppStore } from '@/store';
import { PairingData } from '@/types';
import { basicAuthHeader } from './base64';
import { buildSseEndpoint, exchangePairingCode } from './pairing';

type MessageHandler = (message: any) => void;

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY = 1000;

/**
 * Parse SSE (Server-Sent Events) stream.
 * Each event is separated by a blank line, data lines start with "data:".
 */
function parseSSEStream(buffer: string): { events: any[]; remaining: string } {
  const events: any[] = [];
  const parts = buffer.split('\n\n');
  const remaining = parts.pop() ?? '';

  for (const block of parts) {
    const lines = block.split('\n');
    let data = '';
    let eventType = 'message';
    let eventId = '';

    for (const line of lines) {
      if (line.startsWith('data:')) {
        data += line.slice(5).trim() + '\n';
      } else if (line.startsWith('event:')) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith('id:')) {
        eventId = line.slice(3).trim();
      }
    }

    if (data.trim()) {
      try {
        events.push({
          type: eventType,
          id: eventId,
          data: JSON.parse(data.trim()),
        });
      } catch {
        // Ignore non-JSON data
      }
    }
  }

  return { events, remaining };
}

/**
 * Extract base URL and auth token from paired session.
 * Returns { baseUrl, authToken } or null if not available.
 */
function getAuthInfo(pairingData: PairingData): { baseUrl: string; authToken: string } | null {
  const token = pairingData.publicKey; // token is stored in publicKey after exchange
  if (!token) return null;

  // Base URL from endpoint (convert wss:// to https://)
  let baseUrl = pairingData.endpoint;
  if (baseUrl.startsWith('wss://')) {
    baseUrl = baseUrl.replace(/^wss:\/\//i, 'https://');
  } else if (baseUrl.startsWith('ws://')) {
    baseUrl = baseUrl.replace(/^ws:\/\//i, 'http://');
  }
  // Remove /api/event?auth_token=... if present
  baseUrl = baseUrl.split('/api/event')[0];
  baseUrl = baseUrl.replace(/\/+$/, '');

  return { baseUrl, authToken: basicAuthHeader(token) };
}

class OpenCodeSSE {
  private controller: AbortController | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private pairedSession: PairingData | null = null;
  private buffer = '';

  /**
   * Conecta ao servidor opencode.
   * Se o pareamento ainda estiver no formato "baseUrl|code", troca o código
   * pelo token antes de abrir o SSE (funciona também para sessões persistidas).
   */
  async connect(pairingData: PairingData) {
    this.close();
    this.pairedSession = pairingData;
    this.reconnectAttempts = 0;

    const store = useAppStore.getState();
    store.setConnectionError(null);
    store.setConnectionStatus('connecting');

    let effective = pairingData;

    if (pairingData.token && pairingData.token.includes('|')) {
      const [baseUrl, code] = pairingData.token.split('|');
      const token = await exchangePairingCode(baseUrl, code);

      if (!token) {
        store.setConnectionError(
          'Não foi possível obter o token do servidor. O QR expira em 5 min — rode "opencode pair --remote" de novo.'
        );
        store.setConnectionStatus('error');
        return;
      }

      effective = {
        ...pairingData,
        endpoint: buildSseEndpoint(baseUrl, token),
        publicKey: token,
        token: undefined,
      };
      this.pairedSession = effective;
      // Persiste o token já trocado para não reutilizar o código de uso único.
      useAppStore.getState().setPairedSession(effective);
    }

    this.startConnection(effective.endpoint);
  }

  private async startConnection(url: string) {
    if (this.controller) return;
    this.controller = new AbortController();
    this.buffer = '';

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
        signal: this.controller.signal,
      });

      if (!response.ok) {
        let detail = '';
        try {
          detail = (await response.text()).slice(0, 140);
        } catch {
          // ignore
        }
        throw new Error(`HTTP ${response.status}${detail ? ` — ${detail}` : ''}`);
      }

      if (this.controller?.signal.aborted) return;

      this.reconnectAttempts = 0;
      useAppStore.getState().setConnectionError(null);
      useAppStore.getState().setConnectionStatus('connected');

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Streaming indisponível neste build (response.body vazio)');
      }

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (this.controller?.signal.aborted) break;

        this.buffer += decoder.decode(value, { stream: true });
        this.buffer = this.buffer.replace(/\r\n/g, '\n');
        const { events, remaining } = parseSSEStream(this.buffer);
        this.buffer = remaining;

        for (const event of events) {
          this.handleMessage(event.data);
        }
      }

      if (!this.controller?.signal.aborted) {
        throw new Error('Conexão encerrada pelo servidor');
      }
    } catch (error: any) {
      if (this.controller?.signal.aborted) return;
      const message = error?.message ? String(error.message) : 'Falha de rede';
      console.error('SSE connection error:', message);
      useAppStore.getState().setConnectionError(message);
      useAppStore.getState().setConnectionStatus('error');
      this.scheduleReconnect();
    } finally {
      this.controller = null;
    }
  }

  private handleMessage(message: any) {
    const store = useAppStore.getState();

    switch (message?.type) {
      case 'server.connected':
        store.setConnectionStatus('connected');
        break;

      case 'session.created': {
        const d = message.data;
        if (d?.sessionID) {
          store.addSession({
            id: d.sessionID,
            name: d.title ?? 'Nova sessão',
            status: 'idle',
            workingDirectory: d.location?.directory ?? '',
            lastActivity: d.time?.updated ?? Date.now(),
          });
        }
        break;
      }

      case 'session.renamed': {
        const d = message.data;
        if (d?.sessionID && d?.title) {
          store.updateSession(d.sessionID, { name: d.title });
        }
        break;
      }

      case 'session.deleted':
        if (message.data?.sessionID) {
          store.removeSession(message.data.sessionID);
        }
        break;

      case 'session.message.content.updated':
        if (message.data?.sessionID) {
          store.addMessage(message.data.sessionID, message.data);
        }
        break;

      case 'session.execution.failed':
        store.setConnectionError(
          message.data?.error?.message ?? 'A execução falhou no servidor'
        );
        break;

      case 'session.tool.success':
        if (message.data) {
          store.addTerminalOutput({
            type: 'stdout',
            data: typeof message.data === 'string' ? message.data : JSON.stringify(message.data),
            timestamp: Date.now(),
          });
        }
        break;

      case 'session.tool.failed':
        console.error('Tool failed:', message.data);
        break;

      default:
        break;
    }

    this.messageHandlers.forEach((handler) => handler(message));
  }

  private scheduleReconnect() {
    if (!this.pairedSession) return;

    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      useAppStore.getState().setConnectionStatus('error');
      return;
    }

    const delay = RECONNECT_BASE_DELAY * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts += 1;

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.pairedSession) {
        this.connect(this.pairedSession);
      }
    }, delay);
  }

  /**
   * Send a prompt/message to a session via HTTP POST.
   * Uses /api/session/:sessionID/prompt endpoint.
   */
  async sendCommand(command: string, sessionId: string) {
    const auth = this.pairedSession ? getAuthInfo(this.pairedSession) : null;
    if (!auth) {
      console.error('No auth info available for sendCommand');
      return;
    }

    try {
      const response = await fetch(`${auth.baseUrl}/api/session/${sessionId}/prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth.authToken}`,
        },
        body: JSON.stringify({
          text: command,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('sendCommand failed:', response.status, errorText);
      }
    } catch (error) {
      console.error('sendCommand error:', error);
    }
  }

  /**
   * Create a new session via HTTP POST.
   * Uses /api/session endpoint.
   */
  async createSession(name: string, workingDirectory: string) {
    const auth = this.pairedSession ? getAuthInfo(this.pairedSession) : null;
    if (!auth) {
      console.error('No auth info available for createSession');
      return;
    }

    try {
      const response = await fetch(`${auth.baseUrl}/api/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth.authToken}`,
        },
        body: JSON.stringify({
          title: name,
          location: workingDirectory ? { directory: workingDirectory } : undefined,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('createSession failed:', response.status, errorText);
      } else {
        const data = await response.json();
        // Session created event will come via SSE
        console.log('Session created:', data);
      }
    } catch (error) {
      console.error('createSession error:', error);
    }
  }

  /**
   * Get file tree via HTTP GET.
   * Uses /api/fs/list endpoint.
   */
  async getFileTree(path: string) {
    const auth = this.pairedSession ? getAuthInfo(this.pairedSession) : null;
    if (!auth) {
      console.error('No auth info available for getFileTree');
      return;
    }

    try {
      const response = await fetch(`${auth.baseUrl}/api/fs/list?path=${encodeURIComponent(path)}`, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${auth.authToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('getFileTree failed:', response.status, errorText);
      } else {
        const data = await response.json();
        if (data?.data) {
          useAppStore.getState().setFileTree(data.data);
        }
      }
    } catch (error) {
      console.error('getFileTree error:', error);
    }
  }

  // Legacy methods for compatibility - now use HTTP
  send(_data: any) {
    console.warn('send() is deprecated, use specific methods');
  }

  onMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  disconnect() {
    this.pairedSession = null;
    this.reconnectAttempts = 0;
    this.close();
    const store = useAppStore.getState();
    store.setConnectionError(null);
    store.setConnectionStatus('disconnected');
  }

  private close() {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.buffer = '';
  }

  get readyState() {
    return this.controller ? 1 : 3; // OPEN : CLOSED
  }
}

export const websocket = new OpenCodeSSE();
