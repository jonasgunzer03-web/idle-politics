import type { GroupId, PathId, StateId } from '../engine/ids';

// Ereigniskarten. Titel, Text und Antworten stehen in src/i18n/de.ts unter „events“.
//
// Wirkungen:
// - money, influence, followers: Anteil der Aufstiegsanforderung der aktuellen Stufe
//   (0,1 = 10 % dessen, was der nächste Aufstieg kostet). Negativ = Verlust.
// - diplomacy: absolute Punkte diplomatisches Kapital.
// - approval, unrest, loyalty: Prozentpunkte.
// - groups: Loyalitätsänderung einzelner Gruppen.
// - relation: Beziehung zum Staat, um den es in der Karte geht (nur bei foreign-Karten).
// - relationsAll: Beziehung zu allen Staaten.

export interface EventEffect {
  money?: number;
  influence?: number;
  followers?: number;
  diplomacy?: number;
  approval?: number;
  unrest?: number;
  loyalty?: number;
  groups?: Partial<Record<GroupId, number>>;
  relation?: number;
  relationsAll?: number;
}

export interface EventDef {
  id: string;
  minStage: number;
  maxStage: number;
  states?: StateId[];
  path?: PathId;
  /** Karte handelt von einem anderen Staat (nur mit freigeschalteter Außenpolitik). */
  foreign?: boolean;
  /** Außenpolitische Krise: nur bei schlechten Beziehungen, entfällt bei Bündnis. */
  crisis?: boolean;
  /** Nur ab dieser Unruhe. */
  minUnrest?: number;
  /** Relative Häufigkeit (1 = normal). */
  weight: number;
  yes: EventEffect;
  no: EventEffect;
}

export const events: EventDef[] = [
  // --- Frühe Karriere ---
  {
    id: 'strike',
    minStage: 1,
    maxStage: 4,
    weight: 1,
    yes: { influence: 0.15, followers: 0.1, money: -0.05, groups: { unions: 10, business: -5 } },
    no: { money: 0.05, approval: -2, groups: { unions: -10 } },
  },
  {
    id: 'neighborhoodFestival',
    minStage: 1,
    maxStage: 3,
    weight: 1,
    yes: { money: -0.1, followers: 0.2, approval: 2 },
    no: { influence: 0.03 },
  },
  {
    id: 'pubBrawl',
    minStage: 1,
    maxStage: 3,
    weight: 1,
    yes: { influence: 0.1, approval: 1 },
    no: { followers: -0.05, unrest: 1 },
  },
  {
    id: 'clubAnniversary',
    minStage: 1,
    maxStage: 4,
    weight: 1,
    yes: { money: -0.05, followers: 0.15, influence: 0.05 },
    no: { approval: -1 },
  },
  {
    id: 'heatwave',
    minStage: 2,
    maxStage: 12,
    weight: 1,
    yes: { money: -0.08, approval: 3 },
    no: { approval: -2, unrest: 2 },
  },
  {
    id: 'partyIntrigue',
    minStage: 3,
    maxStage: 10,
    weight: 1,
    yes: { influence: -0.05, loyalty: 3, approval: -1 },
    no: { influence: -0.15 },
  },
  {
    id: 'constructionDonation',
    minStage: 3,
    maxStage: 9,
    weight: 1,
    yes: { money: 0.3, approval: -3, unrest: 3 },
    no: { approval: 2 },
  },
  {
    id: 'tabloidStory',
    minStage: 3,
    maxStage: 8,
    weight: 1,
    yes: { money: -0.08, approval: 2, groups: { media: -5 } },
    no: { approval: -4 },
  },
  {
    id: 'campaignDonor',
    minStage: 3,
    maxStage: 11,
    states: ['novaria'],
    weight: 1.5,
    yes: { money: 0.25, approval: -2, groups: { business: 5 } },
    no: { approval: 1 },
  },
  // --- Mittlere Karriere ---
  {
    id: 'cityCouncilVote',
    minStage: 4,
    maxStage: 6,
    weight: 1,
    yes: { influence: 0.1, followers: 0.05 },
    no: { approval: -1 },
  },
  {
    id: 'flood',
    minStage: 4,
    maxStage: 12,
    weight: 1,
    yes: { money: -0.2, approval: 8 },
    no: { approval: -8, unrest: 6 },
  },
  {
    id: 'journalistInterview',
    minStage: 4,
    maxStage: 9,
    weight: 1,
    yes: { followers: 0.15, approval: 2 },
    no: { groups: { media: -5 } },
  },
  {
    id: 'corruptionTip',
    minStage: 4,
    maxStage: 10,
    weight: 1,
    yes: { approval: 4, groups: { administration: -8 } },
    no: { influence: 0.1, unrest: 2 },
  },
  {
    id: 'oligarchOffer',
    minStage: 4,
    maxStage: 12,
    states: ['borealis'],
    weight: 1.5,
    yes: { money: 0.4, unrest: 5, groups: { oligarchs: 15 } },
    no: { loyalty: -3, groups: { oligarchs: -15 } },
  },
  {
    id: 'companyCarAffair',
    minStage: 5,
    maxStage: 12,
    weight: 1,
    yes: { approval: -2, influence: -0.05 },
    no: { approval: -1, unrest: 4, groups: { media: -8 } },
  },
  {
    id: 'factoryClosure',
    minStage: 5,
    maxStage: 9,
    weight: 1,
    yes: { money: -0.25, approval: 4, groups: { unions: 10 } },
    no: { unrest: 8, groups: { unions: -10, business: 5 } },
  },
  {
    id: 'studentProtest',
    minStage: 5,
    maxStage: 12,
    minUnrest: 30,
    weight: 1.5,
    yes: { approval: 3, unrest: -6, influence: -0.05 },
    no: { unrest: 8, approval: -2 },
  },
  {
    id: 'tvDebate',
    minStage: 5,
    maxStage: 12,
    path: 'democratic',
    weight: 1,
    yes: { followers: 0.2, approval: 4 },
    no: { approval: -3 },
  },
  {
    id: 'coalitionTalks',
    minStage: 5,
    maxStage: 11,
    states: ['rhenania'],
    path: 'democratic',
    weight: 1.5,
    yes: { influence: -0.1, approval: 3, groups: { civilSociety: 5 } },
    no: { influence: 0.1, approval: -3 },
  },
  {
    id: 'exportBoom',
    minStage: 5,
    maxStage: 12,
    weight: 1,
    yes: { money: 0.2, groups: { business: 3 } },
    no: { followers: 0.05 },
  },
  {
    id: 'surveillanceLaw',
    minStage: 5,
    maxStage: 12,
    path: 'autocratic',
    weight: 1,
    yes: { loyalty: 10, unrest: 6, relationsAll: -5, groups: { security: 10 } },
    no: { loyalty: -5 },
  },
  {
    id: 'propagandaFestival',
    minStage: 5,
    maxStage: 12,
    path: 'autocratic',
    weight: 1,
    yes: { money: -0.1, approval: 6, unrest: -3 },
    no: { loyalty: -3 },
  },
  {
    id: 'dissidentArrest',
    minStage: 5,
    maxStage: 12,
    path: 'autocratic',
    weight: 1,
    yes: { unrest: -8, approval: -5, relationsAll: -8 },
    no: { unrest: 5, loyalty: -4 },
  },
  {
    id: 'cadreReview',
    minStage: 3,
    maxStage: 12,
    states: ['zentralia'],
    weight: 1.5,
    yes: { loyalty: 10, unrest: 3, groups: { partyApparatus: 8 } },
    no: { loyalty: -6 },
  },
  // --- Hohe Ämter ---
  {
    id: 'lobbyDinner',
    minStage: 6,
    maxStage: 12,
    path: 'democratic',
    weight: 1,
    yes: { money: 0.2, groups: { business: 8, civilSociety: -8 } },
    no: { groups: { civilSociety: 5 } },
  },
  {
    id: 'leakedDocuments',
    minStage: 6,
    maxStage: 12,
    weight: 1,
    yes: { approval: 2, groups: { administration: -8 } },
    no: { unrest: 6, groups: { media: -8 } },
  },
  {
    id: 'energyCrisis',
    minStage: 6,
    maxStage: 12,
    weight: 1,
    yes: { money: -0.2, approval: 4 },
    no: { unrest: 8, approval: -4 },
  },
  {
    id: 'pensionReform',
    minStage: 6,
    maxStage: 12,
    path: 'democratic',
    weight: 1,
    yes: { approval: -4, money: 0.2 },
    no: { money: -0.05, approval: 1 },
  },
  {
    id: 'generalsDemand',
    minStage: 7,
    maxStage: 12,
    weight: 1,
    yes: { money: -0.2, loyalty: 5, groups: { military: 15 } },
    no: { loyalty: -5, groups: { military: -10 } },
  },
  {
    id: 'infrastructureBill',
    minStage: 7,
    maxStage: 12,
    path: 'democratic',
    weight: 1,
    yes: { money: -0.3, approval: 6, groups: { business: 5 } },
    no: { approval: -3 },
  },
  {
    id: 'palaceIntrigue',
    minStage: 8,
    maxStage: 12,
    path: 'autocratic',
    weight: 1,
    yes: { loyalty: 8, unrest: 5 },
    no: { loyalty: -8 },
  },
  // --- Außenpolitik (ab Stufe 8) ---
  {
    id: 'tradeDispute',
    minStage: 8,
    maxStage: 12,
    foreign: true,
    weight: 1,
    yes: { relation: -15, approval: 3 },
    no: { relation: 10, money: -0.05, approval: -2 },
  },
  {
    id: 'foreignInvestor',
    minStage: 8,
    maxStage: 12,
    foreign: true,
    weight: 1,
    yes: { money: 0.3, relation: 10, groups: { unions: -6 } },
    no: { approval: 2 },
  },
  {
    id: 'techSummit',
    minStage: 8,
    maxStage: 12,
    foreign: true,
    weight: 1,
    yes: { money: -0.1, relation: 8, diplomacy: 30 },
    no: { relation: -3 },
  },
  {
    id: 'gasContract',
    minStage: 6,
    maxStage: 12,
    states: ['borealis'],
    foreign: true,
    weight: 1.5,
    yes: { money: 0.3, relation: 10 },
    no: { relation: -5, loyalty: 2 },
  },
  {
    id: 'borderIncident',
    minStage: 8,
    maxStage: 12,
    foreign: true,
    crisis: true,
    weight: 2,
    yes: { relation: 10, approval: -3 },
    no: { relation: -15, approval: 4, unrest: 3 },
  },
  {
    id: 'refugeeWave',
    minStage: 8,
    maxStage: 12,
    foreign: true,
    crisis: true,
    weight: 2,
    yes: { approval: -3, relation: 10, groups: { civilSociety: 8 } },
    no: { relation: -10, approval: 2 },
  },
  {
    id: 'cyberAttack',
    minStage: 8,
    maxStage: 12,
    foreign: true,
    crisis: true,
    weight: 2,
    yes: { money: -0.15, relation: -10, loyalty: 4 },
    no: { approval: -4, unrest: 4 },
  },
];
