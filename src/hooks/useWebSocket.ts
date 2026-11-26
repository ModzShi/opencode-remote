import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store';
import { websocket } from '@/utils/websocket';

export function useWebSocket() {
  const { pairedSession, connectionStatus, setConnectionStatus } = useAppStore();
  const initialized = useRef(false);

  useEffect(() => {
    if (pairedSession && connectionStatus !== 'connected' && connectionStatus !== 'connecting' && !initialized.current) {
      initialized.current = true;
      websocket.connect(pairedSession);
    }

    if (!pairedSession) {
      websocket.disconnect();
      initialized.current = false;
    }

    return () => {
      // Don't disconnect on unmount - keep connection alive
    };
  }, [pairedSession, connectionStatus]);

  const sendCommand = (command: string) => {
    const { activeSessionId } = useAppStore.getState();
    if (activeSessionId) {
      websocket.sendCommand(command, activeSessionId);
    }
  };

  const createSession = (name: string, workingDirectory: string) => {
    websocket.createSession(name, workingDirectory);
  };

  return {
    sendCommand,
    createSession,
    isConnected: connectionStatus === 'connected',
    connectionStatus,
  };
}