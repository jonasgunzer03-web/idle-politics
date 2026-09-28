// Hochfliegende Zahlen beim Tippen. Die Oberfläche ruft nur `spawnFloatingNumber` auf;
// gezeichnet wird von <FloatingNumbers /> mit einem festen Pool an Elementen,
// damit nie mehr als POOL_SIZE Knoten existieren und nichts neu gerendert wird.

export const POOL_SIZE = 20;

export interface FloatingSpawn {
  x: number;
  y: number;
  text: string;
  color: string;
}

type Handler = (spawn: FloatingSpawn) => void;

let handler: Handler | null = null;

export function registerFloatingHandler(next: Handler | null): void {
  handler = next;
}

export function spawnFloatingNumber(spawn: FloatingSpawn): void {
  handler?.(spawn);
}
