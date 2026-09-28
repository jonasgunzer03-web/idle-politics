import type { GameConfig } from '../config';
import type { GeneratorDef } from '../config/balancing';
import type { ResourceId, StateId } from './ids';
import type { RunState } from './schema';

export function resourceUnlockStage(
  stateId: StateId,
  resource: ResourceId,
  cfg: GameConfig,
): number {
  return (
    cfg.states[stateId].resourceUnlockOverride[resource] ??
    cfg.balancing.resourceUnlockStage[resource]
  );
}

export function isResourceUnlocked(run: RunState, resource: ResourceId, cfg: GameConfig): boolean {
  return run.stage >= resourceUnlockStage(run.stateId, resource, cfg);
}

export function isGeneratorUnlocked(run: RunState, def: GeneratorDef, cfg: GameConfig): boolean {
  return run.stage >= def.unlockStage && isResourceUnlocked(run, def.produces, cfg);
}

export function findGenerator(id: string, cfg: GameConfig): GeneratorDef | undefined {
  return cfg.balancing.generators.find((g) => g.id === id);
}
