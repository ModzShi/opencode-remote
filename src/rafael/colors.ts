import { useEffect, useMemo, useState } from 'react';
import { paletteAt, type Palette } from './palette';

export function mixHex(from: string, to: string, amount: number): string {
  const a = [
    Number.parseInt(from.slice(1, 3), 16),
    Number.parseInt(from.slice(3, 5), 16),
    Number.parseInt(from.slice(5, 7), 16),
  ];
  const b = [
    Number.parseInt(to.slice(1, 3), 16),
    Number.parseInt(to.slice(3, 5), 16),
    Number.parseInt(to.slice(5, 7), 16),
  ];
  const channel = (index: number) =>
    Math.round(a[index] + (b[index] - a[index]) * amount)
      .toString(16)
      .padStart(2, '0');
  return `#${channel(0)}${channel(1)}${channel(2)}`;
}

export function withAlpha(hex: string, alpha: number): string {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export interface OrbPreset {
  id: string;
  name: string;
  from: string;
  to: string;
}

export const ORB_PRESETS: OrbPreset[] = [
  { id: 'neon', name: 'Neon', from: '#7EE7FF', to: '#9D8BFF' },
  { id: 'sunset', name: 'Pôr do sol', from: '#FF9A3D', to: '#FF3D8B' },
  { id: 'aurora', name: 'Aurora', from: '#5CFFB0', to: '#2BC4FF' },
  { id: 'violet', name: 'Violeta', from: '#C8A2FF', to: '#6A3BFF' },
  { id: 'ice', name: 'Gelo', from: '#EAF6FF', to: '#7FB6FF' },
  { id: 'fire', name: 'Fogo', from: '#FFD166', to: '#FF4D2E' },
  { id: 'mint', name: 'Menta', from: '#B4FFD9', to: '#12C99B' },
  { id: 'rose', name: 'Rosa', from: '#FFC2DE', to: '#FF3D77' },
  { id: 'gold', name: 'Ouro', from: '#FFE7A3', to: '#C8871A' },
  { id: 'mono', name: 'Prata', from: '#FFFFFF', to: '#8A8F9C' },
];

/** Cores do orbe: fixas ou seguindo a paleta viva, trocando devagar. */
export function useOrbColors(colorFrom: string, colorTo: string, cycle: boolean) {
  const [cycled, setCycled] = useState<Palette>(() => paletteAt(0));

  useEffect(() => {
    if (!cycle) return;
    const id = setInterval(() => setCycled(paletteAt(Date.now() / 1000)), 900);
    return () => clearInterval(id);
  }, [cycle]);

  const fixed = useMemo<Palette>(
    () => ({ core: colorFrom, glow: colorTo, ring: colorFrom, accent: colorTo }),
    [colorFrom, colorTo]
  );

  return cycle ? cycled : fixed;
}
