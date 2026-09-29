import { defaultConfig } from '../../config';
import { smallStates, type FlagDef } from '../../config/states';
import type { ForeignId } from '../../engine/ids';

/** Flagge eines Staates (auch der kleinen Nachbarstaaten). */
export function flagFor(id: ForeignId): FlagDef {
  return id === 'valmora' || id === 'lysania'
    ? smallStates[id].flag
    : defaultConfig.states[id].flag;
}
