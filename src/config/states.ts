import type { ForeignId, ResourceMap, StateId } from '../engine/ids';

// Namen, Staatsform sowie Vor- und Nachteile als Text stehen in src/i18n/de.ts unter „states“.

export interface FlagDef {
  /** Aufteilung: waagerechte Streifen, senkrechte Streifen oder Feld mit Ecke. */
  layout: 'horizontal' | 'vertical' | 'canton';
  /** Farben der Streifen bzw. [Feld, Ecke]. */
  colors: string[];
  /** Emblem in der Mitte bzw. in der Ecke. */
  emblem: 'none' | 'star' | 'circle' | 'gear' | 'oak' | 'wave' | 'peak';
  emblemColor: string;
}

export interface StatePalette {
  /** Hauptfarbe des Staates (Kopfzeilen, Buttons). */
  primary: string;
  /** Zweitfarbe (Akzente, Linien). */
  secondary: string;
  /** Textfarbe auf der Hauptfarbe. */
  onPrimary: string;
}

/** Baustil der Gebäude in den Szenen. */
export type ArchitectureStyle = 'federal' | 'gabled' | 'soviet' | 'imperial';

export interface StateDef {
  id: StateId;
  /** Kann in dieser Version gespielt werden? */
  playable: boolean;
  /** Anzeige „Aufstiegstempo“ auf der Staatswahl (1 bis 5 Punkte). */
  tempo: number;
  /** Anzeige „Risiko“ auf der Staatswahl (1 bis 5 Punkte). */
  risk: number;
  /** true = immer autokratischer Pfad (Borealis, Zentralia). */
  alwaysAutocratic: boolean;
  /** Währungszeichen hinter Geldbeträgen. */
  currency: string;
  /** Multiplikatoren auf die Erträge einer Währung (1 = unverändert). */
  resourceMultiplier: Partial<ResourceMap>;
  /** Faktor auf alle Aufstiegsanforderungen (1,2 = 20 % mehr). */
  requirementFactor: number;
  /** Faktor auf die Kosten von Wahlkämpfen. */
  campaignCostFactor: number;
  /** Faktor auf Zustimmungsänderungen durch Ereignisse (1,5 = schwankt stärker). */
  approvalVolatility: number;
  /** Faktor, wie schnell die Unruhe sinkt. */
  unrestDecayFactor: number;
  /** Faktor auf die Kosten, Allianzen zu stärken. */
  allianceCostFactor: number;
  /** Faktor auf die Kosten von „Loyalität kaufen“. */
  loyaltyCostFactor: number;
  /** Ab dieser Stufe ist die Loyalität des Apparats sichtbar (leer = Standard aus balancing.ts). */
  loyaltyUnlockStage?: number;
  /** Grund-Unruhe in Prozent (Zielwert, zu dem die Unruhe zurückkehrt). */
  baseUnrest: number;
  /** Zentralia: Unruhe steigt langsamer, solange die Loyalität über diesem Wert liegt. */
  loyalCalm?: { loyaltyAbove: number; factor: number };
  /** Zentralia: Säuberungen bei niedriger Loyalität statt Putsch. */
  purges: boolean;
  /** Startbeziehungen zu anderen Staaten (−100 bis +100). */
  startRelations: Partial<Record<ForeignId, number>>;
  architecture: ArchitectureStyle;
  palette: StatePalette;
  flag: FlagDef;
}

export const states: Record<StateId, StateDef> = {
  novaria: {
    id: 'novaria',
    playable: true,
    tempo: 3,
    risk: 2,
    alwaysAutocratic: false,
    currency: 'N$',
    // Geld ×1,4
    resourceMultiplier: { money: 1.4 },
    requirementFactor: 1,
    // Wahlkämpfe ×1,5 teurer
    campaignCostFactor: 1.5,
    // Zustimmung schwankt stärker
    approvalVolatility: 1.5,
    unrestDecayFactor: 1,
    allianceCostFactor: 1,
    loyaltyCostFactor: 1,
    baseUnrest: 10,
    purges: false,
    startRelations: { rhenania: 40, borealis: -20, zentralia: -10, valmora: 30, lysania: 10 },
    architecture: 'federal',
    // Marineblau und Sand
    palette: { primary: '#1f3a5f', secondary: '#d8c7a0', onPrimary: '#ffffff' },
    flag: { layout: 'canton', colors: ['#d8c7a0', '#1f3a5f'], emblem: 'star', emblemColor: '#ffffff' },
  },
  rhenania: {
    id: 'rhenania',
    playable: true,
    tempo: 2,
    risk: 1,
    alwaysAutocratic: false,
    currency: '€',
    // Geld ×0,9
    resourceMultiplier: { money: 0.9 },
    // Aufstiegsanforderungen ×1,2
    requirementFactor: 1.2,
    campaignCostFactor: 1,
    approvalVolatility: 1,
    // Unruhe sinkt schneller
    unrestDecayFactor: 1.5,
    // Koalitionen günstiger
    allianceCostFactor: 0.75,
    loyaltyCostFactor: 1,
    baseUnrest: 5,
    purges: false,
    startRelations: { novaria: 40, borealis: -5, zentralia: 5, valmora: 25, lysania: 30 },
    architecture: 'gabled',
    // Anthrazit und Gold
    palette: { primary: '#2b2f36', secondary: '#c9a227', onPrimary: '#ffffff' },
    flag: {
      layout: 'horizontal',
      colors: ['#2b2f36', '#c9a227', '#e9e4d8'],
      emblem: 'oak',
      emblemColor: '#2b2f36',
    },
  },
  borealis: {
    id: 'borealis',
    playable: true,
    tempo: 4,
    risk: 4,
    alwaysAutocratic: true,
    currency: 'Bor',
    // Anhänger sind wenig wert
    resourceMultiplier: { followers: 0.3 },
    requirementFactor: 0.9,
    campaignCostFactor: 1,
    approvalVolatility: 1,
    unrestDecayFactor: 0.8,
    allianceCostFactor: 1,
    // Loyalität kaufbar: günstiger
    loyaltyCostFactor: 0.6,
    loyaltyUnlockStage: 3,
    // Hohe Grund-Unruhe
    baseUnrest: 25,
    purges: false,
    // Schlechte Startbeziehungen im Ausland
    startRelations: { novaria: -40, rhenania: -30, zentralia: 20, valmora: -10, lysania: -20 },
    architecture: 'soviet',
    // Eisblau und Dunkelrot
    palette: { primary: '#6b1f24', secondary: '#a9c7d8', onPrimary: '#ffffff' },
    flag: {
      layout: 'horizontal',
      colors: ['#e8eef2', '#a9c7d8', '#6b1f24'],
      emblem: 'circle',
      emblemColor: '#c9a227',
    },
  },
  zentralia: {
    id: 'zentralia',
    playable: true,
    tempo: 3,
    risk: 3,
    alwaysAutocratic: true,
    currency: 'Z¥',
    // Hohe Wirtschaftsleistung, Anhänger fast wertlos
    resourceMultiplier: { money: 1.3, followers: 0.2 },
    requirementFactor: 1,
    campaignCostFactor: 1,
    approvalVolatility: 1,
    unrestDecayFactor: 1,
    allianceCostFactor: 1,
    loyaltyCostFactor: 1,
    loyaltyUnlockStage: 3,
    baseUnrest: 15,
    // Unruhe steigt langsam, solange die Loyalität hoch ist
    loyalCalm: { loyaltyAbove: 60, factor: 0.5 },
    purges: true,
    startRelations: { novaria: -15, rhenania: 10, borealis: 20, valmora: 15, lysania: 0 },
    architecture: 'imperial',
    // Rot und Gold
    palette: { primary: '#9e1b1b', secondary: '#d9a21b', onPrimary: '#ffffff' },
    flag: { layout: 'canton', colors: ['#9e1b1b', '#9e1b1b'], emblem: 'gear', emblemColor: '#d9a21b' },
  },
};

/** Kleine Nachbarstaaten (nur für die Außenpolitik). */
export const smallStates: Record<'valmora' | 'lysania', { flag: FlagDef }> = {
  valmora: {
    flag: { layout: 'vertical', colors: ['#12848a', '#f2efe6', '#12848a'], emblem: 'wave', emblemColor: '#12848a' },
  },
  lysania: {
    flag: { layout: 'horizontal', colors: ['#2e7d4f', '#f2efe6'], emblem: 'peak', emblemColor: '#6a3d9a' },
  },
};
