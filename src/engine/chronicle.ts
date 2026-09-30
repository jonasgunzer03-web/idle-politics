import type { GameConfig } from '../config';
import type { ChronicleKey } from './ids';
import type { ChronicleEntry, RunState } from './schema';

// Stadtchronik: Schlagzeilen zu allem Wichtigen, was im Durchlauf passiert.
// Die Texte stehen in src/i18n/de-party.ts unter „chronicle“.

export type ChronicleParams = ChronicleEntry['params'];

/** Eintrag anhängen; ältere fallen heraus, wenn die Chronik voll ist. */
export function addChronicle(
  run: RunState,
  key: ChronicleKey,
  params: ChronicleParams,
  cfg: GameConfig,
): RunState {
  const entry: ChronicleEntry = { t: run.playMs, key, params };
  const list = [...run.chronicle, entry];
  const size = cfg.party.chronicleSize;
  return { ...run, chronicle: list.length > size ? list.slice(list.length - size) : list };
}
