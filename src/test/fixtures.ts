import { defaultConfig } from '../config';
import { createNewGame, startRun } from '../engine/game';
import type { Character, GameState, RunState } from '../engine/schema';

export const cfg = defaultConfig;

export const testCharacter: Character = {
  name: 'Mara Lindqvist',
  build: 1,
  skinTone: 2,
  faceShape: 0,
  hairStyle: 3,
  hairColor: 1,
  beard: 0,
  glasses: 0,
  party: { name: 'Bürgerliste', color: 1, symbol: 0 },
  accessories: [],
};

/**
 * Laufender Durchlauf (Standard: Rhenanien, Facharbeiter) zum Zeitpunkt t = 1.000.000 ms.
 * Die Figur steht im Werk. Ereigniskarten sind abgeschaltet (nextAt = ∞), damit Tests
 * nicht zufällig eine Karte ziehen.
 */
export function playingGame(
  overrides: Partial<RunState> = {},
  setup: Partial<{ stateId: RunState['stateId']; profession: RunState['profession'] }> = {},
): GameState {
  const base = startRun(
    createNewGame(1_000_000, 42),
    {
      character: testCharacter,
      stateId: setup.stateId ?? 'rhenania',
      profession: setup.profession ?? 'skilled',
    },
    1_000_000,
    cfg,
  );
  if (!base.run) throw new Error('fixture: run missing');
  const run: RunState = {
    ...base.run,
    events: { ...base.run.events, nextAt: Number.MAX_SAFE_INTEGER },
    ...overrides,
  };
  return { ...base, run };
}

/** Kurzform: Durchlauf eines Spielstands, der sicher existiert. */
export function runOf(game: GameState): RunState {
  if (!game.run) throw new Error('kein Durchlauf');
  return game.run;
}
