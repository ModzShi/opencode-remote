import { useEffect } from 'react';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

interface MicBridgeProps {
  enabled: boolean;
  onLevel: (level: number) => void;
}

/**
 * Captura o nível do microfone (dBFS -> 0..1) para o orbe reagir à voz.
 * Só é montado quando o binário tem o módulo nativo de áudio.
 */
export function MicBridge({ enabled, onLevel }: MicBridgeProps) {
  const recorder = useAudioRecorder({ ...RecordingPresets.LOW_QUALITY, isMeteringEnabled: true });
  const state = useAudioRecorderState(recorder, 80);

  useEffect(() => {
    let active = true;

    const start = async () => {
      if (!enabled) return;
      try {
        const permission = await requestRecordingPermissionsAsync();
        if (!active || !permission.granted) return;
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
        if (!active) return;
        recorder.record();
      } catch {
        // sem permissão ou sem microfone: o orbe segue no modo procedural
      }
    };

    void start();

    return () => {
      active = false;
      try {
        recorder.stop();
      } catch {
        // nada a fazer
      }
      onLevel(0);
    };
  }, [enabled, recorder, onLevel]);

  useEffect(() => {
    if (!enabled) return;
    const metering = state.metering;
    if (typeof metering !== 'number') return;
    // iOS entrega dBFS (-160..0); normaliza para 0..1
    onLevel(Math.max(0, Math.min(1, 1 + metering / 55)));
  }, [enabled, onLevel, state.metering]);

  return null;
}
