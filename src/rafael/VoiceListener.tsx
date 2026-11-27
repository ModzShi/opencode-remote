import { useEffect, useRef } from 'react';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

interface VoiceListenerProps {
  active: boolean;
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (code: string) => void;
  onEnd: () => void;
}

/**
 * Ditado nativo (iOS Speech). Enquanto está ativo ocupa o microfone;
 * o MicBridge não deve rodar junto.
 */
export function VoiceListener({ active, onPartial, onFinal, onError, onEnd }: VoiceListenerProps) {
  const sink = useRef({ onPartial, onFinal, onError, onEnd });

  useEffect(() => {
    sink.current = { onPartial, onFinal, onError, onEnd };
  }, [onPartial, onFinal, onError, onEnd]);

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results?.[0]?.transcript?.trim() ?? '';
    if (!text) return;
    if (event.isFinal) sink.current.onFinal(text);
    else sink.current.onPartial(text);
  });

  useSpeechRecognitionEvent('error', (event) => {
    const code = String(event?.error ?? 'erro');
    if (code === 'no-speech' || code === 'aborted') return;
    sink.current.onError(code);
  });

  useSpeechRecognitionEvent('end', () => {
    sink.current.onEnd();
  });

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    const start = async () => {
      try {
        const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (cancelled) return;
        if (!permission.granted) {
          sink.current.onError('permission');
          return;
        }
        ExpoSpeechRecognitionModule.start({
          lang: 'pt-BR',
          interimResults: true,
          continuous: true,
          addsPunctuation: true,
          maxAlternatives: 1,
        });
      } catch {
        sink.current.onError('start');
      }
    };

    void start();

    return () => {
      cancelled = true;
      try {
        ExpoSpeechRecognitionModule.stop();
      } catch {
        // já parado
      }
    };
  }, [active]);

  return null;
}
