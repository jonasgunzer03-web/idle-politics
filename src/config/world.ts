import type {
  ActionId,
  DistrictId,
  GoodId,
  LineTag,
  LocationId,
  ResourceId,
  ResourceMap,
  VehicleId,
} from '../engine/ids';

// Die begehbare Welt: eine lange Straße von links nach rechts, aufgeteilt in Viertel.
// Positionen in „Welt-Einheiten“. Ein iPhone zeigt etwa 390 Einheiten gleichzeitig.
// Namen und Beschreibungen stehen in src/i18n/de.ts unter „world“.

export interface DistrictDef {
  id: DistrictId;
  /** Ab welcher Stufe das Viertel betreten werden kann. */
  unlockStage: number;
  /** Linker Rand und Breite in Welt-Einheiten. */
  startX: number;
  width: number;
}

export interface LocationDef {
  id: LocationId;
  district: DistrictId;
  /** Mitte des Gebäudes in Welt-Einheiten. */
  x: number;
  /** Ab welcher Stufe man hineingehen kann. */
  unlockStage: number;
}

/** Zutaten bzw. Erzeugnisse einer Linie je Durchgang: Waren und Währungen gemischt. */
export type FlowMap = Partial<Record<GoodId | ResourceId, number>>;

export interface ActionDef {
  id: ActionId;
  location: LocationId;
  unlockStage: number;
  /** Wofür die Linie steht (Gesetze und Berater wirken auf solche Gruppen). */
  tag: LineTag;
  /**
   * Zutaten je Durchgang. Waren in Stück; Währungen (Stufe 1) wachsen mit der Karrierestufe
   * wie die Erträge. Fehlt eine Zutat, stockt die Linie.
   */
  inputs: FlowMap;
  /** Erzeugnisse je Durchgang. Währungen (Stufe 1, vor Multiplikatoren), Waren in Stück. */
  outputs: FlowMap;
  /** Mitarbeiter: Grundpreis, Preissteigerung und Durchgänge pro Sekunde je Mitarbeiter. */
  staff: { baseCost: Partial<ResourceMap>; costGrowth: number; ratePerStaff: number };
}

export interface VehicleDef {
  id: VehicleId;
  /** Tempo in Welt-Einheiten pro Sekunde. */
  speed: number;
  cost: Partial<ResourceMap>;
  unlockStage: number;
}

export const districts: DistrictDef[] = [
  // Arbeiterviertel
  { id: 'quarter', unlockStage: 1, startX: 0, width: 1000 },
  // Altstadt
  { id: 'oldTown', unlockStage: 4, startX: 1000, width: 900 },
  // Regierungsviertel
  { id: 'government', unlockStage: 7, startX: 1900, width: 900 },
  // Hauptstadt-Prachtmeile
  { id: 'capital', unlockStage: 10, startX: 2800, width: 700 },
];

export const locations: LocationDef[] = [
  { id: 'workplace', district: 'quarter', x: 160, unlockStage: 1 },
  { id: 'pub', district: 'quarter', x: 430, unlockStage: 1 },
  { id: 'market', district: 'quarter', x: 650, unlockStage: 1 },
  { id: 'partyOffice', district: 'quarter', x: 860, unlockStage: 1 },
  { id: 'townHall', district: 'oldTown', x: 1220, unlockStage: 4 },
  { id: 'newspaper', district: 'oldTown', x: 1480, unlockStage: 4 },
  { id: 'bank', district: 'oldTown', x: 1720, unlockStage: 4 },
  { id: 'parliament', district: 'government', x: 2130, unlockStage: 7 },
  { id: 'ministry', district: 'government', x: 2400, unlockStage: 7 },
  { id: 'embassy', district: 'government', x: 2650, unlockStage: 8 },
  { id: 'palace', district: 'capital', x: 3150, unlockStage: 10 },
];

/** Hier beginnt jeder Durchlauf. */
export const startLocation: LocationId = 'workplace';

/**
 * Produktionslinien an den Orten. Tippen führt einen Durchgang von Hand aus, Mitarbeiter
 * arbeiten automatisch. Waren wandern von Linie zu Linie (Produktionskette).
 */
export const actions: ActionDef[] = [
  // Werk/Büro: Schicht arbeiten → Lohn und Waren
  {
    id: 'work',
    location: 'workplace',
    unlockStage: 1,
    tag: 'industry',
    inputs: {},
    outputs: { money: 0.5, wares: 1 },
    staff: { baseCost: { money: 40 }, costGrowth: 1.3, ratePerStaff: 0.5 },
  },
  // Kneipe: Mit Leuten reden → Einfluss und Kontakte
  {
    id: 'network',
    location: 'pub',
    unlockStage: 1,
    tag: 'party',
    inputs: {},
    outputs: { influence: 0.5, contacts: 0.5 },
    staff: { baseCost: { money: 70 }, costGrowth: 1.3, ratePerStaff: 0.5 },
  },
  // Markt: Waren verkaufen → Geld
  {
    id: 'sell',
    location: 'market',
    unlockStage: 1,
    tag: 'trade',
    inputs: { wares: 1 },
    outputs: { money: 2 },
    staff: { baseCost: { money: 55 }, costGrowth: 1.3, ratePerStaff: 0.5 },
  },
  // Markt: Flugblätter verteilen → Anhänger
  {
    id: 'canvass',
    location: 'market',
    unlockStage: 2,
    tag: 'party',
    inputs: { flyers: 1 },
    outputs: { followers: 1.2 },
    staff: { baseCost: { money: 300, influence: 20 }, costGrowth: 1.3, ratePerStaff: 0.5 },
  },
  // Parteibüro: Flugblätter drucken (kostet Papier und Tinte) → Flugblätter
  {
    id: 'print',
    location: 'partyOffice',
    unlockStage: 2,
    tag: 'party',
    inputs: { money: 0.4 },
    outputs: { flyers: 2 },
    staff: { baseCost: { money: 350, influence: 20 }, costGrowth: 1.3, ratePerStaff: 0.5 },
  },
  // Parteibüro: Kontakte zu Mitgliedern machen → Einfluss und Anhänger
  {
    id: 'partyWork',
    location: 'partyOffice',
    unlockStage: 2,
    tag: 'party',
    inputs: { contacts: 1 },
    outputs: { influence: 0.8, followers: 0.4 },
    staff: { baseCost: { money: 450, influence: 40 }, costGrowth: 1.3, ratePerStaff: 0.5 },
  },
  // Rathaus: Bürgersprechstunde → Einfluss, Anhänger und Akten
  {
    id: 'consultation',
    location: 'townHall',
    unlockStage: 4,
    tag: 'state',
    inputs: {},
    outputs: { influence: 0.4, followers: 0.4, files: 1 },
    staff: { baseCost: { money: 9_000, influence: 600 }, costGrowth: 1.3, ratePerStaff: 0.5 },
  },
  // Zeitungshaus: Kontakte in Interviews verwandeln → Anhänger
  {
    id: 'interview',
    location: 'newspaper',
    unlockStage: 4,
    tag: 'media',
    inputs: { contacts: 1 },
    outputs: { followers: 2.2 },
    staff: { baseCost: { money: 9_000, influence: 600 }, costGrowth: 1.3, ratePerStaff: 0.5 },
  },
  // Bank: Kontakte um Spenden bitten → Geld
  {
    id: 'fundraise',
    location: 'bank',
    unlockStage: 4,
    tag: 'finance',
    inputs: { contacts: 1 },
    outputs: { money: 4.5 },
    staff: { baseCost: { money: 9_000, influence: 600 }, costGrowth: 1.3, ratePerStaff: 0.5 },
  },
  // Parlament: Akten debattieren → Einfluss und Anhänger
  {
    id: 'debate',
    location: 'parliament',
    unlockStage: 7,
    tag: 'state',
    inputs: { files: 1 },
    outputs: { influence: 1.5, followers: 1 },
    staff: { baseCost: { money: 400_000, influence: 30_000 }, costGrowth: 1.3, ratePerStaff: 0.5 },
  },
  // Ministerium: Verwalten → Geld, Einfluss und Akten
  {
    id: 'administer',
    location: 'ministry',
    unlockStage: 7,
    tag: 'state',
    inputs: {},
    outputs: { money: 1.2, influence: 0.4, files: 1 },
    staff: { baseCost: { money: 400_000, influence: 30_000 }, costGrowth: 1.3, ratePerStaff: 0.5 },
  },
  // Botschaftsviertel: Waren als Gastgeschenke → Diplomatie
  {
    id: 'reception',
    location: 'embassy',
    unlockStage: 8,
    tag: 'diplomacy',
    inputs: { wares: 2 },
    outputs: { diplomacy: 0.03 },
    staff: {
      baseCost: { money: 2_000_000, influence: 100_000 },
      costGrowth: 1.3,
      ratePerStaff: 0.5,
    },
  },
  // Regierungssitz: Akten in eine Rede an die Nation gießen → Anhänger und Einfluss
  {
    id: 'speech',
    location: 'palace',
    unlockStage: 10,
    tag: 'media',
    inputs: { files: 1 },
    outputs: { followers: 2.5, influence: 1.2 },
    staff: {
      baseCost: { money: 60_000_000, influence: 4_000_000 },
      costGrowth: 1.3,
      ratePerStaff: 0.5,
    },
  },
];

/** Fortbewegung: schnellere Wege durch die Stadt. Man besitzt immer das beste gekaufte. */
export const vehicles: VehicleDef[] = [
  // zu Fuß
  { id: 'feet', speed: 150, cost: {}, unlockStage: 1 },
  // Fahrrad
  { id: 'bicycle', speed: 300, cost: { money: 80 }, unlockStage: 1 },
  // Moped
  { id: 'moped', speed: 520, cost: { money: 3_000 }, unlockStage: 3 },
  // Dienstwagen
  { id: 'car', speed: 900, cost: { money: 70_000, influence: 5_000 }, unlockStage: 5 },
  // Chauffeur
  { id: 'chauffeur', speed: 1_600, cost: { money: 2_500_000, influence: 150_000 }, unlockStage: 8 },
  // Hubschrauber
  {
    id: 'helicopter',
    speed: 4_000,
    cost: { money: 80_000_000, influence: 5_000_000 },
    unlockStage: 10,
  },
];

/** Kurzform: die Welt-Konfiguration als Ganzes. */
export interface WorldConfig {
  districts: DistrictDef[];
  locations: LocationDef[];
  actions: ActionDef[];
  vehicles: VehicleDef[];
  startLocation: LocationId;
}

export const world: WorldConfig = { districts, locations, actions, vehicles, startLocation };

/** Hilfstyp für Ertragslisten. */
export type Yields = Partial<Record<ResourceId, number>>;
