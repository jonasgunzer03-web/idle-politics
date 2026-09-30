import type { GameConfig } from '../config';
import { demote } from './career';
import { addChronicle } from './chronicle';
import { modifiers } from './modifiers';
import { drawRandom } from './rng';
import {
  approvalBase,
  coupProtection,
  foreignPartners,
  groupsFor,
  groupLoyalty,
  isLoyaltyUnlocked,
  loyaltyBonusPerMinute,
  relation,
  unrestDecayFactor,
  unrestTarget,
} from './rules';
import type { GameState, RunState } from './schema';

// Zustimmung, Unruhe, Loyalität, Allianz-Verfall und Beziehungen bewegen sich langsam zu
// ihren Zielwerten. Hier fallen auch Rücktritt, Revolution, Putsch und Säuberung.

export type PoliticsSignal = 'resigned' | 'revolution' | 'coup' | 'purge' | null;

function approach(value: number, target: number, maxStep: number): number {
  if (value < target) return Math.min(target, value + maxStep);
  if (value > target) return Math.max(target, value - maxStep);
  return value;
}

/** Putsch- bzw. Säuberungsrisiko in Prozent pro Minute (0, wenn keines besteht). */
export function coupRiskPerMinute(
  game: GameState,
  cfg: GameConfig,
): { risk: number; kind: 'coup' | 'purge' } {
  const run = game.run;
  const purges = run ? cfg.states[run.stateId].purges : false;
  const kind = purges ? 'purge' : 'coup';
  if (!run || run.path !== 'autocratic' || !isLoyaltyUnlocked(run, cfg)) return { risk: 0, kind };
  const p = cfg.balancing.politics;
  if (purges) {
    if (run.loyalty >= p.purge.loyaltyBelow) return { risk: 0, kind };
    const factor = (p.purge.loyaltyBelow - run.loyalty) / p.purge.loyaltyBelow;
    return { risk: p.purge.maxPerMinute * factor * coupProtection(run, cfg), kind };
  }
  if (run.loyalty >= p.coup.loyaltyBelow || run.unrest <= p.coup.unrestAbove)
    return { risk: 0, kind };
  const loyaltyFactor = (p.coup.loyaltyBelow - run.loyalty) / p.coup.loyaltyBelow;
  const unrestFactor = (run.unrest - p.coup.unrestAbove) / (100 - p.coup.unrestAbove);
  return {
    risk: p.coup.maxPerMinute * loyaltyFactor * unrestFactor * coupProtection(run, cfg),
    kind,
  };
}

/** Sekunden bis zum frühestmöglichen Sturz durch Unruhe (null = keine Frist läuft). */
export function unrestGraceLeft(run: RunState, cfg: GameConfig): number | null {
  if (run.criticalSince === null) return null;
  const left = cfg.balancing.politics.unrestGraceSeconds * 1000 - (run.playMs - run.criticalSince);
  return Math.max(0, left / 1000);
}

export function tickPolitics(
  game: GameState,
  deltaMs: number,
  cfg: GameConfig,
): { game: GameState; signal: PoliticsSignal } {
  const run = game.run;
  if (game.phase !== 'playing' || !run || deltaMs <= 0) return { game, signal: null };
  const p = cfg.balancing.politics;
  const minutes = deltaMs / 60_000;
  // Verfall, der später Geld kostet (Allianzen, Loyalität, Beziehungen), läuft mit GAME_SPEED,
  // damit ein gestrecktes Spiel nicht unverhältnismäßig teuer wird.
  const scaledMinutes = minutes * cfg.balancing.gameSpeed;
  const state = cfg.states[run.stateId];

  // Zustimmung
  const approval = approach(
    run.approval,
    approvalBase(game, cfg),
    p.approvalDriftPerMinute * minutes,
  );

  // Unruhe: steigt langsamer bei hoher Loyalität (Zentralia), sinkt schneller mit Boni
  const target = unrestTarget(game, cfg);
  let unrestRate = p.unrestDriftPerMinute * minutes;
  if (target < run.unrest) unrestRate *= unrestDecayFactor(game, cfg);
  else if (state.loyalCalm && run.loyalty > state.loyalCalm.loyaltyAbove)
    unrestRate *= state.loyalCalm.factor;
  let unrest = approach(run.unrest, target, unrestRate);

  // Loyalität des Apparats
  let loyalty = run.loyalty;
  if (isLoyaltyUnlocked(run, cfg)) {
    loyalty = approach(loyalty, p.loyaltyBase, p.loyaltyDriftPerMinute * scaledMinutes);
    loyalty = Math.min(100, loyalty + loyaltyBonusPerMinute(run, cfg) * scaledMinutes);
  }

  // Allianzen verlieren langsam an Loyalität
  const groups = { ...run.groups };
  const rules = cfg.allianceRules;
  for (const g of groupsFor(run, cfg)) {
    const current = groupLoyalty(run, g.id, cfg);
    if (current > rules.decayFloor) {
      groups[g.id] = Math.max(rules.decayFloor, current - rules.decayPerMinute * scaledMinutes);
    }
  }

  // Beziehungen kehren langsam zum Startwert zurück
  const relations = { ...run.relations };
  const relationsDrift = modifiers(run, cfg).relationsDrift * scaledMinutes;
  for (const id of foreignPartners(run)) {
    if (run.relations[id] === undefined && relationsDrift === 0) continue;
    const drifted = approach(
      relation(run, id, cfg),
      state.startRelations[id] ?? 0,
      cfg.foreignRules.relationDriftPerMinute * scaledMinutes,
    );
    relations[id] = Math.min(100, Math.max(-100, drifted + relationsDrift));
  }

  // Fairness: zwischen 90 % und einem Sturz liegen mindestens unrestGraceSeconds.
  // Geprüft wird der Wert VOR der Drift dieses Takts, sonst würde die Drift einen Sprung
  // auf 100 % sofort wieder unter 100 % drücken.
  const critical = cfg.balancing.unrestThresholds.critical;
  const graceMs = p.unrestGraceSeconds * 1000;
  let criticalSince = run.criticalSince;
  const falls =
    run.unrest >= 100 && criticalSince !== null && run.playMs - criticalSince >= graceMs;
  if (Math.max(run.unrest, unrest) >= critical) {
    criticalSince ??= run.playMs;
    if (run.playMs - criticalSince < graceMs) unrest = Math.min(unrest, 99.9);
  } else {
    criticalSince = null;
  }

  // Erfolg „Bei 99 % Unruhe überlebt“
  let { atBrink, survivedUnrest } = run.stats;
  if (unrest >= 99) atBrink = true;
  if (atBrink && unrest < cfg.balancing.unrestThresholds.danger) {
    atBrink = false;
    survivedUnrest = true;
  }

  let next: RunState = {
    ...run,
    approval,
    unrest,
    loyalty,
    groups,
    relations,
    criticalSince,
    stats: { ...run.stats, atBrink, survivedUnrest },
  };
  let result: GameState = { ...game, run: next };

  // 100 % Unruhe nach Ablauf der Frist: Demokraten treten zurück, Autokraten werden gestürzt
  if (falls) {
    if (next.path === 'democratic') {
      next = demote(
        {
          ...next,
          unrest: p.resignationUnrest,
          criticalSince: null,
          stats: { ...next.stats, atBrink: false },
        },
        cfg.balancing.elections.lossStages,
        cfg,
      );
      next = addChronicle(next, 'resigned', { stage: next.stage }, cfg);
      return { game: { ...result, run: next }, signal: 'resigned' };
    }
    return { game: result, signal: 'revolution' };
  }

  // Putsch bzw. Säuberung
  const { risk, kind } = coupRiskPerMinute(result, cfg);
  if (risk > 0) {
    const probability = 1 - Math.pow(1 - Math.min(1, risk), minutes);
    const draw = drawRandom(result);
    result = draw.game;
    if (draw.value < probability) return { game: result, signal: kind };
  }
  return { game: result, signal: null };
}
