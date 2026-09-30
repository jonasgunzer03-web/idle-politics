import type { GameConfig } from '../config';
import type { BuildingDef, MachineDef } from '../config/industry';
import type { ActionDef, FlowMap } from '../config/world';
import { addChronicle } from './chronicle';
import {
  GOOD_IDS,
  RESOURCE_IDS,
  type ActionId,
  type GoodId,
  type GoodMap,
  type LocationId,
  type MachineId,
  type ResourceId,
  type ResourceMap,
} from './ids';
import { modifiers } from './modifiers';
import { workerProfile } from './people';
import { resourceMultiplier } from './rules';
import type { GameState, RunState } from './schema';
import { findLocation, isActionUnlocked, isLocationOpen } from './unlocks';

// Produktionsketten: Linien verbrauchen Zutaten (Waren oder Geld) und erzeugen Waren und
// Währungen. Mitarbeiter arbeiten automatisch, Maschinen und Ausbaustufen machen sie
// schneller, fehlende Zutaten lassen Linien stocken.

const RESOURCE_SET: ReadonlySet<string> = new Set(RESOURCE_IDS);

export function isResourceKey(key: GoodId | ResourceId): key is ResourceId {
  return RESOURCE_SET.has(key);
}

export function zeroGoods(): GoodMap {
  return { wares: 0, contacts: 0, flyers: 0, files: 0 };
}

// ---------------------------------------------------------------- Nachschlagen

export function findBuilding(location: LocationId, cfg: GameConfig): BuildingDef | undefined {
  return cfg.industry.buildings.find((b) => b.location === location);
}

export function findMachine(id: MachineId, cfg: GameConfig): MachineDef | undefined {
  return cfg.industry.machines.find((m) => m.id === id);
}

export function buildingLevel(run: RunState, location: LocationId): number {
  return run.buildings[location]?.level ?? 1;
}

export function machineLevel(run: RunState, id: MachineId, cfg: GameConfig): number {
  const def = findMachine(id, cfg);
  if (!def) return 0;
  return run.buildings[def.location]?.machines[id] ?? 0;
}

export function staffOf(run: RunState, id: ActionId): number {
  return run.actions[id]?.staff ?? 0;
}

/** Mitarbeiter im ganzen Gebäude (alle Linien zusammen). */
export function staffInBuilding(run: RunState, location: LocationId, cfg: GameConfig): number {
  let sum = 0;
  for (const a of cfg.world.actions) if (a.location === location) sum += staffOf(run, a.id);
  return sum;
}

export function buildingCapacity(run: RunState, location: LocationId, cfg: GameConfig): number {
  const level = buildingLevel(run, location);
  return cfg.industry.capacity[level] ?? cfg.industry.capacity[cfg.industry.capacity.length - 1] ?? 0;
}

export function totalStaff(run: RunState): number {
  return Object.values(run.actions).reduce((sum, a) => sum + a.staff, 0);
}

/** Summe der Maschinenwirkung einer Art in einem Gebäude. */
function machineBonus(
  run: RunState,
  location: LocationId,
  kind: MachineDef['kind'],
  cfg: GameConfig,
): number {
  const b = findBuilding(location, cfg);
  if (!b) return 0;
  let sum = 0;
  for (const id of b.machines) {
    const def = findMachine(id, cfg);
    if (def?.kind === kind) sum += def.perLevel * machineLevel(run, id, cfg);
  }
  return sum;
}

/** Eigenschaften der Stammbelegschaft (die ersten Mitarbeiter) eines Gebäudes. */
function crewBonus(
  run: RunState,
  location: LocationId,
  cfg: GameConfig,
): { speed: number; yield: number } {
  const count = Math.min(cfg.industry.coreCrew, staffInBuilding(run, location, cfg));
  let speed = 0;
  let bonus = 0;
  for (let i = 0; i < count; i++) {
    const trait = cfg.industry.traits.find(
      (t) => t.id === workerProfile(run.seed, location, i).trait,
    );
    speed += trait?.speed ?? 0;
    bonus += trait?.yield ?? 0;
  }
  return { speed, yield: bonus };
}

// ---------------------------------------------------------------- Faktoren

export function stageFactor(run: RunState, cfg: GameConfig): number {
  return Math.pow(cfg.balancing.tapStageGrowth, run.stage - 1);
}

/** Tempo-Faktor der Arbeiterstimmung (inklusive Streik). */
export function moraleFactor(run: RunState, cfg: GameConfig): number {
  const m = cfg.industry.morale;
  const factor = m.speedAtZero + ((m.speedAtFull - m.speedAtZero) * run.morale) / 100;
  return run.striking ? factor * m.strikeFactor : factor;
}

/** Durchgänge pro Sekunde je Mitarbeiter-Rate, ohne Stimmung (Maschinen, Gesetze, Belegschaft). */
export function lineSpeedFactor(run: RunState, action: ActionDef, cfg: GameConfig): number {
  const mods = modifiers(run, cfg);
  const machines = 1 + machineBonus(run, action.location, 'speed', cfg);
  const policy = Math.max(0.1, 1 + mods.lineSpeed.all + mods.lineSpeed[action.tag]);
  const crew = 1 + crewBonus(run, action.location, cfg).speed;
  return machines * policy * crew;
}

/** Mehr Erzeugnisse je Durchgang (Maschinen, Belegschaft). */
export function lineYieldFactor(run: RunState, action: ActionDef, cfg: GameConfig): number {
  return (
    (1 + machineBonus(run, action.location, 'yield', cfg)) *
    (1 + crewBonus(run, action.location, cfg).yield)
  );
}

/** Erzeugnisse eines Durchgangs (Währungen inklusive Stufe und aller Multiplikatoren). */
export function cycleOutputs(game: GameState, action: ActionDef, cfg: GameConfig): FlowMap {
  const run = game.run;
  if (!run) return {};
  const yieldFactor = lineYieldFactor(run, action, cfg);
  const stage = stageFactor(run, cfg);
  const result: FlowMap = {};
  for (const [key, base] of Object.entries(action.outputs) as [GoodId | ResourceId, number][]) {
    if (base <= 0) continue;
    result[key] = isResourceKey(key)
      ? base * stage * yieldFactor * resourceMultiplier(game, key, cfg)
      : base * yieldFactor;
  }
  return result;
}

/** Zutaten eines Durchgangs (Währungen wachsen mit der Stufe). */
export function cycleInputs(run: RunState, action: ActionDef, cfg: GameConfig): FlowMap {
  const stage = stageFactor(run, cfg);
  const result: FlowMap = {};
  for (const [key, base] of Object.entries(action.inputs) as [GoodId | ResourceId, number][]) {
    if (base > 0) result[key] = isResourceKey(key) ? base * stage : base;
  }
  return result;
}

/** Automatische Durchgänge pro Sekunde durch Mitarbeiter (vor Engpässen). */
export function linePotential(run: RunState, action: ActionDef, cfg: GameConfig): number {
  const staff = staffOf(run, action.id);
  if (staff <= 0 || !isActionUnlocked(run, action, cfg)) return 0;
  return (
    staff * action.staff.ratePerStaff * lineSpeedFactor(run, action, cfg) * moraleFactor(run, cfg)
  );
}

/** Lagerplatz für eine Ware: wächst mit den Gebäuden, die sie herstellen. */
export function storageCapacity(run: RunState, good: GoodId, cfg: GameConfig): number {
  const def = cfg.industry.goods.find((g) => g.id === good);
  if (!def) return 0;
  const producers = new Set<LocationId>();
  for (const a of cfg.world.actions) {
    if ((a.outputs[good] ?? 0) > 0 && isActionUnlocked(run, a, cfg)) producers.add(a.location);
  }
  let capacity = 0;
  for (const loc of producers) {
    capacity +=
      def.storagePerLevel *
      buildingLevel(run, loc) *
      (1 + machineBonus(run, loc, 'storage', cfg));
  }
  return Math.max(def.minStorage, capacity);
}

// ---------------------------------------------------------------- Die Kette

export interface LineFlow {
  id: ActionId;
  /** Mögliche Durchgänge pro Sekunde (Mitarbeiter). */
  potential: number;
  /** Tatsächliche Durchgänge pro Sekunde. */
  actual: number;
  /** Zutat, die gefehlt hat (null = lief ungebremst). */
  blockedBy: GoodId | ResourceId | null;
}

export interface ChainResult {
  game: GameState;
  flows: LineFlow[];
  /** Tatsächlich erzeugte (positiv) bzw. verbrauchte (negativ) Mengen in diesem Schritt. */
  resources: ResourceMap;
  goods: GoodMap;
}

/** Rechenreihenfolge: Linien ohne Waren-Zutaten zuerst (Hersteller vor Verbrauchern). */
function processingOrder(cfg: GameConfig): ActionDef[] {
  const needsGoods = (a: ActionDef) =>
    (Object.keys(a.inputs) as (GoodId | ResourceId)[]).some((k) => !isResourceKey(k));
  return [
    ...cfg.world.actions.filter((a) => !needsGoods(a)),
    ...cfg.world.actions.filter(needsGoods),
  ];
}

const orderCache = new WeakMap<GameConfig, ActionDef[]>();
function orderFor(cfg: GameConfig): ActionDef[] {
  let order = orderCache.get(cfg);
  if (!order) {
    order = processingOrder(cfg);
    orderCache.set(cfg, order);
  }
  return order;
}

/**
 * Einen Zeitschritt der Produktionskette rechnen (Mitarbeiter, keine Tipps).
 * Erzeugte Währungen zählen auch zu `earned`.
 */
export function runChain(game: GameState, seconds: number, cfg: GameConfig): ChainResult {
  const run = game.run;
  const deltaRes: ResourceMap = { money: 0, influence: 0, followers: 0, diplomacy: 0 };
  const deltaGoods = zeroGoods();
  if (!run || seconds <= 0) return { game, flows: [], resources: deltaRes, goods: deltaGoods };
  const resources = { ...run.resources };
  const earned = { ...run.earned };
  const goods = { ...run.goods };
  const flows: LineFlow[] = [];
  for (const action of orderFor(cfg)) {
    const potential = linePotential(run, action, cfg);
    if (potential <= 0) continue;
    let cycles = potential * seconds;
    let blockedBy: LineFlow['blockedBy'] = null;
    const inputs = cycleInputs(run, action, cfg);
    for (const [key, need] of Object.entries(inputs) as [GoodId | ResourceId, number][]) {
      const available = isResourceKey(key) ? resources[key] : goods[key];
      const possible = available / need;
      if (possible < cycles) {
        cycles = Math.max(0, possible);
        blockedBy = key;
      }
    }
    if (cycles > 0) {
      for (const [key, need] of Object.entries(inputs) as [GoodId | ResourceId, number][]) {
        const used = need * cycles;
        if (isResourceKey(key)) {
          resources[key] = Math.max(0, resources[key] - used);
          deltaRes[key] -= used;
        } else {
          goods[key] = Math.max(0, goods[key] - used);
          deltaGoods[key] -= used;
        }
      }
      const outputs = cycleOutputs(game, action, cfg);
      for (const [key, amount] of Object.entries(outputs) as [GoodId | ResourceId, number][]) {
        const made = amount * cycles;
        if (isResourceKey(key)) {
          resources[key] += made;
          earned[key] += made;
          deltaRes[key] += made;
        } else {
          goods[key] += made;
          deltaGoods[key] += made;
        }
      }
    }
    flows.push({ id: action.id, potential, actual: cycles / seconds, blockedBy });
  }
  // Volles Lager: Überschuss verfällt (erst am Ende, damit Verbraucher zuerst zugreifen)
  for (const id of GOOD_IDS) {
    const cap = storageCapacity(run, id, cfg);
    if (goods[id] > cap) {
      deltaGoods[id] -= goods[id] - cap;
      goods[id] = cap;
    }
  }
  return {
    game: { ...game, run: { ...run, resources, earned, goods } },
    flows,
    resources: deltaRes,
    goods: deltaGoods,
  };
}

/** Wie die Kette gerade läuft (eine Sekunde auf einer Kopie gerechnet, für Anzeige und Bot). */
export function chainSnapshot(game: GameState, cfg: GameConfig): ChainResult {
  return runChain(game, 1, cfg);
}

// ---------------------------------------------------------------- Stimmung und Streik

/** Hohe Unruhe drückt auf die Stimmung der Belegschaft. */
export function unrestMoralePressure(run: RunState, cfg: GameConfig): number {
  const m = cfg.industry.morale;
  return Math.max(0, run.unrest - m.unrestFrom) * m.unrestWeight;
}

/** Zielwert der Arbeiterstimmung. */
export function moraleTarget(run: RunState, cfg: GameConfig): number {
  const m = cfg.industry.morale;
  let target = m.base + modifiers(run, cfg).moraleTarget - unrestMoralePressure(run, cfg);
  // Gesellige und verträumte Stammbelegschaft hebt die Stimmung
  for (const loc of new Set(cfg.world.actions.map((a) => a.location))) {
    const count = Math.min(cfg.industry.coreCrew, staffInBuilding(run, loc, cfg));
    for (let i = 0; i < count; i++) {
      const trait = cfg.industry.traits.find((t) => t.id === workerProfile(run.seed, loc, i).trait);
      target += trait?.morale ?? 0;
    }
  }
  return Math.min(100, Math.max(0, target));
}

export type MoraleSignal = 'strikeStarted' | 'strikeEnded' | null;

/** Stimmung wandert zum Zielwert; Streik mit Rückfall-Schwelle (nur online). */
export function tickMorale(
  game: GameState,
  deltaMs: number,
  cfg: GameConfig,
): { game: GameState; signal: MoraleSignal } {
  const run = game.run;
  if (!run || deltaMs <= 0) return { game, signal: null };
  const m = cfg.industry.morale;
  const target = moraleTarget(run, cfg);
  const step = (m.driftPerMinute * deltaMs) / 60_000;
  const morale =
    run.morale < target ? Math.min(target, run.morale + step) : Math.max(target, run.morale - step);
  let striking = run.striking;
  let signal: MoraleSignal = null;
  // Streiks gibt es erst, wenn jemand angestellt ist
  if (!striking && morale < m.strikeBelow && totalStaff(run) > 0) {
    striking = true;
    signal = 'strikeStarted';
  } else if (striking && morale > m.strikeEndAbove) {
    striking = false;
    signal = 'strikeEnded';
  }
  let next: RunState = { ...run, morale, striking };
  if (signal) next = addChronicle(next, signal, {}, cfg);
  return { game: { ...game, run: next }, signal };
}

// ---------------------------------------------------------------- Ausbau

/** Karrierestufe, ab der ein Gebäude die Ausbaustufe `level` erreichen darf. */
export function levelStageRequirement(location: LocationId, level: number, cfg: GameConfig): number {
  const loc = findLocation(location, cfg);
  const offset = cfg.industry.levelStageOffset[level] ?? 0;
  return Math.min(12, (loc?.unlockStage ?? 1) + offset);
}

export function isBuildingOpen(run: RunState, location: LocationId, cfg: GameConfig): boolean {
  const loc = findLocation(location, cfg);
  return loc !== undefined && isLocationOpen(run, loc, cfg);
}
