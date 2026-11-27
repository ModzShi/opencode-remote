let energy = 0;
let idle = 0;

/** Injeta energia vinda de texto/voz (delta de fala). */
export function pushEnergy(amount: number) {
  energy = Math.min(1.6, energy + Math.min(0.5, amount * 0.045));
}

export function tickSignal(deltaSeconds: number): number {
  idle += deltaSeconds;
  energy *= Math.max(0, 1 - deltaSeconds * 2.6);
  const breathing = 0.12 + 0.06 * Math.sin(idle * 1.4);
  return Math.min(1, breathing + energy * 0.55);
}
