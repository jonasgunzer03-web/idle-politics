// Tagesrhythmus der Welt (rein optisch). Aus der Uhrzeit wird eine Phase 0…1 berechnet:
// 0 = Morgen, 0,25 = Mittag, 0,5 = Abend, 0,75 = Mitternacht. Daraus die Deckkraft der
// Ebenen (Tag, Dämmerung, Nacht) und die Winkel von Sonne und Mond.

export interface DayLight {
  day: number;
  dusk: number;
  night: number;
  /** Winkel des Sonnenarms in Grad (−80 = Aufgang links, 80 = Untergang rechts). */
  sun: number;
  moon: number;
}

function ramp(x: number, from: number, to: number): number {
  if (x <= from) return 0;
  if (x >= to) return 1;
  return (x - from) / (to - from);
}

export function dayPhase(nowMs: number, cycleSeconds: number): number {
  const cycle = Math.max(1, cycleSeconds) * 1000;
  return (nowMs % cycle) / cycle;
}

export function dayLight(phase: number): DayLight {
  const p = ((phase % 1) + 1) % 1;
  // Nacht: blendet von 0,52 bis 0,62 ein und von 0,9 bis 0,98 aus
  const night = p < 0.75 ? ramp(p, 0.52, 0.62) : 1 - ramp(p, 0.9, 0.98);
  // Dämmerung: Abendrot um 0,55, Morgenrot um 0,94
  const eveningDusk = p < 0.55 ? ramp(p, 0.46, 0.55) : 1 - ramp(p, 0.55, 0.64);
  const morningDusk = p < 0.94 ? ramp(p, 0.88, 0.94) * 0.8 : 0.8 * (1 - ramp(p, 0.94, 1));
  const dusk = Math.max(eveningDusk, morningDusk);
  const sun = p <= 0.55 ? -80 + (160 * p) / 0.55 : 180;
  const moon = p >= 0.55 ? -80 + (160 * (p - 0.55)) / 0.43 : -180;
  return { day: 1 - night, dusk, night, sun, moon: Math.min(80, moon) };
}
