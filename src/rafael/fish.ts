import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';

/*
 * Voz do Fish Audio (TTS na nuvem). A chave vem do ambiente do build
 * (EXPO_PUBLIC_FISH_API_KEY) e nunca é escrita no repositório.
 */
const ENDPOINT = 'https://api.fish.audio/v1/tts';
const VOICE_ID = process.env.EXPO_PUBLIC_FISH_VOICE_ID || '620fbba75326480b8aa6bae8974ace0c';
const API_KEY = process.env.EXPO_PUBLIC_FISH_API_KEY || '';

export const fishReady = API_KEY.length > 0;

let player: AudioPlayer | null = null;
let controller: AbortController | null = null;
let generation = 0;

function chunk(text: string): string[] {
  const pieces = text.match(/[^.!?…\n]+[.!?…\n]+|[^.!?…\n]+$/g) ?? [text];
  const out: string[] = [];
  let buffer = '';
  pieces.forEach((piece) => {
    buffer += piece;
    if (buffer.trim().length >= 110) {
      out.push(buffer.trim());
      buffer = '';
    }
  });
  if (buffer.trim()) out.push(buffer.trim());
  return out.filter((item) => item.length > 0);
}

async function synthesize(text: string, signal: AbortSignal): Promise<string> {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      model: 's2.1-pro-free',
    },
    body: JSON.stringify({
      text,
      reference_id: VOICE_ID,
      format: 'mp3',
      mp3_bitrate: 128,
      sample_rate: 44100,
      normalize: true,
      chunk_length: 200,
      latency: 'normal',
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
  const parts = chunk(text);
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

    for (const part of parts) {
      if (generation !== mine || ac.signal.aborted) return;
      try {
        const uri = await synthesize(part, ac.signal);
        if (generation !== mine || ac.signal.aborted) return;
        await play(uri, ac.signal);
      } catch {
        // uma frase falhou: tenta a próxima
      }
    }
  })();

  return true;
}
