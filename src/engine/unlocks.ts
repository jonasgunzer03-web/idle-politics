import type { GameConfig } from '../config';
import type { GeneratorDef } from '../config/balancing';
import type { ActionDef, LocationDef } from '../config/world';
import type { ActionId, LocationId } from './ids';
import { isDistrictUnlocked, isResourceUnlocked } from './rules';
import type { RunState } from './schema';

export function findGenerator(id: string, cfg: GameConfig): GeneratorDef | undefined {
  return cfg.balancing.generators.find((g) => g.id === id);
}

/** Generator gehört zum Staat des Durchlaufs (manche gibt es nur in einem Staat). */
export function isGeneratorAvailable(run: RunState, def: GeneratorDef): boolean {
  return def.states === undefined || def.states.includes(run.stateId);
}

export function isGeneratorUnlocked(run: RunState, def: GeneratorDef, cfg: GameConfig): boolean {
  return (
    isGeneratorAvailable(run, def) &&
    run.stage >= def.unlockStage &&
    isResourceUnlocked(run, def.produces, cfg)
  );
}

export function findLocation(id: LocationId, cfg: GameConfig): LocationDef | undefined {
  return cfg.world.locations.find((l) => l.id === id);
}

export function findAction(id: ActionId, cfg: GameConfig): ActionDef | undefined {
  return cfg.world.actions.find((a) => a.id === id);
}

/** Man kann zum Ort laufen (sein Viertel ist offen). */
export function isLocationReachable(run: RunState, loc: LocationDef, cfg: GameConfig): boolean {
  return isDistrictUnlocked(run, loc.district, cfg);
}

/** Man kann den Ort betreten. */
export function isLocationOpen(run: RunState, loc: LocationDef, cfg: GameConfig): boolean {
  return isLocationReachable(run, loc, cfg) && run.stage >= loc.unlockStage;
}

export function isActionUnlocked(run: RunState, action: ActionDef, cfg: GameConfig): boolean {
  const loc = findLocation(action.location, cfg);
  return loc !== undefined && isLocationOpen(run, loc, cfg) && run.stage >= action.unlockStage;
}

export function actionsAt(location: LocationId, cfg: GameConfig): ActionDef[] {
  return cfg.world.actions.filter((a) => a.location === location);
}
