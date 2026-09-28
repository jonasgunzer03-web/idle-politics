import type { AccessoryId, AchievementId, LegacyId } from '../engine/ids';

// Vermächtnis-Baum (dauerhafte Boni über Durchläufe hinweg) und Erfolge.
// Texte in src/i18n/de.ts unter „legacy“ und „achievements“.

export interface LegacyNodeDef {
  id: LegacyId;
  /** Kosten in Vermächtnis-Punkten je Stufe (Index 0 = erste Stufe). */
  costs: number[];
  /** Wirkung je Stufe (Bedeutung siehe Kommentar). */
  perLevel: number;
  /** Nur kaufbar, wenn dieser Knoten mindestens Stufe 1 hat. */
  requires?: LegacyId;
}

export const legacyNodes: LegacyNodeDef[] = [
  // +10 % Geld je Stufe
  { id: 'moneyBoost', costs: [2, 5, 10], perLevel: 0.1 },
  // +10 % Einfluss je Stufe
  { id: 'influenceBoost', costs: [2, 5, 10], perLevel: 0.1 },
  // +10 % Anhänger je Stufe
  { id: 'followersBoost', costs: [3, 6, 12], perLevel: 0.1, requires: 'influenceBoost' },
  // Unruhe sinkt je Stufe 20 % schneller
  { id: 'calmNation', costs: [3, 7, 14], perLevel: 0.2 },
  // Zustimmungs-Grundwert +3 je Stufe
  { id: 'popularity', costs: [3, 7, 14], perLevel: 3, requires: 'calmNation' },
  // Start mit so vielen Überstunden-Generatoren je Stufe
  { id: 'headStart', costs: [2, 4, 8], perLevel: 5 },
  // Startgeld: so viel Geld je Stufe zu Beginn eines Durchlaufs (bei GAME_SPEED 1)
  { id: 'startCapital', costs: [4, 8], perLevel: 500, requires: 'moneyBoost' },
  // Wahlkampf: +4 Prozentpunkte Siegchance je Stufe
  { id: 'campaignVeteran', costs: [4, 8, 16], perLevel: 4 },
  // Wege: +25 % Tempo je Stufe
  { id: 'swiftFeet', costs: [2, 5], perLevel: 0.25 },
  // Offline-Deckel: +2 Stunden je Stufe
  { id: 'longRest', costs: [3, 6], perLevel: 2 },
];

export const legacyRules = {
  /** Punkte je erreichter Stufe: stageWeight × Stufe². */
  stageWeight: 0.35,
  /** Punkte je Zehnerpotenz des insgesamt verdienten Geldes. */
  earnedWeight: 1,
  /** Ruhestand nach Sieg: Punkte × diesem Faktor. */
  retireFactor: 2,
  /** Sieg ohne Ruhestand (Sturz beim Weiterregieren): Bonus-Punkte. */
  victoryBonus: 10,
};

export interface AchievementDef {
  id: AchievementId;
  /** Freigeschaltetes Accessoire (optional). */
  reward?: AccessoryId;
}

export const achievements: AchievementDef[] = [
  { id: 'firstShift' },
  { id: 'firstInvestment' },
  { id: 'firstElection', reward: 'partyPin' },
  { id: 'firstStaff' },
  { id: 'newVehicle' },
  { id: 'mayor', reward: 'tie' },
  { id: 'minister' },
  { id: 'blueCollarPresident', reward: 'sash' },
  { id: 'dictator', reward: 'medal' },
  { id: 'allStates' },
  { id: 'survivedUnrest' },
  { id: 'overthrown' },
  { id: 'emigrant' },
  { id: 'coalitionBuilder' },
  { id: 'diplomat' },
  { id: 'regionalDeveloper' },
  { id: 'millionaire' },
  { id: 'veteran' },
  { id: 'retiree' },
  { id: 'eventVeteran' },
];
