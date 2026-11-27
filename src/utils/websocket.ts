import { useAppStore } from '@/store';
import { pushEnergy } from '@/rafael/signal';
import { MessagePart, OpenCodeMessage, OpenCodeSession, PairingData } from '@/types';
import { basicAuthHeader } from './base64';
import { buildSseEndpoint, exchangePairingCode } from './pairing';

type MessageHandler = (message: any) => void;

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY = 1000;
const CONNECT_TIMEOUT = 15000;

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
  private xhr: XMLHttpRequest | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private pairedSession: PairingData | null = null;
  private buffer = '';
  private generation = 0;
  private pending = new Map<string, { sessionId: string; messageId: string; kind: 'text' | 'reasoning'; text: string }>();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Conecta ao servidor opencode.
   * Se o pareamento ainda estiver no formato "baseUrl|code", troca o código
   * pelo token antes de abrir o SSE (funciona também para sessões persistidas).
   * Resolve `true` quando o stream abriu; `false` quando falhou.
   */
  async connect(pairingData: PairingData): Promise<boolean> {
    this.close();
    this.generation += 1;
    const generation = this.generation;
    this.pairedSession = pairingData;
    this.reconnectAttempts = 0;

    const store = useAppStore.getState();
    store.setConnectionError(null);
    store.setConnectionStatus('connecting');

    let effective = pairingData;

    if (pairingData.token && pairingData.token.includes('|')) {
      const [baseUrl, code] = pairingData.token.split('|');
      const token = await exchangePairingCode(baseUrl, code);

      // Outra conexão começou enquanto o token era trocado.
      if (generation !== this.generation) return false;

      if (!token) {
        store.setConnectionError(
          'Não foi possível obter o token. O link do QR expira em 5 min e só funciona uma vez — rode "opencode pair --remote" de novo.'
        );
        store.setConnectionStatus('error');
        return false;
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

    const opened = await this.startConnection(effective.endpoint);
    if (opened) {
      void this.fetchSessions();
    }
    return opened;
  }

  /**
   * Abre o stream SSE via XMLHttpRequest (o fetch do RN não expõe response.body).
   * Resolve quando o servidor responde 2xx; segue lendo em background.
   */
  private startConnection(url: string): Promise<boolean> {
    this.closeStream();

    const generation = this.generation;

    return new Promise<boolean>((resolve) => {
      let settled = false;
      let connected = false;
      let offset = 0;

      const resolveOnce = (ok: boolean) => {
        if (settled) return;
        settled = true;
        resolve(ok);
      };

      const markConnected = () => {
        if (connected) return;
        connected = true;
        this.reconnectAttempts = 0;
        const store = useAppStore.getState();
        store.setConnectionError(null);
        store.setConnectionStatus('connected');
      };

      const handleDrop = (message: string) => {
        if (generation !== this.generation) return;
        const store = useAppStore.getState();
        store.setConnectionError(message);
        store.setConnectionStatus('error');
        this.scheduleReconnect();
      };

      const pump = () => {
        if (generation !== this.generation) return;
        const text = this.xhr?.responseText ?? '';
        if (text.length <= offset) return;
        const chunk = text.slice(offset);
        offset = text.length;
        this.consume(chunk);
      };

      const timer = setTimeout(() => {
        if (generation !== this.generation) return;
        if (settled) return;
        resolveOnce(false);
        handleDrop('Tempo esgotado ao abrir o stream. Verifique a rede e o link do QR.');
        this.closeStream();
      }, CONNECT_TIMEOUT);

      const xhr = new XMLHttpRequest();
      this.xhr = xhr;

      xhr.onreadystatechange = () => {
        if (generation !== this.generation) return;
        if (xhr.readyState < 2) return;
        if (xhr.status >= 200 && xhr.status < 300) {
          clearTimeout(timer);
          resolveOnce(true);
          markConnected();
        } else if (xhr.status >= 400) {
          let detail = '';
          try {
            detail = String(xhr.responseText ?? '').slice(0, 160);
          } catch {
            // ignore
          }
          clearTimeout(timer);
          resolveOnce(false);
          handleDrop(`HTTP ${xhr.status}${detail ? ` — ${detail}` : ''}`);
        }
      };

      xhr.onprogress = () => {
        if (generation !== this.generation) return;
        if (xhr.status >= 200 && xhr.status < 300) {
          clearTimeout(timer);
          resolveOnce(true);
          markConnected();
          pump();
        }
      };

      xhr.onload = () => {
        if (generation !== this.generation) return;
        clearTimeout(timer);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolveOnce(true);
          pump();
          handleDrop('Conexão encerrada pelo servidor.');
        } else {
          resolveOnce(false);
          handleDrop(`HTTP ${xhr.status}`);
        }
      };

      xhr.onerror = () => {
        if (generation !== this.generation) return;
        clearTimeout(timer);
        resolveOnce(false);
        handleDrop('Falha de rede ao abrir o stream.');
      };

      xhr.ontimeout = () => {
        if (generation !== this.generation) return;
        clearTimeout(timer);
        resolveOnce(false);
        handleDrop('Timeout na conexão.');
      };

      try {
        xhr.open('GET', url);
        xhr.setRequestHeader('Accept', 'text/event-stream');
        xhr.setRequestHeader('Cache-Control', 'no-cache');
        xhr.send();
      } catch (error: any) {
        clearTimeout(timer);
        resolveOnce(false);
        handleDrop(error?.message ? String(error.message) : 'Não foi possível abrir a conexão.');
      }
    });
  }

  private consume(chunk: string) {
    this.buffer = (this.buffer + chunk).replace(/\r\n/g, '\n');
    const { events, remaining } = parseSSEStream(this.buffer);
    this.buffer = remaining;

    for (const event of events) {
      this.handleMessage(event.data);
    }
  }

  private handleMessage(message: any) {
    const store = useAppStore.getState();
    const data = message?.data ?? {};
    const sessionId: string | undefined = data.sessionID;
    const created: number = message?.created ?? Date.now();

    switch (message?.type) {
      case 'server.connected':
        store.setConnectionStatus('connected');
        break;

      case 'session.created': {
        const session = data.session ?? data.info;
        if (session?.id) {
          store.addSession({
            id: session.id,
            name: session.title ?? 'Nova sessão',
            status: 'idle',
            workingDirectory: session.location?.directory ?? '',
            lastActivity: session.time?.updated ?? created,
          });
        }
        break;
      }

      case 'session.renamed':
        if (sessionId && data.title) {
          store.updateSession(sessionId, { name: data.title, lastActivity: created });
        }
        break;

      case 'session.deleted':
        if (sessionId) store.removeSession(sessionId);
        break;

      case 'session.inbox.enqueued': {
        const item = data.item;
        const text = item?.payload?.text;
        if (sessionId && item?.type === 'user' && typeof text === 'string') {
          store.upsertMessage(sessionId, {
            id: data.inboxID ?? `user_${created}`,
            sessionId,
            role: 'user',
            content: text,
            timestamp: created,
            parts: [{ type: 'text', text }],
          });
          store.updateSession(sessionId, { lastActivity: created });
        }
        break;
      }

      case 'session.execution.started':
        if (sessionId) store.updateSession(sessionId, { status: 'running', lastActivity: created });
        break;

      case 'session.execution.succeeded':
        if (sessionId) store.updateSession(sessionId, { status: 'idle', lastActivity: created });
        break;

      case 'session.execution.failed':
        if (sessionId) {
          store.updateSession(sessionId, { status: 'error' });
          const messageId = data.assistantMessageID;
          if (messageId) {
            store.patchMessage(sessionId, messageId, () => ({
              streaming: false,
              error: data.error?.message ?? data.message ?? 'A execução falhou no servidor.',
            }));
          }
        }
        break;

      case 'session.step.started':
        if (sessionId && data.assistantMessageID) {
          this.ensureAssistant(sessionId, data.assistantMessageID, created, {
            model: data.model?.id,
            agent: data.agent,
          });
        }
        break;

      case 'session.step.ended':
        if (sessionId && data.assistantMessageID) {
          this.flushPending();
          store.patchMessage(sessionId, data.assistantMessageID, () => ({
            streaming: false,
            tokens: data.tokens,
            cost: data.cost,
          }));
        }
        break;

      case 'session.text.started':
        if (sessionId && data.assistantMessageID) {
          this.ensureAssistant(sessionId, data.assistantMessageID, created);
          store.patchMessage(sessionId, data.assistantMessageID, () => ({ streaming: true }));
        }
        break;

      case 'session.text.delta':
        if (sessionId && data.assistantMessageID && typeof data.delta === 'string') {
          this.ensureAssistant(sessionId, data.assistantMessageID, created);
          this.queueDelta(sessionId, data.assistantMessageID, 'text', data.delta);
          pushEnergy(data.delta.length);
        }
        break;

      case 'session.text.ended':
        if (sessionId && data.assistantMessageID) {
          this.flushPending();
          const finalText = typeof data.text === 'string' ? data.text : null;
          store.patchMessage(sessionId, data.assistantMessageID, (current) => {
            if (finalText === null) return { streaming: false };
            const others = (current.parts ?? []).filter((part) => part.type !== 'text');
            return {
              streaming: false,
              content: finalText,
              parts: [...others, { type: 'text', text: finalText }],
            };
          });
        }
        break;

      case 'session.reasoning.delta':
        if (sessionId && data.assistantMessageID && typeof data.delta === 'string') {
          this.ensureAssistant(sessionId, data.assistantMessageID, created);
          this.queueDelta(sessionId, data.assistantMessageID, 'reasoning', data.delta);
          pushEnergy(data.delta.length * 0.35);
        }
        break;

      case 'session.reasoning.ended':
        if (sessionId && data.assistantMessageID && typeof data.text === 'string') {
          this.flushPending();
          store.patchMessage(sessionId, data.assistantMessageID, (current) => {
            const parts = [...(current.parts ?? [])];
            const index = parts.findIndex((part) => part.type === 'reasoning');
            const reasoning = { type: 'reasoning' as const, text: data.text as string };
            if (index === -1) parts.unshift(reasoning);
            else parts[index] = reasoning;
            return { parts };
          });
        }
        break;

      case 'session.usage.updated':
        if (sessionId) {
          store.updateSession(sessionId, { cost: data.cost, tokens: data.tokens });
        }
        break;

      case 'session.tool.started':
      case 'session.tool.updated':
      case 'session.tool.ended':
      case 'session.tool.succeeded':
      case 'session.tool.failed': {
        if (!sessionId) break;
        const messageId = data.assistantMessageID;
        const tool = data.tool ?? data.name ?? 'tool';
        if (!messageId) {
          store.addTerminalOutput({
            type: 'stdout',
            data: typeof data === 'string' ? data : JSON.stringify(data),
            timestamp: created,
          });
          break;
        }
        const status: 'running' | 'done' | 'error' =
          message?.type === 'session.tool.failed'
            ? 'error'
            : message?.type === 'session.tool.ended' || message?.type === 'session.tool.succeeded'
              ? 'done'
              : 'running';
        this.ensureAssistant(sessionId, messageId, created);
        store.patchMessage(sessionId, messageId, (current) => {
          const parts = [...(current.parts ?? [])];
          const index = parts.findIndex((part) => part.type === 'tool' && part.name === tool);
          const part = {
            type: 'tool' as const,
            name: String(tool),
            status,
            input: data.input ? JSON.stringify(data.input).slice(0, 2000) : undefined,
            output: data.output ?? data.result
              ? String(typeof (data.output ?? data.result) === 'string' ? data.output ?? data.result : JSON.stringify(data.output ?? data.result)).slice(0, 4000)
              : undefined,
          };
          if (index === -1) parts.push(part);
          else parts[index] = { ...parts[index], ...part };
          return { parts };
        });
        break;
      }

      default:
        break;
    }

    this.messageHandlers.forEach((handler) => handler(message));
  }

  /** Garante que a mensagem do assistente existe antes de receber deltas. */
  private ensureAssistant(
    sessionId: string,
    messageId: string,
    created: number,
    extra?: { model?: string; agent?: string }
  ) {
    const state = useAppStore.getState();
    const exists = state.messages[sessionId]?.some((item) => item.id === messageId);
    if (exists) return;

    state.upsertMessage(sessionId, {
      id: messageId,
      sessionId,
      role: 'assistant',
      content: '',
      timestamp: created,
      parts: [],
      streaming: true,
      model: extra?.model,
      agent: extra?.agent,
    });
  }

  /** Agrupa deltas de streaming para não re-renderizar a cada token. */
  private queueDelta(
    sessionId: string,
    messageId: string,
    kind: 'text' | 'reasoning',
    delta: string
  ) {
    const key = `${sessionId}|${messageId}|${kind}`;
    const pending = this.pending.get(key);
    if (pending) pending.text += delta;
    else this.pending.set(key, { sessionId, messageId, kind, text: delta });

    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => this.flushPending(), 56);
  }

  private flushPending() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.pending.size === 0) return;

    const batch = [...this.pending.values()];
    this.pending.clear();
    const store = useAppStore.getState();

    for (const item of batch) {
      store.appendPart(item.sessionId, item.messageId, item.kind, item.text);
    }
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
        void this.connect(this.pairedSession);
      }
    }, delay);
  }

  private async request(path: string, init?: RequestInit): Promise<any | null> {
    const auth = this.pairedSession ? getAuthInfo(this.pairedSession) : null;
    if (!auth) return null;

    try {
      const response = await fetch(`${auth.baseUrl}${path}`, {
        ...init,
        headers: {
          ...(init?.headers as Record<string, string> | undefined),
          Authorization: `Basic ${auth.authToken}`,
        },
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        console.error(`[opencode] ${init?.method ?? 'GET'} ${path} → ${response.status}`, detail.slice(0, 200));
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error(`[opencode] ${init?.method ?? 'GET'} ${path} falhou:`, error);
      return null;
    }
  }

  /** Lista as sessões do servidor e ativa a mais recente. */
  async fetchSessions(): Promise<void> {
    const payload = await this.request('/api/session');
    if (!payload) return;

    const raw = Array.isArray(payload.data) ? payload.data : Array.isArray(payload) ? payload : [];

    const sessions: OpenCodeSession[] = raw
      .filter((item: any) => item && typeof item.id === 'string')
      .map((item: any) => ({
        id: item.id as string,
        name: (item.title as string) ?? 'Sessão sem título',
        status: 'idle' as const,
        workingDirectory: item.location?.directory ?? '',
        lastActivity: item.time?.updated ?? Date.now(),
      }))
      .sort((a: OpenCodeSession, b: OpenCodeSession) => b.lastActivity - a.lastActivity);

    const store = useAppStore.getState();
    store.setSessions(sessions);

    const current = store.activeSessionId;
    const stillExists = current ? sessions.some((item) => item.id === current) : false;

    if (!stillExists && sessions.length > 0) {
      store.setActiveSession(sessions[0].id);
      void this.fetchMessages(sessions[0].id);
    } else if (stillExists && current) {
      void this.fetchMessages(current);
    }
  }

  /** Carrega o histórico real: { data: [{ type: 'user' | 'assistant' | 'idle' }] }. */
  async fetchMessages(sessionId: string): Promise<void> {
    const payload = await this.request(`/api/session/${sessionId}/message`);
    if (!payload) return;

    const raw: any[] = Array.isArray(payload.data) ? payload.data : [];
    const messages: OpenCodeMessage[] = [];

    for (const item of raw) {
      if (!item || typeof item.id !== 'string' || item.type === 'idle') continue;
      const timestamp: number = item.time?.created ?? Date.now();

      if (item.type === 'user') {
        const text = typeof item.text === 'string' ? item.text : '';
        if (!text) continue;
        messages.push({
          id: item.id,
          sessionId,
          role: 'user',
          content: text,
          timestamp,
          parts: [{ type: 'text', text }],
        });
        continue;
      }

      if (item.type !== 'assistant') continue;

      const parts: MessagePart[] = [];
      for (const part of Array.isArray(item.content) ? item.content : []) {
        if (!part) continue;
        if (part.type === 'text' && typeof part.text === 'string' && part.text.trim()) {
          parts.push({ type: 'text', text: part.text });
        } else if (part.type === 'reasoning' && typeof part.text === 'string' && part.text.trim()) {
          parts.push({ type: 'reasoning', text: part.text });
        } else if (part.type === 'tool') {
          parts.push({
            type: 'tool',
            name: String(part.tool ?? part.name ?? 'tool'),
            status: 'done',
            input: part.state?.input ? JSON.stringify(part.state.input) : undefined,
            output: part.state?.output ? String(part.state.output).slice(0, 4000) : undefined,
          });
        }
      }

      const content = parts
        .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
        .map((part) => part.text)
        .join('\n');

      messages.push({
        id: item.id,
        sessionId,
        role: 'assistant',
        content,
        timestamp,
        parts,
        streaming: false,
        model: item.model?.id,
        agent: item.agent,
        cost: item.cost,
        tokens: item.tokens,
        error: item.error?.message,
      });
    }

    messages.sort((a, b) => a.timestamp - b.timestamp);
    useAppStore.getState().setMessages(sessionId, messages);
  }

  /**
   * Send a prompt/message to a session via HTTP POST.
   * Uses /api/session/:sessionID/prompt endpoint (body: { text }).
   */
  async sendCommand(command: string, sessionId: string, model?: string): Promise<boolean> {
    if (!sessionId) return false;

    const payload = await this.request(`/api/session/${sessionId}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(model ? { text: command, model } : { text: command }),
    });

    return payload !== null;
  }

  /**
   * Create a new session via HTTP POST.
   * Uses /api/session endpoint.
   */
  /** Troca o agente ativo da sessão (ex.: 'rafael'). */
  async setSessionAgent(sessionId: string, agent: string): Promise<boolean> {
    if (!sessionId) return false;
    const payload = await this.request(`/api/session/${sessionId}/agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent }),
    });
    return payload !== null;
  }

  async createSession(): Promise<string | null> {
    const payload = await this.request('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });

    const created = payload?.data;
    if (!created || typeof created.id !== 'string') return null;

    const store = useAppStore.getState();
    store.addSession({
      id: created.id,
      name: created.title ?? 'Nova sessão',
      status: 'idle',
      workingDirectory: created.location?.directory ?? '',
      lastActivity: created.time?.updated ?? Date.now(),
    });
    store.setActiveSession(created.id);
    store.setMessages(created.id, []);
    void this.fetchSessions();
    return created.id;
  }

  /**
   * Get file tree via HTTP GET.
   * Uses /api/fs/list endpoint.
   */
  async getFileTree(path: string): Promise<void> {
    const payload = await this.request(`/api/fs/list?path=${encodeURIComponent(path)}`);
    if (payload?.data) {
      useAppStore.getState().setFileTree(payload.data);
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

  private closeStream() {
    const xhr = this.xhr;
    this.xhr = null;
    this.buffer = '';

    if (!xhr) return;

    xhr.onreadystatechange = null;
    xhr.onprogress = null;
    xhr.onload = null;
    xhr.onerror = null;
    xhr.ontimeout = null;

    try {
      xhr.abort();
    } catch {
      // ignore
    }
  }

  private close() {
    this.generation += 1;
    this.closeStream();
    this.pending.clear();
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  get readyState() {
    return this.xhr ? 1 : 3; // OPEN : CLOSED
  }
}

export const websocket = new OpenCodeSSE();