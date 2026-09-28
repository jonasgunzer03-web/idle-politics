import type { GameConfig } from '../config';
import { applyProduction, zeroResources } from './economy';
import { RESOURCE_IDS, type ResourceMap } from './ids';
import { sanitizeGame } from './sanitize';
import type { GameState } from './schema';

const HOUR_MS = 3_600_000;

export function offlineCapMs(cfg: GameConfig): number {
  return cfg.balancing.time.offlineCapHours * HOUR_MS;
}

/** Negative, ungültige und zu große Zeitdifferenzen abfangen. */
export function clampDelta(deltaMs: number, maxMs: number): number {
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return 0;
  return Math.min(deltaMs, maxMs);
}

/**
 * Ein Takt der laufenden Spielschleife: Erträge und aktive Spielzeit.
 * In späteren Phasen kommen hier Zustimmung, Unruhe und Ereignisse dazu.
 */
export function tick(game: GameState, deltaMs: number, cfg: GameConfig): GameState {
  return sanitizeGame(tickRaw(game, deltaMs, cfg)).game;
}

/** Takt ohne abschließende Prüfung; advance() prüft selbst und meldet Korrekturen. */
function tickRaw(game: GameState, deltaMs: number, cfg: GameConfig): GameState {
  const run = game.run;
  if (game.phase !== 'playing' || !run) return game;
  const dt = clampDelta(deltaMs, offlineCapMs(cfg));
  if (dt === 0) return game;
  const produced = applyProduction(run, dt, cfg);
  return {
    ...game,
    run: { ...produced, playMs: produced.playMs + dt },
    stats: { ...game.stats, totalPlayMs: game.stats.totalPlayMs + dt },
  };
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
 * Abwesenheit verrechnen: ausschließlich Erträge. Zustimmung, Unruhe, Ereignisse und
 * Wahlen bleiben eingefroren.
 */
export function applyOffline(
  game: GameState,
  elapsedMs: number,
  cfg: GameConfig,
): { game: GameState; report: OfflineReport | null } {
  const run = game.run;
  const credited = clampDelta(elapsedMs, offlineCapMs(cfg));
  if (game.phase !== 'playing' || !run || credited === 0) return { game, report: null };
  const produced = applyProduction(run, credited, cfg);
  const gained = zeroResources();
  for (const id of RESOURCE_IDS) gained[id] = produced.resources[id] - run.resources[id];
  const next = sanitizeGame({ ...game, run: produced }).game;
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
  if (!Number.isFinite(now)) return { game, offline: null, issues: ['now: ungültig'] };
  const raw = now - game.lastActiveAt;
  // Uhr zurückgestellt oder ungültige Zeit: nichts gutschreiben, nur neu ansetzen
  if (!Number.isFinite(raw) || raw <= 0) {
    return {
      game: raw === 0 ? game : { ...game, lastActiveAt: now },
      offline: null,
      issues: [],
    };
  }
  if (raw <= cfg.balancing.time.onlineMaxDeltaMs) {
    const { game: next, issues } = sanitizeGame(tickRaw(game, raw, cfg));
    return { game: { ...next, lastActiveAt: now }, offline: null, issues };
  }
  const { game: next, report } = applyOffline(game, raw, cfg);
  return { game: { ...next, lastActiveAt: now }, offline: report, issues: [] };
}
