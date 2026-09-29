import type { GameConfig } from '../config';
import {
  canAfford,
  generatorCost,
  maxAffordable,
  missingFor,
  type BuyMode,
} from '../engine/economy';
import {
  RESOURCE_IDS,
  type GeneratorId,
  type ResourceId,
  type ResourceMap,
  type StateId,
} from '../engine/ids';
import type { GameState } from '../engine/schema';
import { resourceMultiplier } from '../engine/rules';
import { findGenerator, isGeneratorUnlocked } from '../engine/unlocks';
import { de, fill } from '../i18n/de';
import { formatResource } from './gameText';

// Aufbereitete Anzeige-Werte für eine Generator-Zeile. Alle Felder sind Texte, Zahlen oder
// Wahrheitswerte, damit die Zeile per flachem Vergleich nur dann neu zeichnet, wenn sich
// etwas Sichtbares ändert (nicht bei jedem Cent).

export interface GeneratorRowView {
  exists: boolean;
  unlocked: boolean;
  unlockStage: number;
  produces: ResourceId;
  owned: number;
  /** Anzahl, die bei Tipp gekauft würde (bei „Max“ mindestens 1 für die Preisanzeige). */
  count: number;
  affordable: boolean;
  costText: string;
  missingText: string;
  unitRateText: string;
  totalRateText: string;
}

const EMPTY: GeneratorRowView = {
  exists: false,
  unlocked: false,
  unlockStage: 1,
  produces: 'money',
  owned: 0,
  count: 1,
  affordable: false,
  costText: '',
  missingText: '',
  unitRateText: '',
  totalRateText: '',
};

/** Beträge wie „120 € · 5 Einfluss“. Aufgerundet: Angezeigte Preise sind nie zu niedrig. */
function joinAmounts(map: Partial<ResourceMap>, stateId: StateId): string {
  return RESOURCE_IDS.filter((id) => (map[id] ?? 0) > 0)
    .map((id) => {
      const amount = formatResource(id, map[id] ?? 0, stateId, { rounding: 'ceil' });
      return id === 'money' ? amount : `${amount} ${de.resources[id]}`;
    })
    .join(' · ');
}

function rateText(resource: ResourceId, perSecond: number, stateId: StateId): string {
  const amount = formatResource(resource, perSecond, stateId, {
    rounding: 'round',
    smallDecimals: 1,
    signed: true,
  });
  const unit = resource === 'money' ? '' : ` ${de.resources[resource]}`;
  return `${amount}${unit}${de.common.perSecond}`;
}

export function generatorRowView(
  game: GameState,
  id: GeneratorId,
  mode: BuyMode,
  cfg: GameConfig,
): GeneratorRowView {
  const run = game.run;
  const def = findGenerator(id, cfg);
  if (!run || !def) return EMPTY;
  const owned = run.generators[id] ?? 0;
  const unlocked = isGeneratorUnlocked(run, def, cfg);
  const affordableMax = mode === 'max' ? maxAffordable(def, owned, run.resources, cfg) : 0;
  const count = mode === 'max' ? Math.max(1, affordableMax) : mode;
  const cost = generatorCost(def, owned, count, cfg);
  const affordable = unlocked && canAfford(run.resources, cost);
  const unitRate = def.baseOutput * resourceMultiplier(game, def.produces, cfg);
  return {
    exists: true,
    unlocked,
    unlockStage: def.unlockStage,
    produces: def.produces,
    owned,
    count,
    affordable,
    costText: joinAmounts(cost, run.stateId),
    missingText: affordable
      ? ''
      : fill(de.invest.missing, {
          amount: joinAmounts(missingFor(run.resources, cost), run.stateId),
        }),
    unitRateText: rateText(def.produces, unitRate, run.stateId),
    totalRateText: owned > 1 ? rateText(def.produces, unitRate * owned, run.stateId) : '',
  };
}

/** Die günstigsten freigeschalteten Generatoren (für die Schnellauswahl im Karriere-Tab). */
export function suggestedGenerators(
  game: GameState,
  limit: number,
  cfg: GameConfig,
): GeneratorId[] {
  const run = game.run;
  if (!run) return [];
  return cfg.balancing.generators
    .filter((def) => isGeneratorUnlocked(run, def, cfg))
    .map((def) => ({
      id: def.id,
      price: generatorCost(def, run.generators[def.id] ?? 0, 1, cfg).money ?? 0,
    }))
    .sort((a, b) => a.price - b.price)
    .slice(0, limit)
    .map((g) => g.id);
}
