import { defaultConfig } from '../../config';
import type { DistrictId, LocationId } from '../../engine/ids';

// Maße der Straße (Welt-Einheiten), gemeinsam genutzt von Grafik und Oberfläche.

const cfg = defaultConfig;

/** Gesamte Breite der Welt in Welt-Einheiten. */
export const WORLD_WIDTH = cfg.world.districts.reduce((m, d) => Math.max(m, d.startX + d.width), 0);
export const WORLD_HEIGHT = 300;

/** Ungefähre halbe Breite der Gebäude (für Füllhäuser und Tipp-Flächen). */
export const BUILDING_HALF_WIDTH: Record<LocationId, number> = {
  workplace: 92,
  pub: 60,
  market: 82,
  partyOffice: 62,
  townHall: 96,
  newspaper: 72,
  bank: 82,
  parliament: 132,
  ministry: 102,
  embassy: 78,
  palace: 172,
};

/** Viertel an einer Position. */
export function districtOf(x: number): DistrictId {
  for (const d of cfg.world.districts) if (x >= d.startX && x < d.startX + d.width) return d.id;
  return 'capital';
}
