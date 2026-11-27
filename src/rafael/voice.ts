/*
 * Voz do Rafael. Tudo aqui é carregado de forma defensiva: no binário antigo
 * (sem os módulos nativos) as funções simplesmente viram no-op em vez de derrubar o app.
 */

type SpeechModule = {
  speak: (text: string, options?: Record<string, unknown>) => void;
  stop: () => void;
};

type AudioModule = {
  setAudioModeAsync: (mode: Record<string, unknown>) => Promise<void>;
  requestRecordingPermissionsAsync: () => Promise<{ granted: boolean }>;
};

/* eslint-disable @typescript-eslint/no-require-imports */
// require estático (o Metro não aceita require dinâmico); o try/catch cobre
// o caso do binário antigo, onde o módulo nativo não existe.
let Speech: SpeechModule | null = null;
let Audio: AudioModule | null = null;
try {
  Speech = require('expo-speech') as SpeechModule;
} catch {
  Speech = null;
}
try {
  Audio = require('expo-audio') as AudioModule;
} catch {
  Audio = null;
}
/* eslint-enable @typescript-eslint/no-require-imports */

export const voiceReady = {
  speech: Speech !== null,
  mic: Audio !== null,
};

let speaking = false;

export function speak(text: string) {
  if (!Speech) return;
  const clean = text.replace(/[`*_#>]/g, '').trim();
  if (!clean) return;
  try {
    Speech.stop();
    speaking = true;
    Speech.speak(clean.slice(0, 600), {
      language: 'pt-BR',
      rate: 1.02,
      pitch: 1,
      onDone: () => {
        speaking = false;
      },
      onStopped: () => {
        speaking = false;
      },
      onError: () => {
        speaking = false;
      },
    });
  } catch {
    speaking = false;
  }
}

export function stopSpeaking() {
  if (!Speech) return;
  try {
    Speech.stop();
  } catch {
    // ignora: módulo nativo ausente
  }
  speaking = false;
}

export const isSpeaking = () => speaking;