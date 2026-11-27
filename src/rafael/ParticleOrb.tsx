import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { paletteAt, type Palette } from './palette';
import { tickSignal } from './signal';

export type OrbState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error' | 'disabled';

interface ParticleOrbProps {
  size: number;
  state: OrbState;
  level?: number;
}

const COUNT = 620;
const TWO_PI = Math.PI * 2;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const TONES = 6;
const ALPHAS = 4;
const BUCKETS = TONES * ALPHAS;

type Params = {
  tempo: number;
  spin: number;
  breathe: number;
  drift: number;
  ripple: number;
  swell: number;
  flow: number;
  swirl: number;
  pulse: number;
  ring: number;
  jitter: number;
  shake: number;
  alpha: number;
};

const STATES: Record<OrbState, Params> = {
  idle: { tempo: 1, spin: 0.14, breathe: 0.05, drift: 1, ripple: 0, swell: 0.04, flow: 0, swirl: 0, pulse: 0, ring: 0, jitter: 0, shake: 0, alpha: 0.72 },
  connecting: { tempo: 1, spin: 0.3, breathe: 0.02, drift: 0.2, ripple: 0, swell: 0, flow: 0, swirl: 0, pulse: 0.06, ring: 1, jitter: 0, shake: 0, alpha: 0.8 },
  listening: { tempo: 1, spin: 0.55, breathe: 0.012, drift: 0, ripple: 1, swell: 0.12, flow: 0, swirl: 0, pulse: 0, ring: 0, jitter: 0, shake: 0, alpha: 0.92 },
  thinking: { tempo: 1, spin: 0.32, breathe: 0.01, drift: 0, ripple: 0, swell: 0, flow: 0, swirl: 0, pulse: 1, ring: 0, jitter: 0, shake: 0, alpha: 0.78 },
  speaking: { tempo: 1, spin: 0.24, breathe: 0.01, drift: 0, ripple: 0, swell: 0.06, flow: 1, swirl: 1, pulse: 0, ring: 0, jitter: 0.6, shake: 0, alpha: 0.94 },
  error: { tempo: 1, spin: 0.08, breathe: 0, drift: 0, ripple: 0, swell: 0, flow: 0, swirl: 0, pulse: 0, ring: 0, jitter: 0.7, shake: 1, alpha: 0.85 },
  disabled: { tempo: 0.04, spin: 0, breathe: 0, drift: 0, ripple: 0, swell: 0, flow: 0, swirl: 0, pulse: 0, ring: 0, jitter: 0, shake: 0, alpha: 0.45 },
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

export function ParticleOrb({ size, state, level = 0 }: ParticleOrbProps) {
  const paths = useRef<(React.ElementRef<typeof Path> | null)[]>([]);
  const stateRef = useRef<OrbState>(state);
  const levelRef = useRef(level);
  const weights = useRef<Record<string, number>>({});
  const current = useRef<Params>({ ...STATES.idle });
  const paletteRef = useRef(paletteAt(0));
  const [initialPalette] = useState(() => paletteAt(0));

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    levelRef.current = level;
  }, [level]);

  useEffect(() => {
    const initial: Record<string, number> = {};
    STATE_NAMES.forEach((name) => {
      initial[name] = name === stateRef.current ? 1 : 0;
    });
    weights.current = initial;

    let frameId = 0;
    const started = Date.now();
    let last = started;
    let spinAngle = 0;
    let colourClock = 0;
    let frameMs = 16;
    const colours = tonePalette(paletteRef.current);

    const counts = new Uint16Array(BUCKETS);
    const chunks: string[] = new Array(BUCKETS).fill('');

    const loop = () => {
      const now = Date.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const time = (now - started) / 1000;

      STATE_NAMES.forEach((name) => {
        const want = name === stateRef.current ? 1 : 0;
        const rate = name === 'idle' || name === 'disabled' ? 5 : name === 'error' ? 10 : 14;
        weights.current[name] = approach(weights.current[name] ?? 0, want, rate, dt);
      });

      for (let index = 0; index < KEYS.length; index += 1) {
        const key = KEYS[index];
        let target = 0;
        for (let stateIndex = 0; stateIndex < STATE_NAMES.length; stateIndex += 1) {
          const name = STATE_NAMES[stateIndex];
          target += (weights.current[name] ?? 0) * STATES[name][key];
        }
        current.current[key] = approach(current.current[key], target, 12, dt);
      }

      const params = current.current;
      spinAngle += params.spin * dt;
      const sinSpin = Math.sin(spinAngle);
      const cosSpin = Math.cos(spinAngle);

      const amplitude = clamp01(Math.max(levelRef.current, tickSignal(dt) * 0.9));
      const breathe = 1 + params.breathe * Math.sin(time * 1.6);
      const shakeX = params.shake * Math.sin(time * 47) * 2;
      const shakeY = params.shake * Math.cos(time * 39) * 2;
      const baseScale = 62 * breathe;

      frameMs = frameMs * 0.9 + dt * 1000 * 0.1;
      const stride = frameMs > 27 ? 2 : 1;

      counts.fill(0);
      for (let bucket = 0; bucket < BUCKETS; bucket += 1) chunks[bucket] = '';

      for (let index = 0; index < COUNT; index += stride) {
        const seed = seeds[index];

        let px = sphereX[index];
        let py = sphereY[index];
        let pz = sphereZ[index];

        if (params.ring > 0.01) {
          const angle = ringFrac[index] * TWO_PI;
          const ringW = params.ring * 0.9;
          px += (Math.cos(angle) * 1.02 - px) * ringW;
          py += (Math.sin(angle) * 1.02 - py) * ringW;
          pz += (Math.sin(angle * 2 + time * 1.4) * 0.18 - pz) * ringW;
        }

        if (params.flow > 0.01) {
          pz += Math.sin(py * 3 + time * 2.2) * 0.14 * params.flow;
        }

        let rotatedX = px * cosSpin - pz * sinSpin;
        const rotatedZ = px * sinSpin + pz * cosSpin;

        if (params.swirl > 0.01) {
          const swirl = params.swirl * 0.85 * (1 - Math.abs(rotatedZ)) * Math.sin(time * 0.9 + seed);
          rotatedX = rotatedX * Math.cos(swirl) - py * Math.sin(swirl);
        }

        const perspective = 1 / (1.75 - rotatedZ * 0.45);
        const ripple =
          params.ripple * (0.2 + amplitude * 0.8) * Math.sin(seed * 3 + time * 6.5) +
          params.pulse * 0.13 * Math.sin(time * 2.6 + seed * 0.4);
        const drift = params.drift * 0.02 * Math.sin(time * 0.4 + seed * 2);
        const jitter = params.jitter * 0.035 * Math.sin(seed * 97 + time * 31);
        const radial = 1 + ripple * 0.45 + params.swell * 0.28 * Math.sin(time * 1.7 + seed) + jitter;

        const screenX = 100 + (rotatedX + drift) * baseScale * radial * perspective + shakeX;
        const screenY = 100 + (py + drift) * baseScale * radial * perspective + shakeY;

        const depth = (rotatedZ + 1) / 2;
        const dot = (0.7 + depth * 1.55) * (0.8 + amplitude * params.ripple * 1.1);
        const alpha = clamp01(params.alpha * (0.2 + depth * 0.9) * (0.5 + tones[index] * 0.5));
        const alphaBucket = Math.min(ALPHAS - 1, Math.floor(alpha * ALPHAS));
        const bucket = toneBucket[index] * ALPHAS + alphaBucket;
        counts[bucket] += 1;
        chunks[bucket] +=
          'M' +
          (screenX - dot).toFixed(1) +
          ' ' +
          screenY.toFixed(1) +
          'a' +
          dot.toFixed(1) +
          ' ' +
          dot.toFixed(1) +
          ' 0 1 0 ' +
          (dot * 2).toFixed(1) +
          ' 0a' +
          dot.toFixed(1) +
          ' ' +
          dot.toFixed(1) +
          ' 0 1 0 ' +
          (-dot * 2).toFixed(1) +
          ' 0';
      }

      colourClock += dt;
      const colourChanged = colourClock > 0.25;
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
          node.setNativeProps({ d: data, fill: colours[Math.floor(bucket / ALPHAS)] });
        } else {
          node.setNativeProps({ d: data });
        }
      }

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        {Array.from({ length: BUCKETS }).map((_, bucket) => {
          const tone = Math.floor(bucket / ALPHAS);
          const alpha = (bucket % ALPHAS) / ALPHAS + 0.25;
          return (
            <Path
              key={`bucket-${bucket}`}
              ref={(node) => {
                paths.current[bucket] = node;
              }}
              d="M0 0"
              fill={mixHex(initialPalette.core, initialPalette.glow, tone / (TONES - 1))}
              fillOpacity={alpha}
            />
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
});
