import type { GameConfig } from '../config';
import { drawEvent } from './events';
import { endRun } from './game';
import { MAX_STAGE, RESOURCE_IDS, type StateId } from './ids';
import type { GameState } from './schema';
import { clampToWorld } from './world';

// Hilfsfunktionen für das Debug-Menü. Rein und getestet wie der Rest der Engine.

export function debugAddResources(game: GameState, amount: number): GameState {
  const run = game.run;
  if (!run || !Number.isFinite(amount) || amount <= 0) return game;
  const resources = { ...run.resources };
  for (const id of RESOURCE_IDS) resources[id] += amount;
  return { ...game, run: { ...run, resources } };
}

export function debugSetStage(game: GameState, stage: number, cfg: GameConfig): GameState {
  const run = game.run;
  if (!run || !Number.isFinite(stage)) return game;
  const s = Math.min(MAX_STAGE, Math.max(1, Math.round(stage)));
  const next = clampToWorld({ ...run, stage: s, highestStage: Math.max(run.highestStage, s) }, cfg);
  return {
    ...game,
    run: next,
    meta: { ...game.meta, highestStageEver: Math.max(game.meta.highestStageEver, s) },
  };
}

/** Zeitsprung: Der letzte aktive Zeitpunkt wird in die Vergangenheit verschoben,
 *  der nächste Takt verrechnet die Lücke dann als Offline-Zeit. */
export function debugShiftTime(game: GameState, ms: number): GameState {
  if (!Number.isFinite(ms) || ms <= 0) return game;
  return { ...game, lastActiveAt: Math.max(0, game.lastActiveAt - ms) };
}

export function debugSetMeters(
  game: GameState,
  values: { approval?: number; unrest?: number; loyalty?: number },
): GameState {
  const run = game.run;
  if (!run) return game;
  const clamp = (v: number | undefined, fallback: number) =>
    v === undefined || !Number.isFinite(v) ? fallback : Math.min(100, Math.max(0, v));
  return {
    ...game,
    run: {
      ...run,
      approval: clamp(values.approval, run.approval),
      unrest: clamp(values.unrest, run.unrest),
      loyalty: clamp(values.loyalty, run.loyalty),
    },
  };
}

export function debugTriggerEvent(game: GameState, cfg: GameConfig): GameState {
  return drawEvent(game, cfg);
}

export function debugOverthrow(game: GameState, cfg: GameConfig): GameState {
  if (game.phase !== 'playing' || !game.run) return game;
  return endRun(game, game.run.path === 'autocratic' ? 'coup' : 'revolution', cfg);
}

/** Staat wechseln, ohne neu zu beginnen (nur zum Testen von Farben, Ämtern und Baustil). */
export function debugSwitchState(game: GameState, stateId: StateId, cfg: GameConfig): GameState {
  const run = game.run;
  if (!run) return game;
  const path = cfg.states[stateId].alwaysAutocratic ? 'autocratic' : run.path;
  return { ...game, run: { ...run, stateId, path, relations: {}, treaties: {} } };
}
