import { RESOURCE_IDS, type ResourceMap } from './ids';
import type { GameState } from './schema';

/** Größter Wert, den eine Ressource annehmen darf. Schützt vor Infinity durch Überlauf. */
export const RESOURCE_CEILING = 1e300;

export interface SanitizeResult {
  game: GameState;
  /** Beschreibung jeder Korrektur (wird im Debug-Modus geloggt). */
  issues: string[];
}

function cleanNumber(value: number, max: number): number {
  if (Number.isNaN(value)) return 0;
  if (value === Infinity) return max;
  if (value < 0 || Object.is(value, -0)) return 0;
  return Math.min(value, max);
}

function cleanMap(map: ResourceMap, label: string, issues: string[]): ResourceMap {
  let changed = false;
  const next = { ...map };
  for (const id of RESOURCE_IDS) {
    const cleaned = cleanNumber(map[id], RESOURCE_CEILING);
    if (!Object.is(cleaned, map[id])) {
      issues.push(`${label}.${id}: ${String(map[id])} → ${String(cleaned)}`);
      next[id] = cleaned;
      changed = true;
    }
  }
  return changed ? next : map;
}

/**
 * Prüft einen Spielstand auf NaN, Infinity und negative Werte und korrigiert sie.
 * Gibt dasselbe Objekt zurück, wenn nichts zu korrigieren war.
 */
export function sanitizeGame(game: GameState): SanitizeResult {
  const run = game.run;
  if (!run) return { game, issues: [] };
  const issues: string[] = [];
  const resources = cleanMap(run.resources, 'resources', issues);
  const earned = cleanMap(run.earned, 'earned', issues);
  const approval = cleanNumber(run.approval, 100);
  const unrest = cleanNumber(run.unrest, 100);
  const playMs = cleanNumber(run.playMs, Number.MAX_SAFE_INTEGER);
  if (approval !== run.approval) issues.push(`approval: ${String(run.approval)}`);
  if (unrest !== run.unrest) issues.push(`unrest: ${String(run.unrest)}`);
  if (playMs !== run.playMs) issues.push(`playMs: ${String(run.playMs)}`);
  if (issues.length === 0) return { game, issues };
  return {
    game: { ...game, run: { ...run, resources, earned, approval, unrest, playMs } },
    issues,
  };
}
