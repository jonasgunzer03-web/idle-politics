import type { GameConfig } from '../config';
import type { EventDef, EventEffect } from '../config/events';
import {
  costScale,
  foreignPartners,
  groupLoyalty,
  isWorldUnlocked,
  nextRequirement,
  relation,
} from './rules';
import { GROUP_IDS, type ForeignId } from './ids';
import { drawRandom } from './rng';
import type { GameState, OpenEvent, RunState } from './schema';

// Ereigniskarten: entstehen nur im laufenden Spiel (nie offline), höchstens maxOpen im Stapel.

export function findEvent(id: string, cfg: GameConfig): EventDef | undefined {
  return cfg.events.find((e) => e.id === id);
}

function isEligible(game: GameState, def: EventDef, cfg: GameConfig): boolean {
  const run = game.run;
  if (!run) return false;
  if (run.stage < def.minStage || run.stage > def.maxStage) return false;
  if (def.states && !def.states.includes(run.stateId)) return false;
  if (def.path && def.path !== run.path) return false;
  if (def.minUnrest !== undefined && run.unrest < def.minUnrest) return false;
  if (def.foreign && !isWorldUnlocked(run, cfg)) return false;
  if (def.crisis && crisisCandidates(run, cfg).length === 0) return false;
  return !run.events.open.some((o) => o.id === def.id);
}

/** Staaten, mit denen eine Krise möglich ist: schlechte Beziehung und kein Bündnis. */
function crisisCandidates(run: RunState, cfg: GameConfig): ForeignId[] {
  return foreignPartners(run).filter(
    (id) => relation(run, id, cfg) < cfg.foreignRules.crisisBelow && !run.treaties[id]?.alliance,
  );
}

/** Nächster Abstand zwischen zwei Karten in ms (skaliert mit GAME_SPEED). */
export function nextInterval(value: number, run: RunState, cfg: GameConfig): number {
  const e = cfg.balancing.events;
  const seconds = e.minIntervalSeconds + value * (e.maxIntervalSeconds - e.minIntervalSeconds);
  const ruling = run.rulingSince !== null ? e.rulingIntervalFactor : 1;
  return seconds * 1000 * costScale(cfg) * ruling;
}

function pickWeighted(defs: EventDef[], value: number): EventDef | undefined {
  const total = defs.reduce((sum, d) => sum + d.weight, 0);
  let x = value * total;
  for (const d of defs) {
    x -= d.weight;
    if (x < 0) return d;
  }
  return defs[defs.length - 1];
}

/** Eine neue Karte ziehen. `crisisOnly` erzwingt eine Krisenkarte (nach Manövern). */
export function drawEvent(game: GameState, cfg: GameConfig, crisisOnly = false): GameState {
  const run = game.run;
  if (!run || run.events.open.length >= cfg.balancing.events.maxOpen) return game;
  const pool = cfg.events.filter((d) => isEligible(game, d, cfg) && (!crisisOnly || d.crisis));
  if (pool.length === 0) return game;
  const first = drawRandom(game);
  const def = pickWeighted(pool, first.value);
  if (!def) return first.game;
  let current = first.game;
  let target: ForeignId | null = null;
  if (def.foreign) {
    const candidates = def.crisis ? crisisCandidates(run, cfg) : foreignPartners(run);
    const second = drawRandom(current);
    current = second.game;
    target = candidates[Math.floor(second.value * candidates.length)] ?? candidates[0] ?? null;
  }
  const currentRun = current.run ?? run;
  const card: OpenEvent = { id: def.id, target };
  return {
    ...current,
    run: {
      ...currentRun,
      events: { ...currentRun.events, open: [...currentRun.events.open, card] },
    },
  };
}

/** Takt: fällige Karten ziehen. Läuft nur im aktiven Spiel. */
export function tickEvents(game: GameState, cfg: GameConfig): GameState {
  const run = game.run;
  if (game.phase !== 'playing' || !run) return game;
  let current = game;
  if (run.events.crisisAt !== null && run.playMs >= run.events.crisisAt) {
    current = drawEvent(current, cfg, true);
    const r = current.run ?? run;
    current = { ...current, run: { ...r, events: { ...r.events, crisisAt: null } } };
  }
  const r = current.run ?? run;
  if (r.playMs < r.events.nextAt) return current;
  current = drawEvent(current, cfg);
  const draw = drawRandom(current);
  const after = draw.game.run ?? r;
  return {
    ...draw.game,
    run: {
      ...after,
      events: { ...after.events, nextAt: after.playMs + nextInterval(draw.value, after, cfg) },
    },
  };
}

/** Wirkung einer Antwort anwenden. Beträge sind Anteile der aktuellen Anforderung. */
export function applyEffect(
  run: RunState,
  effect: EventEffect,
  target: ForeignId | null,
  cfg: GameConfig,
): RunState {
  const req = nextRequirement(run, cfg);
  const scale = {
    money: req.money,
    influence: req.influence,
    followers: Math.max(req.followers, req.influence),
  };
  const resources = { ...run.resources };
  const earned = { ...run.earned };
  for (const key of ['money', 'influence', 'followers'] as const) {
    const fraction = effect[key];
    if (fraction === undefined) continue;
    const amount = fraction * scale[key];
    resources[key] = Math.max(0, resources[key] + amount);
    if (amount > 0) earned[key] += amount;
  }
  if (effect.diplomacy !== undefined) {
    const amount = effect.diplomacy * costScale(cfg);
    resources.diplomacy = Math.max(0, resources.diplomacy + amount);
    if (amount > 0) earned.diplomacy += amount;
  }
  const volatility = cfg.states[run.stateId].approvalVolatility;
  const clamp = (v: number) => Math.min(100, Math.max(0, v));
  const groups = { ...run.groups };
  for (const g of GROUP_IDS) {
    const delta = effect.groups?.[g];
    if (delta !== undefined) groups[g] = clamp(groupLoyalty(run, g, cfg) + delta);
  }
  const relations = { ...run.relations };
  const shift = (id: ForeignId, delta: number) => {
    relations[id] = Math.min(
      100,
      Math.max(-100, (relations[id] ?? relation(run, id, cfg)) + delta),
    );
  };
  if (target && effect.relation !== undefined) shift(target, effect.relation);
  if (effect.relationsAll !== undefined && isWorldUnlocked(run, cfg)) {
    for (const id of foreignPartners(run)) shift(id, effect.relationsAll);
  }
  return {
    ...run,
    resources,
    earned,
    approval: clamp(run.approval + (effect.approval ?? 0) * volatility),
    unrest: clamp(run.unrest + (effect.unrest ?? 0)),
    loyalty: clamp(run.loyalty + (effect.loyalty ?? 0)),
    groups,
    relations,
  };
}

/** Karte beantworten (ja = rechts, nein = links). Jede Karte wirkt genau einmal. */
export function resolveEvent(
  game: GameState,
  index: number,
  choice: 'yes' | 'no',
  cfg: GameConfig,
): GameState {
  const run = game.run;
  if (game.phase !== 'playing' || !run) return game;
  const card = run.events.open[index];
  if (!card) return game;
  const def = findEvent(card.id, cfg);
  const open = run.events.open.filter((_, i) => i !== index);
  if (!def) return { ...game, run: { ...run, events: { ...run.events, open } } };
  const applied = applyEffect(run, def[choice], card.target, cfg);
  return {
    ...game,
    run: {
      ...applied,
      events: { ...applied.events, open },
      stats: { ...applied.stats, eventsResolved: applied.stats.eventsResolved + 1 },
    },
    meta: { ...game.meta, eventsResolved: game.meta.eventsResolved + 1 },
  };
}
