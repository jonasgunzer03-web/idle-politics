import { allianceRules, groups, type GroupDef } from './alliances';
import { balancing, type Balancing } from './balancing';
import {
  careers,
  stageRequirements,
  targetMinutes,
  type CareerStageDef,
  type StageRequirement,
} from './careers';
import { events, type EventDef } from './events';
import {
  foreignActions,
  foreignRules,
  projects,
  worldUnlockStage,
  type ForeignActionDef,
  type ProjectDef,
} from './foreign';
import {
  achievements,
  legacyNodes,
  legacyRules,
  type AchievementDef,
  type LegacyNodeDef,
} from './legacy';
import { industry, type IndustryConfig } from './industry';
import { minigames, type MinigameConfig } from './minigames';
import { party, type PartyConfig } from './party';
import { states, type StateDef } from './states';
import { world, type WorldConfig } from './world';
import type { StateId } from '../engine/ids';

/** Alles, was die Engine an Konfiguration braucht. Wird als Parameter übergeben, damit
 *  Tests und die Balancing-Simulation eigene Werte einsetzen können. */
export interface GameConfig {
  balancing: Balancing;
  states: Record<StateId, StateDef>;
  careers: Record<StateId, CareerStageDef[]>;
  stageRequirements: StageRequirement[];
  targetMinutes: number[];
  world: WorldConfig;
  groups: GroupDef[];
  allianceRules: typeof allianceRules;
  events: EventDef[];
  projects: ProjectDef[];
  foreignActions: ForeignActionDef[];
  foreignRules: typeof foreignRules;
  worldUnlockStage: number;
  legacyNodes: LegacyNodeDef[];
  legacyRules: typeof legacyRules;
  achievements: AchievementDef[];
  industry: IndustryConfig;
  party: PartyConfig;
  minigames: MinigameConfig;
}

export const defaultConfig: GameConfig = {
  balancing,
  states,
  careers,
  stageRequirements,
  targetMinutes,
  world,
  groups,
  allianceRules,
  events,
  projects,
  foreignActions,
  foreignRules,
  worldUnlockStage,
  legacyNodes,
  legacyRules,
  achievements,
  industry,
  party,
  minigames,
};

/** Kopie der Konfiguration mit anderem Tempo-Faktor (für Tests und Simulation). */
export function withGameSpeed(config: GameConfig, gameSpeed: number): GameConfig {
  return { ...config, balancing: { ...config.balancing, gameSpeed } };
}
