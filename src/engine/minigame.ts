import type { GameConfig } from '../config';
import {
  addResources,
  buildingUpgradeBlock,
  buildingUpgradeCost,
  canAfford,
  hasRoom,
  hireCost,
  machineCost,
  productionRates,
  type UpgradeBlock,
} from './economy';
import {
  RESOURCE_IDS,
  type ActionId,
  type LocationId,
  type MachineId,
  type ResourceMap,
} from './ids';
import {
  buildingLevel,
  cycleOutputs,
  isBuildingOpen,
  isResourceKey,
  staffInBuilding,
} from './production';
import type { GameState, RunState } from './schema';
import { actionsAt, isActionUnlocked } from './unlocks';
import { currentLocation } from './world';

// Minispiel „Selbst anpacken“: Die Bewegung der Figuren läuft in der Oberfläche
// (src/minigame/). Hier steht nur, was ein Verkauf einbringt, wie viele Helfer mitlaufen und
// welche Ausbau-Felder es gibt – Käufe laufen über die üblichen Engine-Funktionen.

function insideAt(run: RunState, location: LocationId, cfg: GameConfig): boolean {
  return run.world.inside && currentLocation(run, cfg) === location;
}

/** Ausbaustufe, nach der sich Quelle und Tragkraft im Minispiel richten. */
export function minigameLevel(run: RunState, location: LocationId): number {
  return buildingLevel(run, location);
}

/** Wie viele Mitarbeiter im Minispiel als Helfer mitlaufen. */
export function minigameHelpers(run: RunState, location: LocationId, cfg: GameConfig): number {
  return Math.min(cfg.minigames.maxHelpers, staffInBuilding(run, location, cfg));
}

/**
 * Wert eines Verkaufs: ein Vielfaches eines Durchgangs aller freigeschalteten Linien des
 * Gebäudes (nur der Währungsanteil) plus ein paar Sekunden des laufenden Ertrags dieser
 * Währungen. So bleibt das Minispiel in jeder Stufe lohnend.
 */
export function minigameSaleValue(
  game: GameState,
  location: LocationId,
  cfg: GameConfig,
): Partial<ResourceMap> {
  const run = game.run;
  if (!run) return {};
  const value: Partial<ResourceMap> = {};
  for (const action of actionsAt(location, cfg)) {
    if (!isActionUnlocked(run, action, cfg)) continue;
    for (const [key, amount] of Object.entries(cycleOutputs(game, action, cfg))) {
      if (!isResourceKey(key as never) || amount <= 0) continue;
      const id = key as keyof ResourceMap;
      value[id] = (value[id] ?? 0) + amount * cfg.minigames.saleCycles;
    }
  }
  const rates = productionRates(game, cfg);
  for (const id of RESOURCE_IDS) {
    const base = value[id];
    if (base === undefined) continue;
    value[id] = base + Math.max(0, rates[id]) * cfg.minigames.rateSeconds;
  }
  return value;
}

export interface SaleResult {
  game: GameState;
  gained: Partial<ResourceMap>;
}

/** Eingesammelte Geldbündel gutschreiben (nur im passenden Gebäude). */
export function minigameSell(
  game: GameState,
  location: LocationId,
  count: number,
  cfg: GameConfig,
): SaleResult {
  const run = game.run;
  if (game.phase !== 'playing' || !run || !insideAt(run, location, cfg))
    return { game, gained: {} };
  if (!isBuildingOpen(run, location, cfg)) return { game, gained: {} };
  const n = Math.min(cfg.minigames.cashPileMax, Math.max(0, Math.floor(count)));
  if (n === 0) return { game, gained: {} };
  const unit = minigameSaleValue(game, location, cfg);
  const gained: Partial<ResourceMap> = {};
  for (const id of RESOURCE_IDS) {
    const v = unit[id];
    if (v !== undefined && v > 0) gained[id] = v * n;
  }
  if (Object.keys(gained).length === 0) return { game, gained };
  const next = addResources(run, gained);
  return {
    game: {
      ...game,
      run: { ...next, stats: { ...next.stats, minigameSales: next.stats.minigameSales + n } },
    },
    gained,
  };
}

// ---------------------------------------------------------------- Ausbau-Felder

export type PadKind = 'hire' | 'upgrade' | 'machine';

export interface PadOffer {
  kind: PadKind;
  /** Was gekauft wird (Linie bzw. Maschine); beim Ausbau leer. */
  target: ActionId | MachineId | null;
  /** null = gerade nichts zu kaufen (voll, ganz ausgebaut, Stufe zu niedrig). */
  cost: Partial<ResourceMap> | null;
  affordable: boolean;
  /** Grund, warum nichts geht (nur beim Ausbau). */
  block: UpgradeBlock;
}

/** Die drei Ausbau-Felder eines Gebäudes mit aktuellem Preis. */
export function minigameOffers(run: RunState, location: LocationId, cfg: GameConfig): PadOffer[] {
  const offers: PadOffer[] = [];

  // Mitarbeiter: günstigste freigeschaltete Linie, solange Platz ist
  const lines = actionsAt(location, cfg).filter((a) => isActionUnlocked(run, a, cfg));
  let hire: PadOffer = { kind: 'hire', target: null, cost: null, affordable: false, block: null };
  if (hasRoom(run, location, cfg)) {
    for (const line of lines) {
      const cost = hireCost(run, line, cfg);
      const total = Object.values(cost).reduce((a, b) => a + b, 0);
      const best = hire.cost ? Object.values(hire.cost).reduce((a, b) => a + b, 0) : Infinity;
      if (total < best) {
        hire = {
          kind: 'hire',
          target: line.id,
          cost,
          affordable: canAfford(run.resources, cost),
          block: null,
        };
      }
    }
  }
  offers.push(hire);

  // Ausbaustufe
  const upgradeCost = buildingUpgradeCost(run, location, cfg);
  const block = buildingUpgradeBlock(run, location, cfg);
  offers.push({
    kind: 'upgrade',
    target: null,
    cost: block === 'maxed' || block === 'stage' ? null : upgradeCost,
    affordable: block === null,
    block,
  });

  // Maschine: die günstigere der beiden, die noch eine Stufe zulässt
  let machine: PadOffer = {
    kind: 'machine',
    target: null,
    cost: null,
    affordable: false,
    block: null,
  };
  const building = cfg.industry.buildings.find((b) => b.location === location);
  for (const id of building?.machines ?? []) {
    const cost = machineCost(run, id, cfg);
    if (!cost) continue;
    const total = Object.values(cost).reduce((a, b) => a + b, 0);
    const best = machine.cost ? Object.values(machine.cost).reduce((a, b) => a + b, 0) : Infinity;
    if (total < best) {
      machine = {
        kind: 'machine',
        target: id,
        cost,
        affordable: canAfford(run.resources, cost),
        block: null,
      };
    }
  }
  offers.push(machine);
  return offers;
}

/** Darf das Minispiel an diesem Ort gestartet werden? */
export function canPlayMinigame(game: GameState, location: LocationId, cfg: GameConfig): boolean {
  const run = game.run;
  return (
    game.phase === 'playing' &&
    run !== null &&
    insideAt(run, location, cfg) &&
    isBuildingOpen(run, location, cfg)
  );
}
