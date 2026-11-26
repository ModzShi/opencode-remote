import { useAppStore } from '@/store';
import { PairingData } from '@/types';

type MessageHandler = (message: any) => void;

const CONNECT_TIMEOUT_MS = 8000;
const MAX_RECONNECT_ATTEMPTS = 5;

class OpenCodeWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectDelay = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private pairedSession: PairingData | null = null;
  private keepAliveInterval: ReturnType<typeof setInterval> | null = null;

  connect(pairingData: PairingData) {
    this.closeSocket();
    this.pairedSession = pairingData;
    useAppStore.getState().setConnectionStatus('connecting');

    let socket: WebSocket;
    try {
      socket = new WebSocket(pairingData.endpoint);
    } catch (error) {
      console.error('WebSocket connection error:', error);
      useAppStore.getState().setConnectionStatus('error');
      this.scheduleReconnect();
      return;
    }

    this.ws = socket;

    const timeout = setTimeout(() => {
      if (this.ws !== socket || socket.readyState === WebSocket.OPEN) return;
      useAppStore.getState().setConnectionStatus('error');
      try {
        socket.close();
      } catch {
        // ignore
      }
    }, CONNECT_TIMEOUT_MS);

    socket.onopen = () => {
      if (this.ws !== socket) return;
      clearTimeout(timeout);
      this.reconnectAttempts = 0;
      useAppStore.getState().setConnectionStatus('connected');

      this.send({
        type: 'auth',
        sessionId: this.pairedSession?.sessionId,
        publicKey: this.pairedSession?.publicKey,
      });

      this.startKeepAlive();
    };

    socket.onmessage = (event) => {
      if (this.ws !== socket) return;
      try {
        this.handleMessage(JSON.parse(event.data));
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    socket.onerror = () => {
      if (this.ws !== socket) return;
      clearTimeout(timeout);
      useAppStore.getState().setConnectionStatus('error');
    };

    socket.onclose = (event) => {
      if (this.ws !== socket) return;
      clearTimeout(timeout);
      this.stopKeepAlive();
      this.ws = null;

      if (event.code === 1000) {
        useAppStore.getState().setConnectionStatus('disconnected');
        return;
      }

      useAppStore.getState().setConnectionStatus('error');
      this.scheduleReconnect();
    };
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
      case 'pong':
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

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts += 1;

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.pairedSession) {
        this.connect(this.pairedSession);
      }
    }, delay);
  }

  private startKeepAlive() {
    this.stopKeepAlive();
    this.keepAliveInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, 30000);
  }

  private stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  sendCommand(command: string, sessionId: string) {
    this.send({
      type: 'command',
      sessionId,
      command,
    });
  }

  createSession(name: string, workingDirectory: string) {
    this.send({
      type: 'create_session',
      name,
      workingDirectory,
    });
  }

  getFileTree(path: string) {
    this.send({
      type: 'get_file_tree',
      path,
    });
  }

  onMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  disconnect() {
    this.stopKeepAlive();
    this.pairedSession = null;
    this.reconnectAttempts = 0;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const socket = this.ws;
    this.ws = null;

    if (socket) {
      try {
        socket.close(1000, 'Client disconnect');
      } catch {
        // ignore
      }
    }

    useAppStore.getState().setConnectionStatus('disconnected');
  }

  private closeSocket() {
    const socket = this.ws;
    this.ws = null;
    if (socket) {
      try {
        socket.close(1000, 'Reconnecting');
      } catch {
        // ignore
      }
    }
  }

  get readyState() {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }
}

export const websocket = new OpenCodeWebSocket();
