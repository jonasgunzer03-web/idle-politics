import type { GameConfig } from '../config';
import type { GeneratorDef } from '../config/balancing';
import type { ActionDef } from '../config/world';
import { addChronicle } from './chronicle';
import {
  RESOURCE_IDS,
  VEHICLE_IDS,
  type ActionId,
  type GeneratorId,
  type GoodId,
  type GoodMap,
  type LocationId,
  type MachineId,
  type ProjectId,
  type ResourceId,
  type ResourceMap,
  type VehicleId,
} from './ids';
import {
  buildingCapacity,
  buildingLevel,
  chainSnapshot,
  cycleInputs,
  cycleOutputs,
  findBuilding,
  findMachine,
  isBuildingOpen,
  isResourceKey,
  levelStageRequirement,
  machineLevel,
  runChain,
  staffInBuilding,
  staffOf,
  storageCapacity,
  totalStaff,
} from './production';
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

// ---------------------------------------------------------------- Erträge

/** Passive Erträge pro Sekunde: Generatoren (Beteiligungen) und Regionalprojekte. */
export function passiveRates(game: GameState, cfg: GameConfig): ResourceMap {
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
  return rates;
}

/**
 * Netto-Erträge pro Sekunde: Beteiligungen plus Produktionskette (wie sie gerade läuft,
 * inklusive Engpässen; Zutaten wie Papiergeld sind abgezogen).
 */
export function productionRates(game: GameState, cfg: GameConfig): ResourceMap {
  const rates = passiveRates(game, cfg);
  const chain = chainSnapshot(game, cfg);
  for (const id of RESOURCE_IDS) rates[id] += chain.resources[id];
  return rates;
}

/** Erträge für einen Zeitraum gutschreiben (Beteiligungen und Produktionskette). */
export function applyProduction(game: GameState, deltaMs: number, cfg: GameConfig): GameState {
  const run = game.run;
  if (!run || deltaMs <= 0) return game;
  const rates = passiveRates(game, cfg);
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
  let current: GameState = { ...game, run: { ...run, resources, earned } };
  // Kette in Schritten rechnen, damit Waren bei langer Abwesenheit weiterwandern
  let remaining = seconds;
  const step = Math.max(1, cfg.industry.offlineStepSeconds);
  while (remaining > 1e-9) {
    const dt = Math.min(step, remaining);
    current = runChain(current, dt, cfg).game;
    remaining -= dt;
  }
  return current;
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

// ---------------------------------------------------------------- Tippen

export interface PerformResult {
  game: GameState;
  gained: Partial<ResourceMap>;
  goods: Partial<GoodMap>;
  /** Zutat, die fehlt (dann passiert nichts). */
  blockedBy: GoodId | ResourceId | null;
}

/** Einen Durchgang der Linie von Hand ausführen. Nur im passenden Gebäude. */
export function performAction(game: GameState, id: ActionId, cfg: GameConfig): PerformResult {
  const run = game.run;
  const action = findAction(id, cfg);
  const none: PerformResult = { game, gained: {}, goods: {}, blockedBy: null };
  if (game.phase !== 'playing' || !run || !action) return none;
  if (!run.world.inside || currentLocation(run, cfg) !== action.location) return none;
  if (!isActionUnlocked(run, action, cfg)) return none;
  const inputs = cycleInputs(run, action, cfg);
  for (const [key, need] of Object.entries(inputs) as [GoodId | ResourceId, number][]) {
    const available = isResourceKey(key) ? run.resources[key] : run.goods[key];
    if (available + 1e-9 < need) return { ...none, blockedBy: key };
  }
  const resources = { ...run.resources };
  const goods = { ...run.goods };
  for (const [key, need] of Object.entries(inputs) as [GoodId | ResourceId, number][]) {
    if (isResourceKey(key)) resources[key] = Math.max(0, resources[key] - need);
    else goods[key] = Math.max(0, goods[key] - need);
  }
  const gained: Partial<ResourceMap> = {};
  const madeGoods: Partial<GoodMap> = {};
  const earned = { ...run.earned };
  for (const [key, amount] of Object.entries(cycleOutputs(game, action, cfg)) as [
    GoodId | ResourceId,
    number,
  ][]) {
    if (isResourceKey(key)) {
      resources[key] += amount;
      earned[key] += amount;
      gained[key] = amount;
    } else {
      const cap = storageCapacity(run, key, cfg);
      const room = Math.max(0, cap - goods[key]);
      const added = Math.min(room, amount);
      goods[key] += added;
      madeGoods[key] = added;
    }
  }
  return {
    game: {
      ...game,
      run: {
        ...run,
        resources,
        goods,
        earned,
        stats: { ...run.stats, taps: run.stats.taps + 1 },
      },
      meta: { ...game.meta, totalTaps: game.meta.totalTaps + 1 },
    },
    gained,
    goods: madeGoods,
    blockedBy: null,
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

// ---------------------------------------------------------------- Mitarbeiter und Ausbau

/** Preis für den nächsten Mitarbeiter an einer Linie. */
export function hireCost(run: RunState, action: ActionDef, cfg: GameConfig): Partial<ResourceMap> {
  return scaledCost(
    action.staff.baseCost,
    action.staff.costGrowth,
    staffOf(run, action.id),
    1,
    cfg,
  );
}

/** Ist im Gebäude noch Platz für einen Mitarbeiter? */
export function hasRoom(run: RunState, location: LocationId, cfg: GameConfig): boolean {
  return staffInBuilding(run, location, cfg) < buildingCapacity(run, location, cfg);
}

function insideAt(run: RunState, location: LocationId, cfg: GameConfig): boolean {
  return run.world.inside && currentLocation(run, cfg) === location;
}

/** Mitarbeiter einstellen. Nur im Gebäude der Linie und wenn Platz ist. */
export function hireStaff(game: GameState, id: ActionId, cfg: GameConfig): GameState {
  const run = game.run;
  const action = findAction(id, cfg);
  if (game.phase !== 'playing' || !run || !action || !isActionUnlocked(run, action, cfg)) {
    return game;
  }
  if (!insideAt(run, action.location, cfg) || !hasRoom(run, action.location, cfg)) return game;
  const cost = hireCost(run, action, cfg);
  if (!canAfford(run.resources, cost)) return game;
  const before = totalStaff(run);
  let next: RunState = {
    ...run,
    resources: pay(run.resources, cost),
    actions: { ...run.actions, [id]: { staff: staffOf(run, id) + 1 } },
  };
  if (before === 0) next = addChronicle(next, 'firstWorker', {}, cfg);
  const milestone = cfg.industry.workforceMilestones.find((m) => before < m && before + 1 >= m);
  if (milestone !== undefined) next = addChronicle(next, 'workforce', { count: milestone }, cfg);
  return { ...game, run: next };
}

/** Preis für die nächste Ausbaustufe (null = schon ganz ausgebaut). */
export function buildingUpgradeCost(
  run: RunState,
  location: LocationId,
  cfg: GameConfig,
): Partial<ResourceMap> | null {
  const def = findBuilding(location, cfg);
  const level = buildingLevel(run, location);
  if (!def || level >= cfg.industry.maxLevel) return null;
  return scaledCost(def.levelCost, def.levelCostGrowth, level - 1, 1, cfg);
}

export type UpgradeBlock = 'maxed' | 'stage' | 'money' | 'away' | null;

/** Warum der Ausbau gerade nicht geht (null = er geht). */
export function buildingUpgradeBlock(
  run: RunState,
  location: LocationId,
  cfg: GameConfig,
): UpgradeBlock {
  const cost = buildingUpgradeCost(run, location, cfg);
  if (!cost) return 'maxed';
  const level = buildingLevel(run, location);
  if (run.stage < levelStageRequirement(location, level + 1, cfg)) return 'stage';
  if (!insideAt(run, location, cfg)) return 'away';
  if (!canAfford(run.resources, cost)) return 'money';
  return null;
}

/** Gebäude eine Stufe ausbauen: mehr Plätze, mehr Maschinen, sichtbar größer. */
export function upgradeBuilding(game: GameState, location: LocationId, cfg: GameConfig): GameState {
  const run = game.run;
  if (game.phase !== 'playing' || !run || !isBuildingOpen(run, location, cfg)) return game;
  const cost = buildingUpgradeCost(run, location, cfg);
  if (!cost || buildingUpgradeBlock(run, location, cfg) !== null) return game;
  const current = run.buildings[location] ?? { level: 1, machines: {} };
  const level = current.level + 1;
  let next: RunState = {
    ...run,
    resources: pay(run.resources, cost),
    buildings: { ...run.buildings, [location]: { ...current, level } },
    stats: { ...run.stats, upgrades: run.stats.upgrades + 1 },
  };
  next = addChronicle(next, 'buildingUpgraded', { location, level }, cfg);
  return { ...game, run: next };
}

/** Preis für die nächste Maschinenstufe (null = am Gebäude-Limit bzw. unbekannt). */
export function machineCost(
  run: RunState,
  id: MachineId,
  cfg: GameConfig,
): Partial<ResourceMap> | null {
  const def = findMachine(id, cfg);
  if (!def) return null;
  const level = machineLevel(run, id, cfg);
  if (level >= buildingLevel(run, def.location)) return null;
  return scaledCost(def.baseCost, def.costGrowth, level, 1, cfg);
}

/** Maschine bauen bzw. verbessern. Höchstens so weit wie die Ausbaustufe des Gebäudes. */
export function buyMachine(game: GameState, id: MachineId, cfg: GameConfig): GameState {
  const run = game.run;
  const def = findMachine(id, cfg);
  if (game.phase !== 'playing' || !run || !def || !isBuildingOpen(run, def.location, cfg)) {
    return game;
  }
  if (!insideAt(run, def.location, cfg)) return game;
  const cost = machineCost(run, id, cfg);
  if (!cost || !canAfford(run.resources, cost)) return game;
  const current = run.buildings[def.location] ?? { level: 1, machines: {} };
  const level = machineLevel(run, id, cfg) + 1;
  let next: RunState = {
    ...run,
    resources: pay(run.resources, cost),
    buildings: {
      ...run.buildings,
      [def.location]: { ...current, machines: { ...current.machines, [id]: level } },
    },
    stats: { ...run.stats, upgrades: run.stats.upgrades + 1 },
  };
  next = addChronicle(next, 'machineBuilt', { machine: id, level }, cfg);
  return { ...game, run: next };
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
