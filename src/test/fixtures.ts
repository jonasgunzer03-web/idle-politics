import { defaultConfig } from '../config';
import { createNewGame, startRun } from '../engine/game';
import type { Character, GameState } from '../engine/schema';

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
};

/** Laufender Durchlauf in Rhenanien, Beruf Facharbeiter, Zeitpunkt t = 1.000.000 ms. */
export function playingGame(overrides: Partial<NonNullable<GameState['run']>> = {}): GameState {
  const base = startRun(
    createNewGame(1_000_000, 42),
    { character: testCharacter, stateId: 'rhenania', profession: 'skilled' },
    1_000_000,
    cfg,
  );
  if (!base.run) throw new Error('fixture: run missing');
  return { ...base, run: { ...base.run, ...overrides } };
}
