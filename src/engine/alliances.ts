import type { GameConfig } from '../config';
import { canAfford, pay, wholeAmount } from './economy';
import type { GroupId, ResourceMap } from './ids';
import { groupLoyalty, groupsFor, nextRequirement } from './rules';
import type { GameState, RunState } from './schema';

// Allianzen: Gruppen umwerben (Geld oder Einfluss), Gegenspieler verlieren etwas.

export function investCost(run: RunState, id: GroupId, cfg: GameConfig): Partial<ResourceMap> {
  const group = cfg.groups.find((g) => g.id === id);
  if (!group) return {};
  const rules = cfg.allianceRules;
  const req = nextRequirement(run, cfg);
  const loyalty = groupLoyalty(run, id, cfg);
  const growth = Math.pow(rules.costGrowthPer10, Math.max(0, loyalty - 50) / 10);
  const base = group.currency === 'money' ? req.money : req.influence;
  const amount = wholeAmount(
    Math.max(1, base * rules.costFraction * cfg.states[run.stateId].allianceCostFactor * growth),
  );
  return { [group.currency]: amount };
}

export function investInGroup(game: GameState, id: GroupId, cfg: GameConfig): GameState {
  const run = game.run;
  if (game.phase !== 'playing' || !run) return game;
  const group = groupsFor(run, cfg).find((g) => g.id === id);
  if (!group) return game;
  const loyalty = groupLoyalty(run, id, cfg);
  if (loyalty >= 100) return game;
  const cost = investCost(run, id, cfg);
  if (!canAfford(run.resources, cost)) return game;
  const rules = cfg.allianceRules;
  const groups = { ...run.groups, [id]: Math.min(100, loyalty + rules.investGain) };
  for (const rival of group.rivals) {
    if (groupsFor(run, cfg).some((g) => g.id === rival)) {
      groups[rival] = Math.max(0, groupLoyalty(run, rival, cfg) - rules.rivalPenalty);
    }
  }
  return { ...game, run: { ...run, resources: pay(run.resources, cost), groups } };
}
