import { useEffect } from 'react';
import { useAppStore } from '@/store';
import { websocket } from '@/utils/websocket';

export function useWebSocket() {
  const pairedSession = useAppStore((state) => state.pairedSession);
  const connectionStatus = useAppStore((state) => state.connectionStatus);

  useEffect(() => {
    if (!pairedSession) {
      // Não derruba uma conexão que está sendo aberta (troca de token em andamento).
      if (connectionStatus !== 'connecting') {
        websocket.disconnect();
      }
      return;
    }

    if (connectionStatus === 'disconnected') {
      websocket.connect(pairedSession);
    }
  }, [pairedSession, connectionStatus]);

  const sendCommand = (command: string) => {
    const { activeSessionId } = useAppStore.getState();
    if (activeSessionId) {
      websocket.sendCommand(command, activeSessionId);
    }
  };

  const createSession = () => websocket.createSession();

  return {
    sendCommand,
    createSession,
    isConnected: connectionStatus === 'connected',
    connectionStatus,
  };
}

/** Mantém o WebSocket vivo durante todo o ciclo de vida do app. */
export function ConnectionManager() {
  useWebSocket();
  return null;
}
