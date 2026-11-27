import React, { memo, useEffect, useId, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Line, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { findOrb, type OrbDef } from './orbs';
import { ParticleOrbInline } from './OrbParticles';

export type OrbState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error' | 'disabled';

interface OrbViewProps {
  size: number;
  state?: OrbState;
  variant?: string;
  levelRef?: { current: number };
  /** prévia da galeria: menos partículas para manter fluido */
  preview?: boolean;
}

const ENERGY: Record<OrbState, number> = {
  idle: 0.22,
  connecting: 0.4,
  listening: 1,
  thinking: 0.55,
  speaking: 0.8,
  error: 0.7,
  disabled: 0.08,
};

function useFrame(active: boolean, fps = 30): number {
  const [time, setTime] = useState(0);

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = 0;
    const started = Date.now();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = Date.now();
      if (now - last < 1000 / fps) return;
      last = now;
      setTime((now - started) / 1000);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, fps]);

  return time;
}

interface Ctx {
  t: number;
  energy: number;
  accent: string;
  id: string;
}

function Halo({ t, energy, accent }: Ctx) {
  return (
    <G>
      {[0, 1, 2].map((index) => {
        const phase = (t * 0.22 + index / 3) % 1;
        const radius = 30 + phase * 56 + energy * 6;
        const opacity = (1 - phase) * (0.2 + energy * 0.55);
        return <Circle key={index} cx={100} cy={100} r={radius} stroke={accent} strokeWidth={1.1} fill="none" opacity={opacity} />;
      })}
      <Circle cx={100} cy={100} r={12 + energy * 8} fill={accent} opacity={0.22 + energy * 0.3} />
      <Circle cx={100} cy={100} r={5 + energy * 4} fill="#ffffff" opacity={0.5} />
    </G>
  );
}

function EdgeGlow({ t, energy, accent, id }: Ctx) {
  const pulse = 0.5 + 0.5 * Math.sin(t * 1.4);
  return (
    <G>
      <Defs>
        <RadialGradient id={`${id}-edge`} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={accent} stopOpacity={0} />
          <Stop offset="72%" stopColor={accent} stopOpacity={0.05} />
          <Stop offset="88%" stopColor={accent} stopOpacity={0.45 * (0.5 + energy * 0.6)} />
          <Stop offset="100%" stopColor={accent} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={100} cy={100} r={88} fill={`url(#${id}-edge)`} />
      <Circle cx={100} cy={100} r={58 + pulse * 2} stroke={accent} strokeWidth={2 + pulse * 0.8} fill="none" opacity={0.7} />
      <Circle cx={100} cy={100} r={40 + energy * 10} stroke={accent} strokeWidth={0.8} fill="none" opacity={0.25} />
    </G>
  );
}

function Pulse({ t, energy, accent }: Ctx) {
  return (
    <G>
      {[0, 1, 2, 3].map((index) => {
        const phase = (t * 0.4 + index / 4) % 1;
        const radius = 8 + phase * 86;
        const opacity = (1 - phase) * (0.25 + energy * 0.5);
        return <Circle key={index} cx={100} cy={100} r={radius} stroke={accent} strokeWidth={1.4} fill="none" opacity={opacity} />;
      })}
      <Circle cx={100} cy={100} r={9 + energy * 4} fill={accent} opacity={0.85} />
    </G>
  );
}

function WaveformRing({ t, energy, accent }: Ctx) {
  const bars = 36;
  return (
    <G>
      {Array.from({ length: bars }).map((_, index) => {
        const angle = (index / bars) * Math.PI * 2;
        const wave = Math.abs(Math.sin(t * 2.2 + index * 0.55)) * (0.3 + energy);
        const inner = 44;
        const outer = inner + 6 + wave * 22;
        const x1 = 100 + Math.cos(angle) * inner;
        const y1 = 100 + Math.sin(angle) * inner;
        const x2 = 100 + Math.cos(angle) * outer;
        const y2 = 100 + Math.sin(angle) * outer;
        return <Line key={index} x1={x1} y1={y1} x2={x2} y2={y2} stroke={accent} strokeWidth={2.2} strokeLinecap="round" opacity={0.35 + wave * 0.55} />;
      })}
      <Circle cx={100} cy={100} r={36} stroke={accent} strokeWidth={0.6} fill="none" opacity={0.3} />
    </G>
  );
}

function GlassOrb({ t, energy, accent, id }: Ctx) {
  const wobble = 1 + Math.sin(t * 0.8) * 0.02;
  return (
    <G>
      <Defs>
        <RadialGradient id={`${id}-body`} cx="38%" cy="30%" r="72%">
          <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.55} />
          <Stop offset="42%" stopColor={accent} stopOpacity={0.28} />
          <Stop offset="100%" stopColor="#000000" stopOpacity={0.85} />
        </RadialGradient>
        <RadialGradient id={`${id}-rim`} cx="50%" cy="50%" r="50%">
          <Stop offset="82%" stopColor={accent} stopOpacity={0} />
          <Stop offset="100%" stopColor={accent} stopOpacity={0.6} />
        </RadialGradient>
      </Defs>
      <Circle cx={100} cy={100} r={72 * wobble} fill={`url(#${id}-body)`} />
      <Circle cx={100} cy={100} r={72 * wobble} fill={`url(#${id}-rim)`} />
      <Ellipse cx={82} cy={68} rx={22} ry={12} fill="#ffffff" opacity={0.24} />
      <Circle cx={100} cy={100} r={72 * wobble} stroke="#ffffff" strokeOpacity={0.22} strokeWidth={0.8} fill="none" />
      <Circle cx={100} cy={100} r={26 + energy * 12} fill={accent} opacity={0.18} />
    </G>
  );
}

function Mercury({ t, energy, accent, id }: Ctx) {
  const points = 10;
  let d = '';
  for (let index = 0; index <= points; index += 1) {
    const angle = (index / points) * Math.PI * 2;
    const radius = 56 + Math.sin(angle * 3 + t * 1.4) * (5 + energy * 8) + Math.cos(angle * 5 - t) * 3;
    const x = 100 + Math.cos(angle) * radius;
    const y = 100 + Math.sin(angle) * radius;
    d += index === 0 ? `M${x} ${y}` : `L${x} ${y}`;
  }
  d += 'Z';
  return (
    <G>
      <Defs>
        <RadialGradient id={`${id}-mercury`} cx="35%" cy="28%" r="80%">
          <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.9} />
          <Stop offset="45%" stopColor={accent} stopOpacity={0.7} />
          <Stop offset="100%" stopColor="#0a0a12" stopOpacity={0.95} />
        </RadialGradient>
      </Defs>
      <Path d={d} fill={`url(#${id}-mercury)`} />
      <Path d={d} stroke="#ffffff" strokeOpacity={0.28} strokeWidth={0.8} fill="none" />
    </G>
  );
}

function Gooey({ t, energy, accent }: Ctx) {
  const blobs = [
    { x: 88 + Math.sin(t * 0.9) * 6, y: 92 + Math.cos(t * 0.7) * 6, r: 30 },
    { x: 112 + Math.cos(t * 0.8) * 7, y: 96 + Math.sin(t * 1.1) * 5, r: 26 },
    { x: 100 + Math.sin(t * 1.2) * 4, y: 112 + Math.cos(t * 0.6) * 5, r: 22 },
  ];
  return (
    <G>
      {blobs.map((blob, index) => (
        <Circle key={index} cx={blob.x} cy={blob.y} r={blob.r * (1 + energy * 0.08)} fill={accent} opacity={0.65} />
      ))}
      <Circle cx={100} cy={100} r={70} stroke={accent} strokeWidth={0.7} fill="none" opacity={0.18} />
    </G>
  );
}

function Minimal({ t, energy, accent }: Ctx) {
  const scale = 1 + Math.sin(t * 1.1) * 0.015 + energy * 0.04;
  return (
    <G>
      <Circle cx={100} cy={100} r={70 * scale} stroke={accent} strokeWidth={0.6} fill="none" opacity={0.35} />
      <Circle cx={100} cy={100} r={4 + energy * 3} fill="#ffffff" opacity={0.9} />
      <Circle cx={100} cy={100} r={18 + energy * 10} fill={accent} opacity={0.12} />
    </G>
  );
}

function Plasma({ t, energy, accent, id }: Ctx) {
  const blobs = [
    { x: 100 + Math.sin(t * 0.7) * 26, y: 100 + Math.cos(t * 0.9) * 22, r: 52, c: accent },
    { x: 100 + Math.cos(t * 0.55) * 30, y: 100 + Math.sin(t * 0.8) * 26, r: 44, c: '#7ee7ff' },
    { x: 100 + Math.sin(t * 1.1 + 2) * 18, y: 100 + Math.cos(t * 0.65 + 1) * 24, r: 36, c: '#b48cff' },
  ];
  return (
    <G>
      <Defs>
        {blobs.map((blob, index) => (
          <RadialGradient key={index} id={`${id}-plasma-${index}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={blob.c} stopOpacity={0.55 + energy * 0.25} />
            <Stop offset="60%" stopColor={blob.c} stopOpacity={0.16} />
            <Stop offset="100%" stopColor={blob.c} stopOpacity={0} />
          </RadialGradient>
        ))}
      </Defs>
      {blobs.map((blob, index) => (
        <Circle key={index} cx={blob.x} cy={blob.y} r={blob.r} fill={`url(#${id}-plasma-${index})`} />
      ))}
      <Circle cx={100} cy={100} r={40} stroke="#ffffff" strokeOpacity={0.12} fill="none" />
    </G>
  );
}

function Aurora({ t, energy, accent }: Ctx) {
  return (
    <G>
      {[0, 1, 2, 3].map((index) => {
        const offset = index * 14 - 21;
        let d = `M18 ${100 + offset}`;
        for (let step = 1; step <= 8; step += 1) {
          const x = 18 + (step / 8) * 164;
          const y = 100 + offset + Math.sin(t * 1.3 + step * 0.7 + index) * (6 + energy * 10);
          d += ` Q${x - 10} ${y - 6} ${x} ${y}`;
        }
        return <Path key={index} d={d} stroke={index % 2 === 0 ? accent : '#7affc1'} strokeWidth={7} strokeLinecap="round" fill="none" opacity={0.18 + energy * 0.16} />;
      })}
    </G>
  );
}

function Iridescent({ t, energy, accent, id }: Ctx) {
  return (
    <G>
      <Defs>
        <RadialGradient id={`${id}-iri`} cx="40%" cy="35%" r="75%">
          <Stop offset="0%" stopColor="#7ee7ff" stopOpacity={0.5} />
          <Stop offset="45%" stopColor={accent} stopOpacity={0.45} />
          <Stop offset="75%" stopColor="#ff8ad0" stopOpacity={0.3} />
          <Stop offset="100%" stopColor="#000000" stopOpacity={0.1} />
        </RadialGradient>
      </Defs>
      <Circle cx={100} cy={100} r={68} fill={`url(#${id}-iri)`} opacity={0.75} />
      <Circle cx={100} cy={100} r={68} stroke="#ffffff" strokeOpacity={0.18} fill="none" />
      {[0, 1, 2].map((index) => {
        const radius = 26 + index * 14 + Math.sin(t * 1.2 + index) * (2 + energy * 4);
        return <Circle key={index} cx={100} cy={100} r={radius} stroke="#ffffff" strokeOpacity={0.22} strokeWidth={0.7} fill="none" />;
      })}
    </G>
  );
}

function SiriSheet({ t, energy, accent, id }: Ctx) {
  const width = 96 + Math.sin(t * 1.6) * (4 + energy * 18);
  return (
    <G>
      <Defs>
        <RadialGradient id={`${id}-sheet`} cx="50%" cy="50%" r="60%">
          <Stop offset="0%" stopColor={accent} stopOpacity={0.5 + energy * 0.3} />
          <Stop offset="100%" stopColor={accent} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={100} cy={100} rx={92} ry={62} fill={`url(#${id}-sheet)`} opacity={0.7} />
      <Rect x={100 - width / 2} y={94} width={width} height={12} rx={6} fill="#ffffff" opacity={0.85} />
      <Rect x={100 - width / 3} y={77} width={(width * 2) / 3} height={6} rx={3} fill={accent} opacity={0.55} />
      <Rect x={100 - width / 4} y={112} width={width / 2} height={5} rx={2.5} fill={accent} opacity={0.4} />
    </G>
  );
}

function SiriWave({ t, energy, accent }: Ctx) {
  let d = 'M8 100';
  for (let step = 1; step <= 40; step += 1) {
    const x = 8 + (step / 40) * 184;
    const damp = Math.sin((step / 40) * Math.PI);
    const y = 100 + Math.sin(step * 0.45 - t * 4) * damp * (10 + energy * 30);
    d += ` L${x} ${y}`;
  }
  return (
    <G>
      <Path d={d} stroke={accent} strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.9} />
      <Path d={d} stroke={accent} strokeWidth={12} strokeLinecap="round" fill="none" opacity={0.14} />
    </G>
  );
}

function Equalizer({ t, energy, accent }: Ctx) {
  const bars = 11;
  return (
    <G>
      {Array.from({ length: bars }).map((_, index) => {
        const height = 14 + Math.abs(Math.sin(t * 2.4 + index * 0.7)) * (14 + energy * 62);
        const x = 34 + index * 12;
        return <Rect key={index} x={x} y={100 - height / 2} width={5} height={height} rx={2.5} fill={accent} opacity={0.35 + (index % 3) * 0.2} />;
      })}
    </G>
  );
}

function Structural({ orb, t, energy, id }: { orb: OrbDef; t: number; energy: number; id: string }) {
  const ctx = { t, energy, accent: orb.accent, id };
  switch (orb.id) {
    case 'halo':
      return <Halo {...ctx} />;
    case 'edge-glow':
      return <EdgeGlow {...ctx} />;
    case 'pulse':
      return <Pulse {...ctx} />;
    case 'waveform-ring':
      return <WaveformRing {...ctx} />;
    case 'glass':
      return <GlassOrb {...ctx} />;
    case 'mercury':
      return <Mercury {...ctx} />;
    case 'gooey':
      return <Gooey {...ctx} />;
    case 'minimal':
      return <Minimal {...ctx} />;
    case 'plasma':
      return <Plasma {...ctx} />;
    case 'aurora':
      return <Aurora {...ctx} />;
    case 'iridescent':
      return <Iridescent {...ctx} />;
    case 'siri-sheet':
      return <SiriSheet {...ctx} />;
    case 'siri-wave':
      return <SiriWave {...ctx} />;
    case 'equalizer':
      return <Equalizer {...ctx} />;
    default:
      return <Halo {...ctx} />;
  }
}

function OrbViewInner({ size, state = 'idle', variant, levelRef, preview = false }: OrbViewProps) {
  const orb = findOrb(variant);
  const energy = ENERGY[state] ?? 0.3;
  const rawId = useId();
  const id = rawId.replace(/[^a-zA-Z0-9]/g, '');
  const active = state !== 'disabled';
  const fps = preview ? 18 : 30;
  const time = useFrame(active && orb.family !== 'particles', fps);

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {orb.family === 'particles' ? (
        <ParticleOrbInline
          size={size}
          orb={orb}
          energy={energy}
          levelRef={levelRef}
          count={Math.round((orb.density ?? 420) * (preview ? 0.32 : 1))}
          fps={fps}
        />
      ) : (
        <Svg width={size} height={size} viewBox="0 0 200 200">
          <Structural orb={orb} t={time} energy={energy} id={id} />
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const OrbView = memo(OrbViewInner);
