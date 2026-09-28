import type { ResourceId, ResourceMap, StateId } from '../engine/ids';

// Namen, Staatsform sowie Vor- und Nachteile als Text stehen in src/i18n/de.ts unter „states“.

export interface FlagDef {
  /** Aufteilung: waagerechte Streifen, senkrechte Streifen oder einfarbiges Feld mit Ecke. */
  layout: 'horizontal' | 'vertical' | 'canton';
  /** Farben der Streifen bzw. [Feld, Ecke]. */
  colors: string[];
  /** Emblem in der Mitte bzw. in der Ecke. */
  emblem: 'none' | 'star' | 'circle' | 'gear' | 'oak';
  emblemColor: string;
}

export interface StatePalette {
  /** Hauptfarbe des Staates (Buttons, Kopfzeilen). */
  primary: string;
  /** Zweitfarbe (Akzente, Linien). */
  secondary: string;
  /** Textfarbe auf der Hauptfarbe. */
  onPrimary: string;
}

export interface StateDef {
  id: StateId;
  /** Kann in dieser Version schon gespielt werden? */
  playable: boolean;
  /** Anzeige „Aufstiegstempo“ auf der Staatswahl (1 bis 5 Punkte). */
  tempo: number;
  /** Anzeige „Risiko“ auf der Staatswahl (1 bis 5 Punkte). */
  risk: number;
  /** true = immer autokratischer Pfad (Borealis, Zentralia). */
  alwaysAutocratic: boolean;
  /** Währungszeichen hinter Geldbeträgen. */
  currency: string;
  /** Multiplikatoren auf die Erträge einer Ressource (1 = unverändert). */
  resourceMultiplier: Partial<ResourceMap>;
  /** Abweichende Freischalt-Stufe einzelner Ressourcen. */
  resourceUnlockOverride: Partial<Record<ResourceId, number>>;
  /** Grund-Unruhe in Prozent zu Beginn eines Durchlaufs. */
  baseUnrest: number;
  palette: StatePalette;
  flag: FlagDef;
}

export const states: Record<StateId, StateDef> = {
  novaria: {
    id: 'novaria',
    playable: false,
    tempo: 3,
    risk: 2,
    alwaysAutocratic: false,
    currency: 'N$',
    // Geld ×1,4
    resourceMultiplier: { money: 1.4 },
    resourceUnlockOverride: {},
    baseUnrest: 10,
    // Marineblau und Sand
    palette: { primary: '#1f3a5f', secondary: '#d8c7a0', onPrimary: '#ffffff' },
    flag: {
      layout: 'canton',
      colors: ['#d8c7a0', '#1f3a5f'],
      emblem: 'star',
      emblemColor: '#ffffff',
    },
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
    resourceUnlockOverride: {},
    baseUnrest: 5,
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
    playable: false,
    tempo: 4,
    risk: 4,
    alwaysAutocratic: true,
    currency: 'Bor',
    resourceMultiplier: {},
    // Loyalität schon ab Stufe 3
    resourceUnlockOverride: { loyalty: 3 },
    baseUnrest: 25,
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
    playable: false,
    tempo: 3,
    risk: 3,
    alwaysAutocratic: true,
    currency: 'Z¥',
    // Hohe Wirtschaftsleistung, Anhänger fast wertlos
    resourceMultiplier: { money: 1.3, followers: 0.2 },
    resourceUnlockOverride: { loyalty: 3 },
    baseUnrest: 15,
    // Rot und Gold
    palette: { primary: '#9e1b1b', secondary: '#d9a21b', onPrimary: '#ffffff' },
    flag: {
      layout: 'canton',
      colors: ['#9e1b1b', '#9e1b1b'],
      emblem: 'gear',
      emblemColor: '#d9a21b',
    },
  },
};
