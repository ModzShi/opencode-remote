import { useEffect, useRef } from 'react';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

interface VoiceListenerProps {
  active: boolean;
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (code: string) => void;
  onEnd: () => void;
}

/** Silêncio que encerra a fala: mais longo enquanto a frase está em aberto. */
const SILENCE_AFTER_INTERIM = 1600;
const SILENCE_AFTER_FINAL = 900;
const SILENCE_AFTER_SPEECH_END = 800;

/**
 * Ditado nativo (iOS Speech) com detecção de fim de fala própria:
 * o reconhecedor não é a única fonte do 'acabou', então pausas curtas não
 * cortam a frase e uma pausa longa encerra sozinha, sem toque no orbe.
 */
export function VoiceListener({ active, onPartial, onFinal, onError, onEnd }: VoiceListenerProps) {
  const sink = useRef({ onPartial, onFinal, onError, onEnd });
  const session = useRef({ text: '', timer: null as ReturnType<typeof setTimeout> | null, done: true });

  useEffect(() => {
    sink.current = { onPartial, onFinal, onError, onEnd };
  }, [onPartial, onFinal, onError, onEnd]);

  const clearTimer = () => {
    if (session.current.timer) {
      clearTimeout(session.current.timer);
      session.current.timer = null;
    }
  };

  const arm = (ms: number) => {
    clearTimer();
    session.current.timer = setTimeout(() => finish(), ms);
  };

  // Fecha a fala: entrega o texto (uma única vez) e para o microfone.
  const finish = () => {
    if (session.current.done) return;
    session.current.done = true;
    clearTimer();
    const text = session.current.text.trim();
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // já estava parado
    }
    if (text) sink.current.onFinal(text);
    else sink.current.onEnd();
  };

  useSpeechRecognitionEvent('result', (event) => {
    if (session.current.done) return;
    const text = event.results?.[0]?.transcript?.trim() ?? '';
    if (!text) return;
    session.current.text = text;
    if (event.isFinal) {
      arm(SILENCE_AFTER_FINAL);
      return;
    }
    sink.current.onPartial(text);
    arm(SILENCE_AFTER_INTERIM);
  });

  useSpeechRecognitionEvent('speechend', () => {
    if (session.current.done || !session.current.text) return;
    arm(SILENCE_AFTER_SPEECH_END);
  });

  useSpeechRecognitionEvent('error', (event) => {
    const code = String(event?.error ?? 'erro');
    if (code === 'no-speech' || code === 'aborted') return;
    if (code === 'recognition-paused') return;
    session.current.done = true;
    clearTimer();
    sink.current.onError(code);
  });

  useSpeechRecognitionEvent('end', () => {
    if (session.current.done) return;
    if (session.current.text.trim()) finish();
    else sink.current.onEnd();
  });

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    session.current = { text: '', timer: null, done: false };

    const start = async () => {
      try {
        const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (cancelled) return;
        if (!permission.granted) {
          session.current.done = true;
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
        session.current.done = true;
        sink.current.onError('start');
      }
    };

    void start();

    return () => {
      cancelled = true;
      session.current.done = true;
      clearTimer();
      try {
        ExpoSpeechRecognitionModule.stop();
      } catch {
        // já parado
      }
    };
  }, [active]);

  return null;
}
