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
  speed: number;
  volume: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function config(): FishConfig {
  const settings = useAppStore.getState().settings;
  return {
    voice: settings.rafaelVoiceId || ENV_VOICE,
    model: settings.rafaelTtsModel || 's2.1-pro-free',
    summary: settings.rafaelSummary ?? 'auto',
    // Voz um pouco mais rápida e mais alta: o padrão do Fish sai baixo e lento
    // no alto-falante do iPhone.
    speed: clamp(settings.rafaelVoiceSpeed ?? 1.25, 0.5, 2),
    volume: clamp(settings.rafaelVoiceVolume ?? 10, -10, 15),
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
    if (buffer.length > 0 && (buffer + piece).length > 150) {
      out.push(buffer.trim());
      buffer = '';
    }
    buffer += piece;
    // O primeiro pedaço é curto (áudio começa antes); os outros são maiores
    // para reduzir o número de requisições e os intervalos entre frases.
    const limit = out.length === 0 ? 70 : 150;
    if (buffer.trim().length >= limit && /[.!?…,]$/.test(buffer.trim())) {
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
      latency: 'low',
      prosody: {
        speed: cfg.speed,
        volume: cfg.volume,
        normalize_loudness: true,
      },
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
    let guard: ReturnType<typeof setTimeout> | null = null;
    const finish = () => {
      if (done) return;
      done = true;
      if (guard) clearTimeout(guard);
      subscription.remove();
      resolve();
    };

    const next = createAudioPlayer({ uri });
    try {
      next.volume = 1;
    } catch {
      // player antigo sem volume
    }
    player = next;
    const subscription = next.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) finish();
    });

    // Se o player travar (arquivo corrompido, interrupção do sistema), não
    // deixa a fila de frases parada para sempre.
    guard = setTimeout(finish, 45000);

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

/** Prepara a sessão de áudio antes do primeiro toque (menos atraso). */
export async function warmFish(): Promise<void> {
  try {
    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      shouldRouteThroughEarpiece: false,
      interruptionMode: 'doNotMix',
    });
  } catch {
    // segue com o modo atual
  }
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

/**
 * Fala com a voz do Fish. Retorna false quando não há chave configurada.
 * Se a nuvem falhar logo no primeiro pedaço, chama onFail para o app usar a
 * voz nativa — melhor uma voz diferente do que silêncio.
 */
export function speakFish(text: string, onFail?: (speech: string) => void): boolean {
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
    // Mantém dois pedaços em voo: o próximo já chega pronto enquanto o atual toca.
    const jobs: (Promise<string> | null)[] = parts.map(() => null);
    const startJob = (index: number) => {
      if (index >= parts.length || jobs[index]) return;
      const job = synthesize(parts[index], cfg, ac.signal);
      job.catch(() => undefined);
      jobs[index] = job;
    };
    startJob(0);
    startJob(1);
    await warmFish();

    for (let index = 0; index < parts.length; index += 1) {
      if (generation !== mine || ac.signal.aborted) return;
      try {
        const job = jobs[index];
        if (!job) {
          startJob(index);
          if (!jobs[index]) return;
        }
        const uri = await jobs[index]!;
        if (generation !== mine || ac.signal.aborted) return;
        startJob(index + 2);
        await play(uri, ac.signal);
      } catch {
        if (ac.signal.aborted || generation !== mine) return;
        if (index === 0) {
          onFail?.(speech);
          return;
        }
        // uma frase falhou: tenta a próxima
      }
    }
  })();

  return true;
}
