import React, { memo, useEffect, useRef } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { mixHex, useOrbColors } from './colors';
import type { OrbState } from './ParticleOrb';

const LINES = 5;
const POINTS = 48;
const FRAME_MS = 33;
const WIDTH = 200;
const HEIGHT = 200;
const CENTER_Y = 100;

const AMP = [1, 0.78, 0.6, 0.44, 0.3];
const FREQ = [1.5, 2.3, 3.2, 4.3, 5.6];
const WIDTHS = [8, 3.4, 2.3, 1.6, 1.1];
const ALPHAS = [0.12, 0.92, 0.6, 0.4, 0.26];

interface Step {
  energy: number;
  speed: number;
}

const STEPS: Record<OrbState, Step> = {
  idle: { energy: 0.16, speed: 0.7 },
  connecting: { energy: 0.34, speed: 1.5 },
  listening: { energy: 0.72, speed: 2.6 },
  thinking: { energy: 0.38, speed: 1.9 },
  speaking: { energy: 0.56, speed: 3.1 },
  error: { energy: 0.5, speed: 2.2 },
  disabled: { energy: 0.06, speed: 0.2 },
};

interface SiriWaveOrbProps {
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

function SiriWaveOrbInner({ size, state, levelRef, colorFrom, colorTo, cycle, animate = true }: SiriWaveOrbProps) {
  const paths = useRef<(React.ElementRef<typeof Path> | null)[]>([]);
  const stateRef = useRef<OrbState>(state);
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
    let energy = STEPS[stateRef.current].energy;
    let speed = STEPS[stateRef.current].speed;
    let level = 0;

    const draw = (time: number) => {
      const amp = 30 * (0.28 + energy * 0.82);
      const phaseBase = time * speed;

      for (let line = 0; line < LINES; line += 1) {
        const node = paths.current[line];
        if (!node) continue;
        const lineAmp = amp * AMP[line];
        const freq = FREQ[line];
        let d = '';
        for (let point = 0; point <= POINTS; point += 1) {
          const u = point / POINTS;
          const envelope = Math.pow(Math.sin(Math.PI * u), 0.65);
          const x = 8 + u * (WIDTH - 16);
          const y =
            CENTER_Y +
            lineAmp * envelope * Math.sin(u * freq * 6.28318 - phaseBase * (1 + line * 0.12) + line * 0.9);
          d += (point === 0 ? 'M' : 'L') + (x * 10 | 0) / 10 + ' ' + ((y * 10) | 0) / 10;
        }
        node.setNativeProps({ d });
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
      const target = STEPS[stateRef.current];
      level = approach(level, levelRef?.current ?? 0, 8, dt);
      energy = approach(energy, Math.min(1, target.energy + level * 0.6), 5, dt);
      speed = approach(speed, target.speed, 3, dt);
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

    if (animate) {
      frameId = requestAnimationFrame(loop);
    } else {
      draw(0);
    }

    return () => {
      running = false;
      subscription.remove();
      cancelAnimationFrame(frameId);
    };
  }, [animate, levelRef]);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        {Array.from({ length: LINES }).map((_, line) => (
          <Path
            key={`wave-${line}`}
            ref={(node) => {
              paths.current[line] = node;
            }}
            d="M8 100"
            fill="none"
            stroke={mixHex(palette.core, palette.glow, line / (LINES - 1))}
            strokeWidth={WIDTHS[line]}
            strokeOpacity={ALPHAS[line]}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </Svg>
    </View>
  );
}

export const SiriWaveOrb = memo(SiriWaveOrbInner);

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
});
