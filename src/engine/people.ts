import { LOCATION_IDS, TRAIT_IDS, type LocationId, type TraitId } from './ids';

// Benannte Menschen der Welt (Mitarbeiter, Berater, Rivale). Alles wird aus Seeds abgeleitet
// und nicht gespeichert: Derselbe Durchlauf zeigt immer dieselben Gesichter und Namen.

/** Schneller, reiner 32-Bit-Hash aus mehreren Zahlen. */
export function hash32(...parts: number[]): number {
  let h = 0x811c9dc5;
  for (const part of parts) {
    h ^= part >>> 0;
    h = Math.imul(h, 0x01000193);
    h ^= h >>> 13;
    h = Math.imul(h, 0x5bd1e995);
    h ^= h >>> 15;
  }
  return h >>> 0;
}

export interface PersonProfile {
  /** Index in die Vornamen-Liste (modulo Länge). */
  first: number;
  /** Index in die Nachnamen-Liste (modulo Länge). */
  last: number;
  /** Seed für das Aussehen. */
  look: number;
}

export function personFromSeed(seed: number): PersonProfile {
  return { first: hash32(seed, 1), last: hash32(seed, 2), look: hash32(seed, 3) };
}

export interface WorkerProfile extends PersonProfile {
  trait: TraitId;
}

/** Mitarbeiter Nummer `index` (0 = zuerst eingestellt) in einem Gebäude. */
export function workerProfile(runSeed: number, location: LocationId, index: number): WorkerProfile {
  const seed = hash32(runSeed, LOCATION_IDS.indexOf(location) + 17, index);
  const trait = TRAIT_IDS[hash32(seed, 4) % TRAIT_IDS.length] ?? 'diligent';
  return { ...personFromSeed(seed), trait };
}
