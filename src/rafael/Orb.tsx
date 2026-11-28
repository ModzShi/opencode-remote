import React from 'react';
import { ClassicOrb } from './ClassicOrb';
import { MercuryOrb } from './MercuryOrb';
import { ParticleOrb, type OrbState } from './ParticleOrb';
import { SiriWaveOrb } from './SiriWaveOrb';

export type { OrbState };

export type OrbStyle = 'particles' | 'plasma' | 'siri' | 'mercury';

export const ORB_STYLES: { id: OrbStyle; name: string; hint: string }[] = [
  { id: 'particles', name: 'Original', hint: 'o orbe de partículas do começo, intacto' },
  { id: 'plasma', name: 'Plasma', hint: 'partículas com as suas cores' },
  { id: 'siri', name: 'Siri Wave', hint: 'ondas suaves' },
  { id: 'mercury', name: 'Mercury', hint: 'líquido metálico' },
];

export function findOrbStyle(id?: string | null): OrbStyle {
  if (id === 'plasma' || id === 'siri' || id === 'mercury') return id;
  return 'particles';
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
  if (style === 'particles') {
    return <ClassicOrb size={size} state={state} levelRef={levelRef} animate={animate} />;
  }
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
