import { useAppStore } from '@/store';
import { PairingData } from '@/types';

type MessageHandler = (message: any) => void;

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY = 1000;

/**
 * Parse SSE (Server-Sent Events) stream.
 * Each event is separated by double newline, data lines start with "data: ".
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

  const authToken = btoa(`opencode:${token}`);
  return { baseUrl, authToken };
}

class OpenCodeSSE {
  private controller: AbortController | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private pairedSession: PairingData | null = null;
  private buffer = '';

  connect(pairingData: PairingData) {
    this.close();
    this.pairedSession = pairingData;
    useAppStore.getState().setConnectionStatus('connecting');

    // Extract token from pairingData.token (format: "baseUrl|pairingCode")
    let sseUrl = pairingData.endpoint;
    const token = pairingData.token;

    if (token && token.includes('|')) {
      const [baseUrl] = token.split('|');
      // For now, assume token was already exchanged and stored in publicKey
      // In practice, we'd exchange the code first
      sseUrl = `${baseUrl.replace(/\/+$/, '')}/api/event?auth_token=${encodeURIComponent(btoa(`opencode:${pairingData.publicKey}`))}`;
    } else if (pairingData.publicKey) {
      // Use publicKey as token for auth
      // Check if endpoint is already an SSE URL (contains /api/event)
      if (pairingData.endpoint.includes('/api/event')) {
        // Already an SSE URL, use as-is (may need to update auth_token if token changed)
        sseUrl = pairingData.endpoint;
      } else {
        // Legacy WebSocket URL, convert to SSE
        const baseUrl = pairingData.endpoint.replace(/^wss?:\/\//i, 'https://').replace(/\/+$/, '');
        sseUrl = `${baseUrl}/api/event?auth_token=${encodeURIComponent(btoa(`opencode:${pairingData.publicKey}`))}`;
      }
    }

    this.startConnection(sseUrl);
  }

  private async startConnection(url: string) {
    if (this.controller) return;
    this.controller = new AbortController();
    this.buffer = '';

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
        signal: this.controller.signal,
      });

      if (!response.ok) {
        throw new Error(`SSE connection failed: ${response.status}`);
      }

      if (this.controller?.signal.aborted) return;

      this.reconnectAttempts = 0;
      useAppStore.getState().setConnectionStatus('connected');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (this.controller?.signal.aborted) break;

        this.buffer += decoder.decode(value, { stream: true });
        const { events, remaining } = parseSSEStream(this.buffer);
        this.buffer = remaining;

        for (const event of events) {
          this.handleMessage(event.data);
        }
      }
    } catch (error) {
      if (this.controller?.signal.aborted) return;
      console.error('SSE connection error:', error);
      useAppStore.getState().setConnectionStatus('error');
      this.scheduleReconnect();
    } finally {
      this.controller = null;
    }
  }

  private handleMessage(message: any) {
    switch (message?.type) {
      case 'session_list':
        if (Array.isArray(message.sessions)) {
          useAppStore.getState().setSessions(message.sessions);
        }
        break;
      case 'session_created':
        if (message.session) {
          useAppStore.getState().addSession(message.session);
          useAppStore.getState().setActiveSession(message.session.id);
        }
        break;
      case 'message':
        if (message.sessionId && message.data) {
          useAppStore.getState().addMessage(message.sessionId, message.data);
        }
        break;
      case 'terminal_output':
        if (message.data) {
          useAppStore.getState().addTerminalOutput(message.data);
        }
        break;
      case 'file_tree':
        if (Array.isArray(message.data)) {
          useAppStore.getState().setFileTree(message.data);
        }
        break;
      case 'error':
        console.error('Server error:', message.data);
        break;
      case 'server.connected':
        // Connected event from opencode
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
          'Authorization': `Basic ${auth.authToken}`,
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
          'Authorization': `Basic ${auth.authToken}`,
        },
        body: JSON.stringify({
          title: name,
          location: workingDirectory ? { path: workingDirectory } : undefined,
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
          'Authorization': `Basic ${auth.authToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('getFileTree failed:', response.status, errorText);
      } else {
        const data = await response.json();
        // File tree will come via SSE or we can update directly
        if (data?.data) {
          useAppStore.getState().setFileTree(data.data);
        }
      }
    } catch (error) {
      console.error('getFileTree error:', error);
    }
  }

  // Legacy methods for compatibility - now use HTTP
  send(data: any) {
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
    useAppStore.getState().setConnectionStatus('disconnected');
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