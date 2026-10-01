import { REGION_IDS, type ForeignId, type RegionId } from '../../engine/ids';
import { COUNTRY_SHAPES, type Pt } from './geography';
import { centroid, province } from './provinces';

// Maße der Weltkarte und Positionen für die Knöpfe darüber.

export const MAP_W = 360;
export const MAP_H = 420;

export interface MapPartner {
  id: ForeignId;
  relation: number;
  trade: boolean;
  alliance: boolean;
}

/** Positionen der Provinz-Mittelpunkte (für Knöpfe). */
export function provinceCenters(own: ForeignId): Record<RegionId, Pt> {
  const shape = COUNTRY_SHAPES[own];
  const result = {} as Record<RegionId, Pt>;
  for (const r of REGION_IDS) result[r] = centroid(province(shape.points, shape.center, r));
  return result;
}
