import type { GroupId, StateId } from '../engine/ids';

// Gesellschaftliche Gruppen im Netzwerk-Tab. Namen und Texte in src/i18n/de.ts unter „groups“.

export type GroupBonus =
  | { kind: 'money' | 'influence' | 'followers'; tier1: number; tier2: number }
  | { kind: 'approvalBase'; tier1: number; tier2: number }
  | { kind: 'unrestTarget'; tier1: number; tier2: number }
  | { kind: 'coupProtection'; tier1: number; tier2: number }
  | { kind: 'loyaltyDrift'; tier1: number; tier2: number };

export interface GroupDef {
  id: GroupId;
  /** Ab welcher Stufe die Gruppe im Netzwerk erscheint. */
  unlockStage: number;
  /** Nur auf diesem Pfad (leer = beide). */
  path?: 'democratic' | 'autocratic';
  /** Nur in diesen Staaten (leer = alle). */
  states?: StateId[];
  /** Macht der Gruppe (1–3): Größe des Kreises. */
  power: number;
  /** Womit man die Gruppe umwirbt. */
  currency: 'money' | 'influence';
  /** Gegenspieler: verlieren etwas Loyalität, wenn man diese Gruppe stärkt. */
  rivals: GroupId[];
  /** Passive Boni ab 50 % (tier1) und ab 80 % (tier2) Loyalität. */
  bonus: GroupBonus;
  /** Zusätzliche Unruhe-Änderung ab tier1 (z. B. Oligarchen sorgen für Unmut). */
  unrestSideEffect?: number;
}

export const allianceRules = {
  /** Startloyalität jeder Gruppe (Prozent). */
  startLoyalty: 25,
  /** Umwerben erhöht die Loyalität um so viele Punkte. */
  investGain: 10,
  /** Gegenspieler verlieren so viele Punkte. */
  rivalPenalty: 4,
  /** Kosten als Anteil der Anforderung der aktuellen Stufe (Geld bzw. Einfluss). */
  costFraction: 0.04,
  /** Jede Stufe Loyalität über 50 % macht das Umwerben teurer (Faktor je 10 Punkte). */
  costGrowthPer10: 1.15,
  /** Die Loyalität sinkt pro Minute um so viele Punkte … */
  decayPerMinute: 1,
  /** … aber nicht unter diesen Wert. */
  decayFloor: 10,
  /** Schwellen für Boni. */
  tier1: 50,
  tier2: 80,
  /** Ab dieser Loyalität gilt eine Allianz als stark (dicke Linie). */
  strongLink: 60,
  /** Unter dieser Loyalität gilt eine Gruppe als verärgert (rote Linie zu Rivalen). */
  tension: 25,
};

export const groups: GroupDef[] = [
  // Gewerkschaften: mehr Anhänger
  {
    id: 'unions',
    unlockStage: 2,
    power: 2,
    currency: 'influence',
    rivals: ['business', 'oligarchs'],
    bonus: { kind: 'followers', tier1: 1.15, tier2: 1.35 },
  },
  // Wirtschaft: mehr Geld
  {
    id: 'business',
    unlockStage: 2,
    power: 3,
    currency: 'money',
    rivals: ['unions'],
    bonus: { kind: 'money', tier1: 1.1, tier2: 1.25 },
  },
  // Zivilgesellschaft (nur Demokratie): weniger Unruhe
  {
    id: 'civilSociety',
    unlockStage: 3,
    path: 'democratic',
    power: 1,
    currency: 'influence',
    rivals: ['security', 'military'],
    bonus: { kind: 'unrestTarget', tier1: -5, tier2: -10 },
  },
  // Medien: steigende Zustimmung
  {
    id: 'media',
    unlockStage: 4,
    power: 2,
    currency: 'money',
    rivals: ['security'],
    bonus: { kind: 'approvalBase', tier1: 5, tier2: 10 },
  },
  // Verwaltung: mehr Einfluss
  {
    id: 'administration',
    unlockStage: 5,
    power: 2,
    currency: 'influence',
    rivals: [],
    bonus: { kind: 'influence', tier1: 1.1, tier2: 1.25 },
  },
  // Parteiapparat (Zentralia): Loyalität steigt
  {
    id: 'partyApparatus',
    unlockStage: 3,
    states: ['zentralia'],
    power: 3,
    currency: 'influence',
    rivals: ['business'],
    bonus: { kind: 'loyaltyDrift', tier1: 1.5, tier2: 3 },
  },
  // Oligarchen (Borealis): viel Geld, aber Unmut im Volk
  {
    id: 'oligarchs',
    unlockStage: 4,
    states: ['borealis'],
    power: 3,
    currency: 'money',
    rivals: ['unions', 'security'],
    bonus: { kind: 'money', tier1: 1.2, tier2: 1.45 },
    unrestSideEffect: 4,
  },
  // Sicherheitsdienste (autokratisch): Loyalität steigt
  {
    id: 'security',
    unlockStage: 5,
    path: 'autocratic',
    power: 2,
    currency: 'money',
    rivals: ['media', 'civilSociety'],
    bonus: { kind: 'loyaltyDrift', tier1: 1, tier2: 2 },
  },
  // Militär: Schutz vor Putsch
  {
    id: 'military',
    unlockStage: 7,
    power: 3,
    currency: 'money',
    rivals: ['civilSociety'],
    bonus: { kind: 'coupProtection', tier1: 0.5, tier2: 0.2 },
  },
];
