import type { GameConfig } from '../config';
import { zeroResources } from './economy';
import { MAX_STAGE, type ProfessionId, type StateId } from './ids';
import { SAVE_VERSION, type Character, type GameState, type HintId } from './schema';
import { isResourceUnlocked } from './unlocks';

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
    flags: { introSeen: false, hintsSeen: [] },
    stats: { totalTaps: 0, totalPlayMs: 0, runsStarted: 0 },
  };
}

export interface RunSetup {
  character: Character;
  stateId: StateId;
  profession: ProfessionId;
}

/** Startet einen neuen Durchlauf als Arbeiter (Stufe 1). Nicht spielbare Staaten werden abgelehnt. */
export function startRun(
  game: GameState,
  setup: RunSetup,
  now: number,
  cfg: GameConfig,
): GameState {
  const stateDef = cfg.states[setup.stateId];
  if (!stateDef.playable) return game;
  return {
    ...game,
    phase: 'playing',
    lastActiveAt: now,
    character: setup.character,
    run: {
      stateId: setup.stateId,
      profession: setup.profession,
      path: stateDef.alwaysAutocratic ? 'autocratic' : 'democratic',
      stage: 1,
      resources: zeroResources(),
      earned: zeroResources(),
      approval: cfg.balancing.startApproval,
      unrest: stateDef.baseUnrest,
      generators: {},
      startedAt: now,
      playMs: 0,
    },
    stats: { ...game.stats, runsStarted: game.stats.runsStarted + 1 },
  };
}

export function markIntroSeen(game: GameState): GameState {
  return game.flags.introSeen ? game : { ...game, flags: { ...game.flags, introSeen: true } };
}

/** Hinweise, die jetzt fällig sind, weil eine Funktion zum ersten Mal freigeschaltet wurde. */
export function pendingHints(game: GameState, cfg: GameConfig): HintId[] {
  const run = game.run;
  if (game.phase !== 'playing' || !run) return [];
  const due: HintId[] = [];
  if (
    isResourceUnlocked(run, 'followers', cfg) &&
    !game.flags.hintsSeen.includes('followersUnlocked')
  ) {
    due.push('followersUnlocked');
  }
  return due;
}

export function markHintSeen(game: GameState, hint: HintId): GameState {
  if (game.flags.hintsSeen.includes(hint)) return game;
  return { ...game, flags: { ...game.flags, hintsSeen: [...game.flags.hintsSeen, hint] } };
}

export function clampStage(stage: number): number {
  return Math.min(MAX_STAGE, Math.max(1, Math.round(stage)));
}
