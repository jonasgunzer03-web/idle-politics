import { RESOURCE_IDS, type ResourceMap } from './ids';
import type { GameState, RunState } from './schema';

/** Größter Wert, den eine Währung annehmen darf. Schützt vor Infinity durch Überlauf. */
export const RESOURCE_CEILING = 1e300;

export interface SanitizeResult {
  game: GameState;
  /** Beschreibung jeder Korrektur (wird im Debug-Modus geloggt). */
  issues: string[];
}

function cleanNumber(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min < 0 ? 0 : min;
  if (value === Infinity) return max;
  if (value === -Infinity) return min;
  if (Object.is(value, -0)) return 0;
  return Math.min(max, Math.max(min, value));
}

function cleanMap(map: ResourceMap, label: string, issues: string[]): ResourceMap {
  let changed = false;
  const next = { ...map };
  for (const id of RESOURCE_IDS) {
    const cleaned = cleanNumber(map[id], 0, RESOURCE_CEILING);
    if (!Object.is(cleaned, map[id])) {
      issues.push(`${label}.${id}: ${String(map[id])} → ${String(cleaned)}`);
      next[id] = cleaned;
      changed = true;
    }
  }
  return changed ? next : map;
}

function cleanRecord<K extends string>(
  record: Partial<Record<K, number>>,
  min: number,
  max: number,
  label: string,
  issues: string[],
): Partial<Record<K, number>> {
  let changed = false;
  const next: Partial<Record<K, number>> = { ...record };
  for (const key of Object.keys(record) as K[]) {
    const value = record[key];
    if (value === undefined) continue;
    const cleaned = cleanNumber(value, min, max);
    if (!Object.is(cleaned, value)) {
      issues.push(`${label}.${key}: ${String(value)}`);
      next[key] = cleaned;
      changed = true;
    }
  }
  return changed ? next : record;
}

/**
 * Prüft einen Spielstand auf NaN, Infinity und Werte außerhalb ihres Bereichs und
 * korrigiert sie. Gibt dasselbe Objekt zurück, wenn nichts zu korrigieren war.
 */
export function sanitizeGame(game: GameState): SanitizeResult {
  const run = game.run;
  if (!run) return { game, issues: [] };
  const issues: string[] = [];
  const pct = (v: number, label: string) => {
    const c = cleanNumber(v, 0, 100);
    if (!Object.is(c, v)) issues.push(`${label}: ${String(v)}`);
    return c;
  };
  const next: RunState = {
    ...run,
    resources: cleanMap(run.resources, 'resources', issues),
    earned: cleanMap(run.earned, 'earned', issues),
    approval: pct(run.approval, 'approval'),
    unrest: pct(run.unrest, 'unrest'),
    loyalty: pct(run.loyalty, 'loyalty'),
    groups: cleanRecord(run.groups, 0, 100, 'groups', issues),
    relations: cleanRecord(run.relations, -100, 100, 'relations', issues),
    playMs: cleanNumber(run.playMs, 0, Number.MAX_SAFE_INTEGER),
    world: {
      ...run.world,
      posX: cleanNumber(run.world.posX, 0, 100_000),
    },
  };
  if (!Object.is(next.playMs, run.playMs)) issues.push('playMs');
  if (!Object.is(next.world.posX, run.world.posX)) issues.push('world.posX');
  if (issues.length === 0) return { game, issues };
  return { game: { ...game, run: next }, issues };
}
