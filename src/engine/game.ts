import type { GameConfig } from '../config';
import { canTurnAutocratic } from './career';
import { zeroResources } from './economy';
import { nextInterval } from './events';
import {
  ACCESSORY_IDS,
  MAX_STAGE,
  type AccessoryId,
  type AchievementId,
  type LegacyId,
  type ProfessionId,
  type StateId,
} from './ids';
import {
  alliances,
  costScale,
  groupsFor,
  groupTier,
  isLoyaltyUnlocked,
  isWorldUnlocked,
  legacyLevel,
  legacyStartBonus,
} from './rules';
import {
  SAVE_VERSION,
  type Character,
  type GameState,
  type HintId,
  type RunEndReason,
  type RunState,
} from './schema';
import { findLocation } from './unlocks';

/** Frischer Spielstand vor dem ersten Durchlauf. */
export function createNewGame(now: number, seed: number): GameState {
  return {
    saveVersion: SAVE_VERSION,
    phase: 'setup',
    createdAt: now,
    lastActiveAt: now,
    rngState: seed >>> 0,
    character: null,
    run: null,
    meta: {
      legacyPoints: 0,
      legacy: {},
      achievements: [],
      statesRuled: [],
      highestStageEver: 0,
      runsStarted: 0,
      emigrations: 0,
      overthrows: 0,
      retirements: 0,
      totalTaps: 0,
      totalPlayMs: 0,
      eventsResolved: 0,
      ceremoniesSeen: [],
    },
    pending: { ceremony: null, runEnd: null, emigration: null },
    flags: { introSeen: false, hintsSeen: [] },
  };
}

export interface RunSetup {
  /** Neuer Charakter (erster Durchlauf) – sonst bleibt der bisherige. */
  character?: Character;
  stateId: StateId;
  profession: ProfessionId;
}

function freshRun(
  game: GameState,
  stateId: StateId,
  profession: ProfessionId,
  startMoney: number,
  now: number,
  cfg: GameConfig,
): RunState {
  const state = cfg.states[stateId];
  const start = findLocation(cfg.world.startLocation, cfg);
  const bonus = legacyStartBonus(game, cfg);
  const base: RunState = {
    stateId,
    profession,
    path: state.alwaysAutocratic ? 'autocratic' : 'democratic',
    stage: 1,
    highestStage: 1,
    resources: { ...zeroResources(), money: startMoney + bonus.money },
    earned: zeroResources(),
    approval: cfg.balancing.startApproval,
    unrest: state.baseUnrest,
    loyalty: cfg.balancing.startLoyalty,
    criticalSince: null,
    generators: bonus.overtime > 0 ? { overtime: bonus.overtime } : {},
    // Start im Werk bzw. Büro, damit man sofort arbeiten kann
    world: { posX: start?.x ?? 0, target: null, inside: true },
    actions: {},
    vehicle: 'feet',
    events: { open: [], nextAt: 0, crisisAt: null },
    groups: {},
    relations: {},
    treaties: {},
    projects: {},
    cooldowns: {},
    fixElectionBonus: false,
    rulingSince: null,
    startedAt: now,
    playMs: 0,
    stats: {
      electionsWon: 0,
      electionsLost: 0,
      eventsResolved: 0,
      taps: 0,
      survivedUnrest: false,
      atBrink: false,
    },
  };
  // Die erste Karte kommt nach dem längsten Abstand, damit man sich erst orientieren kann
  return { ...base, events: { ...base.events, nextAt: nextInterval(1, base, cfg) } };
}

/** Startet einen neuen Durchlauf als Arbeiter (Stufe 1). */
export function startRun(game: GameState, setup: RunSetup, now: number, cfg: GameConfig): GameState {
  if (game.phase !== 'setup') return game;
  const character = setup.character ?? game.character;
  if (!character || !cfg.states[setup.stateId].playable) return game;
  return {
    ...game,
    phase: 'playing',
    lastActiveAt: now,
    character,
    run: freshRun(game, setup.stateId, setup.profession, 0, now, cfg),
    pending: { ceremony: null, runEnd: null, emigration: null },
    meta: { ...game.meta, runsStarted: game.meta.runsStarted + 1 },
  };
}

// ---------------------------------------------------------------- Vermächtnis

export function legacyPointsFor(run: RunState, retired: boolean, cfg: GameConfig): number {
  const r = cfg.legacyRules;
  const raw =
    r.stageWeight * run.highestStage * run.highestStage +
    r.earnedWeight * Math.log10(run.earned.money + 1) +
    (run.rulingSince !== null ? r.victoryBonus : 0);
  return Math.max(1, Math.floor(raw * (retired ? r.retireFactor : 1)));
}

export function legacyCost(game: GameState, id: LegacyId, cfg: GameConfig): number | null {
  const node = cfg.legacyNodes.find((n) => n.id === id);
  if (!node) return null;
  return node.costs[legacyLevel(game, id)] ?? null;
}

export function canBuyLegacy(game: GameState, id: LegacyId, cfg: GameConfig): boolean {
  const node = cfg.legacyNodes.find((n) => n.id === id);
  const cost = legacyCost(game, id, cfg);
  if (!node || cost === null) return false;
  if (node.requires && legacyLevel(game, node.requires) < 1) return false;
  return game.meta.legacyPoints >= cost;
}

export function buyLegacy(game: GameState, id: LegacyId, cfg: GameConfig): GameState {
  const cost = legacyCost(game, id, cfg);
  if (cost === null || !canBuyLegacy(game, id, cfg)) return game;
  return {
    ...game,
    meta: {
      ...game.meta,
      legacyPoints: game.meta.legacyPoints - cost,
      legacy: { ...game.meta.legacy, [id]: legacyLevel(game, id) + 1 },
    },
  };
}

// ---------------------------------------------------------------- Ende und Neustart

/** Durchlauf beenden (Sturz oder Ruhestand) und Vermächtnis-Punkte gutschreiben. */
export function endRun(game: GameState, reason: RunEndReason, cfg: GameConfig): GameState {
  const run = game.run;
  if (!run) return game;
  const retired = reason === 'retired';
  const points = legacyPointsFor(run, retired, cfg);
  return {
    ...game,
    phase: 'runEnded',
    run: null,
    pending: {
      ceremony: null,
      emigration: null,
      runEnd: {
        reason,
        stateId: run.stateId,
        path: run.path,
        stage: run.stage,
        highestStage: run.highestStage,
        playMs: run.playMs,
        points,
        earnedMoney: run.earned.money,
      },
    },
    meta: {
      ...game.meta,
      legacyPoints: game.meta.legacyPoints + points,
      overthrows: game.meta.overthrows + (retired ? 0 : 1),
      retirements: game.meta.retirements + (retired ? 1 : 0),
    },
  };
}

/** Vom Abschlussbildschirm zurück in den Startablauf (Staat frei wählbar). */
export function beginNewRunSetup(game: GameState): GameState {
  if (game.phase !== 'runEnded') return game;
  return { ...game, phase: 'setup', pending: { ...game.pending, runEnd: null } };
}

export function retire(game: GameState, cfg: GameConfig): GameState {
  if (game.phase !== 'victory') return game;
  return endRun(game, 'retired', cfg);
}

export function continueRuling(game: GameState): GameState {
  const run = game.run;
  if (game.phase !== 'victory' || !run) return game;
  return { ...game, phase: 'playing', run: { ...run, rulingSince: run.playMs } };
}

export function rulingYears(run: RunState, cfg: GameConfig): number {
  if (run.rulingSince === null) return 0;
  return Math.floor((run.playMs - run.rulingSince) / (cfg.balancing.ruling.secondsPerYear * 1000));
}

// ---------------------------------------------------------------- Auswandern

export function emigrationCost(game: GameState, cfg: GameConfig): number {
  const e = cfg.balancing.emigration;
  return Math.ceil(
    e.baseCost * Math.pow(e.costGrowthPerEmigration, game.meta.emigrations) * costScale(cfg),
  );
}

export function canEmigrate(game: GameState, to: StateId, cfg: GameConfig): boolean {
  const run = game.run;
  return (
    game.phase === 'playing' &&
    run !== null &&
    run.stateId !== to &&
    cfg.states[to].playable &&
    run.stage >= cfg.balancing.emigration.minStage &&
    run.resources.money >= emigrationCost(game, cfg)
  );
}

/** Staatsbürgerschaft kaufen: startet die Animation (phase 'emigrating'). */
export function startEmigration(game: GameState, to: StateId, cfg: GameConfig): GameState {
  const run = game.run;
  if (!run || !canEmigrate(game, to, cfg)) return game;
  return {
    ...game,
    phase: 'emigrating',
    pending: {
      ...game.pending,
      emigration: { from: run.stateId, to, money: run.resources.money - emigrationCost(game, cfg) },
    },
  };
}

/** Nach der Animation und der Berufswahl: Neustart als Arbeiter, das Geld bleibt. */
export function completeEmigration(
  game: GameState,
  profession: ProfessionId,
  now: number,
  cfg: GameConfig,
): GameState {
  const pending = game.pending.emigration;
  if (game.phase !== 'emigrating' || !pending) return game;
  return {
    ...game,
    phase: 'playing',
    lastActiveAt: now,
    run: freshRun(game, pending.to, profession, Math.max(0, pending.money), now, cfg),
    pending: { ceremony: null, runEnd: null, emigration: null },
    meta: {
      ...game.meta,
      runsStarted: game.meta.runsStarted + 1,
      emigrations: game.meta.emigrations + 1,
    },
  };
}

// ---------------------------------------------------------------- Charakter

export function unlockedAccessories(game: GameState, cfg: GameConfig): AccessoryId[] {
  const rewards = new Set<AccessoryId>();
  for (const a of cfg.achievements) {
    if (a.reward && game.meta.achievements.includes(a.id)) rewards.add(a.reward);
  }
  return ACCESSORY_IDS.filter((a) => rewards.has(a));
}

/** Charakter ändern (Profil). Accessoires nur, wenn sie freigeschaltet sind. */
export function updateCharacter(game: GameState, character: Character, cfg: GameConfig): GameState {
  if (!game.character) return game;
  const unlocked = unlockedAccessories(game, cfg);
  return {
    ...game,
    character: {
      ...character,
      accessories: character.accessories.filter((a) => unlocked.includes(a)),
    },
  };
}

// ---------------------------------------------------------------- Einführung und Hinweise

export function markIntroSeen(game: GameState): GameState {
  return game.flags.introSeen ? game : { ...game, flags: { ...game.flags, introSeen: true } };
}

/** Hinweise, die jetzt fällig sind, weil etwas zum ersten Mal freigeschaltet wurde. */
export function pendingHints(game: GameState, cfg: GameConfig): HintId[] {
  const run = game.run;
  if (game.phase !== 'playing' || !run) return [];
  const seen = game.flags.hintsSeen;
  const due: HintId[] = [];
  const add = (id: HintId, condition: boolean) => {
    if (condition && !seen.includes(id)) due.push(id);
  };
  add('followersUnlocked', run.stage >= cfg.balancing.resourceUnlockStage.followers);
  add('networkUnlocked', groupsFor(run, cfg).length > 0);
  add('oldTownUnlocked', run.stage >= (cfg.world.districts[1]?.unlockStage ?? MAX_STAGE));
  add('loyaltyUnlocked', isLoyaltyUnlocked(run, cfg));
  add('autocraticTurn', canTurnAutocratic(game, cfg));
  add('governmentUnlocked', run.stage >= (cfg.world.districts[2]?.unlockStage ?? MAX_STAGE));
  add('worldUnlocked', isWorldUnlocked(run, cfg));
  add('capitalUnlocked', run.stage >= (cfg.world.districts[3]?.unlockStage ?? MAX_STAGE));
  add('firstEvent', run.events.open.length > 0);
  return due;
}

export function markHintSeen(game: GameState, hint: HintId): GameState {
  if (game.flags.hintsSeen.includes(hint)) return game;
  return { ...game, flags: { ...game.flags, hintsSeen: [...game.flags.hintsSeen, hint] } };
}

// ---------------------------------------------------------------- Erfolge

function achievementMet(game: GameState, id: AchievementId, cfg: GameConfig): boolean {
  const run = game.run;
  const m = game.meta;
  switch (id) {
    case 'firstShift':
      return m.totalTaps >= 1;
    case 'firstInvestment':
      return run !== null && Object.values(run.generators).some((n) => n > 0);
    case 'firstElection':
      return run !== null && run.stats.electionsWon >= 1;
    case 'firstStaff':
      return run !== null && Object.values(run.actions).some((a) => a.staff > 0);
    case 'newVehicle':
      return run !== null && run.vehicle !== 'feet';
    case 'mayor':
      return m.highestStageEver >= 5;
    case 'minister':
      return m.highestStageEver >= 10;
    case 'blueCollarPresident':
      return run !== null && run.stage >= MAX_STAGE && run.path === 'democratic';
    case 'dictator':
      return run !== null && run.stage >= MAX_STAGE && run.path === 'autocratic';
    case 'allStates':
      return m.statesRuled.length >= Object.keys(cfg.states).length;
    case 'survivedUnrest':
      return run !== null && run.stats.survivedUnrest;
    case 'overthrown':
      return m.overthrows >= 1;
    case 'emigrant':
      return m.emigrations >= 1;
    case 'coalitionBuilder':
      return run !== null && groupsFor(run, cfg).filter((g) => groupTier(run, g, cfg) === 2).length >= 3;
    case 'diplomat':
      return run !== null && alliances(run) >= 2;
    case 'regionalDeveloper':
      return run !== null && Object.values(run.projects).reduce((a, b) => a + b, 0) >= 10;
    case 'millionaire':
      return run !== null && run.resources.money >= 1_000_000;
    case 'veteran':
      return run !== null && rulingYears(run, cfg) >= 5;
    case 'retiree':
      return m.retirements >= 1;
    case 'eventVeteran':
      return m.eventsResolved >= 50;
  }
}

/** Prüft alle Erfolge und schaltet neue frei. */
export function checkAchievements(
  game: GameState,
  cfg: GameConfig,
): { game: GameState; unlocked: AchievementId[] } {
  const unlocked = cfg.achievements
    .map((a) => a.id)
    .filter((id) => !game.meta.achievements.includes(id) && achievementMet(game, id, cfg));
  if (unlocked.length === 0) return { game, unlocked };
  return {
    game: { ...game, meta: { ...game.meta, achievements: [...game.meta.achievements, ...unlocked] } },
    unlocked,
  };
}
