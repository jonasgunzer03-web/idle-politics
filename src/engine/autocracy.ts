import type { GameConfig } from '../config';
import type { AutocracyActionDef } from '../config/balancing';
import { canAfford, pay } from './economy';
import type { AutocracyActionId, ResourceMap } from './ids';
import {
  foreignPartners,
  isLoyaltyUnlocked,
  isWorldUnlocked,
  nextRequirement,
  relation,
} from './rules';
import type { GameState, RunState } from './schema';

// Autokratische Aktionen. Jede zeigt vorher ihre Folgen (siehe autocracyPreview).

export function findAutocracyAction(
  id: AutocracyActionId,
  cfg: GameConfig,
): AutocracyActionDef | undefined {
  return cfg.balancing.autocracy.actions.find((a) => a.id === id);
}

export function autocracyCost(
  run: RunState,
  def: AutocracyActionDef,
  cfg: GameConfig,
): Partial<ResourceMap> {
  const req = nextRequirement(run, cfg);
  const loyaltyFactor = def.id === 'buyLoyalty' ? cfg.states[run.stateId].loyaltyCostFactor : 1;
  const cost: Partial<ResourceMap> = {};
  if (def.costFraction.money)
    cost.money = Math.ceil(req.money * def.costFraction.money * loyaltyFactor);
  if (def.costFraction.influence)
    cost.influence = Math.ceil(req.influence * def.costFraction.influence);
  return cost;
}

export function autocracyCooldownKey(id: AutocracyActionId): string {
  return `autocracy:${id}`;
}

export function isAutocracyAvailable(run: RunState, cfg: GameConfig): boolean {
  return run.path === 'autocratic' && isLoyaltyUnlocked(run, cfg);
}

export function autocracyAction(
  game: GameState,
  id: AutocracyActionId,
  cfg: GameConfig,
): GameState {
  const run = game.run;
  const def = findAutocracyAction(id, cfg);
  if (game.phase !== 'playing' || !run || !def || !isAutocracyAvailable(run, cfg)) return game;
  if ((run.cooldowns[autocracyCooldownKey(id)] ?? 0) > run.playMs) return game;
  const cost = autocracyCost(run, def, cfg);
  if (!canAfford(run.resources, cost)) return game;
  const clamp = (v: number) => Math.min(100, Math.max(0, v));
  const relations = { ...run.relations };
  if (def.relations !== 0 && isWorldUnlocked(run, cfg)) {
    for (const f of foreignPartners(run)) {
      relations[f] = Math.min(100, Math.max(-100, relation(run, f, cfg) + def.relations));
    }
  }
  const next: RunState = {
    ...run,
    resources: pay(run.resources, cost),
    approval: clamp(run.approval + def.approval),
    unrest: clamp(run.unrest + def.unrest),
    loyalty: clamp(run.loyalty + def.loyalty),
    relations,
    fixElectionBonus: id === 'fixElection' ? true : run.fixElectionBonus,
    rival:
      def.rival !== 0 && run.rival.status === 'active'
        ? { ...run.rival, strength: Math.min(100, Math.max(0, run.rival.strength + def.rival)) }
        : run.rival,
    cooldowns: {
      ...run.cooldowns,
      [autocracyCooldownKey(id)]: run.playMs + def.cooldownSeconds * 1000,
    },
  };
  return { ...game, run: next };
}
