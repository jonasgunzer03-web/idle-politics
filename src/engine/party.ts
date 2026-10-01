import type { GameConfig } from '../config';
import type { PolicyDef, PolicyShock, RivalCounterDef } from '../config/party';
import { addChronicle } from './chronicle';
import { canAfford, pay } from './economy';
import {
  FACTION_IDS,
  GROUP_IDS,
  MAX_STAGE,
  SKILL_IDS,
  type FactionId,
  type PolicyId,
  type ResourceMap,
  type RivalCounterId,
} from './ids';
import { consequenceDelayMs, findPolicy, modifiers } from './modifiers';
import { hash32 } from './people';
import { drawRandom } from './rng';
import {
  costScale,
  foreignPartners,
  groupLoyalty,
  isWorldUnlocked,
  nextRequirement,
  relation,
} from './rules';
import type { Advisor, AdvisorCandidate, GameState, RunState } from './schema';
import { currentLocation } from './world';

// Politik im Parteibüro: Berater am Tisch, Beschlüsse mit Spätfolgen, der Rivale.
// Alle Entscheidungen fallen im Parteibüro (man muss drinnen sein).

export const SESSION_LOCATION = 'partyOffice' as const;

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

export function isInSession(run: RunState, cfg: GameConfig): boolean {
  return run.world.inside && currentLocation(run, cfg) === SESSION_LOCATION;
}

/** Hier wird über Gesetze abgestimmt (Wisch-Karten): Parteibüro, Rathaus, Parlament. */
export const VOTE_LOCATIONS = ['partyOffice', 'townHall', 'parliament'] as const;

export function canVoteHere(run: RunState, cfg: GameConfig): boolean {
  const here = currentLocation(run, cfg);
  return run.world.inside && here !== null && (VOTE_LOCATIONS as readonly string[]).includes(here);
}

function stageIndex(run: RunState): number {
  return Math.min(MAX_STAGE, Math.max(1, run.stage)) - 1;
}

export function seats(run: RunState, cfg: GameConfig): number {
  return cfg.party.seatsByStage[stageIndex(run)] ?? 2;
}

export function lawSlots(run: RunState, cfg: GameConfig): number {
  return cfg.party.lawSlotsByStage[stageIndex(run)] ?? 2;
}

export function activeLaws(run: RunState): PolicyId[] {
  return Object.keys(run.laws) as PolicyId[];
}

// ---------------------------------------------------------------- Einmalige Wirkungen

/** Einmalige Wirkung (Beschluss, Spätfolge, Rivale) auf den Durchlauf anwenden. */
export function applyShock(
  run: RunState,
  shock: PolicyShock | undefined,
  cfg: GameConfig,
): RunState {
  if (!shock) return run;
  const volatility = cfg.states[run.stateId].approvalVolatility;
  const groups = { ...run.groups };
  for (const g of GROUP_IDS) {
    const delta = shock.groups?.[g];
    if (delta !== undefined) groups[g] = clamp(groupLoyalty(run, g, cfg) + delta);
  }
  const relations = { ...run.relations };
  if (shock.relationsAll !== undefined && isWorldUnlocked(run, cfg)) {
    for (const id of foreignPartners(run)) {
      relations[id] = clamp(relation(run, id, cfg) + shock.relationsAll, -100, 100);
    }
  }
  const rival =
    shock.rival !== undefined && run.rival.status === 'active'
      ? { ...run.rival, strength: clamp(run.rival.strength + shock.rival) }
      : run.rival;
  return {
    ...run,
    approval: clamp(run.approval + (shock.approval ?? 0) * volatility),
    unrest: clamp(run.unrest + (shock.unrest ?? 0)),
    loyalty: clamp(run.loyalty + (shock.loyalty ?? 0)),
    morale: clamp(run.morale + (shock.morale ?? 0)),
    groups,
    relations,
    rival,
  };
}

// ---------------------------------------------------------------- Berater

/** Kosten für einen neuen Berater (Anteil der Einfluss-Anforderung). */
export function advisorHireCost(run: RunState, cfg: GameConfig): Partial<ResourceMap> {
  const req = nextRequirement(run, cfg);
  return { influence: Math.ceil(req.influence * cfg.party.hireCostFraction) };
}

function drawCandidate(game: GameState): { game: GameState; candidate: AdvisorCandidate } {
  const a = drawRandom(game);
  const b = drawRandom(a.game);
  const c = drawRandom(b.game);
  const faction = FACTION_IDS[Math.floor(b.value * FACTION_IDS.length)] ?? 'economic';
  const skill = SKILL_IDS[Math.floor(c.value * SKILL_IDS.length)] ?? 'strategist';
  return {
    game: c.game,
    candidate: { seed: hash32(Math.floor(a.value * 0xffffffff), 7), faction, skill },
  };
}

/** Neue Bewerber ziehen (immer drei, verschiedene Flügel bevorzugt). */
export function refreshPool(game: GameState, cfg: GameConfig): GameState {
  let current = game;
  const candidates: AdvisorCandidate[] = [];
  for (let i = 0; i < 3; i++) {
    const draw = drawCandidate(current);
    current = draw.game;
    candidates.push(draw.candidate);
  }
  const run = current.run;
  if (!run) return game;
  return {
    ...current,
    run: {
      ...run,
      advisorPool: {
        candidates,
        refreshAt: run.playMs + cfg.party.poolRefreshSeconds * 1000 * costScale(cfg),
      },
    },
  };
}

export type AdvisorBlock = 'away' | 'seats' | 'money' | 'missing' | null;

export function hireAdvisorBlock(run: RunState, index: number, cfg: GameConfig): AdvisorBlock {
  if (!run.advisorPool.candidates[index]) return 'missing';
  if (run.advisors.length >= seats(run, cfg)) return 'seats';
  if (!isInSession(run, cfg)) return 'away';
  if (!canAfford(run.resources, advisorHireCost(run, cfg))) return 'money';
  return null;
}

/** Bewerber an den Tisch holen. */
export function hireAdvisor(game: GameState, index: number, cfg: GameConfig): GameState {
  const run = game.run;
  if (game.phase !== 'playing' || !run || hireAdvisorBlock(run, index, cfg) !== null) return game;
  const candidate = run.advisorPool.candidates[index];
  if (!candidate) return game;
  const advisor: Advisor = {
    ...candidate,
    loyalty: cfg.party.advisor.startLoyalty,
    joinedAt: run.playMs,
  };
  let next: RunState = {
    ...run,
    resources: pay(run.resources, advisorHireCost(run, cfg)),
    advisors: [...run.advisors, advisor],
    advisorPool: {
      ...run.advisorPool,
      candidates: run.advisorPool.candidates.filter((_, i) => i !== index),
    },
  };
  next = addChronicle(next, 'advisorJoined', { seed: advisor.seed, faction: advisor.faction }, cfg);
  return { ...game, run: next };
}

/** Berater verabschieden (Platz für jemand anderen). */
export function dismissAdvisor(game: GameState, index: number, cfg: GameConfig): GameState {
  const run = game.run;
  const advisor = run?.advisors[index];
  if (game.phase !== 'playing' || !run || !advisor || !isInSession(run, cfg)) return game;
  let next: RunState = { ...run, advisors: run.advisors.filter((_, i) => i !== index) };
  next = addChronicle(next, 'advisorLeft', { seed: advisor.seed }, cfg);
  return { ...game, run: next };
}

// ---------------------------------------------------------------- Beschlüsse

export function policyCost(run: RunState, def: PolicyDef, cfg: GameConfig): Partial<ResourceMap> {
  const req = nextRequirement(run, cfg);
  const cost: Partial<ResourceMap> = { influence: Math.ceil(req.influence * def.cost.influence) };
  if (def.cost.money) cost.money = Math.ceil(req.money * def.cost.money);
  return cost;
}

export function revokeKey(id: PolicyId): string {
  return `revoke:${id}`;
}

/** Kann die Vorlage auf die Tagesordnung kommen? */
export function isPolicyEligible(run: RunState, def: PolicyDef): boolean {
  if (run.stage < def.minStage) return false;
  if (def.path && def.path !== run.path) return false;
  if (run.laws[def.id]) return false;
  return (run.cooldowns[revokeKey(def.id)] ?? 0) <= run.playMs;
}

/** Neue Tagesordnung ziehen. */
export function refreshAgenda(game: GameState, cfg: GameConfig): GameState {
  const run = game.run;
  if (!run) return game;
  let current = game;
  const pool = cfg.party.policies.filter((p) => isPolicyEligible(run, p)).map((p) => p.id);
  const items: PolicyId[] = [];
  while (items.length < cfg.party.agendaSize && pool.length > 0) {
    const draw = drawRandom(current);
    current = draw.game;
    const [picked] = pool.splice(Math.floor(draw.value * pool.length), 1);
    if (picked) items.push(picked);
  }
  const r = current.run ?? run;
  return {
    ...current,
    run: {
      ...r,
      agenda: {
        items,
        refreshAt: r.playMs + cfg.party.agendaRefreshSeconds * 1000 * costScale(cfg),
      },
    },
  };
}

/** Haltung eines Beraters zu einer Vorlage (−2 … +2). */
export function advisorStance(advisor: Pick<Advisor, 'faction'>, def: PolicyDef): number {
  return def.stances[advisor.faction] ?? 0;
}

export interface Vote {
  for: number;
  against: number;
  neutral: number;
}

export function sessionVote(run: RunState, def: PolicyDef): Vote {
  const vote: Vote = { for: 0, against: 0, neutral: 0 };
  for (const a of run.advisors) {
    const s = advisorStance(a, def);
    if (s > 0) vote.for++;
    else if (s < 0) vote.against++;
    else vote.neutral++;
  }
  return vote;
}

/** Sieht ein Berater am Tisch die Spätfolge Nummer `index` voraus? */
export function isConsequenceForeseen(
  run: RunState,
  def: PolicyDef,
  index: number,
): FactionId | null {
  const c = def.consequences?.[index];
  if (!c) return null;
  return run.advisors.some((a) => a.faction === c.foreseenBy) ? c.foreseenBy : null;
}

/** Gesetze, die sich mit dieser Vorlage ausschließen und gerade gelten. */
export function conflictingLaws(run: RunState, def: PolicyDef): PolicyId[] {
  return (def.exclusive ?? []).filter((id) => run.laws[id] !== undefined);
}

export type EnactBlock = 'away' | 'agenda' | 'slots' | 'conflict' | 'money' | 'stage' | null;

export function enactBlock(run: RunState, id: PolicyId, cfg: GameConfig): EnactBlock {
  const def = findPolicy(id, cfg);
  if (!def || !isPolicyEligible(run, def)) return 'stage';
  if (!run.agenda.items.includes(id)) return 'agenda';
  if (conflictingLaws(run, def).length > 0) return 'conflict';
  if (activeLaws(run).length >= lawSlots(run, cfg)) return 'slots';
  if (!canVoteHere(run, cfg)) return 'away';
  if (!canAfford(run.resources, policyCost(run, def, cfg))) return 'money';
  return null;
}

function shiftAdvisorLoyalty(
  run: RunState,
  def: PolicyDef,
  factor: number,
  cfg: GameConfig,
): Advisor[] {
  return run.advisors.map((a) => ({
    ...a,
    loyalty: clamp(a.loyalty + advisorStance(a, def) * cfg.party.advisor.loyaltyPerStance * factor),
  }));
}

/** Beschluss fassen: Gesetz gilt ab jetzt, Berater reagieren, einmalige Wirkung tritt ein. */
export function enactPolicy(game: GameState, id: PolicyId, cfg: GameConfig): GameState {
  const run = game.run;
  const def = findPolicy(id, cfg);
  if (game.phase !== 'playing' || !run || !def || enactBlock(run, id, cfg) !== null) return game;
  let next: RunState = {
    ...run,
    resources: pay(run.resources, policyCost(run, def, cfg)),
    laws: { ...run.laws, [id]: { since: run.playMs, fired: 0 } },
    advisors: shiftAdvisorLoyalty(run, def, 1, cfg),
    agenda: { ...run.agenda, items: run.agenda.items.filter((p) => p !== id) },
    stats: { ...run.stats, lawsPassed: run.stats.lawsPassed + 1 },
  };
  next = applyShock(next, def.shock, cfg);
  next = addChronicle(next, 'lawEnacted', { policy: id }, cfg);
  return { ...game, run: next };
}

/** Vorlage ablehnen: Befürworter sind enttäuscht, Gegner zufrieden. */
export function rejectPolicy(game: GameState, id: PolicyId, cfg: GameConfig): GameState {
  const run = game.run;
  const def = findPolicy(id, cfg);
  if (game.phase !== 'playing' || !run || !def || !run.agenda.items.includes(id)) return game;
  if (!canVoteHere(run, cfg)) return game;
  return {
    ...game,
    run: {
      ...run,
      advisors: shiftAdvisorLoyalty(run, def, -0.5, cfg),
      agenda: { ...run.agenda, items: run.agenda.items.filter((p) => p !== id) },
    },
  };
}

export function revokeCost(run: RunState, id: PolicyId, cfg: GameConfig): Partial<ResourceMap> {
  const def = findPolicy(id, cfg);
  if (!def) return {};
  const full = policyCost(run, def, cfg);
  const cost: Partial<ResourceMap> = {};
  for (const [k, v] of Object.entries(full) as [keyof ResourceMap, number][]) {
    cost[k] = Math.ceil(v * cfg.party.revokeCostFraction);
  }
  return cost;
}

/** Gesetz aufheben: alle Wirkungen enden, auch eingetretene Spätfolgen. */
export function revokePolicy(game: GameState, id: PolicyId, cfg: GameConfig): GameState {
  const run = game.run;
  const def = findPolicy(id, cfg);
  if (game.phase !== 'playing' || !run || !def || !run.laws[id] || !canVoteHere(run, cfg)) {
    return game;
  }
  const cost = revokeCost(run, id, cfg);
  if (!canAfford(run.resources, cost)) return game;
  const laws: RunState['laws'] = Object.fromEntries(
    Object.entries(run.laws).filter(([key]) => key !== id),
  );
  let next: RunState = {
    ...run,
    resources: pay(run.resources, cost),
    laws,
    advisors: shiftAdvisorLoyalty(run, def, -0.5, cfg),
    cooldowns: {
      ...run.cooldowns,
      [revokeKey(id)]: run.playMs + cfg.party.revokeCooldownSeconds * 1000 * costScale(cfg),
    },
  };
  next = addChronicle(next, 'lawRevoked', { policy: id }, cfg);
  return { ...game, run: next };
}

// ---------------------------------------------------------------- Rivale

export function isRivalActive(run: RunState, cfg: GameConfig): boolean {
  return run.stage >= cfg.party.rival.fromStage && run.rival.status === 'active';
}

export function rivalTarget(run: RunState, cfg: GameConfig): number {
  const r = cfg.party.rival;
  return clamp(
    r.baseTarget + (50 - run.approval) * r.approvalWeight + modifiers(run, cfg).rivalTarget,
    5,
    95,
  );
}

/** Wirkung des Rivalen auf die Wahlchance (Prozentpunkte, negativ = schlechter). */
export function rivalElectionEffect(run: RunState, cfg: GameConfig): number {
  const r = cfg.party.rival;
  if (run.stage < r.fromStage) return 0;
  const strength = run.rival.status === 'jailed' ? 0 : run.rival.strength;
  return strength > r.neutral
    ? -(strength - r.neutral) * r.electionWeight
    : (r.neutral - strength) * r.electionBonusWeight;
}

export function findCounter(id: RivalCounterId, cfg: GameConfig): RivalCounterDef | undefined {
  return cfg.party.rival.counters.find((c) => c.id === id);
}

export function counterCost(
  run: RunState,
  def: RivalCounterDef,
  cfg: GameConfig,
): Partial<ResourceMap> {
  const req = nextRequirement(run, cfg);
  const cost: Partial<ResourceMap> = {};
  if (def.cost.money) cost.money = Math.ceil(req.money * def.cost.money);
  if (def.cost.influence) cost.influence = Math.ceil(req.influence * def.cost.influence);
  return cost;
}

export function counterKey(id: RivalCounterId): string {
  return `rival:${id}`;
}

export type CounterBlock = 'inactive' | 'path' | 'strength' | 'cooldown' | 'away' | 'money' | null;

export function counterBlock(run: RunState, id: RivalCounterId, cfg: GameConfig): CounterBlock {
  const def = findCounter(id, cfg);
  if (!def || !isRivalActive(run, cfg)) return 'inactive';
  if (def.path && def.path !== run.path) return 'path';
  if (def.maxStrength !== undefined && run.rival.strength > def.maxStrength) return 'strength';
  if ((run.cooldowns[counterKey(id)] ?? 0) > run.playMs) return 'cooldown';
  if (!isInSession(run, cfg)) return 'away';
  if (!canAfford(run.resources, counterCost(run, def, cfg))) return 'money';
  return null;
}

export interface CounterOutcome {
  success: boolean;
}

/** Gegenmaßnahme gegen den Rivalen. */
export function rivalCounter(
  game: GameState,
  id: RivalCounterId,
  cfg: GameConfig,
): { game: GameState; outcome: CounterOutcome | null } {
  const run = game.run;
  const def = findCounter(id, cfg);
  if (game.phase !== 'playing' || !run || !def || counterBlock(run, id, cfg) !== null) {
    return { game, outcome: null };
  }
  const draw = drawRandom(game);
  const success = draw.value * 100 < def.chance;
  let next: RunState = {
    ...run,
    resources: pay(run.resources, counterCost(run, def, cfg)),
    cooldowns: {
      ...run.cooldowns,
      [counterKey(id)]: run.playMs + def.cooldownSeconds * 1000 * costScale(cfg),
    },
  };
  if (success) {
    const strength = clamp(next.rival.strength - def.strength);
    const jailed = id === 'arrest';
    next = {
      ...next,
      rival: {
        ...next.rival,
        strength: jailed ? 0 : strength,
        status: jailed ? 'jailed' : 'active',
      },
    };
    next = applyShock(next, def.shock, cfg);
    next = addChronicle(
      next,
      jailed ? 'rivalJailed' : id === 'exposeScandal' ? 'rivalScandal' : 'rivalCountered',
      { seed: run.rival.seed },
      cfg,
    );
  } else {
    next = applyShock(next, def.failShock, cfg);
    next = addChronicle(next, 'rivalScandalFailed', { seed: run.rival.seed }, cfg);
  }
  return { game: { ...draw.game, run: next }, outcome: { success } };
}

/** Nach einem Wahlsieg ist der Rivale geschwächt. */
export function rivalAfterElection(run: RunState, won: boolean, cfg: GameConfig): RunState {
  if (run.rival.status !== 'active' || run.stage < cfg.party.rival.fromStage) return run;
  const delta = won ? -cfg.party.rival.electionLoss : cfg.party.rival.electionLoss / 2;
  return { ...run, rival: { ...run.rival, strength: clamp(run.rival.strength + delta) } };
}

// ---------------------------------------------------------------- Takt

function nextMoveDelay(value: number, cfg: GameConfig): number {
  const [min, max] = cfg.party.rival.moveIntervalSeconds;
  return (min + value * (max - min)) * 1000 * costScale(cfg);
}

function tickRival(game: GameState, minutes: number, cfg: GameConfig): GameState {
  const run = game.run;
  if (!run || !isRivalActive(run, cfg)) return game;
  const r = cfg.party.rival;
  const target = rivalTarget(run, cfg);
  const step = r.driftPerMinute * minutes;
  const s = run.rival.strength;
  const strength = s < target ? Math.min(target, s + step) : Math.max(target, s - step);
  let current: GameState = { ...game, run: { ...run, rival: { ...run.rival, strength } } };
  if (run.playMs < run.rival.nextMoveAt) return current;
  // Der Rivale handelt
  const pick = drawRandom(current);
  const when = drawRandom(pick.game);
  current = when.game;
  let next = current.run ?? run;
  const moves = r.moves.filter((m) => strength >= m.minStrength);
  const total = moves.reduce((sum, m) => sum + m.weight, 0);
  let x = pick.value * total;
  const move = moves.find((m) => (x -= m.weight) < 0) ?? moves[moves.length - 1];
  if (move) {
    next = applyShock(next, move.shock, cfg);
    if (move.poachLoyalty !== undefined && next.advisors.length > 0) {
      let weakest = 0;
      next.advisors.forEach((a, i) => {
        if (a.loyalty < (next.advisors[weakest]?.loyalty ?? 100)) weakest = i;
      });
      next = {
        ...next,
        advisors: next.advisors.map((a, i) =>
          i === weakest ? { ...a, loyalty: clamp(a.loyalty - (move.poachLoyalty ?? 0)) } : a,
        ),
      };
    }
    const key =
      move.id === 'smear' ? 'rivalSmear' : move.id === 'poach' ? 'rivalPoach' : 'rivalRally';
    next = addChronicle(next, key, { seed: run.rival.seed }, cfg);
  }
  next = {
    ...next,
    rival: { ...next.rival, nextMoveAt: next.playMs + nextMoveDelay(when.value, cfg) },
  };
  return { ...current, run: next };
}

function tickAdvisors(game: GameState, minutes: number, cfg: GameConfig): GameState {
  const run = game.run;
  if (!run || run.advisors.length === 0) return game;
  const a = cfg.party.advisor;
  const step = a.loyaltyDriftPerMinute * minutes;
  let current = game;
  let advisors = run.advisors.map((adv) => ({
    ...adv,
    loyalty:
      adv.loyalty < a.loyaltyBase
        ? Math.min(a.loyaltyBase, adv.loyalty + step)
        : Math.max(a.loyaltyBase, adv.loyalty - step),
  }));
  let next: RunState = { ...run, advisors };
  // Abspringen: nur unter der Schwelle, je untreuer desto wahrscheinlicher
  const candidate = advisors.findIndex((adv) => adv.loyalty < a.defectBelow);
  const defector = advisors[candidate];
  if (defector) {
    const perMinute = (a.defectPerMinute * (a.defectBelow - defector.loyalty)) / a.defectBelow;
    const probability = 1 - Math.pow(1 - Math.min(1, perMinute), minutes);
    const draw = drawRandom(current);
    current = draw.game;
    if (draw.value < probability) {
      advisors = advisors.filter((_, i) => i !== candidate);
      next = {
        ...next,
        advisors,
        rival:
          next.rival.status === 'active'
            ? { ...next.rival, strength: clamp(next.rival.strength + a.defectRivalGain) }
            : next.rival,
        stats: { ...next.stats, defections: next.stats.defections + 1 },
      };
      next = addChronicle(next, 'advisorDefected', { seed: defector.seed }, cfg);
    }
  }
  return { ...current, run: next };
}

function tickConsequences(run: RunState, cfg: GameConfig): RunState {
  let next = run;
  for (const id of activeLaws(run)) {
    const def = findPolicy(id, cfg);
    const law = next.laws[id];
    if (!def?.consequences || !law) continue;
    let fired = law.fired;
    while (fired < def.consequences.length) {
      const c = def.consequences[fired];
      if (!c || next.playMs < law.since + consequenceDelayMs(c.afterSeconds, cfg)) break;
      next = applyShock(next, c.shock, cfg);
      next = addChronicle(next, 'consequence', { policy: id, index: fired }, cfg);
      fired++;
    }
    if (fired !== law.fired) next = { ...next, laws: { ...next.laws, [id]: { ...law, fired } } };
  }
  return next;
}

/** Politik im Parteibüro weiterrechnen (nur im laufenden Spiel, nie offline). */
export function tickParty(game: GameState, deltaMs: number, cfg: GameConfig): GameState {
  const run = game.run;
  if (game.phase !== 'playing' || !run || deltaMs <= 0) return game;
  const minutes = deltaMs / 60_000;
  let current: GameState = { ...game, run: tickConsequences(run, cfg) };
  current = tickAdvisors(current, minutes, cfg);
  current = tickRival(current, minutes, cfg);
  const r = current.run ?? run;
  if (r.playMs >= r.agenda.refreshAt || (r.agenda.items.length === 0 && r.agenda.refreshAt === 0)) {
    current = refreshAgenda(current, cfg);
  }
  const r2 = current.run ?? run;
  if (r2.playMs >= r2.advisorPool.refreshAt) current = refreshPool(current, cfg);
  return current;
}
