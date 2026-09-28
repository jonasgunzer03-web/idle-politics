import type { GameConfig } from '../config';
import type { GeneratorDef } from '../config/balancing';
import {
  RESOURCE_IDS,
  type GeneratorId,
  type ResourceId,
  type ResourceMap,
  type TapActionId,
} from './ids';
import type { GameState, RunState } from './schema';
import { findGenerator, isGeneratorUnlocked, isResourceUnlocked } from './unlocks';

export type BuyMode = 1 | 10 | 'max';

/** Obergrenze für einen einzelnen Max-Kauf, schützt vor Endlosschleifen bei Extremwerten. */
const MAX_BULK = 10_000;

export function zeroResources(): ResourceMap {
  return { money: 0, influence: 0, followers: 0, loyalty: 0, diplomacy: 0 };
}

/**
 * Preise werden auf ganze Beträge aufgerundet, damit angezeigter und abgezogener Preis
 * identisch sind. Der kleine Abzug fängt Gleitkommafehler ab (10,000000000000002 → 10).
 */
function wholeAmount(value: number): number {
  if (value >= 1e15) return value;
  return Math.ceil(value - 1e-9);
}

/** Kosten skalieren mit 1 / GAME_SPEED. */
function costScale(cfg: GameConfig): number {
  return 1 / cfg.balancing.gameSpeed;
}

/**
 * Gesamtkosten für `count` weitere Exemplare, wenn schon `owned` vorhanden sind.
 * Geometrische Reihe: base · r^owned · (r^count − 1) / (r − 1).
 */
export function generatorCost(
  def: GeneratorDef,
  owned: number,
  count: number,
  cfg: GameConfig,
): Partial<ResourceMap> {
  const r = cfg.balancing.costGrowth;
  const factor = r === 1 ? count : (Math.pow(r, owned) * (Math.pow(r, count) - 1)) / (r - 1);
  const result: Partial<ResourceMap> = {};
  for (const id of RESOURCE_IDS) {
    const base = def.baseCost[id];
    if (base !== undefined && base > 0) result[id] = wholeAmount(base * costScale(cfg) * factor);
  }
  return result;
}

export function canAfford(resources: ResourceMap, cost: Partial<ResourceMap>): boolean {
  return RESOURCE_IDS.every((id) => resources[id] >= (cost[id] ?? 0));
}

/** Was fehlt noch? Nur Ressourcen mit Fehlbetrag > 0. */
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

/** Wie viele Exemplare kann man sich gerade leisten? */
export function maxAffordable(
  def: GeneratorDef,
  owned: number,
  resources: ResourceMap,
  cfg: GameConfig,
): number {
  const r = cfg.balancing.costGrowth;
  let estimate = MAX_BULK;
  for (const id of RESOURCE_IDS) {
    const base = def.baseCost[id];
    if (base === undefined || base <= 0) continue;
    const first = base * costScale(cfg) * Math.pow(r, owned);
    const n =
      r === 1
        ? Math.floor(resources[id] / first)
        : Math.floor(Math.log((resources[id] * (r - 1)) / first + 1) / Math.log(r));
    estimate = Math.min(estimate, Number.isFinite(n) ? Math.max(0, n) : 0);
  }
  // Rundungsfehler der Logarithmus-Formel korrigieren
  while (estimate > 0 && !canAfford(resources, generatorCost(def, owned, estimate, cfg))) {
    estimate--;
  }
  while (
    estimate < MAX_BULK &&
    canAfford(resources, generatorCost(def, owned, estimate + 1, cfg))
  ) {
    estimate++;
  }
  return estimate;
}

/** Ertrags-Multiplikator aus Beruf und Staat für eine Ressource. */
export function resourceMultiplier(run: RunState, resource: ResourceId, cfg: GameConfig): number {
  const profession = cfg.balancing.professions[run.profession][resource];
  const state = cfg.states[run.stateId].resourceMultiplier[resource] ?? 1;
  return profession * state;
}

/** Automatische Erträge pro Sekunde. */
export function productionRates(run: RunState, cfg: GameConfig): ResourceMap {
  const rates = zeroResources();
  for (const def of cfg.balancing.generators) {
    const count = run.generators[def.id] ?? 0;
    if (count > 0) rates[def.produces] += count * def.baseOutput;
  }
  for (const id of RESOURCE_IDS) rates[id] *= resourceMultiplier(run, id, cfg);
  return rates;
}

/** Erträge für einen Zeitraum gutschreiben (ohne sonstige Spiellogik). */
export function applyProduction(run: RunState, deltaMs: number, cfg: GameConfig): RunState {
  if (deltaMs <= 0) return run;
  const rates = productionRates(run, cfg);
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
  return { ...run, resources, earned };
}

export function tapYield(
  run: RunState,
  action: TapActionId,
  cfg: GameConfig,
): {
  resource: ResourceId;
  amount: number;
} {
  const def = cfg.balancing.tapActions.find((a) => a.id === action);
  if (!def) return { resource: 'money', amount: 0 };
  return {
    resource: def.produces,
    amount: def.baseYield * resourceMultiplier(run, def.produces, cfg),
  };
}

export interface TapResult {
  game: GameState;
  resource: ResourceId;
  gained: number;
}

export function applyTap(game: GameState, action: TapActionId, cfg: GameConfig): TapResult {
  const run = game.run;
  if (game.phase !== 'playing' || !run) return { game, resource: 'money', gained: 0 };
  const { resource, amount } = tapYield(run, action, cfg);
  if (amount <= 0 || !isResourceUnlocked(run, resource, cfg)) {
    return { game, resource, gained: 0 };
  }
  return {
    game: {
      ...game,
      run: {
        ...run,
        resources: { ...run.resources, [resource]: run.resources[resource] + amount },
        earned: { ...run.earned, [resource]: run.earned[resource] + amount },
      },
      stats: { ...game.stats, totalTaps: game.stats.totalTaps + 1 },
    },
    resource,
    gained: amount,
  };
}

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

  const resources = { ...run.resources };
  for (const res of RESOURCE_IDS) {
    // Math.max schützt vor −0,000001 durch Gleitkomma-Rundung
    resources[res] = Math.max(0, resources[res] - (cost[res] ?? 0));
  }
  return {
    game: {
      ...game,
      run: { ...run, resources, generators: { ...run.generators, [id]: owned + count } },
    },
    bought: count,
  };
}
