import type { GameConfig } from '../config';
import type { GeneratorDef } from '../config/balancing';
import type { ActionDef } from '../config/world';
import {
  RESOURCE_IDS,
  VEHICLE_IDS,
  type ActionId,
  type GeneratorId,
  type ProjectId,
  type ResourceMap,
  type VehicleId,
} from './ids';
import { costScale, isWorldUnlocked, resourceMultiplier } from './rules';
import type { GameState, RunState } from './schema';
import {
  findAction,
  findGenerator,
  isActionUnlocked,
  isGeneratorAvailable,
  isGeneratorUnlocked,
} from './unlocks';
import { currentLocation } from './world';

export type BuyMode = 1 | 10 | 'max';

/** Obergrenze für einen einzelnen Max-Kauf, schützt vor Endlosschleifen bei Extremwerten. */
const MAX_BULK = 10_000;

export function zeroResources(): ResourceMap {
  return { money: 0, influence: 0, followers: 0, diplomacy: 0 };
}

/**
 * Preise werden auf ganze Beträge aufgerundet, damit angezeigter und abgezogener Preis
 * identisch sind. Der kleine Abzug fängt Gleitkommafehler ab (10,000000000000002 → 10).
 */
export function wholeAmount(value: number): number {
  if (value >= 1e15) return value;
  return Math.ceil(value - 1e-9);
}

/** Geometrische Kosten für `count` weitere Einheiten, wenn schon `owned` vorhanden sind. */
export function scaledCost(
  baseCost: Partial<ResourceMap>,
  growth: number,
  owned: number,
  count: number,
  cfg: GameConfig,
): Partial<ResourceMap> {
  const factor =
    growth === 1 ? count : (Math.pow(growth, owned) * (Math.pow(growth, count) - 1)) / (growth - 1);
  const result: Partial<ResourceMap> = {};
  for (const id of RESOURCE_IDS) {
    const base = baseCost[id];
    if (base !== undefined && base > 0) result[id] = wholeAmount(base * costScale(cfg) * factor);
  }
  return result;
}

/** Gesamtkosten für `count` weitere Generatoren, wenn schon `owned` vorhanden sind. */
export function generatorCost(
  def: GeneratorDef,
  owned: number,
  count: number,
  cfg: GameConfig,
): Partial<ResourceMap> {
  return scaledCost(def.baseCost, cfg.balancing.costGrowth, owned, count, cfg);
}

export function canAfford(resources: ResourceMap, cost: Partial<ResourceMap>): boolean {
  return RESOURCE_IDS.every((id) => resources[id] >= (cost[id] ?? 0));
}

/** Was fehlt noch? Nur Währungen mit Fehlbetrag > 0. */
export function missingFor(
  resources: ResourceMap,
  cost: Partial<ResourceMap>,
): Partial<ResourceMap> {
  const missing: Partial<ResourceMap> = {};
  for (const id of RESOURCE_IDS) {
    const gap = (cost[id] ?? 0) - resources[id];
    if (gap > 0) missing[id] = gap;
  }
  return missing;
}

/** Kosten abziehen (nie unter 0). Voraussetzung: canAfford wurde geprüft. */
export function pay(resources: ResourceMap, cost: Partial<ResourceMap>): ResourceMap {
  const next = { ...resources };
  for (const id of RESOURCE_IDS) next[id] = Math.max(0, next[id] - (cost[id] ?? 0));
  return next;
}

/** Wie viele Einheiten kann man sich gerade leisten? */
export function maxAffordableScaled(
  baseCost: Partial<ResourceMap>,
  growth: number,
  owned: number,
  resources: ResourceMap,
  cfg: GameConfig,
): number {
  let estimate = MAX_BULK;
  for (const id of RESOURCE_IDS) {
    const base = baseCost[id];
    if (base === undefined || base <= 0) continue;
    const first = base * costScale(cfg) * Math.pow(growth, owned);
    const n =
      growth === 1
        ? Math.floor(resources[id] / first)
        : Math.floor(Math.log((resources[id] * (growth - 1)) / first + 1) / Math.log(growth));
    estimate = Math.min(estimate, Number.isFinite(n) ? Math.max(0, n) : 0);
  }
  // Rundungsfehler der Logarithmus-Formel korrigieren
  while (
    estimate > 0 &&
    !canAfford(resources, scaledCost(baseCost, growth, owned, estimate, cfg))
  ) {
    estimate--;
  }
  while (
    estimate < MAX_BULK &&
    canAfford(resources, scaledCost(baseCost, growth, owned, estimate + 1, cfg))
  ) {
    estimate++;
  }
  return estimate;
}

export function maxAffordable(
  def: GeneratorDef,
  owned: number,
  resources: ResourceMap,
  cfg: GameConfig,
): number {
  return maxAffordableScaled(def.baseCost, cfg.balancing.costGrowth, owned, resources, cfg);
}

// ---------------------------------------------------------------- Tätigkeiten

export function actionProgress(run: RunState, id: ActionId): { staff: number; training: number } {
  return run.actions[id] ?? { staff: 0, training: 0 };
}

/** Ertrag einer einzelnen Ausführung der Tätigkeit (inkl. Stufe, Schulung, Multiplikatoren). */
export function actionYield(
  game: GameState,
  action: ActionDef,
  cfg: GameConfig,
): Partial<ResourceMap> {
  const run = game.run;
  if (!run) return {};
  const { training } = actionProgress(run, action.id);
  const factor =
    Math.pow(cfg.balancing.tapStageGrowth, run.stage - 1) * (1 + training * action.training.bonus);
  const result: Partial<ResourceMap> = {};
  for (const id of RESOURCE_IDS) {
    const base = action.yields[id];
    if (base !== undefined && base > 0) {
      result[id] = base * factor * resourceMultiplier(game, id, cfg);
    }
  }
  return result;
}

// ---------------------------------------------------------------- Erträge

/** Automatische Erträge pro Sekunde: Generatoren, Mitarbeiter, Regionalprojekte. */
export function productionRates(game: GameState, cfg: GameConfig): ResourceMap {
  const run = game.run;
  const rates = zeroResources();
  if (!run) return rates;
  const raw = zeroResources();
  for (const def of cfg.balancing.generators) {
    const n = run.generators[def.id] ?? 0;
    if (n > 0 && isGeneratorAvailable(run, def)) raw[def.produces] += n * def.baseOutput;
  }
  for (const p of cfg.projects) {
    const level = run.projects[p.id] ?? 0;
    if (level <= 0) continue;
    for (const id of RESOURCE_IDS) raw[id] += (p.output[id] ?? 0) * level;
  }
  for (const id of RESOURCE_IDS) rates[id] = raw[id] * resourceMultiplier(game, id, cfg);
  // Mitarbeiter: Ausführungen pro Sekunde × Ertrag je Ausführung (enthält Multiplikatoren)
  for (const action of cfg.world.actions) {
    const { staff } = actionProgress(run, action.id);
    if (staff <= 0 || !isActionUnlocked(run, action, cfg)) continue;
    const perRun = actionYield(game, action, cfg);
    const perSecond = staff * action.staff.ratePerStaff;
    for (const id of RESOURCE_IDS) rates[id] += (perRun[id] ?? 0) * perSecond;
  }
  return rates;
}

/** Erträge für einen Zeitraum gutschreiben (ohne sonstige Spiellogik). */
export function applyProduction(game: GameState, deltaMs: number, cfg: GameConfig): GameState {
  const run = game.run;
  if (!run || deltaMs <= 0) return game;
  const rates = productionRates(game, cfg);
  const seconds = deltaMs / 1000;
  const resources = { ...run.resources };
  const earned = { ...run.earned };
  for (const id of RESOURCE_IDS) {
    const gain = rates[id] * seconds;
    if (gain > 0) {
      resources[id] += gain;
      earned[id] += gain;
    }
  }
  return { ...game, run: { ...run, resources, earned } };
}

/** Beträge gutschreiben (nur positive Anteile). */
export function addResources(run: RunState, gains: Partial<ResourceMap>): RunState {
  const resources = { ...run.resources };
  const earned = { ...run.earned };
  for (const id of RESOURCE_IDS) {
    const g = gains[id] ?? 0;
    if (g > 0) {
      resources[id] += g;
      earned[id] += g;
    }
  }
  return { ...run, resources, earned };
}

export interface PerformResult {
  game: GameState;
  gained: Partial<ResourceMap>;
}

/** Tätigkeit einmal ausführen (Tippen). Nur im passenden Gebäude und wenn freigeschaltet. */
export function performAction(game: GameState, id: ActionId, cfg: GameConfig): PerformResult {
  const run = game.run;
  const action = findAction(id, cfg);
  if (game.phase !== 'playing' || !run || !action) return { game, gained: {} };
  if (!run.world.inside || currentLocation(run, cfg) !== action.location) {
    return { game, gained: {} };
  }
  if (!isActionUnlocked(run, action, cfg)) return { game, gained: {} };
  const gained = actionYield(game, action, cfg);
  const next = addResources(run, gained);
  return {
    game: {
      ...game,
      run: { ...next, stats: { ...next.stats, taps: next.stats.taps + 1 } },
      meta: { ...game.meta, totalTaps: game.meta.totalTaps + 1 },
    },
    gained,
  };
}

// ---------------------------------------------------------------- Käufe

export interface BuyResult {
  game: GameState;
  bought: number;
}

/**
 * Atomarer Kauf: Freischaltung und Kosten werden im selben Schritt geprüft wie abgezogen.
 * Reicht das Geld nicht, bleibt der Spielstand unverändert.
 */
export function buyGenerator(
  game: GameState,
  id: GeneratorId,
  mode: BuyMode,
  cfg: GameConfig,
): BuyResult {
  const run = game.run;
  const def = findGenerator(id, cfg);
  if (game.phase !== 'playing' || !run || !def || !isGeneratorUnlocked(run, def, cfg)) {
    return { game, bought: 0 };
  }
  const owned = run.generators[id] ?? 0;
  const count = mode === 'max' ? maxAffordable(def, owned, run.resources, cfg) : mode;
  if (count <= 0) return { game, bought: 0 };
  const cost = generatorCost(def, owned, count, cfg);
  if (!canAfford(run.resources, cost)) return { game, bought: 0 };
  return {
    game: {
      ...game,
      run: {
        ...run,
        resources: pay(run.resources, cost),
        generators: { ...run.generators, [id]: owned + count },
      },
    },
    bought: count,
  };
}

export type UpgradeKind = 'staff' | 'training';

export function upgradeCost(
  run: RunState,
  action: ActionDef,
  kind: UpgradeKind,
  cfg: GameConfig,
): Partial<ResourceMap> {
  const progress = actionProgress(run, action.id);
  const spec = kind === 'staff' ? action.staff : action.training;
  return scaledCost(spec.baseCost, spec.costGrowth, progress[kind], 1, cfg);
}

/** Mitarbeiter einstellen bzw. Schulung kaufen. Nur im Gebäude der Tätigkeit. */
export function buyActionUpgrade(
  game: GameState,
  id: ActionId,
  kind: UpgradeKind,
  cfg: GameConfig,
): GameState {
  const run = game.run;
  const action = findAction(id, cfg);
  if (game.phase !== 'playing' || !run || !action || !isActionUnlocked(run, action, cfg)) {
    return game;
  }
  if (!run.world.inside || currentLocation(run, cfg) !== action.location) return game;
  const progress = actionProgress(run, id);
  if (kind === 'training' && progress.training >= action.training.maxLevel) return game;
  const cost = upgradeCost(run, action, kind, cfg);
  if (!canAfford(run.resources, cost)) return game;
  return {
    ...game,
    run: {
      ...run,
      resources: pay(run.resources, cost),
      actions: { ...run.actions, [id]: { ...progress, [kind]: progress[kind] + 1 } },
    },
  };
}

export function vehicleIndex(id: VehicleId): number {
  return VEHICLE_IDS.indexOf(id);
}

export function vehicleCost(id: VehicleId, cfg: GameConfig): Partial<ResourceMap> {
  const def = cfg.world.vehicles.find((v) => v.id === id);
  return def ? scaledCost(def.cost, 1, 0, 1, cfg) : {};
}

/** Nächstes Fahrzeug kaufen (immer nur das nächstbessere). */
export function buyVehicle(game: GameState, id: VehicleId, cfg: GameConfig): GameState {
  const run = game.run;
  const def = cfg.world.vehicles.find((v) => v.id === id);
  if (game.phase !== 'playing' || !run || !def) return game;
  if (vehicleIndex(id) !== vehicleIndex(run.vehicle) + 1 || run.stage < def.unlockStage) {
    return game;
  }
  const cost = vehicleCost(id, cfg);
  if (!canAfford(run.resources, cost)) return game;
  return { ...game, run: { ...run, resources: pay(run.resources, cost), vehicle: id } };
}

export function projectCost(run: RunState, id: ProjectId, cfg: GameConfig): Partial<ResourceMap> {
  const def = cfg.projects.find((p) => p.id === id);
  if (!def) return {};
  return scaledCost(def.baseCost, def.costGrowth, run.projects[id] ?? 0, 1, cfg);
}

/** Regionalprojekt ausbauen (Welt-Tab ab Stufe 8). */
export function buildProject(game: GameState, id: ProjectId, cfg: GameConfig): GameState {
  const run = game.run;
  const def = cfg.projects.find((p) => p.id === id);
  if (game.phase !== 'playing' || !run || !def || !isWorldUnlocked(run, cfg)) return game;
  const level = run.projects[id] ?? 0;
  if (level >= def.maxLevel) return game;
  const cost = projectCost(run, id, cfg);
  if (!canAfford(run.resources, cost)) return game;
  return {
    ...game,
    run: {
      ...run,
      resources: pay(run.resources, cost),
      projects: { ...run.projects, [id]: level + 1 },
    },
  };
}
