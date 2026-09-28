import type { LocationId, StateId } from '../engine/ids';

// Die Amtstitel stehen in src/i18n/de.ts unter „careers“, damit alle Texte an einer Stelle
// liegen. Hier stehen Aufbau und Anforderungen der Leiter.

export interface StageRequirement {
  /** Wird beim Aufstieg bzw. bei der Kandidatur ausgegeben (bei GAME_SPEED 1). */
  money: number;
  influence: number;
  /** Anhänger, die man für eine Wahl haben sollte (werden nicht ausgegeben). */
  followers: number;
  /** Autokratischer Pfad: mindestens so viel Loyalität des Apparats (Prozent). */
  loyalty: number;
}

export interface CareerStageDef {
  /** Nummer der Stufe, 1 bis 12. */
  stage: number;
  /** true = auf dem demokratischen Pfad ist für diese Stufe eine gewonnene Wahl nötig (W). */
  election: boolean;
}

/**
 * Anforderungen für den Aufstieg AUF die Stufe (Index 0 = Aufstieg auf Stufe 2).
 * Gilt für alle Staaten und wird mit dem Faktor aus states.ts multipliziert.
 * Autokratischer Pfad: × 0,7 (siehe balancing.ts), dafür Loyalität statt Anhänger.
 */
export const stageRequirements: StageRequirement[] = [
  // Werte mit scripts/calibrate.ts auf die Zielzeiten eingestellt
  { money: 280, influence: 68, followers: 0, loyalty: 0 }, // → 2
  { money: 3_900, influence: 740, followers: 390, loyalty: 0 }, // → 3
  { money: 10_000, influence: 1_600, followers: 1_000, loyalty: 20 }, // → 4
  { money: 76_000, influence: 9_700, followers: 6_400, loyalty: 25 }, // → 5
  { money: 520_000, influence: 66_000, followers: 41_000, loyalty: 30 }, // → 6
  { money: 1_800_000, influence: 220_000, followers: 100_000, loyalty: 35 }, // → 7
  { money: 3_700_000, influence: 400_000, followers: 230_000, loyalty: 40 }, // → 8
  { money: 8_400_000, influence: 970_000, followers: 560_000, loyalty: 45 }, // → 9
  { money: 22_000_000, influence: 2_400_000, followers: 1_200_000, loyalty: 50 }, // → 10
  { money: 45_000_000, influence: 4_900_000, followers: 2_700_000, loyalty: 55 }, // → 11
  { money: 85_000_000, influence: 8_800_000, followers: 5_000_000, loyalty: 60 }, // → 12
];

/**
 * Zielzeiten in Minuten für jeden Aufstieg (Index 0 = Stufe 1 → 2), demokratischer Pfad.
 * Die Balancing-Simulation prüft dagegen (Fehler ab dem Dreifachen).
 */
export const targetMinutes: number[] = [3, 3, 3, 3, 5.5, 5.5, 5.5, 5.5, 7, 7, 7];

/**
 * Zielzeit-Faktor je angezeigtem Aufstiegstempo (states.ts): Tempo 3 = Grundzielzeit,
 * Tempo 2 = 1,5-fach, Tempo 4 = 0,75-fach. Der autokratische Pfad ist zusätzlich 30 % schneller.
 */
export function targetFactor(tempo: number, autocratic: boolean): number {
  return (3 / tempo) * (autocratic ? 0.7 : 1);
}

/** Wo man für die nächste Stufe kandidiert bzw. Macht ausbaut (nach aktueller Stufe). */
export function careerVenue(stage: number): LocationId {
  if (stage <= 3) return 'partyOffice';
  if (stage <= 6) return 'townHall';
  if (stage <= 9) return 'parliament';
  return 'palace';
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

/** Ab Stufe 5 kann man in Demokratien den autoritären Kurs einschlagen. */
export const autocraticTurnStage = 5;
