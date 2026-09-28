import type { GameConfig } from '../config';
import type { ForeignActionDef } from '../config/foreign';
import type { ForeignActionId, ForeignId } from './ids';
import { costScale, foreignPartners, groupLoyalty, isWorldUnlocked, relation } from './rules';
import type { GameState, RunState } from './schema';

// Außenpolitik: Aktionen kosten diplomatisches Kapital und verändern Beziehungen.

export function foreignCooldownKey(action: ForeignActionId, target: ForeignId): string {
  return `foreign:${action}:${target}`;
}

export function foreignActionCost(def: ForeignActionDef, cfg: GameConfig): number {
  return Math.ceil(def.cost * costScale(cfg));
}

export type ForeignBlock =
  | 'locked'
  | 'relation'
  | 'cooldown'
  | 'cost'
  | 'autocraticOnly'
  | 'already'
  | null;

/** Warum eine Aktion gerade nicht geht (null = möglich). */
export function foreignActionBlock(
  game: GameState,
  target: ForeignId,
  action: ForeignActionId,
  cfg: GameConfig,
): ForeignBlock {
  const run = game.run;
  const def = cfg.foreignActions.find((a) => a.id === action);
  if (!run || !def || !isWorldUnlocked(run, cfg) || !foreignPartners(run).includes(target)) {
    return 'locked';
  }
  if (def.autocraticOnly && run.path !== 'autocratic') return 'autocraticOnly';
  const treaty = run.treaties[target];
  if (action === 'tradeAgreement' && treaty?.trade) return 'already';
  if (action === 'alliance' && treaty?.alliance) return 'already';
  if (relation(run, target, cfg) < def.minRelation) return 'relation';
  if ((run.cooldowns[foreignCooldownKey(action, target)] ?? 0) > run.playMs) return 'cooldown';
  if (run.resources.diplomacy < foreignActionCost(def, cfg)) return 'cost';
  return null;
}

export function foreignAction(
  game: GameState,
  target: ForeignId,
  action: ForeignActionId,
  cfg: GameConfig,
): GameState {
  const run = game.run;
  const def = cfg.foreignActions.find((a) => a.id === action);
  if (game.phase !== 'playing' || !run || !def) return game;
  if (foreignActionBlock(game, target, action, cfg) !== null) return game;
  const rules = cfg.foreignRules;
  const treaty = run.treaties[target] ?? { trade: false, alliance: false };
  let nextTreaty = treaty;
  let next: RunState = {
    ...run,
    resources: { ...run.resources, diplomacy: run.resources.diplomacy - foreignActionCost(def, cfg) },
    relations: {
      ...run.relations,
      [target]: Math.min(100, Math.max(-100, relation(run, target, cfg) + def.relation)),
    },
    approval: Math.min(100, Math.max(0, run.approval + def.approval)),
    cooldowns: {
      ...run.cooldowns,
      [foreignCooldownKey(action, target)]: run.playMs + def.cooldownSeconds * 1000,
    },
  };
  if (action === 'tradeAgreement') nextTreaty = { ...treaty, trade: true };
  if (action === 'alliance') nextTreaty = { ...treaty, alliance: true };
  if (action === 'sanctions') nextTreaty = { trade: false, alliance: false };
  if (action === 'maneuver') {
    next = {
      ...next,
      groups: {
        ...next.groups,
        military: Math.min(100, groupLoyalty(next, 'military', cfg) + rules.maneuverMilitary),
      },
      events: { ...next.events, crisisAt: next.playMs + rules.maneuverCrisisSeconds * 1000 },
    };
  }
  return { ...game, run: { ...next, treaties: { ...next.treaties, [target]: nextTreaty } } };
}
