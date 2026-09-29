import type {
  ActionId,
  DistrictId,
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

export interface ActionDef {
  id: ActionId;
  location: LocationId;
  unlockStage: number;
  /** Ertrag pro Ausführung (Stufe 1, vor Multiplikatoren). */
  yields: Partial<ResourceMap>;
  /** Mitarbeiter: Grundpreis, Preissteigerung und Ausführungen pro Sekunde je Mitarbeiter. */
  staff: { baseCost: Partial<ResourceMap>; costGrowth: number; ratePerStaff: number };
  /** Schulung: Grundpreis, Preissteigerung, Ertragsbonus je Stufe, Höchststufe. */
  training: { baseCost: Partial<ResourceMap>; costGrowth: number; bonus: number; maxLevel: number };
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
  { id: 'market', district: 'quarter', x: 650, unlockStage: 2 },
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
 * Tätigkeiten an den Orten. Tippen führt sie einmal aus, Mitarbeiter führen sie automatisch aus,
 * Schulungen erhöhen den Ertrag.
 */
export const actions: ActionDef[] = [
  // Werk/Büro: Schicht arbeiten → Geld
  {
    id: 'work',
    location: 'workplace',
    unlockStage: 1,
    yields: { money: 1 },
    staff: { baseCost: { money: 40 }, costGrowth: 1.3, ratePerStaff: 0.5 },
    training: { baseCost: { money: 30 }, costGrowth: 2.2, bonus: 0.25, maxLevel: 10 },
  },
  // Kneipe: Mit Kollegen reden → Einfluss
  {
    id: 'network',
    location: 'pub',
    unlockStage: 1,
    yields: { influence: 0.5 },
    staff: { baseCost: { money: 70 }, costGrowth: 1.3, ratePerStaff: 0.5 },
    training: { baseCost: { money: 50 }, costGrowth: 2.2, bonus: 0.25, maxLevel: 10 },
  },
  // Marktplatz: Flyer verteilen → Anhänger
  {
    id: 'canvass',
    location: 'market',
    unlockStage: 2,
    yields: { followers: 0.6 },
    staff: { baseCost: { money: 300, influence: 20 }, costGrowth: 1.3, ratePerStaff: 0.5 },
    training: { baseCost: { money: 200 }, costGrowth: 2.2, bonus: 0.25, maxLevel: 10 },
  },
  // Parteibüro: Parteiarbeit → Einfluss und Anhänger
  {
    id: 'partyWork',
    location: 'partyOffice',
    unlockStage: 2,
    yields: { influence: 0.3, followers: 0.3 },
    staff: { baseCost: { money: 450, influence: 40 }, costGrowth: 1.3, ratePerStaff: 0.5 },
    training: { baseCost: { money: 300 }, costGrowth: 2.2, bonus: 0.25, maxLevel: 10 },
  },
  // Rathaus: Bürgersprechstunde → Einfluss und Anhänger
  {
    id: 'consultation',
    location: 'townHall',
    unlockStage: 4,
    yields: { influence: 0.4, followers: 0.4 },
    staff: { baseCost: { money: 9_000, influence: 600 }, costGrowth: 1.3, ratePerStaff: 0.5 },
    training: { baseCost: { money: 6_000 }, costGrowth: 2.2, bonus: 0.25, maxLevel: 10 },
  },
  // Zeitungshaus: Interview geben → Anhänger
  {
    id: 'interview',
    location: 'newspaper',
    unlockStage: 4,
    yields: { followers: 0.9 },
    staff: { baseCost: { money: 9_000, influence: 600 }, costGrowth: 1.3, ratePerStaff: 0.5 },
    training: { baseCost: { money: 6_000 }, costGrowth: 2.2, bonus: 0.25, maxLevel: 10 },
  },
  // Bank: Spenden sammeln → Geld
  {
    id: 'fundraise',
    location: 'bank',
    unlockStage: 4,
    yields: { money: 1.6 },
    staff: { baseCost: { money: 9_000, influence: 600 }, costGrowth: 1.3, ratePerStaff: 0.5 },
    training: { baseCost: { money: 6_000 }, costGrowth: 2.2, bonus: 0.25, maxLevel: 10 },
  },
  // Parlament: Debattieren → Einfluss und Anhänger
  {
    id: 'debate',
    location: 'parliament',
    unlockStage: 7,
    yields: { influence: 0.8, followers: 0.5 },
    staff: { baseCost: { money: 400_000, influence: 30_000 }, costGrowth: 1.3, ratePerStaff: 0.5 },
    training: { baseCost: { money: 250_000 }, costGrowth: 2.2, bonus: 0.25, maxLevel: 10 },
  },
  // Ministerium: Verwalten → Geld und Einfluss
  {
    id: 'administer',
    location: 'ministry',
    unlockStage: 7,
    yields: { money: 1.2, influence: 0.4 },
    staff: { baseCost: { money: 400_000, influence: 30_000 }, costGrowth: 1.3, ratePerStaff: 0.5 },
    training: { baseCost: { money: 250_000 }, costGrowth: 2.2, bonus: 0.25, maxLevel: 10 },
  },
  // Botschaftsviertel: Empfang geben → Diplomatie
  {
    id: 'reception',
    location: 'embassy',
    unlockStage: 8,
    yields: { diplomacy: 0.02 },
    staff: {
      baseCost: { money: 2_000_000, influence: 100_000 },
      costGrowth: 1.3,
      ratePerStaff: 0.5,
    },
    training: { baseCost: { money: 1_500_000 }, costGrowth: 2.2, bonus: 0.25, maxLevel: 10 },
  },
  // Regierungssitz: Rede an die Nation → Anhänger und Einfluss
  {
    id: 'speech',
    location: 'palace',
    unlockStage: 10,
    yields: { followers: 1.2, influence: 0.6 },
    staff: {
      baseCost: { money: 60_000_000, influence: 4_000_000 },
      costGrowth: 1.3,
      ratePerStaff: 0.5,
    },
    training: { baseCost: { money: 40_000_000 }, costGrowth: 2.2, bonus: 0.25, maxLevel: 10 },
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
