import React, { memo, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { paletteAt, type Palette } from './palette';
import { tickSignal } from './signal';

export type OrbState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error' | 'disabled';

interface ParticleOrbProps {
  size: number;
  state: OrbState;
  /** Nível 0..1 vindo do microfone (opcional). */
  levelRef?: { current: number };
}

const COUNT = 460;
const TWO_PI = Math.PI * 2;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const TONES = 6;
const ALPHAS = 2;
const BUCKETS = TONES * ALPHAS;
const FRAME_MS = 33; // 30 fps: movimento lento e constante, metade do custo

type Params = {
  breathe: number;
  drift: number;
  ripple: number;
  swell: number;
  pulse: number;
  ring: number;
  jitter: number;
  shake: number;
  alpha: number;
};

/*
 * Sem giro e sem zoom: o orbe fica parado no lugar. 'pensando' usa a mesma
 * animação de 'conectando' (anel) e 'ouvindo' usa a de 'falando' (vibração forte).
 */
const STATES: Record<OrbState, Params> = {
  idle: { breathe: 0.07, drift: 1, ripple: 0, swell: 0.05, pulse: 0, ring: 0, jitter: 0, shake: 0, alpha: 0.74 },
  connecting: { breathe: 0.03, drift: 0.3, ripple: 0, swell: 0.02, pulse: 0.08, ring: 1, jitter: 0, shake: 0, alpha: 0.82 },
  listening: { breathe: 0.02, drift: 0, ripple: 1, swell: 0.3, pulse: 0, ring: 0, jitter: 0.7, shake: 0, alpha: 0.94 },
  thinking: { breathe: 0.03, drift: 0.3, ripple: 0, swell: 0.02, pulse: 0.08, ring: 1, jitter: 0, shake: 0, alpha: 0.82 },
  speaking: { breathe: 0.02, drift: 0, ripple: 0.35, swell: 0.28, pulse: 0, ring: 0, jitter: 0.45, shake: 0, alpha: 0.94 },
  error: { breathe: 0, drift: 0, ripple: 0, swell: 0, pulse: 0, ring: 0, jitter: 0.5, shake: 1, alpha: 0.86 },
  disabled: { breathe: 0, drift: 0, ripple: 0, swell: 0, pulse: 0, ring: 0, jitter: 0, shake: 0, alpha: 0.45 },
};

const STATE_NAMES = Object.keys(STATES) as OrbState[];
const KEYS = Object.keys(STATES.idle) as (keyof Params)[];

const sphereX = new Float32Array(COUNT);
const sphereY = new Float32Array(COUNT);
const sphereZ = new Float32Array(COUNT);
const ringFrac = new Float32Array(COUNT);
const seeds = new Float32Array(COUNT);
const tones = new Float32Array(COUNT);
const toneBucket = new Uint8Array(COUNT);

for (let index = 0; index < COUNT; index += 1) {
  const y = 1 - (index / (COUNT - 1)) * 2;
  const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = GOLDEN * index;
  sphereX[index] = Math.cos(theta) * radiusAtY;
  sphereY[index] = y;
  sphereZ[index] = Math.sin(theta) * radiusAtY;
  ringFrac[index] = (index * 0.61803398875) % 1;
  seeds[index] = ((index * 0.7548776662) % 1) * TWO_PI;
  const tone = (index * 0.5436890126) % 1;
  tones[index] = tone;
  toneBucket[index] = Math.min(TONES - 1, Math.floor(tone * TONES));
}

const approach = (value: number, target: number, rate: number, dt: number) =>
  value + (target - value) * (1 - Math.exp(-rate * dt));

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);

function mixHex(from: string, to: string, amount: number): string {
  const parse = (hex: string) => [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
  const a = parse(from);
  const b = parse(to);
  const channel = (index: number) =>
    Math.round(a[index] + (b[index] - a[index]) * amount)
      .toString(16)
      .padStart(2, '0');
  return `#${channel(0)}${channel(1)}${channel(2)}`;
}

function tonePalette(palette: Palette): string[] {
  return Array.from({ length: TONES }).map((_, index) =>
    mixHex(palette.core, palette.glow, index / (TONES - 1))
  );
}

function ParticleOrbInner({ size, state, levelRef }: ParticleOrbProps) {
  const paths = useRef<(React.ElementRef<typeof Path> | null)[]>([]);
  const stateRef = useRef<OrbState>(state);
  const weights = useRef<Record<string, number>>({});
  const current = useRef<Params>({ ...STATES.idle });
  const paletteRef = useRef(paletteAt(0));
  const [initialPalette] = useState(() => paletteAt(0));
  const [mounts] = useState(() => Array.from({ length: BUCKETS }, (_, bucket) => bucket));

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const initial: Record<string, number> = {};
    STATE_NAMES.forEach((name) => {
      initial[name] = name === stateRef.current ? 1 : 0;
    });
    weights.current = initial;

    let frameId = 0;
    let running = true;
    let lastDraw = 0;
    const started = Date.now();
    let last = started;
    let colourClock = 0;
    let smoothedLevel = 0;
    const colours = tonePalette(paletteRef.current);

    const counts = new Uint16Array(BUCKETS);
    const chunks: string[] = new Array(BUCKETS).fill('');

    const loop = () => {
      if (!running) return;
      frameId = requestAnimationFrame(loop);

      const now = Date.now();
      if (now - lastDraw < FRAME_MS) return;
      const dt = Math.min(0.12, (now - last) / 1000);
      last = now;
      lastDraw = now;
      if (dt <= 0) return;
      const time = (now - started) / 1000;

      STATE_NAMES.forEach((name) => {
        const want = name === stateRef.current ? 1 : 0;
        const rate = name === 'idle' || name === 'disabled' ? 3 : name === 'error' ? 6 : 7;
        weights.current[name] = approach(weights.current[name] ?? 0, want, rate, dt);
      });

      for (let index = 0; index < KEYS.length; index += 1) {
        const key = KEYS[index];
        let target = 0;
        for (let stateIndex = 0; stateIndex < STATE_NAMES.length; stateIndex += 1) {
          const name = STATE_NAMES[stateIndex];
          target += (weights.current[name] ?? 0) * STATES[name][key];
        }
        current.current[key] = approach(current.current[key], target, 5, dt);
      }

      smoothedLevel = approach(smoothedLevel, levelRef?.current ?? 0, 6, dt);
      const params = current.current;
      const amplitude = clamp01(Math.max(smoothedLevel, tickSignal(dt) * 0.75));
      const breathe = 1 + params.breathe * Math.sin(time * 1.1);
      const shakeX = params.shake * Math.sin(time * 30) * 2;
      const shakeY = params.shake * Math.cos(time * 26) * 2;
      const baseScale = 62 * breathe;

      counts.fill(0);
      for (let bucket = 0; bucket < BUCKETS; bucket += 1) chunks[bucket] = '';

      for (let index = 0; index < COUNT; index += 1) {
        const seed = seeds[index];

        let px = sphereX[index];
        let py = sphereY[index];
        let pz = sphereZ[index];

        if (params.ring > 0.01) {
          const angle = ringFrac[index] * TWO_PI;
          const ringW = params.ring * 0.9;
          px += (Math.cos(angle) * 1.02 - px) * ringW;
          py += (Math.sin(angle) * 1.02 - py) * ringW;
          pz += (Math.sin(angle * 2 + time * 0.9) * 0.18 - pz) * ringW;
        }

        const perspective = 1 / (1.75 - pz * 0.45);
        const ripple =
          params.ripple * (0.25 + amplitude * 0.75) * Math.sin(seed * 3 + time * 2.4) +
          params.pulse * 0.1 * Math.sin(time * 1.5 + seed * 0.4);
        const drift = params.drift * 0.03 * Math.sin(time * 0.3 + seed * 2);
        const jitter = params.jitter * 0.05 * Math.sin(seed * 97 + time * 9);
        const radial =
          1 + ripple * 0.6 + params.swell * 0.5 * Math.sin(time * 0.8 + seed) + jitter;

        const screenX = 100 + (px + drift) * baseScale * radial * perspective + shakeX;
        const screenY = 100 + (py + drift) * baseScale * radial * perspective + shakeY;

        const depth = (pz + 1) / 2;
        const dot = (0.7 + depth * 1.55) * (0.85 + amplitude * params.ripple * 0.9);
        const alpha = clamp01(params.alpha * (0.2 + depth * 0.9) * (0.5 + tones[index] * 0.5));
        const bucket = toneBucket[index] * ALPHAS + (alpha > 0.55 ? 1 : 0);
        counts[bucket] += 1;

        const xi = Math.round(screenX * 2) / 2;
        const yi = Math.round(screenY * 2) / 2;
        const ri = Math.round(dot * 2) / 2;
        const d2 = ri * 2;
        chunks[bucket] =
          chunks[bucket] +
          'M' + (xi - ri) + ' ' + yi + 'a' + ri + ' ' + ri + ' 0 1 0 ' + d2 + ' 0a' + ri + ' ' + ri + ' 0 1 0 ' + (-d2) + ' 0';
      }

      colourClock += dt;
      const colourChanged = colourClock > 0.35;
      if (colourChanged) {
        colourClock = 0;
        paletteRef.current = paletteAt(time);
        const next = tonePalette(paletteRef.current);
        for (let index = 0; index < TONES; index += 1) colours[index] = next[index];
      }

      for (let bucket = 0; bucket < BUCKETS; bucket += 1) {
        const node = paths.current[bucket];
        if (!node) continue;
        const data = counts[bucket] > 0 ? chunks[bucket] : 'M0 0';
        if (colourChanged) {
          node.setNativeProps({ d: data, fill: colours[bucket >> 1] });
        } else {
          node.setNativeProps({ d: data });
        }
      }
    };

    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        if (!running) {
          running = true;
          last = Date.now();
          lastDraw = 0;
          frameId = requestAnimationFrame(loop);
        }
      } else {
        running = false;
        cancelAnimationFrame(frameId);
      }
    });

    frameId = requestAnimationFrame(loop);
    return () => {
      running = false;
      subscription.remove();
      cancelAnimationFrame(frameId);
    };
  }, [levelRef]);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        {mounts.map((bucket) => (
          <Path
            key={`bucket-${bucket}`}
            ref={(node) => {
              paths.current[bucket] = node;
            }}
            d="M0 0"
            fill={mixHex(initialPalette.core, initialPalette.glow, (bucket >> 1) / (TONES - 1))}
            fillOpacity={bucket % ALPHAS === 0 ? 0.44 : 0.84}
          />
        ))}
      </Svg>
    </View>
  );
}

export const ParticleOrb = memo(ParticleOrbInner);

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
});
