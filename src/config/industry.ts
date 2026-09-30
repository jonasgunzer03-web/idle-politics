import type { GoodId, LocationId, MachineId, ResourceMap, TraitId } from '../engine/ids';

// Aufbau-System: Waren, Gebäude-Ausbaustufen, Maschinen, Arbeiterstimmung und die
// Eigenschaften benannter Mitarbeiter. Texte stehen in src/i18n/de-industry.ts.

export interface GoodDef {
  id: GoodId;
  /** Lagerplatz je Ausbaustufe der Gebäude, die diese Ware herstellen. */
  storagePerLevel: number;
  /** So viel passt immer ins Lager, auch ohne Hersteller. */
  minStorage: number;
}

export type MachineKind = 'speed' | 'yield' | 'storage';

export interface MachineDef {
  id: MachineId;
  location: LocationId;
  /**
   * speed = mehr Durchgänge pro Sekunde (verbraucht auch mehr Zutaten),
   * yield = mehr Erzeugnisse je Durchgang (ohne mehr Zutaten),
   * storage = größeres Lager für die hier hergestellten Waren.
   */
  kind: MachineKind;
  /** Wirkung je Maschinenstufe (0,25 = +25 %). */
  perLevel: number;
  /** Preis der ersten Stufe (bei GAME_SPEED 1). */
  baseCost: Partial<ResourceMap>;
  /** Preissteigerung je Stufe. */
  costGrowth: number;
}

export interface BuildingDef {
  location: LocationId;
  /** Kosten für den Ausbau auf Stufe 2 (bei GAME_SPEED 1). */
  levelCost: Partial<ResourceMap>;
  /** Preissteigerung je weiterer Ausbaustufe. */
  levelCostGrowth: number;
  /** Die zwei Maschinen dieses Gebäudes. */
  machines: [MachineId, MachineId];
}

export interface TraitDef {
  id: TraitId;
  /** Tempo-Bonus für das Gebäude (0,03 = +3 %). */
  speed: number;
  /** Ertrags-Bonus für das Gebäude. */
  yield: number;
  /** Beitrag zum Zielwert der Arbeiterstimmung (Prozentpunkte). */
  morale: number;
}

export interface IndustryConfig {
  goods: GoodDef[];
  /** Höchste Ausbaustufe eines Gebäudes. */
  maxLevel: number;
  /** Plätze für Mitarbeiter im ganzen Gebäude je Ausbaustufe (Index = Stufe, 0 = unbenutzt). */
  capacity: number[];
  /**
   * Karrierestufen nach Öffnung des Ortes, ab denen eine Ausbaustufe möglich ist
   * (Index = Ausbaustufe). Höchstens bis Karrierestufe 12.
   */
  levelStageOffset: number[];
  buildings: BuildingDef[];
  machines: MachineDef[];
  traits: TraitDef[];
  /** So viele der ersten Mitarbeiter je Gebäude bilden die „Stammbelegschaft“ (Eigenschaften wirken). */
  coreCrew: number;
  /** Bei diesen Belegschaftsgrößen (alle Gebäude) erscheint eine Schlagzeile. */
  workforceMilestones: number[];
  morale: {
    /** Startwert in Prozent. */
    start: number;
    /** Grundwert, zu dem die Stimmung wandert (ohne Gesetze). */
    base: number;
    /** Prozentpunkte pro Minute Richtung Zielwert. */
    driftPerMinute: number;
    /** Ab dieser Unruhe drückt die Unruhe auf die Stimmung … */
    unrestFrom: number;
    /** … um so viele Punkte je Prozentpunkt Unruhe darüber. */
    unrestWeight: number;
    /** Unter diesem Wert beginnt ein Streik … */
    strikeBelow: number;
    /** … der erst über diesem Wert endet. */
    strikeEndAbove: number;
    /** Tempo-Faktor bei 0 % bzw. 100 % Stimmung (dazwischen linear). */
    speedAtZero: number;
    speedAtFull: number;
    /** Tempo-Faktor während eines Streiks (zusätzlich). */
    strikeFactor: number;
  };
  /** Kleinster Rechenschritt bei Abwesenheit in Sekunden (Genauigkeit der Kette). */
  offlineStepSeconds: number;
}

/** Hilfsfunktion: Kosten einer Preisklasse (Grundpreis eines Mitarbeiters am Ort) × Faktor. */
function times(base: Partial<ResourceMap>, factor: number): Partial<ResourceMap> {
  const result: Partial<ResourceMap> = {};
  for (const [key, value] of Object.entries(base) as [keyof ResourceMap, number][]) {
    result[key] = value * factor;
  }
  return result;
}

// Preisklassen je Viertel (entsprechen dem Grundpreis eines Mitarbeiters dort)
const QUARTER = { money: 60 };
const QUARTER_PARTY = { money: 350, influence: 25 };
const OLD_TOWN = { money: 9_000, influence: 600 };
const GOVERNMENT = { money: 400_000, influence: 30_000 };
const EMBASSY = { money: 2_000_000, influence: 100_000 };
const PALACE = { money: 60_000_000, influence: 4_000_000 };

/** Ausbau auf Stufe 2 kostet so viel wie … Mitarbeiter-Grundpreise. */
const LEVEL_FACTOR = 12;
/** Erste Maschinenstufe kostet so viel wie … Mitarbeiter-Grundpreise. */
const MACHINE_FACTOR = 5;
/** Preissteigerung je Ausbaustufe. */
const LEVEL_GROWTH = 4.5;
/** Preissteigerung je Maschinenstufe. */
const MACHINE_GROWTH = 3.2;

function building(
  location: LocationId,
  tier: Partial<ResourceMap>,
  machines: [MachineId, MachineId],
): BuildingDef {
  return {
    location,
    levelCost: times(tier, LEVEL_FACTOR),
    levelCostGrowth: LEVEL_GROWTH,
    machines,
  };
}

function machine(
  id: MachineId,
  location: LocationId,
  kind: MachineKind,
  tier: Partial<ResourceMap>,
): MachineDef {
  // Tempo +25 % je Stufe, Ertrag +20 % je Stufe, Lager +60 % je Stufe
  const perLevel = kind === 'speed' ? 0.25 : kind === 'yield' ? 0.2 : 0.6;
  return {
    id,
    location,
    kind,
    perLevel,
    baseCost: times(tier, MACHINE_FACTOR),
    costGrowth: MACHINE_GROWTH,
  };
}

export const industry: IndustryConfig = {
  goods: [
    // Waren aus Werk bzw. Büro
    { id: 'wares', storagePerLevel: 120, minStorage: 40 },
    // Kontakte aus der Kneipe
    { id: 'contacts', storagePerLevel: 80, minStorage: 30 },
    // Flugblätter aus dem Parteibüro
    { id: 'flyers', storagePerLevel: 150, minStorage: 40 },
    // Akten aus Rathaus und Ministerium
    { id: 'files', storagePerLevel: 80, minStorage: 30 },
  ],
  maxLevel: 5,
  // Stufe 1: 5 Plätze, Stufe 2: 10, Stufe 3: 18, Stufe 4: 28, Stufe 5: 40
  capacity: [0, 5, 10, 18, 28, 40],
  // Stufe 2 sofort, Stufe 3 eine Karrierestufe später, Stufe 4 nach drei, Stufe 5 nach fünf
  levelStageOffset: [0, 0, 0, 1, 3, 5],
  buildings: [
    building('workplace', QUARTER, ['conveyor', 'warehouse']),
    building('pub', QUARTER, ['beerTap', 'jukebox']),
    building('market', QUARTER, ['stalls', 'register']),
    building('partyOffice', QUARTER_PARTY, ['printer', 'phoneBank']),
    building('townHall', OLD_TOWN, ['counter', 'archive']),
    building('newspaper', OLD_TOWN, ['rotary', 'photoLab']),
    building('bank', OLD_TOWN, ['tickerBoard', 'vault']),
    building('parliament', GOVERNMENT, ['mics', 'votingBoard']),
    building('ministry', GOVERNMENT, ['mainframe', 'fileLift']),
    building('embassy', EMBASSY, ['interpreters', 'banquet']),
    building('palace', PALACE, ['tvStudio', 'balcony']),
  ],
  machines: [
    // Werk: Fließband (Tempo), Lagerhalle (Lager)
    machine('conveyor', 'workplace', 'speed', QUARTER),
    machine('warehouse', 'workplace', 'storage', QUARTER),
    // Kneipe: Zapfanlage (Tempo), Musikbox (Ertrag)
    machine('beerTap', 'pub', 'speed', QUARTER),
    machine('jukebox', 'pub', 'yield', QUARTER),
    // Markt: mehr Stände (Tempo), Registrierkasse (Ertrag)
    machine('stalls', 'market', 'speed', QUARTER),
    machine('register', 'market', 'yield', QUARTER),
    // Parteibüro: Druckmaschine (Tempo), Telefonzentrale (Ertrag)
    machine('printer', 'partyOffice', 'speed', QUARTER_PARTY),
    machine('phoneBank', 'partyOffice', 'yield', QUARTER_PARTY),
    // Rathaus: Bürgerschalter (Tempo), Archiv (Lager)
    machine('counter', 'townHall', 'speed', OLD_TOWN),
    machine('archive', 'townHall', 'storage', OLD_TOWN),
    // Zeitung: Rotationsdruck (Tempo), Fotolabor (Ertrag)
    machine('rotary', 'newspaper', 'speed', OLD_TOWN),
    machine('photoLab', 'newspaper', 'yield', OLD_TOWN),
    // Bank: Börsentafel (Tempo), Tresor (Ertrag)
    machine('tickerBoard', 'bank', 'speed', OLD_TOWN),
    machine('vault', 'bank', 'yield', OLD_TOWN),
    // Parlament: Mikrofonanlage (Tempo), Abstimmungstafel (Ertrag)
    machine('mics', 'parliament', 'speed', GOVERNMENT),
    machine('votingBoard', 'parliament', 'yield', GOVERNMENT),
    // Ministerium: Rechenzentrum (Tempo), Aktenaufzug (Lager)
    machine('mainframe', 'ministry', 'speed', GOVERNMENT),
    machine('fileLift', 'ministry', 'storage', GOVERNMENT),
    // Botschaft: Dolmetscherkabinen (Tempo), Bankettsaal (Ertrag)
    machine('interpreters', 'embassy', 'speed', EMBASSY),
    machine('banquet', 'embassy', 'yield', EMBASSY),
    // Regierungssitz: Fernsehstudio (Tempo), Balkon (Ertrag)
    machine('tvStudio', 'palace', 'speed', PALACE),
    machine('balcony', 'palace', 'yield', PALACE),
  ],
  traits: [
    // Fleißig: +4 % Tempo
    { id: 'diligent', speed: 0.04, yield: 0, morale: 0 },
    // Gesellig: hebt die Stimmung aller
    { id: 'social', speed: 0, yield: 0, morale: 1.5 },
    // Erfinderisch: +4 % Ertrag
    { id: 'inventive', speed: 0, yield: 0.04, morale: 0 },
    // Genau: +2 % Tempo und +2 % Ertrag
    { id: 'meticulous', speed: 0.02, yield: 0.02, morale: 0 },
    // Verträumt: etwas langsamer, aber gute Laune
    { id: 'dreamy', speed: -0.02, yield: 0, morale: 2.5 },
  ],
  coreCrew: 3,
  workforceMilestones: [10, 25, 50, 100, 200],
  morale: {
    start: 60,
    base: 60,
    driftPerMinute: 5,
    unrestFrom: 30,
    unrestWeight: 0.45,
    strikeBelow: 20,
    strikeEndAbove: 35,
    speedAtZero: 0.8,
    speedAtFull: 1.2,
    strikeFactor: 0.3,
  },
  offlineStepSeconds: 10,
};
