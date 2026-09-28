import { RESOURCE_IDS } from './ids';
import { clampStage } from './game';
import type { GameState } from './schema';

// Hilfsfunktionen für das Debug-Menü. Rein und getestet wie der Rest der Engine.

export function debugAddResources(game: GameState, amount: number): GameState {
  const run = game.run;
  if (!run || !Number.isFinite(amount) || amount <= 0) return game;
  const resources = { ...run.resources };
  for (const id of RESOURCE_IDS) resources[id] += amount;
  return { ...game, run: { ...run, resources } };
}

export function debugSetStage(game: GameState, stage: number): GameState {
  const run = game.run;
  if (!run || !Number.isFinite(stage)) return game;
  return { ...game, run: { ...run, stage: clampStage(stage) } };
}

/** Zeitsprung: Der letzte aktive Zeitpunkt wird in die Vergangenheit verschoben,
 *  der nächste Takt verrechnet die Lücke dann als Offline-Zeit. */
export function debugShiftTime(game: GameState, ms: number): GameState {
  if (!Number.isFinite(ms) || ms <= 0) return game;
  return { ...game, lastActiveAt: Math.max(0, game.lastActiveAt - ms) };
}
