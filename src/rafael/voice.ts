/*
 * Voz do Rafael. Tudo aqui é carregado de forma defensiva: no binário antigo
 * (sem os módulos nativos) as funções simplesmente viram no-op em vez de derrubar o app.
 *
 * Ordem de preferência: Fish Audio (voz escolhida, nuvem) e, se não houver
 * chave configurada, a voz nativa do iOS.
 */

type SpeechModule = {
  speak: (text: string, options?: Record<string, unknown>) => void;
  stop: () => void;
};

type AudioModule = {
  setAudioModeAsync: (mode: Record<string, unknown>) => Promise<void>;
  requestRecordingPermissionsAsync: () => Promise<{ granted: boolean }>;
};

type FishModule = {
  fishReady: boolean;
  speakFish: (text: string) => boolean;
  stopFish: () => void;
};

/* eslint-disable @typescript-eslint/no-require-imports */
// require estático (o Metro não aceita require dinâmico); o try/catch cobre
// o caso do binário antigo, onde o módulo nativo não existe.
let Speech: SpeechModule | null = null;
let Audio: AudioModule | null = null;
let Fish: FishModule | null = null;
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
try {
  Fish = require('@/rafael/fish') as FishModule;
} catch {
  Fish = null;
}
/* eslint-enable @typescript-eslint/no-require-imports */

export const voiceReady = {
  speech: Speech !== null,
  mic: Audio !== null,
  fish: Fish !== null && Fish.fishReady,
};

let speaking = false;

function speakNative(clean: string) {
  if (!Speech) return;
  try {
    Speech.stop();
    speaking = true;
    Speech.speak(clean, {
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

export function speak(text: string) {
  const clean = text.replace(/[`*_#>]/g, '').trim();
  if (!clean) return;

  if (Fish?.fishReady) {
    try {
      if (Fish.speakFish(clean.slice(0, 900))) {
        speaking = true;
        return;
      }
    } catch {
      // cai para a voz nativa
    }
  }

  speakNative(clean.slice(0, 600));
}

export function stopSpeaking() {
  if (Fish) {
    try {
      Fish.stopFish();
    } catch {
      // ignora
    }
  }
  if (Speech) {
    try {
      Speech.stop();
    } catch {
      // ignora: módulo nativo ausente
    }
  }
  speaking = false;
}

export const isSpeaking = () => speaking;
