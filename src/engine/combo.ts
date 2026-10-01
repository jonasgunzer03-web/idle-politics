import type { GameConfig } from '../config';

// Tipp-Kombo: Wer schnell hintereinander tippt, bekommt je Tipp mehr (bis ×3). Der Faktor
// bleibt nach dem letzten Tipp kurz stehen und sinkt dann zurück. Rein für Tipps von Hand,
// Zeitstempel kommen aus der Oberfläche (keine Speicherung im Spielstand).

export interface Combo {
  /** Faktor direkt nach dem letzten Tipp (1 … max). */
  value: number;
  /** Zeitpunkt des letzten Tipps (ms). */
  at: number;
}

export const NO_COMBO: Combo = { value: 1, at: 0 };

/** Aktueller Faktor zum Zeitpunkt `now` (inklusive Abklingen). */
export function comboValue(combo: Combo, now: number, cfg: GameConfig): number {
  const c = cfg.balancing.tapCombo;
  const idle = Math.max(0, (now - combo.at) / 1000 - c.holdSeconds);
  return Math.max(1, Math.min(c.max, combo.value - idle * c.decayPerSecond));
}

/** Neuer Stand nach einem Tipp zum Zeitpunkt `now`. */
export function comboAfterTap(combo: Combo, now: number, cfg: GameConfig): Combo {
  const c = cfg.balancing.tapCombo;
  return { value: Math.min(c.max, comboValue(combo, now, cfg) + c.perTap), at: now };
}
