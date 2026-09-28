import type { ForeignActionId, ProjectId, RegionId, ResourceMap } from '../engine/ids';

// Welt-Tab ab Stufe 8: Regionen des eigenen Landes mit Wirtschaftsprojekten und die
// Nachbarstaaten mit Außenpolitik. Namen und Texte in src/i18n/de.ts unter „foreign“.

/** Ab dieser Stufe ist der Welt-Tab offen. */
export const worldUnlockStage = 8;

export interface ProjectDef {
  id: ProjectId;
  region: RegionId;
  /** Preis der ersten Ausbaustufe (bei GAME_SPEED 1). */
  baseCost: Partial<ResourceMap>;
  /** Preissteigerung je Ausbaustufe. */
  costGrowth: number;
  /** Ertrag pro Sekunde je Ausbaustufe. */
  output: Partial<ResourceMap>;
  /** Zusätzliche Zustimmung (Grundwert) je Ausbaustufe. */
  approvalPerLevel?: number;
  maxLevel: number;
}

export const projects: ProjectDef[] = [
  // Norden: Hafen und Fischerei
  {
    id: 'port',
    region: 'north',
    baseCost: { money: 3_000_000, influence: 200_000 },
    costGrowth: 2.6,
    output: { money: 9_000, diplomacy: 0.2 },
    maxLevel: 5,
  },
  {
    id: 'fishery',
    region: 'north',
    baseCost: { money: 1_200_000 },
    costGrowth: 2.4,
    output: { money: 3_500 },
    approvalPerLevel: 1,
    maxLevel: 5,
  },
  // Osten: Bergbau und Stahlwerk
  {
    id: 'mine',
    region: 'east',
    baseCost: { money: 2_500_000 },
    costGrowth: 2.5,
    output: { money: 8_000 },
    maxLevel: 5,
  },
  {
    id: 'steelworks',
    region: 'east',
    baseCost: { money: 6_000_000, influence: 300_000 },
    costGrowth: 2.6,
    output: { money: 15_000, followers: 400 },
    maxLevel: 5,
  },
  // Süden: Landwirtschaft und Tourismus
  {
    id: 'farming',
    region: 'south',
    baseCost: { money: 1_500_000 },
    costGrowth: 2.4,
    output: { followers: 900 },
    approvalPerLevel: 1.5,
    maxLevel: 5,
  },
  {
    id: 'tourism',
    region: 'south',
    baseCost: { money: 4_000_000, influence: 150_000 },
    costGrowth: 2.5,
    output: { money: 10_000, diplomacy: 0.3 },
    maxLevel: 5,
  },
  // Westen: Technologiepark und Universität
  {
    id: 'techPark',
    region: 'west',
    baseCost: { money: 8_000_000, influence: 500_000 },
    costGrowth: 2.6,
    output: { money: 20_000, influence: 2_500 },
    maxLevel: 5,
  },
  {
    id: 'university',
    region: 'west',
    baseCost: { money: 3_500_000, influence: 250_000 },
    costGrowth: 2.5,
    output: { influence: 4_000 },
    approvalPerLevel: 1,
    maxLevel: 5,
  },
];

export interface ForeignActionDef {
  id: ForeignActionId;
  /** Kosten in diplomatischem Kapital (bei GAME_SPEED 1). */
  cost: number;
  /** Beziehung muss mindestens so hoch sein (−100 bis +100). */
  minRelation: number;
  /** Beziehungsänderung. */
  relation: number;
  /** Einmalige Zustimmungsänderung im Inland. */
  approval: number;
  /** Wartezeit je Staat in Sekunden. */
  cooldownSeconds: number;
  /** Nur autokratisch. */
  autocraticOnly?: boolean;
}

export const foreignActions: ForeignActionDef[] = [
  // Staatsbesuch: Beziehung verbessern
  { id: 'stateVisit', cost: 20, minRelation: -100, relation: 15, approval: 1, cooldownSeconds: 45 },
  // Handelsabkommen: dauerhafter Geldbonus
  { id: 'tradeAgreement', cost: 60, minRelation: 25, relation: 10, approval: 2, cooldownSeconds: 30 },
  // Bündnis: schützt vor Krisen mit Dritten
  { id: 'alliance', cost: 120, minRelation: 50, relation: 15, approval: 3, cooldownSeconds: 30 },
  // Sanktionen: Zustimmung im Inland, Beziehung sinkt, Abkommen enden
  { id: 'sanctions', cost: 15, minRelation: -100, relation: -35, approval: 5, cooldownSeconds: 60 },
  // Militärmanöver an der Grenze (nur autokratisch)
  {
    id: 'maneuver',
    cost: 25,
    minRelation: -100,
    relation: -20,
    approval: 4,
    cooldownSeconds: 90,
    autocraticOnly: true,
  },
];

export const foreignRules = {
  /** Jedes Handelsabkommen erhöht alle Geld-Erträge um diesen Anteil. */
  tradeBonus: 0.06,
  /** Bündnis: Zustimmungs-Grundwert +. */
  allianceApproval: 2,
  /** Manöver: Militär gewinnt so viel Loyalität … */
  maneuverMilitary: 10,
  /** … und die Wahrscheinlichkeit einer Krise steigt: nächste Krisenkarte nach spätestens so vielen Sekunden. */
  maneuverCrisisSeconds: 60,
  /** Beziehungen nähern sich pro Minute um so viel dem Startwert an. */
  relationDriftPerMinute: 0.5,
  /** Unter dieser Beziehung sind Krisenkarten mit dem Staat möglich. */
  crisisBelow: -20,
};
