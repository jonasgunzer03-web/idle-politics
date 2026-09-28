import type { StateId } from '../engine/ids';

// Die Amtstitel stehen in src/i18n/de.ts unter „careers“, damit alle Spieltexte an einer
// Stelle liegen und später übersetzt werden können. Hier steht nur der Aufbau der Leiter.
// Die Anforderungen je Stufe kommen in Phase 2 dazu.

export interface CareerStageDef {
  /** Nummer der Stufe, 1 bis 12. */
  stage: number;
  /** true = auf dem demokratischen Pfad ist für diese Stufe eine gewonnene Wahl nötig (W). */
  election: boolean;
}

function ladder(elections: number[]): CareerStageDef[] {
  return Array.from({ length: 12 }, (_, i) => ({
    stage: i + 1,
    election: elections.includes(i + 1),
  }));
}

export const careers: Record<StateId, CareerStageDef[]> = {
  // Wahl-Stufen laut Spezifikation 4.5
  novaria: ladder([3, 4, 5, 6, 7, 8, 9, 11, 12]),
  rhenania: ladder([2, 3, 4, 5, 6, 9, 11, 12]),
  // Autokratische Staaten: keine echten Wahlen
  borealis: ladder([]),
  zentralia: ladder([]),
};
