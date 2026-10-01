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
    walls: ['#ead6b4', '#dcae80', '#f3e6d0', '#cf7757', '#e6cc9e'],
    roof: '#ae321f',
    trim: '#705439',
    stone: '#dcd1bb',
    accent: '#f5be10',
    roofShape: 'gable',
    domeShape: 'glass',
  },
  federal: {
    walls: ['#cd532e', '#d9c39b', '#efe8dc', '#be4525', '#d0b48d'],
    roof: '#4e5868',
    trim: '#f4efe1',
    stone: '#f5efe1',
    accent: '#16417c',
    roofShape: 'flat',
    domeShape: 'classic',
  },
  soviet: {
    walls: ['#cbc3b0', '#a9b6be', '#e2dbca', '#d4be9f', '#a6b3a2'],
    roof: '#5d7887',
    trim: '#9a1f1f',
    stone: '#e5dfd0',
    accent: '#8b131b',
    roofShape: 'flat',
    domeShape: 'onion',
  },
  imperial: {
    walls: ['#e42212', '#f2d9a9', '#dfac64', '#d41d0e', '#eccf9e'],
    roof: '#2e6449',
    trim: '#ffb809',
    stone: '#f1e7cd',
    accent: '#c90404',
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
  quarter: '#b8b0a0',
  oldTown: '#cab593',
  government: '#dcd3bf',
  capital: '#ede1c5',
};
