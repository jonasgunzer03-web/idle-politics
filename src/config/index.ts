import { balancing, type Balancing } from './balancing';
import { careers, type CareerStageDef } from './careers';
import { states, type StateDef } from './states';
import type { StateId } from '../engine/ids';

/** Alles, was die Engine an Konfiguration braucht. Wird als Parameter übergeben, damit
 *  Tests und die Balancing-Simulation eigene Werte einsetzen können. */
export interface GameConfig {
  balancing: Balancing;
  states: Record<StateId, StateDef>;
  careers: Record<StateId, CareerStageDef[]>;
}

export const defaultConfig: GameConfig = { balancing, states, careers };

/** Kopie der Standard-Konfiguration mit anderem Tempo-Faktor (für Tests und Simulation). */
export function withGameSpeed(config: GameConfig, gameSpeed: number): GameConfig {
  return { ...config, balancing: { ...config.balancing, gameSpeed } };
}
