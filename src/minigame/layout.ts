import type { Layout } from './sim';

// Grundriss aller Minispiele (Meter): Raum 12 × 14, Quelle hinten links, Theke rechts mit
// Kundengang dahinter, Geldhaufen vor der Theke, drei Ausbau-Felder vorne.

export const ROOM = { halfW: 6, halfD: 7 } as const;

export const layout: Layout = {
  bounds: { minX: -5.5, maxX: 2.55, minZ: -5.4, maxZ: 6.3 },
  start: { x: -1, z: 1.5 },
  source: { x: -3.4, z: -4.3 },
  counter: { x: 3.4, z: -1.6 },
  serve: { x: 4.6, z: -1.6 },
  cash: { x: 1.6, z: 0.9 },
  door: { x: 4.8, z: 7.6 },
  queueDir: { x: 0, z: 1 },
  pads: {
    hire: { x: -3.6, z: 4.6 },
    upgrade: { x: -1.25, z: 4.6 },
    machine: { x: 1.1, z: 4.6 },
  },
  blocks: [
    // Maschine hinter der Quelle
    { x: -3.4, z: -5.7, w: 3.4, d: 1.4 },
    // Theke
    { x: 3.4, z: -1.6, w: 1.1, d: 2.8 },
  ],
};
