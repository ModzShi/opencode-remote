import type { ThemeColors } from './index';

/*
 * Sub-cores prontas: trocam o azul/roxo do app sem mexer no resto do tema.
 * Cada preset tem uma versão para o tema claro e uma para o escuro.
 */
export interface AccentPreset {
  id: string;
  name: string;
  light: { primary: string; accent: string };
  dark: { primary: string; accent: string };
}

export const ACCENT_PRESETS: AccentPreset[] = [
  {
    id: 'neon',
    name: 'Neon',
    light: { primary: '#0A6CD6', accent: '#0A6CD6' },
    dark: { primary: '#7EE7FF', accent: '#9D8BFF' },
  },
  {
    id: 'aurora',
    name: 'Aurora',
    light: { primary: '#0E9F8A', accent: '#0A6CD6' },
    dark: { primary: '#5CF2C8', accent: '#7EE7FF' },
  },
  {
    id: 'violeta',
    name: 'Violeta',
    light: { primary: '#6D28D9', accent: '#DB2777' },
    dark: { primary: '#B79CFF', accent: '#FF8BD0' },
  },
  {
    id: 'ember',
    name: 'Ember',
    light: { primary: '#C2410C', accent: '#B45309' },
    dark: { primary: '#FFA26B', accent: '#FFD166' },
  },
  {
    id: 'gelo',
    name: 'Gelo',
    light: { primary: '#0369A1', accent: '#0284C7' },
    dark: { primary: '#9BE7FF', accent: '#C7D2FE' },
  },
  {
    id: 'mono',
    name: 'Mono',
    light: { primary: '#111827', accent: '#4B5563' },
    dark: { primary: '#F5F5F7', accent: '#B9BDC7' },
  },
];

export const DEFAULT_ACCENT = 'neon';

function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${red},${green},${blue},${alpha})`;
}

/** Aplica uma sub-cor pronta sobre as cores do tema atual. */
export function withAccent(
  colors: ThemeColors,
  mode: 'light' | 'dark',
  presetId?: string | null
): ThemeColors {
  const preset = ACCENT_PRESETS.find((item) => item.id === presetId);
  if (!preset || preset.id === DEFAULT_ACCENT) return colors;

  const tone = mode === 'dark' ? preset.dark : preset.light;
  const dark = mode === 'dark';
  return {
    ...colors,
    primary: tone.primary,
    primaryForeground: dark ? '#00131A' : '#FFFFFF',
    primaryMuted: hexToRgba(tone.primary, dark ? 0.14 : 0.1),
    ring: tone.primary,
    accent: tone.accent,
    accentForeground: dark ? '#0B0614' : '#FFFFFF',
    bubbleUser: hexToRgba(tone.primary, dark ? 0.1 : 0.09),
    bubbleUserBorder: hexToRgba(tone.primary, dark ? 0.24 : 0.18),
  };
}
