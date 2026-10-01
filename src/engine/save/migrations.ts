import { ACTION_IDS, type ActionId } from '../ids';
import { hash32 } from '../people';
import { SAVE_VERSION } from '../schema';

// Migrationen heben alte Spielstände Schritt für Schritt auf die aktuelle saveVersion.
// Eintrag n wandelt einen Stand der Version n in Version n + 1 um.

export type Migration = (old: Record<string, unknown>) => Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** Version 1 (Phase 0/1) → Version 2 (begehbare Welt, Karriere, Politik, Meta). */
export function migrateV1toV2(old: Record<string, unknown>): Record<string, unknown> {
  const stats = isRecord(old.stats) ? old.stats : {};
  const flags = isRecord(old.flags) ? old.flags : {};
  const character = isRecord(old.character) ? { ...old.character, accessories: [] } : null;
  const oldRun = isRecord(old.run) ? old.run : null;
  let run: Record<string, unknown> | null = null;
  if (oldRun) {
    const res = isRecord(oldRun.resources) ? oldRun.resources : {};
    const earned = isRecord(oldRun.earned) ? oldRun.earned : {};
    const pick = (m: Record<string, unknown>) => ({
      money: num(m.money, 0),
      influence: num(m.influence, 0),
      followers: num(m.followers, 0),
      diplomacy: num(m.diplomacy, 0),
    });
    const stage = num(oldRun.stage, 1);
    const playMs = num(oldRun.playMs, 0);
    run = {
      stateId: oldRun.stateId,
      profession: oldRun.profession,
      path: oldRun.path,
      stage,
      highestStage: stage,
      resources: pick(res),
      earned: pick(earned),
      approval: num(oldRun.approval, 50),
      unrest: num(oldRun.unrest, 0),
      loyalty: 50,
      criticalSince: null,
      generators: isRecord(oldRun.generators) ? oldRun.generators : {},
      // Neue Welt: Start im Werk bzw. Büro (x = 160)
      world: { posX: 160, target: null, inside: true },
      actions: {},
      vehicle: 'feet',
      events: { open: [], nextAt: playMs + 180_000, crisisAt: null },
      groups: {},
      relations: {},
      treaties: {},
      projects: {},
      cooldowns: {},
      fixElectionBonus: false,
      rulingSince: null,
      startedAt: num(oldRun.startedAt, 0),
      playMs,
      stats: {
        electionsWon: 0,
        electionsLost: 0,
        eventsResolved: 0,
        taps: 0,
        survivedUnrest: false,
        atBrink: false,
      },
    };
  }
  const oldHints = Array.isArray(flags.hintsSeen) ? flags.hintsSeen : [];
  return {
    saveVersion: 2,
    phase: old.phase === 'playing' && run ? 'playing' : 'setup',
    createdAt: old.createdAt,
    lastActiveAt: old.lastActiveAt,
    rngState: old.rngState,
    character,
    run,
    meta: {
      legacyPoints: 0,
      legacy: {},
      achievements: [],
      statesRuled: [],
      highestStageEver: run ? num(run.stage, 1) : 0,
      runsStarted: num(stats.runsStarted, 0),
      emigrations: 0,
      overthrows: 0,
      retirements: 0,
      totalTaps: num(stats.totalTaps, 0),
      totalPlayMs: num(stats.totalPlayMs, 0),
      eventsResolved: 0,
      ceremoniesSeen: [],
    },
    pending: { ceremony: null, runEnd: null, emigration: null },
    flags: {
      introSeen: flags.introSeen === true,
      hintsSeen: oldHints.filter((h) => h === 'followersUnlocked'),
    },
  };
}

/** Welche Linie in welchem Gebäude arbeitet (für die Umrechnung der Schulungen). */
const V2_SPEED_MACHINE: Partial<Record<ActionId, [string, string]>> = {
  work: ['workplace', 'conveyor'],
  network: ['pub', 'beerTap'],
  canvass: ['market', 'stalls'],
  partyWork: ['partyOffice', 'printer'],
  consultation: ['townHall', 'counter'],
  interview: ['newspaper', 'rotary'],
  fundraise: ['bank', 'tickerBoard'],
  debate: ['parliament', 'mics'],
  administer: ['ministry', 'mainframe'],
  reception: ['embassy', 'interpreters'],
  speech: ['palace', 'tvStudio'],
};

/** Plätze je Ausbaustufe zum Zeitpunkt der Umstellung (siehe config/industry.ts). */
const V3_CAPACITY = [0, 5, 10, 18, 28, 40];

/**
 * Version 2 → Version 3 (Produktionsketten, Parteibüro, Rivale, Chronik).
 * Mitarbeiter bleiben; das Gebäude wird so weit ausgebaut, dass sie Platz haben.
 * Schulungen werden zu Tempo-Maschinen (zwei Schulungsstufen = eine Maschinenstufe).
 */
export function migrateV2toV3(old: Record<string, unknown>): Record<string, unknown> {
  const oldRun = isRecord(old.run) ? old.run : null;
  let run: Record<string, unknown> | null = null;
  if (oldRun) {
    const oldActions = isRecord(oldRun.actions) ? oldRun.actions : {};
    const actions: Record<string, { staff: number }> = {};
    const staffByBuilding: Record<string, number> = {};
    const trainingByBuilding: Record<string, number> = {};
    for (const id of ACTION_IDS) {
      const entry = oldActions[id];
      if (!isRecord(entry)) continue;
      const staff = Math.max(0, Math.floor(num(entry.staff, 0)));
      const training = Math.max(0, Math.floor(num(entry.training, 0)));
      if (staff > 0) actions[id] = { staff };
      const mapping = V2_SPEED_MACHINE[id];
      if (mapping) {
        const [building] = mapping;
        staffByBuilding[building] = (staffByBuilding[building] ?? 0) + staff;
        trainingByBuilding[building] = Math.max(trainingByBuilding[building] ?? 0, training);
      }
    }
    const buildings: Record<string, { level: number; machines: Record<string, number> }> = {};
    for (const mapping of Object.values(V2_SPEED_MACHINE)) {
      const [building, machine] = mapping;
      if (buildings[building]) continue;
      const staff = staffByBuilding[building] ?? 0;
      let level = 1;
      while (level < 5 && (V3_CAPACITY[level] ?? 0) < staff) level++;
      const machineLevel = Math.min(level, Math.round((trainingByBuilding[building] ?? 0) / 2));
      if (level > 1 || machineLevel > 0) {
        buildings[building] = {
          level,
          machines: machineLevel > 0 ? { [machine]: machineLevel } : {},
        };
      }
    }
    const playMs = num(oldRun.playMs, 0);
    const seed = hash32(num(oldRun.startedAt, 0) >>> 0, 3);
    const stats = isRecord(oldRun.stats) ? oldRun.stats : {};
    run = {
      ...oldRun,
      seed,
      actions,
      goods: { wares: 0, contacts: 0, flyers: 0, files: 0 },
      buildings,
      morale: 60,
      striking: false,
      advisors: [],
      advisorPool: { candidates: [], refreshAt: 0 },
      agenda: { items: [], refreshAt: 0 },
      laws: {},
      rival: {
        seed: hash32(seed, 99),
        strength: 30,
        status: 'active',
        nextMoveAt: playMs + 300_000,
      },
      chronicle: [],
      stats: { ...stats, lawsPassed: 0, upgrades: 0, defections: 0 },
    };
  }
  return { ...old, saveVersion: 3, run };
}

/** Version 3 → Version 4 (Minispiele): Zähler für Minispiel-Verkäufe. */
export function migrateV3toV4(old: Record<string, unknown>): Record<string, unknown> {
  const oldRun = isRecord(old.run) ? old.run : null;
  if (!oldRun) return { ...old, saveVersion: 4 };
  const stats = isRecord(oldRun.stats) ? oldRun.stats : {};
  return { ...old, saveVersion: 4, run: { ...oldRun, stats: { ...stats, minigameSales: 0 } } };
}

export const migrations: Record<number, Migration> = {
  1: migrateV1toV2,
  2: migrateV2toV3,
  3: migrateV3toV4,
};

export type MigrationResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; reason: 'not-object' | 'no-version' | 'too-new' | 'missing-migration' | 'failed' };

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
