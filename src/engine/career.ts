import type { GameConfig } from '../config';
import { autocraticTurnStage, careerVenue, type StageRequirement } from '../config/careers';
import { canAfford, pay } from './economy';
import { MAX_STAGE, type LocationId, type ResourceMap } from './ids';
import { addChronicle } from './chronicle';
import { modifiers } from './modifiers';
import { rivalAfterElection, rivalElectionEffect } from './party';
import { drawRandom } from './rng';
import {
  campaignLegacyBonus,
  foreignPartners,
  groupLoyalty,
  isLoyaltyUnlocked,
  nextRequirement,
  relation,
} from './rules';
import type { GameState, RunState } from './schema';
import { clampToWorld, currentLocation } from './world';

// Aufstieg: Wahlen (demokratisch), Ernennungen (Stufen ohne Wahl) und „Macht ausbauen“
// (autokratisch). Jeder Aufstieg führt in die Zeremonie (phase 'ceremony').

export function isElectionStage(run: RunState, cfg: GameConfig): boolean {
  if (run.path !== 'democratic' || run.stage >= MAX_STAGE) return false;
  return cfg.careers[run.stateId][run.stage]?.election ?? false;
}

export function isAtVenue(run: RunState, cfg: GameConfig): boolean {
  return run.world.inside && currentLocation(run, cfg) === careerVenue(run.stage);
}

/** Geld und Einfluss, die für den Aufstieg ausgegeben werden. */
export function advancementCost(game: GameState, cfg: GameConfig): Partial<ResourceMap> {
  const run = game.run;
  if (!run) return {};
  const req = nextRequirement(run, cfg);
  const discount =
    run.path === 'autocratic' && run.fixElectionBonus
      ? 1 - cfg.balancing.autocracy.fixElectionDiscount
      : 1;
  return { money: Math.ceil(req.money * discount), influence: Math.ceil(req.influence * discount) };
}

export function campaignCost(game: GameState, campaign: number, cfg: GameConfig): number {
  const run = game.run;
  const level = cfg.balancing.elections.campaigns[campaign];
  if (!run || !level) return 0;
  const req = nextRequirement(run, cfg);
  return Math.ceil(req.money * level.costFraction * cfg.states[run.stateId].campaignCostFactor);
}

/** Siegchance in Prozent (5 bis 95) bei gewähltem Wahlkampfbudget. */
export function electionChance(game: GameState, campaign: number, cfg: GameConfig): number {
  const run = game.run;
  if (!run) return 0;
  const e = cfg.balancing.elections;
  const req = nextRequirement(run, cfg);
  const ratio = Math.max(run.resources.followers, 1) / Math.max(req.followers, 1);
  // Anhänger: pro Verdopplung gegenüber dem Bedarf +followersWeight, begrenzt auf ±2 Verdopplungen
  const followersTerm = e.followersWeight * Math.max(-2, Math.min(2, Math.log2(ratio)));
  const raw =
    e.base +
    e.approvalWeight * (run.approval - 50) +
    followersTerm +
    (e.campaigns[campaign]?.bonus ?? 0) +
    campaignLegacyBonus(game, cfg) +
    modifiers(run, cfg).electionBonus +
    rivalElectionEffect(run, cfg);
  return Math.round(Math.min(e.maxChance, Math.max(e.minChance, raw)));
}

export interface CareerStatus {
  /** Nächste Stufe oder null an der Spitze. */
  nextStage: number | null;
  election: boolean;
  autocratic: boolean;
  venue: LocationId;
  atVenue: boolean;
  requirement: StageRequirement;
  cost: Partial<ResourceMap>;
  canAffordCost: boolean;
  loyaltyOk: boolean;
  /** Alles erfüllt (bei Wahlen: Kosten bezahlbar; die Chance entscheidet). */
  ready: boolean;
}

export function careerStatus(game: GameState, cfg: GameConfig): CareerStatus | null {
  const run = game.run;
  if (!run) return null;
  const top = run.stage >= MAX_STAGE;
  const requirement = nextRequirement(run, cfg);
  const cost = advancementCost(game, cfg);
  const canAffordCost = canAfford(run.resources, cost);
  const autocratic = run.path === 'autocratic';
  const loyaltyNeed = Math.max(requirement.loyalty, cfg.balancing.autocracy.powerLoyaltyCost);
  const loyaltyOk = !autocratic || !isLoyaltyUnlocked(run, cfg) || run.loyalty >= loyaltyNeed;
  const election = isElectionStage(run, cfg);
  return {
    nextStage: top ? null : run.stage + 1,
    election,
    autocratic,
    venue: careerVenue(run.stage),
    atVenue: isAtVenue(run, cfg),
    requirement,
    cost,
    canAffordCost,
    loyaltyOk,
    ready: !top && canAffordCost && loyaltyOk,
  };
}

/** Stufe erhöhen und in die Zeremonie wechseln. */
function stageUp(game: GameState, run: RunState): GameState {
  const stage = Math.min(MAX_STAGE, run.stage + 1);
  const statesRuled =
    stage === MAX_STAGE && !game.meta.statesRuled.includes(run.stateId)
      ? [...game.meta.statesRuled, run.stateId]
      : game.meta.statesRuled;
  return {
    ...game,
    phase: 'ceremony',
    pending: { ...game.pending, ceremony: { stage } },
    run: {
      ...run,
      stage,
      highestStage: Math.max(run.highestStage, stage),
      world: { ...run.world },
    },
    meta: {
      ...game.meta,
      highestStageEver: Math.max(game.meta.highestStageEver, stage),
      statesRuled,
    },
  };
}

/** Stufen verlieren (Wahlniederlage, Rücktritt). Mindestens Stufe 1. */
export function demote(run: RunState, stages: number, cfg: GameConfig): RunState {
  const stage = Math.max(1, run.stage - stages);
  return clampToWorld({ ...run, stage, fixElectionBonus: false }, cfg);
}

export interface ElectionOutcome {
  won: boolean;
  chance: number;
  stage: number;
}

/** Kandidieren: kostet Aufstiegskosten und Wahlkampfbudget, Ergebnis per Zufall. */
export function runForElection(
  game: GameState,
  campaign: number,
  cfg: GameConfig,
): { game: GameState; outcome: ElectionOutcome | null } {
  const run = game.run;
  if (game.phase !== 'playing' || !run || !isElectionStage(run, cfg) || !isAtVenue(run, cfg)) {
    return { game, outcome: null };
  }
  if (campaign < 0 || campaign >= cfg.balancing.elections.campaigns.length) {
    return { game, outcome: null };
  }
  const cost = advancementCost(game, cfg);
  const total = { ...cost, money: (cost.money ?? 0) + campaignCost(game, campaign, cfg) };
  if (!canAfford(run.resources, total)) return { game, outcome: null };
  const chance = electionChance(game, campaign, cfg);
  const draw = drawRandom(game);
  const won = draw.value * 100 < chance;
  const paid: RunState = { ...run, resources: pay(run.resources, total) };
  if (won) {
    let withStats: RunState = rivalAfterElection(
      { ...paid, stats: { ...paid.stats, electionsWon: paid.stats.electionsWon + 1 } },
      true,
      cfg,
    );
    withStats = addChronicle(
      withStats,
      'electionWon',
      { stage: run.stage + 1, chance, seed: run.rival.seed },
      cfg,
    );
    return {
      game: stageUp({ ...draw.game }, withStats),
      outcome: { won: true, chance, stage: run.stage + 1 },
    };
  }
  const e = cfg.balancing.elections;
  let lost = demote(
    rivalAfterElection(
      {
        ...paid,
        approval: Math.max(0, paid.approval - e.lossApproval),
        stats: { ...paid.stats, electionsLost: paid.stats.electionsLost + 1 },
      },
      false,
      cfg,
    ),
    e.lossStages,
    cfg,
  );
  lost = addChronicle(lost, 'electionLost', { stage: run.stage + 1, seed: run.rival.seed }, cfg);
  return { game: { ...draw.game, run: lost }, outcome: { won: false, chance, stage: lost.stage } };
}

/** Ernennung (Stufe ohne Wahl) bzw. „Macht ausbauen“ (autokratisch). */
export function promote(game: GameState, cfg: GameConfig): GameState {
  const run = game.run;
  if (game.phase !== 'playing' || !run || isElectionStage(run, cfg) || !isAtVenue(run, cfg)) {
    return game;
  }
  const status = careerStatus(game, cfg);
  if (!status?.ready) return game;
  let next: RunState = { ...run, resources: pay(run.resources, status.cost) };
  if (run.path === 'autocratic') {
    const a = cfg.balancing.autocracy;
    next = {
      ...next,
      loyalty: isLoyaltyUnlocked(run, cfg)
        ? Math.max(0, next.loyalty - a.powerLoyaltyCost)
        : next.loyalty,
      unrest: Math.min(100, next.unrest + a.powerUnrest),
      fixElectionBonus: false,
    };
  }
  next = addChronicle(next, 'promoted', { stage: run.stage + 1 }, cfg);
  return stageUp(game, next);
}

/** Zeremonie beenden. An der Spitze folgt der Siegesbildschirm (einmal pro Durchlauf). */
export function finishCeremony(game: GameState): GameState {
  if (game.phase !== 'ceremony' || !game.run) return game;
  const stage = game.pending.ceremony?.stage ?? game.run.stage;
  const seen = game.meta.ceremoniesSeen.includes(stage)
    ? game.meta.ceremoniesSeen
    : [...game.meta.ceremoniesSeen, stage];
  const victory = game.run.stage >= MAX_STAGE && game.run.rulingSince === null;
  return {
    ...game,
    phase: victory ? 'victory' : 'playing',
    pending: { ...game.pending, ceremony: null },
    meta: { ...game.meta, ceremoniesSeen: seen },
  };
}

export function canTurnAutocratic(game: GameState, cfg: GameConfig): boolean {
  const run = game.run;
  return (
    game.phase === 'playing' &&
    run !== null &&
    run.path === 'democratic' &&
    !cfg.states[run.stateId].alwaysAutocratic &&
    run.stage >= autocraticTurnStage
  );
}

/** Einmalig und unumkehrbar: autoritären Kurs einschlagen. */
export function turnAutocratic(game: GameState, cfg: GameConfig): GameState {
  const run = game.run;
  if (!run || !canTurnAutocratic(game, cfg)) return game;
  const a = cfg.balancing.autocracy;
  const relations = { ...run.relations };
  for (const id of foreignPartners(run)) {
    relations[id] = Math.max(-100, relation(run, id, cfg) - a.turnRelations);
  }
  const withEntry = addChronicle(run, 'autocraticTurn', {}, cfg);
  return {
    ...game,
    run: {
      ...withEntry,
      path: 'autocratic',
      unrest: Math.min(100, run.unrest + a.turnUnrest),
      groups: {
        ...run.groups,
        civilSociety: Math.max(0, groupLoyalty(run, 'civilSociety', cfg) - a.turnCivilSociety),
      },
      relations,
    },
  };
}
