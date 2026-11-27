export type OrbFamily = 'particles' | 'rings' | 'glass' | 'flow' | 'bars';

export interface OrbDef {
  id: string;
  name: string;
  family: OrbFamily;
  /** Modo do motor de partículas (quando family = particles). */
  mode?: 'sphere' | 'spiral' | 'disc' | 'grid' | 'noise' | 'nebula';
  accent: string;
  /** Densidade de partículas (particles) ou quantidade de elementos. */
  density?: number;
}

/** Catálogo inspirado na galeria do voiceorbs. */
export const ORBS: OrbDef[] = [
  { id: 'particles', name: 'Particles', family: 'particles', mode: 'sphere', accent: '#7ee7ff', density: 460 },
  { id: 'galaxy', name: 'Galaxy', family: 'particles', mode: 'spiral', accent: '#b48cff', density: 520 },
  { id: 'nebula', name: 'Nebula', family: 'particles', mode: 'nebula', accent: '#ff8ad0', density: 380 },
  { id: 'aura-field', name: 'Aura Field', family: 'particles', mode: 'disc', accent: '#8affc1', density: 340 },
  { id: 'dither', name: 'Dither', family: 'particles', mode: 'grid', accent: '#d9e6ff', density: 320 },
  { id: 'grain', name: 'Grain', family: 'particles', mode: 'noise', accent: '#ffffff', density: 300 },
  { id: 'halo', name: 'Halo', family: 'rings', accent: '#9adcff' },
  { id: 'edge-glow', name: 'Edge Glow', family: 'rings', accent: '#7ee7ff' },
  { id: 'pulse', name: 'Pulse', family: 'rings', accent: '#9d8bff' },
  { id: 'waveform-ring', name: 'Waveform Ring', family: 'rings', accent: '#7affd8' },
  { id: 'glass', name: 'Glass', family: 'glass', accent: '#cfe9ff' },
  { id: 'mercury', name: 'Mercury', family: 'glass', accent: '#dfe7f5' },
  { id: 'gooey', name: 'Gooey', family: 'glass', accent: '#ff9ad5' },
  { id: 'minimal', name: 'Minimal', family: 'glass', accent: '#ffffff' },
  { id: 'plasma', name: 'Plasma', family: 'flow', accent: '#ff7ac6' },
  { id: 'aurora', name: 'Aurora', family: 'flow', accent: '#7affc1' },
  { id: 'iridescent', name: 'Iridescent Flow', family: 'flow', accent: '#9d8bff' },
  { id: 'siri-sheet', name: 'Siri Sheet', family: 'flow', accent: '#7ee7ff' },
  { id: 'siri-wave', name: 'Siri Wave', family: 'bars', accent: '#9adcff' },
  { id: 'equalizer', name: 'Equalizer', family: 'bars', accent: '#7affd8' },
];

export const DEFAULT_ORB = ORBS[0].id;

export function findOrb(id?: string | null): OrbDef {
  return ORBS.find((orb) => orb.id === id) ?? ORBS[0];
}
