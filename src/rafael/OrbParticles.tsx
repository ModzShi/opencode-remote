import React, { memo, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { OrbDef } from './orbs';

const TONES = 6;
const ALPHAS = 2;
const BUCKETS = TONES * ALPHAS;
const FRAME_MS = 33;
const TWO_PI = Math.PI * 2;

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

interface Layout {
  x: Float32Array;
  y: Float32Array;
  z: Float32Array;
  seed: Float32Array;
  tone: Uint8Array;
}

const layouts = new Map<string, Layout>();
const MAX_COUNT = 560;
const BUCKET_IDS = Array.from({ length: BUCKETS }, (_, bucket) => bucket);

function layoutFor(mode: NonNullable<OrbDef['mode']>): Layout {
  const cached = layouts.get(mode);
  if (cached) return cached;

  const x = new Float32Array(MAX_COUNT);
  const y = new Float32Array(MAX_COUNT);
  const z = new Float32Array(MAX_COUNT);
  const seed = new Float32Array(MAX_COUNT);
  const tone = new Uint8Array(MAX_COUNT);
  const golden = Math.PI * (3 - Math.sqrt(5));

  for (let index = 0; index < MAX_COUNT; index += 1) {
    const rnd = ((index * 0.61803398875) % 1) * TWO_PI;
    seed[index] = rnd;
    tone[index] = Math.min(TONES - 1, Math.floor(((index * 0.5436890126) % 1) * TONES));

    if (mode === 'sphere' || mode === 'nebula') {
      const yy = 1 - (index / (MAX_COUNT - 1)) * 2;
      const radiusAtY = Math.sqrt(Math.max(0, 1 - yy * yy));
      const theta = golden * index;
      const puff = mode === 'nebula' ? 0.55 + ((index * 0.7548776662) % 1) * 0.7 : 1;
      x[index] = Math.cos(theta) * radiusAtY * puff;
      y[index] = yy * puff;
      z[index] = Math.sin(theta) * radiusAtY * puff;
    } else if (mode === 'spiral') {
      const frac = index / MAX_COUNT;
      const radius = Math.sqrt(frac) * 0.98;
      const angle = index * 0.55;
      x[index] = Math.cos(angle) * radius;
      y[index] = Math.sin(angle) * radius * 0.32;
      z[index] = Math.sin(angle * 0.5) * 0.5;
    } else if (mode === 'disc') {
      const frac = index / MAX_COUNT;
      const radius = Math.sqrt(frac);
      x[index] = Math.cos(rnd) * radius;
      y[index] = 0;
      z[index] = Math.sin(rnd) * radius;
    } else if (mode === 'grid') {
      const side = Math.ceil(Math.sqrt(MAX_COUNT));
      const gx = index % side;
      const gy = Math.floor(index / side);
      x[index] = (gx / (side - 1)) * 1.8 - 0.9;
      y[index] = (gy / (side - 1)) * 1.8 - 0.9;
      z[index] = 0;
    } else {
      const a1 = (index * 12.9898) % TWO_PI;
      const a2 = (index * 78.233) % TWO_PI;
      const radius = 0.55 + ((index * 0.7548776662) % 1) * 0.45;
      x[index] = Math.cos(a1) * Math.cos(a2) * radius;
      y[index] = Math.sin(a1) * radius;
      z[index] = Math.cos(a1) * Math.sin(a2) * radius;
    }
  }

  const layout = { x, y, z, seed, tone };
  layouts.set(mode, layout);
  return layout;
}

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);

function ParticleField({
  size,
  orb,
  energy,
  levelRef,
  count,
  fps = 30,
}: {
  size: number;
  orb: OrbDef;
  energy: number;
  levelRef?: { current: number };
  count: number;
  fps?: number;
}) {
  const paths = useRef<(React.ElementRef<typeof Path> | null)[]>([]);
  const energyRef = useRef(energy);
  const energySmooth = useRef(energy);

  useEffect(() => {
    energyRef.current = energy;
  }, [energy]);

  useEffect(() => {
    const layout = layoutFor(orb.mode ?? 'sphere');
    const total = Math.min(MAX_COUNT, count);

    let frameId = 0;
    let running = true;
    let lastDraw = 0;
    let last = Date.now();
    const started = last;
    const counts = new Uint16Array(BUCKETS);
    const chunks: string[] = new Array(BUCKETS).fill('');

    const loop = () => {
      if (!running) return;
      frameId = requestAnimationFrame(loop);

      const now = Date.now();
      if (now - lastDraw < Math.max(FRAME_MS, 1000 / fps)) return;
      const dt = Math.min(0.12, (now - last) / 1000);
      last = now;
      lastDraw = now;
      if (dt <= 0) return;

      const time = (now - started) / 1000;
      const target = energyRef.current * 0.85 + clamp01(levelRef?.current ?? 0) * 0.6;
      energySmooth.current += (target - energySmooth.current) * Math.min(1, dt * 5);
      const energyNow = energySmooth.current;

      const breathe = 1 + 0.06 * Math.sin(time * 0.9);
      const baseScale = 62 * breathe;
      const swirl = orb.mode === 'spiral' || orb.mode === 'disc' ? time * 0.12 : 0;
      const flat = orb.mode === 'grid' || orb.mode === 'noise';

      counts.fill(0);
      for (let bucket = 0; bucket < BUCKETS; bucket += 1) chunks[bucket] = '';

      for (let index = 0; index < total; index += 1) {
        const seed = layout.seed[index];
        let px = layout.x[index];
        let py = layout.y[index];
        let pz = layout.z[index];

        if (swirl !== 0) {
          const cos = Math.cos(swirl);
          const sin = Math.sin(swirl);
          const rx = px * cos - pz * sin;
          const rz = px * sin + pz * cos;
          px = rx;
          pz = rz;
        }

        const perspective = flat ? 1 : 1 / (1.75 - pz * 0.5);
        const ripple = Math.sin(seed * 3 + time * 1.6) * (0.05 + energyNow * 0.16);
        const jitter = Math.sin(seed * 41 + time * 3.1) * 0.012 * (0.4 + energyNow);
        const radial = 1 + ripple + jitter;

        const screenX = 100 + (px + 0.02 * Math.sin(time * 0.4 + seed)) * baseScale * radial * perspective;
        const screenY = 100 + (py + 0.02 * Math.cos(time * 0.35 + seed)) * baseScale * radial * perspective;

        const depth = flat ? 0.55 + 0.35 * Math.sin(seed * 2) : (pz + 1) / 2;
        const dot = (orb.mode === 'grid' ? 0.85 : 0.7 + depth * 1.5) * (0.9 + energyNow * 0.7);
        const alpha = clamp01((0.32 + depth * 0.68) * (0.55 + energyNow * 0.45));
        const bucket = layout.tone[index] * ALPHAS + (alpha > 0.6 ? 1 : 0);
        const xi = Math.round(screenX * 2) / 2;
        const yi = Math.round(screenY * 2) / 2;
        const ri = Math.round(dot * 2) / 2;
        const d2 = ri * 2;

        counts[bucket] += 1;
        chunks[bucket] =
          chunks[bucket] +
          'M' + (xi - ri) + ' ' + yi + 'a' + ri + ' ' + ri + ' 0 1 0 ' + d2 + ' 0a' + ri + ' ' + ri + ' 0 1 0 ' + (-d2) + ' 0';
      }

      for (let bucket = 0; bucket < BUCKETS; bucket += 1) {
        const node = paths.current[bucket];
        if (!node) continue;
        node.setNativeProps({ d: counts[bucket] > 0 ? chunks[bucket] : 'M0 0' });
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
  }, [count, fps, levelRef, orb.accent, orb.mode]);

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      {BUCKET_IDS.map((bucket) => (
        <Path
          key={`p-${bucket}`}
          ref={(node) => {
            paths.current[bucket] = node;
          }}
          d="M0 0"
          fill={mixHex(orb.accent, '#ffffff', ((bucket >> 1) * 0.12) % 0.5)}
          fillOpacity={bucket % ALPHAS === 0 ? 0.42 : 0.85}
        />
      ))}
    </Svg>
  );
}

export const ParticleOrbInline = memo(ParticleField);
