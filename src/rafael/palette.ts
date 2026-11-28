export interface Palette {
  core: string;
  glow: string;
  ring: string;
  accent: string;
}

interface Stops {
  name: string;
  hue: number;
  glowHue: number;
  sat: number;
}

const STOPS: Stops[] = [
  { name: 'aurora', hue: 168, glowHue: 190, sat: 92 },
  { name: 'violeta', hue: 268, glowHue: 286, sat: 88 },
  { name: 'ambar', hue: 24, glowHue: 8, sat: 96 },
  { name: 'gelo', hue: 205, glowHue: 185, sat: 74 },
  { name: 'acido', hue: 86, glowHue: 62, sat: 90 },
];

function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.min(100, Math.max(0, s)) / 100;
  const light = Math.min(100, Math.max(0, l)) / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;
  let rgb: [number, number, number];
  if (hue < 60) rgb = [c, x, 0];
  else if (hue < 120) rgb = [x, c, 0];
  else if (hue < 180) rgb = [0, c, x];
  else if (hue < 240) rgb = [0, x, c];
  else if (hue < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  const toHex = (value: number) =>
    Math.round((value + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(rgb[0])}${toHex(rgb[1])}${toHex(rgb[2])}`;
}

function lerp(a: number, b: number, t: number): number {
  const delta = ((b - a + 540) % 360) - 180;
  return ((a + delta * t) % 360 + 360) % 360;
}

/**
 * Paleta viva: percorre os estilos devagar, interpolando matiz e saturação.
 * `t` em segundos; cada estilo leva CYCLE_SECONDS para nascer e morrer.
 */
export function paletteAt(t: number): Palette {
  const per = 26;
  const raw = t / per;
  const index = Math.floor(raw) % STOPS.length;
  const next = (index + 1) % STOPS.length;
  const blend = (raw % 1);
  const eased = blend * blend * (3 - 2 * blend);
  const from = STOPS[index];
  const to = STOPS[next];
  const hue = lerp(from.hue, to.hue, eased);
  const glowHue = lerp(from.glowHue, to.glowHue, eased);
  const sat = from.sat + (to.sat - from.sat) * eased;

  return {
    core: hslToHex(hue, sat, 62),
    glow: hslToHex(glowHue, sat, 52),
    ring: hslToHex(hue, sat * 0.9, 70),
    accent: hslToHex(glowHue, Math.min(100, sat + 4), 74),
  };
}
