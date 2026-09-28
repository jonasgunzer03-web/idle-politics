import { SAVE_VERSION } from '../schema';

// Migrationen heben alte Spielstände Schritt für Schritt auf die aktuelle saveVersion.
// Eintrag n wandelt einen Stand der Version n in Version n + 1 um.
// Beispiel für eine spätere Änderung:
//   1: (old) => ({ ...old, saveVersion: 2, neuesFeld: 0 }),

export type Migration = (old: Record<string, unknown>) => Record<string, unknown>;

export const migrations: Record<number, Migration> = {};

export type MigrationResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; reason: 'not-object' | 'no-version' | 'too-new' | 'missing-migration' | 'failed' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function migrate(
  raw: unknown,
  table: Record<number, Migration> = migrations,
  target: number = SAVE_VERSION,
): MigrationResult {
  if (!isRecord(raw)) return { ok: false, reason: 'not-object' };
  let current: Record<string, unknown> = raw;
  const initial: unknown = current.saveVersion;
  if (typeof initial !== 'number' || !Number.isInteger(initial)) {
    return { ok: false, reason: 'no-version' };
  }
  let version: number = initial;
  if (version > target) return { ok: false, reason: 'too-new' };
  while (version < target) {
    const step = table[version];
    if (!step) return { ok: false, reason: 'missing-migration' };
    try {
      current = step(current);
    } catch {
      return { ok: false, reason: 'failed' };
    }
    const nextVersion: unknown = current.saveVersion;
    if (typeof nextVersion !== 'number' || nextVersion !== version + 1) {
      return { ok: false, reason: 'failed' };
    }
    version = nextVersion;
  }
  return { ok: true, value: current };
}
