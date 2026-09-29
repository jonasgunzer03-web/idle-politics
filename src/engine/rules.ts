import type { GameConfig } from '../config';
import type { GroupDef } from '../config/alliances';
import type { StageRequirement } from '../config/careers';
import {
  FOREIGN_IDS,
  MAX_STAGE,
  type DistrictId,
  type ForeignId,
  type GroupId,
  type LegacyId,
  type ResourceId,
} from './ids';
import type { GameState, RunState } from './schema';

// Zentrale Regel-Helfer: Freischaltungen, Anforderungen und alle Multiplikatoren.
// Jede Stelle im Spiel, die „wie viel?“ fragt, fragt hier.

export function legacyLevel(game: GameState, id: LegacyId): number {
  return game.meta.legacy[id] ?? 0;
}

function legacyValue(game: GameState, id: LegacyId, cfg: GameConfig): number {
  const node = cfg.legacyNodes.find((n) => n.id === id);
  return node ? node.perLevel * legacyLevel(game, id) : 0;
}

/** Kosten skalieren mit 1 / GAME_SPEED. */
export function costScale(cfg: GameConfig): number {
  return 1 / cfg.balancing.gameSpeed;
}

// ---------------------------------------------------------------- Freischaltungen

export function isResourceUnlocked(run: RunState, resource: ResourceId, cfg: GameConfig): boolean {
  return run.stage >= cfg.balancing.resourceUnlockStage[resource];
}

export function loyaltyUnlockStage(run: RunState, cfg: GameConfig): number {
  return cfg.states[run.stateId].loyaltyUnlockStage ?? cfg.balancing.loyaltyUnlockStage;
}

export function isLoyaltyUnlocked(run: RunState, cfg: GameConfig): boolean {
  return run.stage >= loyaltyUnlockStage(run, cfg);
}

export function isDistrictUnlocked(run: RunState, district: DistrictId, cfg: GameConfig): boolean {
  const def = cfg.world.districts.find((d) => d.id === district);
  return def !== undefined && run.stage >= def.unlockStage;
}

export function isWorldUnlocked(run: RunState, cfg: GameConfig): boolean {
  return run.stage >= cfg.worldUnlockStage;
}

/** Rechter Rand der begehbaren Welt (Ende des letzten freigeschalteten Viertels). */
export function worldLimitX(run: RunState, cfg: GameConfig): number {
  let limit = 0;
  for (const d of cfg.world.districts) {
    if (run.stage >= d.unlockStage) limit = Math.max(limit, d.startX + d.width);
  }
  return limit;
}

// ---------------------------------------------------------------- Anforderungen

/**
 * Anforderung für den Aufstieg auf die nächste Stufe, mit Staats-, Pfad- und Tempofaktor.
 * An der Spitze (Stufe 12) die letzte Anforderung (für die Skalierung von Ereignissen).
 */
export function nextRequirement(run: RunState, cfg: GameConfig): StageRequirement {
  const index = Math.min(run.stage, MAX_STAGE - 1) - 1;
  const base = cfg.stageRequirements[index] ??
    cfg.stageRequirements[cfg.stageRequirements.length - 1] ?? {
      money: 0,
      influence: 0,
      followers: 0,
      loyalty: 0,
    };
  const autocratic = run.path === 'autocratic';
  const factor =
    cfg.states[run.stateId].requirementFactor *
    (autocratic ? cfg.balancing.autocracy.requirementFactor : 1) *
    costScale(cfg);
  return {
    money: Math.ceil(base.money * factor),
    influence: Math.ceil(base.influence * factor),
    followers: autocratic ? 0 : Math.ceil(base.followers * factor),
    loyalty: autocratic ? base.loyalty : 0,
  };
}

// ---------------------------------------------------------------- Allianzen

export function groupsFor(run: RunState, cfg: GameConfig): GroupDef[] {
  return cfg.groups.filter(
    (g) =>
      run.stage >= g.unlockStage &&
      (g.path === undefined || g.path === run.path) &&
      (g.states === undefined || g.states.includes(run.stateId)),
  );
}

export function groupLoyalty(run: RunState, id: GroupId, cfg: GameConfig): number {
  return run.groups[id] ?? cfg.allianceRules.startLoyalty;
}

/** 0 = kein Bonus, 1 = ab 50 %, 2 = ab 80 %. */
export function groupTier(run: RunState, group: GroupDef, cfg: GameConfig): 0 | 1 | 2 {
  const loyalty = groupLoyalty(run, group.id, cfg);
  if (loyalty >= cfg.allianceRules.tier2) return 2;
  if (loyalty >= cfg.allianceRules.tier1) return 1;
  return 0;
}

function activeGroupBonus(run: RunState, kind: string, cfg: GameConfig): number[] {
  const values: number[] = [];
  for (const g of groupsFor(run, cfg)) {
    if (g.bonus.kind !== kind) continue;
    const tier = groupTier(run, g, cfg);
    if (tier === 1) values.push(g.bonus.tier1);
    if (tier === 2) values.push(g.bonus.tier2);
  }
  return values;
}

// ---------------------------------------------------------------- Außenpolitik

/** Andere Staaten aus Sicht des eigenen Staates (ohne sich selbst). */
export function foreignPartners(run: RunState): ForeignId[] {
  return FOREIGN_IDS.filter((id) => id !== run.stateId);
}

export function relation(run: RunState, id: ForeignId, cfg: GameConfig): number {
  return run.relations[id] ?? cfg.states[run.stateId].startRelations[id] ?? 0;
}

export function tradeAgreements(run: RunState): number {
  return Object.values(run.treaties).filter((t) => t.trade).length;
}

export function alliances(run: RunState): number {
  return Object.values(run.treaties).filter((t) => t.alliance).length;
}

// ---------------------------------------------------------------- Multiplikatoren

/** Gesamter Ertrags-Multiplikator für eine Währung. */
export function resourceMultiplier(game: GameState, resource: ResourceId, cfg: GameConfig): number {
  const run = game.run;
  if (!run) return 1;
  let m = cfg.balancing.professions[run.profession][resource];
  m *= cfg.states[run.stateId].resourceMultiplier[resource] ?? 1;
  if (resource === 'money') m *= 1 + legacyValue(game, 'moneyBoost', cfg);
  if (resource === 'influence') m *= 1 + legacyValue(game, 'influenceBoost', cfg);
  if (resource === 'followers') m *= 1 + legacyValue(game, 'followersBoost', cfg);
  for (const v of activeGroupBonus(run, resource, cfg)) m *= v;
  if (resource === 'money') m *= 1 + tradeAgreements(run) * cfg.foreignRules.tradeBonus;
  return m;
}

/** Grundwert, zu dem die Zustimmung zurückkehrt. */
export function approvalBase(game: GameState, cfg: GameConfig): number {
  const run = game.run;
  if (!run) return cfg.balancing.politics.approvalBase;
  let base = cfg.balancing.politics.approvalBase + legacyValue(game, 'popularity', cfg);
  for (const v of activeGroupBonus(run, 'approvalBase', cfg)) base += v;
  base += alliances(run) * cfg.foreignRules.allianceApproval;
  for (const p of cfg.projects) base += (p.approvalPerLevel ?? 0) * (run.projects[p.id] ?? 0);
  return Math.min(90, Math.max(10, base));
}

/** Zielwert, zu dem die Unruhe langsam wandert. */
export function unrestTarget(game: GameState, cfg: GameConfig): number {
  const run = game.run;
  if (!run) return 0;
  const state = cfg.states[run.stateId];
  let target = state.baseUnrest;
  if (run.path === 'autocratic') {
    target += cfg.balancing.politics.autocraticUnrestPressure * (1 - run.approval / 100);
  }
  for (const v of activeGroupBonus(run, 'unrestTarget', cfg)) target += v;
  for (const g of groupsFor(run, cfg)) {
    if (g.unrestSideEffect && groupTier(run, g, cfg) > 0) target += g.unrestSideEffect;
  }
  return Math.min(85, Math.max(0, target));
}

/** Wie schnell die Unruhe sinkt (Faktor). */
export function unrestDecayFactor(game: GameState, cfg: GameConfig): number {
  const run = game.run;
  if (!run) return 1;
  return cfg.states[run.stateId].unrestDecayFactor * (1 + legacyValue(game, 'calmNation', cfg));
}

/** Zusätzliche Loyalitäts-Drift pro Minute durch Sicherheitsdienste und Parteiapparat. */
export function loyaltyBonusPerMinute(run: RunState, cfg: GameConfig): number {
  return activeGroupBonus(run, 'loyaltyDrift', cfg).reduce((a, b) => a + b, 0);
}

/** Faktor auf das Putschrisiko (Militär schützt). */
export function coupProtection(run: RunState, cfg: GameConfig): number {
  return activeGroupBonus(run, 'coupProtection', cfg).reduce((a, b) => a * b, 1);
}

/** Tempo der Figur in Welt-Einheiten pro Sekunde. */
export function travelSpeed(game: GameState, cfg: GameConfig): number {
  const run = game.run;
  if (!run) return 0;
  const vehicle = cfg.world.vehicles.find((v) => v.id === run.vehicle);
  return (vehicle?.speed ?? 150) * (1 + legacyValue(game, 'swiftFeet', cfg));
}

/** Offline-Deckel in Stunden (mit Vermächtnis-Bonus). */
export function offlineCapHours(game: GameState, cfg: GameConfig): number {
  return cfg.balancing.time.offlineCapHours + legacyValue(game, 'longRest', cfg);
}

/** Wahlkampf-Bonus aus dem Vermächtnis in Prozentpunkten. */
export function campaignLegacyBonus(game: GameState, cfg: GameConfig): number {
  return legacyValue(game, 'campaignVeteran', cfg);
}

export function legacyStartBonus(
  game: GameState,
  cfg: GameConfig,
): { overtime: number; money: number } {
  return {
    overtime: legacyValue(game, 'headStart', cfg),
    money: legacyValue(game, 'startCapital', cfg) * costScale(cfg),
  };
}
