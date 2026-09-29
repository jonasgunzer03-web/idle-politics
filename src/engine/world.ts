import type { GameConfig } from '../config';
import type { LocationId } from './ids';
import { travelSpeed, worldLimitX } from './rules';
import type { GameState, RunState } from './schema';
import { findLocation, isLocationOpen, isLocationReachable } from './unlocks';

// Bewegung der Figur auf der Straße. Die Position ist eine Zahl (posX); ein Ziel lässt die
// Figur mit dem Tempo des Fahrzeugs dorthin laufen. Angekommen ist man, wenn posX genau
// auf dem Ort liegt und kein Ziel mehr gesetzt ist.

/** Ort, an dem die Figur gerade steht (oder null unterwegs / zwischen Orten). */
export function currentLocation(run: RunState, cfg: GameConfig): LocationId | null {
  if (run.world.target !== null) return null;
  const loc = cfg.world.locations.find((l) => Math.abs(l.x - run.world.posX) < 0.5);
  return loc ? loc.id : null;
}

/** Zum Ort laufen. Verlässt dabei das Gebäude. Unerreichbare Orte werden ignoriert. */
export function walkTo(game: GameState, target: LocationId, cfg: GameConfig): GameState {
  const run = game.run;
  const loc = findLocation(target, cfg);
  if (game.phase !== 'playing' || !run || !loc || !isLocationReachable(run, loc, cfg)) return game;
  if (currentLocation(run, cfg) === target && run.world.target === null) {
    return run.world.inside
      ? { ...game, run: { ...run, world: { ...run.world, inside: false } } }
      : game;
  }
  return { ...game, run: { ...run, world: { posX: run.world.posX, target, inside: false } } };
}

/** Laufen abbrechen: Die Figur bleibt stehen, wo sie ist. */
export function stopWalking(game: GameState): GameState {
  const run = game.run;
  if (!run || run.world.target === null) return game;
  return { ...game, run: { ...run, world: { ...run.world, target: null } } };
}

/** Gebäude betreten, wenn man davor steht und es offen ist. */
export function enterBuilding(game: GameState, cfg: GameConfig): GameState {
  const run = game.run;
  if (game.phase !== 'playing' || !run || run.world.inside) return game;
  const here = currentLocation(run, cfg);
  const loc = here ? findLocation(here, cfg) : undefined;
  if (!loc || !isLocationOpen(run, loc, cfg)) return game;
  return { ...game, run: { ...run, world: { ...run.world, inside: true } } };
}

export function leaveBuilding(game: GameState): GameState {
  const run = game.run;
  if (!run || !run.world.inside) return game;
  return { ...game, run: { ...run, world: { ...run.world, inside: false } } };
}

/** Bewegung für einen Zeitraum. Instant = sofort ankommen (Offline-Zeit). */
export function moveFigure(
  game: GameState,
  deltaMs: number,
  cfg: GameConfig,
  instant = false,
): GameState {
  const run = game.run;
  if (!run || run.world.target === null || deltaMs <= 0) return game;
  const loc = findLocation(run.world.target, cfg);
  if (!loc) return { ...game, run: { ...run, world: { ...run.world, target: null } } };
  const distance = loc.x - run.world.posX;
  const step = (travelSpeed(game, cfg) * deltaMs) / 1000;
  if (instant || Math.abs(distance) <= step) {
    return { ...game, run: { ...run, world: { posX: loc.x, target: null, inside: false } } };
  }
  const posX = run.world.posX + Math.sign(distance) * step;
  return { ...game, run: { ...run, world: { ...run.world, posX } } };
}

/** Geschätzte Wegzeit in Sekunden bis zum Ort. */
export function travelSeconds(game: GameState, target: LocationId, cfg: GameConfig): number {
  const run = game.run;
  const loc = findLocation(target, cfg);
  if (!run || !loc) return 0;
  const speed = travelSpeed(game, cfg);
  return speed > 0 ? Math.abs(loc.x - run.world.posX) / speed : 0;
}

/**
 * Nach einem Abstieg: Steht die Figur in einem Viertel, das nicht mehr offen ist, kehrt sie
 * zum Parteibüro zurück (bzw. zum Startort).
 */
export function clampToWorld(run: RunState, cfg: GameConfig): RunState {
  const limit = worldLimitX(run, cfg);
  const targetLoc = run.world.target ? findLocation(run.world.target, cfg) : undefined;
  const targetOk = !targetLoc || isLocationReachable(run, targetLoc, cfg);
  if (run.world.posX <= limit && targetOk) return run;
  const fallback = findLocation('partyOffice', cfg) ?? findLocation(cfg.world.startLocation, cfg);
  return { ...run, world: { posX: fallback?.x ?? 0, target: null, inside: false } };
}
