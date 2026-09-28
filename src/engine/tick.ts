import type { GameConfig } from '../config';
import { applyProduction, zeroResources } from './economy';
import { tickEvents } from './events';
import { endRun } from './game';
import { RESOURCE_IDS, type ResourceMap } from './ids';
import { tickPolitics, type PoliticsSignal } from './politics';
import { offlineCapHours } from './rules';
import { sanitizeGame } from './sanitize';
import type { GameState } from './schema';
import { moveFigure } from './world';

const HOUR_MS = 3_600_000;

export function offlineCapMs(game: GameState, cfg: GameConfig): number {
  return offlineCapHours(game, cfg) * HOUR_MS;
}

/** Negative, ungültige und zu große Zeitdifferenzen abfangen. */
export function clampDelta(deltaMs: number, maxMs: number): number {
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return 0;
  return Math.min(deltaMs, maxMs);
}

/** Längster einzelner Rechenschritt, damit Politik und Zufall bei großen Takten stabil bleiben. */
const MAX_STEP_MS = 1_000;

interface TickResult {
  game: GameState;
  signal: PoliticsSignal;
}

function tickStep(game: GameState, dt: number, cfg: GameConfig): TickResult {
  const run = game.run;
  if (game.phase !== 'playing' || !run) return { game, signal: null };
  let next = applyProduction(game, dt, cfg);
  next = moveFigure(next, dt, cfg);
  const r = next.run ?? run;
  next = {
    ...next,
    run: { ...r, playMs: r.playMs + dt },
    meta: { ...next.meta, totalPlayMs: next.meta.totalPlayMs + dt },
  };
  const politics = tickPolitics(next, dt, cfg);
  next = politics.game;
  if (politics.signal === 'revolution' || politics.signal === 'coup' || politics.signal === 'purge') {
    return { game: endRun(next, politics.signal, cfg), signal: politics.signal };
  }
  next = tickEvents(next, cfg);
  return { game: next, signal: politics.signal };
}

/** Takt ohne abschließende Prüfung; advance() prüft selbst und meldet Korrekturen. */
function tickRaw(game: GameState, deltaMs: number, cfg: GameConfig): TickResult {
  let remaining = clampDelta(deltaMs, offlineCapMs(game, cfg));
  let current = game;
  let signal: PoliticsSignal = null;
  while (remaining > 0 && current.phase === 'playing') {
    const dt = Math.min(MAX_STEP_MS, remaining);
    const result = tickStep(current, dt, cfg);
    current = result.game;
    signal = result.signal ?? signal;
    remaining -= dt;
  }
  return { game: current, signal };
}

/**
 * Ein Takt der laufenden Spielschleife: Erträge, Bewegung, Politik und Ereignisse.
 * Endet der Durchlauf (Sturz), wechselt die Phase und weitere Zeit wird nicht mehr verrechnet.
 */
export function tick(game: GameState, deltaMs: number, cfg: GameConfig): GameState {
  return sanitizeGame(tickRaw(game, deltaMs, cfg).game).game;
}

export interface OfflineReport {
  /** Tatsächlich vergangene Zeit. */
  elapsedMs: number;
  /** Gutgeschriebene Zeit (nach Offline-Deckel). */
  creditedMs: number;
  capped: boolean;
  gained: ResourceMap;
}

/**
 * Abwesenheit verrechnen: ausschließlich Erträge (Generatoren, Mitarbeiter, Projekte).
 * Zustimmung, Unruhe, Ereignisse und Wahlen bleiben eingefroren. Eine begonnene
 * Wegstrecke gilt als erledigt.
 */
export function applyOffline(
  game: GameState,
  elapsedMs: number,
  cfg: GameConfig,
): { game: GameState; report: OfflineReport | null } {
  const run = game.run;
  const credited = clampDelta(elapsedMs, offlineCapMs(game, cfg));
  if (game.phase !== 'playing' || !run || credited === 0) return { game, report: null };
  const produced = moveFigure(applyProduction(game, credited, cfg), credited, cfg, true);
  const gained = zeroResources();
  const after = produced.run ?? run;
  for (const id of RESOURCE_IDS) gained[id] = after.resources[id] - run.resources[id];
  const next = sanitizeGame(produced).game;
  return {
    game: next,
    report: {
      elapsedMs: Math.max(0, elapsedMs),
      creditedMs: credited,
      capped: elapsedMs > credited,
      gained,
    },
  };
}

export interface AdvanceResult {
  game: GameState;
  /** Gesetzt, wenn die Lücke seit dem letzten Takt als Abwesenheit verrechnet wurde. */
  offline: OfflineReport | null;
  /** Politisches Ereignis in diesem Takt (Rücktritt, Sturz …). */
  signal: PoliticsSignal;
  /** Korrekturen durch die NaN/Infinity-Prüfung (im Debug-Modus geloggt). */
  issues: string[];
}

/**
 * Zentrale Zeitfunktion: verrechnet alles seit `game.lastActiveAt` bis `now`.
 * Weil es nur diesen einen Zeitstempel gibt, kann dieselbe Zeitspanne nie doppelt
 * gutgeschrieben werden – weder durch Schleife und Offline-Berechnung noch durch
 * mehrfachen Aufruf.
 */
export function advance(game: GameState, now: number, cfg: GameConfig): AdvanceResult {
  if (!Number.isFinite(now)) {
    return { game, offline: null, signal: null, issues: ['now: ungültig'] };
  }
  const raw = now - game.lastActiveAt;
  // Uhr zurückgestellt oder ungültige Zeit: nichts gutschreiben, nur neu ansetzen
  if (!Number.isFinite(raw) || raw <= 0) {
    return {
      game: raw === 0 ? game : { ...game, lastActiveAt: now },
      offline: null,
      signal: null,
      issues: [],
    };
  }
  if (raw <= cfg.balancing.time.onlineMaxDeltaMs) {
    const result = tickRaw(game, raw, cfg);
    const { game: next, issues } = sanitizeGame(result.game);
    return { game: { ...next, lastActiveAt: now }, offline: null, signal: result.signal, issues };
  }
  const { game: next, report } = applyOffline(game, raw, cfg);
  return { game: { ...next, lastActiveAt: now }, offline: report, signal: null, issues: [] };
}
