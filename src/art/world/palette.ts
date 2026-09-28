import type { ArchitectureStyle } from '../../config/states';
import type { DistrictId } from '../../engine/ids';

// Farben und Formen der Gebäude je Baustil. Reine Illustration, keine Spielwerte.

export interface ArchPalette {
  /** Wandfarben (werden reihum verwendet). */
  walls: string[];
  roof: string;
  trim: string;
  /** Farbe für Säulen, Gesimse, Sockel. */
  stone: string;
  accent: string;
  roofShape: 'gable' | 'flat' | 'pagoda' | 'mansard';
  domeShape: 'glass' | 'classic' | 'onion' | 'tiered';
}

export const architecture: Record<ArchitectureStyle, ArchPalette> = {
  gabled: {
    walls: ['#dccbad', '#c9a47f', '#e8dcc6', '#b8735a', '#d6c09a'],
    roof: '#8b3a2e',
    trim: '#5b4a3a',
    stone: '#cfc6b4',
    accent: '#c9a227',
    roofShape: 'gable',
    domeShape: 'glass',
  },
  federal: {
    walls: ['#a8573f', '#c9b797', '#e4ded2', '#9a4a35', '#bfa98a'],
    roof: '#4a4f57',
    trim: '#f2efe6',
    stone: '#ece6d8',
    accent: '#1f3a5f',
    roofShape: 'flat',
    domeShape: 'classic',
  },
  soviet: {
    walls: ['#bdb7aa', '#a3abb0', '#d6d0c2', '#c4b39a', '#9ea59c'],
    roof: '#5c6b73',
    trim: '#7a2b2b',
    stone: '#d9d4c7',
    accent: '#6b1f24',
    roofShape: 'flat',
    domeShape: 'onion',
  },
  imperial: {
    walls: ['#b7352a', '#e3cda3', '#c9a066', '#a92f25', '#dcc39a'],
    roof: '#2f4f3f',
    trim: '#d9a21b',
    stone: '#e6dcc4',
    accent: '#9e1b1b',
    roofShape: 'pagoda',
    domeShape: 'tiered',
  },
};

/** Wie prächtig ein Viertel ausgestattet ist (0 = schlicht … 3 = prunkvoll). */
export const districtGrandeur: Record<DistrictId, number> = {
  quarter: 0,
  oldTown: 1,
  government: 2,
  capital: 3,
};

/** Farbe des Gehwegs je Viertel. */
export const sidewalkColors: Record<DistrictId, string> = {
  quarter: '#a9a49a',
  oldTown: '#b9a98f',
  government: '#cfc8b8',
  capital: '#e1d6bd',
};
