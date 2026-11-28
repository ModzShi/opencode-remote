import React from 'react';
import { MercuryOrb } from './MercuryOrb';
import { ParticleOrb, type OrbState } from './ParticleOrb';
import { SiriWaveOrb } from './SiriWaveOrb';

export type { OrbState };

export type OrbStyle = 'particles' | 'siri' | 'mercury';

export const ORB_STYLES: { id: OrbStyle; name: string; hint: string }[] = [
  { id: 'particles', name: 'Partículas', hint: 'o orbe original' },
  { id: 'siri', name: 'Siri Wave', hint: 'ondas suaves' },
  { id: 'mercury', name: 'Mercury', hint: 'líquido metálico' },
];

export function findOrbStyle(id?: string | null): OrbStyle {
  return id === 'siri' || id === 'mercury' ? id : 'particles';
}

interface OrbProps {
  size: number;
  state: OrbState;
  style?: OrbStyle;
  colorFrom: string;
  colorTo: string;
  /** true = paleta viva; false = usa as duas cores escolhidas. */
  cycle: boolean;
  levelRef?: { current: number };
  /** false desenha um quadro parado (miniatura). */
  animate?: boolean;
}

export function Orb({ size, state, style = 'particles', colorFrom, colorTo, cycle, levelRef, animate = true }: OrbProps) {
  if (style === 'siri') {
    return (
      <SiriWaveOrb
        size={size}
        state={state}
        levelRef={levelRef}
        colorFrom={colorFrom}
        colorTo={colorTo}
        cycle={cycle}
        animate={animate}
      />
    );
  }
  if (style === 'mercury') {
    return (
      <MercuryOrb
        size={size}
        state={state}
        levelRef={levelRef}
        colorFrom={colorFrom}
        colorTo={colorTo}
        cycle={cycle}
        animate={animate}
      />
    );
  }
  return (
    <ParticleOrb
      size={size}
      state={state}
      levelRef={levelRef}
      colorFrom={colorFrom}
      colorTo={colorTo}
      cycle={cycle}
      animate={animate}
    />
  );
}
