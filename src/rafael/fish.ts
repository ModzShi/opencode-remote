import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { useAppStore } from '@/store';
import { DEFAULT_VOICE_ID } from './voices';

/*
 * Voz do Fish Audio (TTS na nuvem). A chave vem do ambiente do build
 * (EXPO_PUBLIC_FISH_API_KEY) e nunca é escrita no repositório.
 */
const ENDPOINT = 'https://api.fish.audio/v1/tts';
const ENV_KEY = process.env.EXPO_PUBLIC_FISH_API_KEY || '';
const ENV_VOICE = process.env.EXPO_PUBLIC_FISH_VOICE_ID || DEFAULT_VOICE_ID;

export const fishReady = ENV_KEY.length > 0;

let player: AudioPlayer | null = null;
let controller: AbortController | null = null;
let generation = 0;

interface FishConfig {
  voice: string;
  model: string;
  summary: 'auto' | 'full' | 'off';
}

function config(): FishConfig {
  const settings = useAppStore.getState().settings;
  return {
    voice: settings.rafaelVoiceId || ENV_VOICE,
    model: settings.rafaelTtsModel || 's2.1-pro-free',
    summary: settings.rafaelSummary ?? 'auto',
  };
}

/** Limpa marcação e corta o texto que não faz sentido ouvir. */
export function spokenText(input: string, summary: FishConfig['summary']): string {
  let text = input
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\|[^\n]*\|/g, ' ')
    .replace(/[`*_#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return '';
  if (summary === 'off') return '';
  if (summary === 'full' || text.length <= 260) return text;

  // Resposta longa: fala as primeiras frases e avisa que o resto está na tela.
  const sentences = text.split(/(?<=[.!?…])\s+/);
  let out = '';
  for (const sentence of sentences) {
    if ((out + ' ' + sentence).trim().length > 210) break;
    out = (out + ' ' + sentence).trim();
  }
  if (!out) out = text.slice(0, 200);
  return `${out} Os detalhes estão na tela.`;
}

function chunk(text: string): string[] {
  const pieces = text.match(/[^.!?…,\n]+[.!?…,\n]*/g) ?? [text];
  const out: string[] = [];
  let buffer = '';
  for (const piece of pieces) {
    if (buffer.length > 0 && (buffer + piece).length > 80) {
      out.push(buffer.trim());
      buffer = '';
    }
    buffer += piece;
    // Frase curta já pode ir sozinha: reduz o tempo até o primeiro áudio.
    if (buffer.trim().length > 60 && /[.!?…]$/.test(buffer.trim())) {
      out.push(buffer.trim());
      buffer = '';
    }
  }
  if (buffer.trim()) out.push(buffer.trim());
  return out.filter((item) => item.length > 0);
}

async function synthesize(text: string, cfg: FishConfig, signal: AbortSignal): Promise<string> {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ENV_KEY}`,
      'Content-Type': 'application/json',
      model: cfg.model,
    },
    body: JSON.stringify({
      text,
      reference_id: cfg.voice,
      format: 'mp3',
      mp3_bitrate: 128,
      sample_rate: 44100,
      normalize: true,
      chunk_length: 100,
      latency: 'balanced',
    }),
    signal,
  });

  if (!response.ok) throw new Error(`fish ${response.status}`);

  const bytes = new Uint8Array(await response.arrayBuffer());
  const file = new File(Paths.cache, `rafael-${Date.now()}-${Math.round(Math.random() * 1e5)}.mp3`);
  file.write(bytes);
  return file.uri;
}

function play(uri: string, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      subscription.remove();
      resolve();
    };

    const next = createAudioPlayer({ uri });
    player = next;
    const subscription = next.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) finish();
    });

    signal.addEventListener('abort', () => {
      try {
        next.pause();
      } catch {
        // já parou
      }
      finish();
    });

    next.play();
  });
}

export function stopFish(): void {
  generation += 1;
  try {
    controller?.abort();
  } catch {
    // ignorado
  }
  controller = null;
  try {
    player?.pause();
    player?.remove();
  } catch {
    // ignorado
  }
  player = null;
}

/** Fala com a voz do Fish. Retorna false quando não há chave configurada. */
export function speakFish(text: string): boolean {
  if (!fishReady) return false;
  const cfg = config();
  const speech = spokenText(text, cfg.summary);
  if (!speech) return false;

  const parts = chunk(speech);
  if (parts.length === 0) return false;

  stopFish();
  const mine = generation;
  const ac = new AbortController();
  controller = ac;

  void (async () => {
    try {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    } catch {
      // segue com o modo atual
    }

    // Sintetiza a próxima frase enquanto a atual toca: o áudio sai sem pausas.
    let pending: Promise<string> | null = null;
    for (let index = 0; index < parts.length; index += 1) {
      if (generation !== mine || ac.signal.aborted) return;
      try {
        const uri = pending
          ? await pending
          : await synthesize(parts[index], cfg, ac.signal);
        pending = null;
        if (generation !== mine || ac.signal.aborted) return;
        if (index + 1 < parts.length) {
          pending = synthesize(parts[index + 1], cfg, ac.signal);
          pending.catch(() => undefined);
        }
        await play(uri, ac.signal);
      } catch {
        pending = null;
        // uma frase falhou: tenta a próxima
      }
    }
  })();

  return true;
}
