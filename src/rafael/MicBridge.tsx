import { useEffect, useRef } from 'react';
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
 * Nível do microfone (dBFS -> 0..1) para o orbe reagir à voz.
 * Só é montado quando o binário tem o módulo nativo de áudio.
 */
export function MicBridge({ enabled, onLevel }: MicBridgeProps) {
  const recorder = useAudioRecorder({ ...RecordingPresets.LOW_QUALITY, isMeteringEnabled: true });
  const state = useAudioRecorderState(recorder, 100);
  const sink = useRef(onLevel);

  useEffect(() => {
    sink.current = onLevel;
  }, [onLevel]);

  useEffect(() => {
    let active = true;

    const stop = () => {
      try {
        recorder.stop();
      } catch {
        // nada a fazer
      }
      // devolve o áudio para o alto-falante (modo gravação usa o fone)
      void setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
    };

    if (!enabled) {
      stop();
      return () => {
        active = false;
      };
    }

    const start = async () => {
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
      stop();
      sink.current(0);
    };
  }, [enabled, recorder]);

  useEffect(() => {
    if (!enabled) return;
    const metering = state.metering;
    if (typeof metering !== 'number') return;
    // iOS entrega dBFS (-160..0); normaliza para 0..1
    sink.current(Math.max(0, Math.min(1, 1 + metering / 55)));
  }, [enabled, state.metering]);

  return null;
}
