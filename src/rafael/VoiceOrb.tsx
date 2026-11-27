import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, Path, RadialGradient, Stop } from 'react-native-svg';
import { paletteAt } from './palette';
import { tickSignal } from './signal';

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface VoiceOrbProps {
  size: number;
  state: OrbState;
}

interface Frame {
  rings: string[];
  core: number;
  halo: number;
  haloOpacity: number;
  particles: { x: number; y: number; opacity: number }[];
}

const PARTICLES = 7;
const RADII = [58, 74, 90];
const SEEDS = [0, 2.1, 4.4];
const SPEEDS = [1, 0.72, 0.5];

function ringPath(radius: number, amp: number, time: number, seed: number, speed: number): string {
  const points: string[] = [];
  const steps = 64;
  for (let index = 0; index < steps; index += 1) {
    const angle = (index / steps) * Math.PI * 2;
    const wobble =
      Math.sin(angle * 3 + time * 1.5 * speed + seed) * 0.6 +
      Math.sin(angle * 5 - time * 1.1 * speed + seed * 2) * 0.4;
    const radiusNow = radius + wobble * (3 + amp * 26) + amp * 5;
    points.push(`${(Math.cos(angle) * radiusNow).toFixed(2)},${(Math.sin(angle) * radiusNow).toFixed(2)}`);
  }
  return `M${points.join('L')}Z`;
}

function buildFrame(time: number, amplitude: number): Frame {
  const rings = RADII.map((radius, index) =>
    ringPath(radius, amplitude * (1 - index * 0.22), time, SEEDS[index], SPEEDS[index])
  );
  const particles = Array.from({ length: PARTICLES }).map((_, index) => {
    const angle = time * (0.5 + index * 0.09) + index * 1.9;
    const radius = 66 + Math.sin(time * 0.9 + index) * 14 + amplitude * 10;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      opacity: 0.35 + amplitude * 0.55,
    };
  });
  return {
    rings,
    core: 30 + amplitude * 12,
    halo: 62 + amplitude * 22,
    haloOpacity: 0.16 + amplitude * 0.3,
    particles,
  };
}

const STATIC_FRAME = buildFrame(0, 0.12);

export function VoiceOrb({ size, state }: VoiceOrbProps) {
  const [palette, setPalette] = useState(() => paletteAt(0));
  const [frame, setFrame] = useState<Frame | null>(null);
  const [fallback, setFallback] = useState(false);

  const rings = useRef<(React.ElementRef<typeof Path> | null)[]>([]);
  const coreRef = useRef<React.ElementRef<typeof Circle> | null>(null);
  const haloRef = useRef<React.ElementRef<typeof Circle> | null>(null);
  const particles = useRef<(React.ElementRef<typeof Circle> | null)[]>([]);
  const stateRef = useRef<OrbState>(state);
  const fallbackRef = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    let frameId = 0;
    const start = Date.now();
    let last = start;
    let colourClock = 0;
    let stateClock = 0;

    const apply = (node: { setNativeProps?: (props: Record<string, unknown>) => void } | null, props: Record<string, unknown>) => {
      if (!node || typeof node.setNativeProps !== 'function') return false;
      try {
        node.setNativeProps(props);
        return true;
      } catch {
        return false;
      }
    };

    const loop = () => {
      const now = Date.now();
      const delta = Math.min(0.05, (now - last) / 1000);
      last = now;
      const time = (now - start) / 1000;

      const mode = stateRef.current;
      const gain = mode === 'listening' ? 1.35 : mode === 'thinking' ? 0.9 : mode === 'speaking' ? 1.15 : 1;
      const amplitude = tickSignal(delta) * gain;
      const next = buildFrame(time, amplitude);

      if (!fallbackRef.current) {
        const ok =
          apply(rings.current[0], { d: next.rings[0] }) &&
          apply(rings.current[1], { d: next.rings[1] }) &&
          apply(rings.current[2], { d: next.rings[2] });
        apply(coreRef.current, { r: next.core });
        apply(haloRef.current, { r: next.halo, opacity: next.haloOpacity });
        next.particles.forEach((particle, index) => {
          apply(particles.current[index], { cx: particle.x, cy: particle.y, opacity: particle.opacity });
        });

        if (!ok) {
          fallbackRef.current = true;
          setFallback(true);
        }
      }

      if (fallbackRef.current) {
        stateClock += delta;
        if (stateClock > 0.055) {
          stateClock = 0;
          setFrame(next);
        }
      }

      colourClock += delta;
      if (colourClock > 0.24) {
        colourClock = 0;
        setPalette(paletteAt(time));
      }

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const current = fallback && frame ? frame : STATIC_FRAME;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="-100 -100 200 200">
        <Defs>
          <RadialGradient id="rafael-core" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={palette.core} stopOpacity={0.98} />
            <Stop offset="55%" stopColor={palette.glow} stopOpacity={0.55} />
            <Stop offset="100%" stopColor={palette.glow} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="rafael-halo" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={palette.glow} stopOpacity={0.55} />
            <Stop offset="70%" stopColor={palette.glow} stopOpacity={0.08} />
            <Stop offset="100%" stopColor={palette.glow} stopOpacity={0} />
          </RadialGradient>
        </Defs>

        <Circle
          ref={haloRef}
          cx={0}
          cy={0}
          r={current.halo}
          fill="url(#rafael-halo)"
          opacity={current.haloOpacity}
        />

        <G>
          {RADII.map((radius, index) => (
            <Path
              key={`ring-${index}`}
              ref={(node) => {
                rings.current[index] = node;
              }}
              d={current.rings[index] || ringPath(radius, 0.12, 0, SEEDS[index], 1)}
              fill="none"
              stroke={index === 0 ? palette.core : palette.ring}
              strokeOpacity={0.75 - index * 0.18}
              strokeWidth={index === 0 ? 1.6 : 0.9}
            />
          ))}
        </G>

        <Circle ref={coreRef} cx={0} cy={0} r={current.core} fill="url(#rafael-core)" />
        <Circle cx={0} cy={0} r={3} fill={palette.accent} opacity={0.9} />

        {Array.from({ length: PARTICLES }).map((_, index) => (
          <Circle
            key={`particle-${index}`}
            ref={(node) => {
              particles.current[index] = node;
            }}
            cx={current.particles[index]?.x ?? 0}
            cy={current.particles[index]?.y ?? 0}
            r={index % 3 === 0 ? 1.6 : 1}
            fill={palette.accent}
            opacity={current.particles[index]?.opacity ?? 0.35}
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
});