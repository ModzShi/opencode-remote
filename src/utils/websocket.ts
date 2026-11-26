import { useAppStore } from '@/store';
import { OpenCodeMessage, PairingData } from '@/types';

type MessageHandler = (message: any) => void;

class OpenCodeWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageHandlers: Set<MessageHandler> = new Set();
  private pairedSession: PairingData | null = null;
  private keepAliveInterval: ReturnType<typeof setInterval> | null = null;

  connect(pairingData: PairingData) {
    this.pairedSession = pairingData;
    this.reconnectAttempts = 0;
    
    try {
      this.ws = new WebSocket(pairingData.endpoint);
      this.setupEventHandlers();
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.scheduleReconnect();
    }
  }

  private setupEventHandlers() {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      useAppStore.getState().setConnectionStatus('connected');
      
      // Send authentication
      this.send({
        type: 'auth',
        sessionId: this.pairedSession?.sessionId,
        publicKey: this.pairedSession?.publicKey,
      });

      // Start keep-alive
      this.startKeepAlive();
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      this.stopKeepAlive();
      useAppStore.getState().setConnectionStatus('disconnected');
      
      if (event.code !== 1000) { // Not a clean close
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      useAppStore.getState().setConnectionStatus('error');
    };
  }

  private handleMessage(message: any) {
    switch (message.type) {
      case 'session_list':
        useAppStore.getState().setSessions(message.sessions);
        break;
      case 'session_created':
        useAppStore.getState().addSession(message.session);
        useAppStore.getState().setActiveSession(message.session.id);
        break;
      case 'message':
        useAppStore.getState().addMessage(message.sessionId, message.data);
        break;
      case 'terminal_output':
        useAppStore.getState().addTerminalOutput(message.data);
        break;
      case 'file_tree':
        useAppStore.getState().setFileTree(message.data);
        break;
      case 'error':
        console.error('Server error:', message.data);
        break;
      case 'pong':
        // Keep-alive response
        break;
      default:
        console.log('Unknown message type:', message.type);
    }

    // Notify all handlers
    this.messageHandlers.forEach(handler => handler(message));
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    useAppStore.getState().setConnectionStatus('reconnecting');
    
    setTimeout(() => {
      if (this.pairedSession) {
        this.connect(this.pairedSession);
      }
    }, delay);
  }

  private startKeepAlive() {
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
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.pairedSession = null;
    this.reconnectAttempts = 0;
  }

  get readyState() {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }
}

export const websocket = new OpenCodeWebSocket();