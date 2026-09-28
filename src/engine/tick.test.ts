import { cfg, playingGame, runOf } from '../test/fixtures';
import { productionRates, zeroResources } from './economy';
import { createNewGame } from './game';
import { sanitizeGame } from './sanitize';
import { advance, applyOffline, clampDelta, tick } from './tick';
import { walkTo } from './world';

const HOUR = 3_600_000;
const withIncome = () => playingGame({ generators: { overtime: 10 } });
const perSecond = () => productionRates(withIncome(), cfg).money;

describe('clampDelta', () => {
  it('negative und ungültige Werte zählen als 0, zu große werden begrenzt', () => {
    expect(clampDelta(-500, 1000)).toBe(0);
    expect(clampDelta(Number.NaN, 1000)).toBe(0);
    expect(clampDelta(Infinity, 1000)).toBe(0);
    expect(clampDelta(5000, 1000)).toBe(1000);
  });
});

describe('tick', () => {
  it('schreibt Erträge anteilig zur Zeit gut und zählt Spielzeit', () => {
    const next = tick(withIncome(), 2000, cfg);
    expect(runOf(next).resources.money).toBeCloseTo(2 * perSecond());
    expect(runOf(next).playMs).toBe(2000);
    expect(next.meta.totalPlayMs).toBe(2000);
  });

  it('viele kleine Takte ergeben dasselbe wie ein großer', () => {
    let small = withIncome();
    for (let i = 0; i < 100; i++) small = tick(small, 100, cfg);
    const big = tick(withIncome(), 10_000, cfg);
    expect(runOf(small).resources.money).toBeCloseTo(runOf(big).resources.money, 6);
  });

  it('ändert nichts bei negativer Zeit und außerhalb des Spiels', () => {
    const game = withIncome();
    expect(tick(game, -1000, cfg)).toBe(game);
    const setup = createNewGame(0, 1);
    expect(tick(setup, 1000, cfg)).toBe(setup);
    const ceremony = { ...game, phase: 'ceremony' as const };
    expect(tick(ceremony, 1000, cfg)).toBe(ceremony);
  });
});

describe('Offline-Fortschritt', () => {
  it('nur Erträge; Zustimmung, Unruhe und Loyalität bleiben eingefroren', () => {
    const game = playingGame({ generators: { overtime: 10 }, approval: 37, unrest: 12, loyalty: 70 });
    const { game: next, report } = applyOffline(game, HOUR, cfg);
    expect(runOf(next).resources.money).toBeCloseTo(3600 * perSecond(), 3);
    expect(runOf(next)).toMatchObject({ approval: 37, unrest: 12, loyalty: 70, playMs: 0 });
    expect(report?.capped).toBe(false);
  });

  it('keine Ereigniskarten offline', () => {
    const game = playingGame({ events: { open: [], nextAt: 0, crisisAt: 0 } });
    const { game: next } = applyOffline(game, 8 * HOUR, cfg);
    expect(runOf(next).events.open).toEqual([]);
  });

  it('eine begonnene Wegstrecke gilt offline als erledigt', () => {
    const walking = walkTo(playingGame(), 'partyOffice', cfg);
    const { game: next } = applyOffline(walking, HOUR, cfg);
    expect(runOf(next).world.target).toBeNull();
    expect(runOf(next).world.posX).toBe(860);
  });

  it('begrenzt auf den Offline-Deckel von 8 Stunden', () => {
    const { report } = applyOffline(withIncome(), 30 * HOUR, cfg);
    expect(report?.creditedMs).toBe(8 * HOUR);
    expect(report?.capped).toBe(true);
  });

  it('Vermächtnis „Lange Ruhe“ erhöht den Deckel', () => {
    const game = { ...withIncome(), meta: { ...withIncome().meta, legacy: { longRest: 2 } } };
    expect(applyOffline(game, 30 * HOUR, cfg).report?.creditedMs).toBe(12 * HOUR);
  });

  it('ohne Erträge wird nichts gutgeschrieben', () => {
    expect(applyOffline(playingGame(), HOUR, cfg).report?.gained).toEqual(zeroResources());
  });
});

describe('advance (zentrale Zeitfunktion)', () => {
  it('kleine Lücken laufen als Takt, große als Offline-Zeit', () => {
    const game = withIncome();
    expect(advance(game, game.lastActiveAt + 1000, cfg).offline).toBeNull();
    expect(advance(game, game.lastActiveAt + HOUR, cfg).offline?.creditedMs).toBe(HOUR);
  });

  it('keine doppelte Gutschrift bei wiederholtem Aufruf', () => {
    const game = withIncome();
    const now = game.lastActiveAt + HOUR;
    const once = advance(game, now, cfg).game;
    expect(runOf(advance(once, now, cfg).game).resources.money).toBe(runOf(once).resources.money);
  });

  it('Uhr zurückgestellt: nichts gutschreiben, danach normal weiter', () => {
    const game = withIncome();
    const back = game.lastActiveAt - HOUR;
    const next = advance(game, back, cfg);
    expect(next.offline).toBeNull();
    expect(runOf(next.game).resources.money).toBe(0);
    const later = advance(next.game, back + 1000, cfg).game;
    expect(runOf(later).resources.money).toBeCloseTo(perSecond());
  });

  it('ungültige Uhrzeit ändert nichts', () => {
    const game = withIncome();
    expect(advance(game, Number.NaN, cfg).game).toBe(game);
  });
});

describe('sanitizeGame', () => {
  it('ersetzt NaN, Infinity und Werte außerhalb des Bereichs', () => {
    const game = playingGame({
      resources: { ...zeroResources(), money: Number.NaN, influence: -5, followers: Infinity },
      approval: 140,
      groups: { unions: Number.NaN },
      relations: { novaria: -300 },
    });
    const { game: clean, issues } = sanitizeGame(game);
    const run = runOf(clean);
    expect(run.resources.money).toBe(0);
    expect(run.resources.influence).toBe(0);
    expect(Number.isFinite(run.resources.followers)).toBe(true);
    expect(run.approval).toBe(100);
    expect(run.groups.unions).toBe(0);
    expect(run.relations.novaria).toBe(-100);
    expect(issues.length).toBeGreaterThan(0);
  });

  it('gibt dasselbe Objekt zurück, wenn alles stimmt', () => {
    const game = playingGame();
    expect(sanitizeGame(game).game).toBe(game);
  });
});
