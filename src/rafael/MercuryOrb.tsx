import React, { memo, useEffect, useRef } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, RadialGradient, Stop } from 'react-native-svg';
import { mixHex, useOrbColors, withAlpha } from './colors';
import type { OrbState } from './ParticleOrb';

const FRAME_MS = 33;
const RADIUS = 72;

const ENERGY: Record<OrbState, number> = {
  idle: 0.18,
  connecting: 0.42,
  listening: 0.9,
  thinking: 0.5,
  speaking: 0.72,
  error: 0.8,
  disabled: 0.06,
};

interface MercuryOrbProps {
  size: number;
  state: OrbState;
  levelRef?: { current: number };
  colorFrom: string;
  colorTo: string;
  cycle: boolean;
  animate?: boolean;
}

const approach = (value: number, target: number, rate: number, dt: number) =>
  value + (target - value) * (1 - Math.exp(-rate * dt));

function MercuryOrbInner({ size, state, levelRef, colorFrom, colorTo, cycle, animate = true }: MercuryOrbProps) {
  const stateRef = useRef<OrbState>(state);
  const blobs = useRef<(React.ElementRef<typeof Ellipse> | null)[]>([]);
  const spec = useRef<React.ElementRef<typeof Circle> | null>(null);
  const palette = useOrbColors(colorFrom, colorTo, cycle);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    let frameId = 0;
    let running = true;
    let lastDraw = 0;
    const started = Date.now();
    let last = started;
    let energy = ENERGY[stateRef.current];
    let level = 0;

    const draw = (time: number) => {
      const speed = 0.25 + energy * 0.7;
      const squash = 1 + energy * 0.05;

      for (let index = 0; index < blobs.current.length; index += 1) {
        const node = blobs.current[index];
        if (!node) continue;
        const phase = time * speed + index * 1.7;
        const orbit = RADIUS * (0.42 + index * 0.09);
        const cx = 100 + Math.cos(phase) * orbit;
        const cy = 96 + Math.sin(phase * 1.13 + index) * orbit * 0.55;
        const rx = (22 + index * 6) * (1 + Math.sin(phase * 0.9) * 0.12) * squash;
        const ry = rx * (0.62 + 0.1 * Math.cos(phase * 1.4));
        node.setNativeProps({ cx, cy, rx, ry });
      }

      if (spec.current) {
        const phase = time * (0.6 + energy);
        spec.current.setNativeProps({
          cx: 100 + Math.cos(phase) * 26,
          cy: 74 + Math.sin(phase * 1.3) * 14,
          opacity: 0.55 + energy * 0.35,
        });
      }
    };

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
      level = approach(level, levelRef?.current ?? 0, 8, dt);
      energy = approach(energy, Math.min(1, ENERGY[stateRef.current] + level * 0.5), 4, dt);
      draw(time);
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

    if (animate) frameId = requestAnimationFrame(loop);
    else draw(0.4);

    return () => {
      running = false;
      subscription.remove();
      cancelAnimationFrame(frameId);
    };
  }, [animate, levelRef]);

  const light = mixHex(palette.core, '#ffffff', 0.45);
  const edge = mixHex(palette.glow, '#050505', 0.35);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Defs>
          <RadialGradient id="mercury-body" cx="0.38" cy="0.3" r="0.85">
            <Stop offset="0" stopColor={light} />
            <Stop offset="0.42" stopColor={palette.core} />
            <Stop offset="0.78" stopColor={palette.glow} />
            <Stop offset="1" stopColor={edge} />
          </RadialGradient>
          <RadialGradient id="mercury-high" cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={withAlpha(light, 0.85)} />
            <Stop offset="0.6" stopColor={withAlpha(palette.core, 0.25)} />
            <Stop offset="1" stopColor={withAlpha(palette.glow, 0)} />
          </RadialGradient>
          <LinearGradient id="mercury-rim" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={withAlpha('#ffffff', 0.85)} />
            <Stop offset="0.45" stopColor={withAlpha(palette.core, 0.25)} />
            <Stop offset="1" stopColor={withAlpha('#ffffff', 0.05)} />
          </LinearGradient>
        </Defs>

        <Circle cx={100} cy={100} r={RADIUS} fill="url(#mercury-body)" />

        {[0, 1, 2, 3].map((index) => (
          <Ellipse
            key={`blob-${index}`}
            ref={(node) => {
              blobs.current[index] = node;
            }}
            cx={100}
            cy={96}
            rx={30}
            ry={20}
            fill="url(#mercury-high)"
            opacity={index === 0 ? 0.85 : 0.5 - index * 0.08}
          />
        ))}

        <Ellipse cx={104} cy={142} rx={58} ry={18} fill={withAlpha(edge, 0.55)} />
        <Circle cx={100} cy={100} r={RADIUS} fill="none" stroke="url(#mercury-rim)" strokeWidth={1.6} />
        <Circle cx={100} cy={100} r={RADIUS - 6} fill="none" stroke={withAlpha(light, 0.16)} strokeWidth={1} />

        <Circle ref={spec} cx={82} cy={70} r={7} fill={withAlpha('#ffffff', 0.75)} />
        <Circle cx={128} cy={64} r={2.6} fill={withAlpha('#ffffff', 0.6)} />
      </Svg>
    </View>
  );
}

export const MercuryOrb = memo(MercuryOrbInner);

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
});
