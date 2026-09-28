import { cfg, playingGame } from '../test/fixtures';
import { zeroResources } from './economy';
import { createNewGame } from './game';
import { sanitizeGame } from './sanitize';
import { advance, applyOffline, clampDelta, tick } from './tick';

const HOUR = 3_600_000;
// Facharbeiter in Rhenanien: Geld-Multiplikator 0,63 → 10 Überstunden = 1,89 €/s
const withIncome = () => playingGame({ generators: { overtime: 10 } });
const moneyPerSecond = 10 * 0.3 * 0.63;

describe('clampDelta', () => {
  it('negative und ungültige Werte zählen als 0', () => {
    expect(clampDelta(-500, 1000)).toBe(0);
    expect(clampDelta(Number.NaN, 1000)).toBe(0);
    expect(clampDelta(Infinity, 1000)).toBe(0);
  });
  it('begrenzt nach oben', () => {
    expect(clampDelta(5000, 1000)).toBe(1000);
  });
});

describe('tick', () => {
  it('schreibt Erträge anteilig zur Zeit gut', () => {
    const next = tick(withIncome(), 2000, cfg);
    expect(next.run?.resources.money).toBeCloseTo(2 * moneyPerSecond);
    expect(next.run?.playMs).toBe(2000);
    expect(next.stats.totalPlayMs).toBe(2000);
  });

  it('mehrere kleine Takte ergeben dasselbe wie ein großer', () => {
    let small = withIncome();
    for (let i = 0; i < 100; i++) small = tick(small, 100, cfg);
    const big = tick(withIncome(), 10_000, cfg);
    expect(small.run?.resources.money).toBeCloseTo(big.run?.resources.money ?? -1, 8);
  });

  it('ändert nichts bei negativer Zeit', () => {
    const game = withIncome();
    expect(tick(game, -1000, cfg)).toBe(game);
  });

  it('läuft nicht im Startablauf', () => {
    const game = createNewGame(0, 1);
    expect(tick(game, 1000, cfg)).toBe(game);
  });
});

describe('Offline-Fortschritt', () => {
  it('schreibt nur Erträge gut und friert Zustimmung und Unruhe ein', () => {
    const game = playingGame({ generators: { overtime: 10 }, approval: 37, unrest: 12 });
    const { game: next, report } = applyOffline(game, HOUR, cfg);
    expect(next.run?.resources.money).toBeCloseTo(3600 * moneyPerSecond);
    expect(next.run?.approval).toBe(37);
    expect(next.run?.unrest).toBe(12);
    // Offline-Zeit ist keine aktive Spielzeit
    expect(next.run?.playMs).toBe(0);
    expect(report?.gained.money).toBeCloseTo(3600 * moneyPerSecond);
    expect(report?.capped).toBe(false);
  });

  it('begrenzt auf den Offline-Deckel von 8 Stunden', () => {
    const { report } = applyOffline(withIncome(), 30 * HOUR, cfg);
    expect(report?.creditedMs).toBe(8 * HOUR);
    expect(report?.elapsedMs).toBe(30 * HOUR);
    expect(report?.capped).toBe(true);
    expect(report?.gained.money).toBeCloseTo(8 * 3600 * moneyPerSecond);
  });

  it('genau am Deckel gilt nicht als gekappt', () => {
    const { report } = applyOffline(withIncome(), 8 * HOUR, cfg);
    expect(report?.capped).toBe(false);
  });

  it('negative Zeit ergibt keinen Bericht', () => {
    const game = withIncome();
    const { game: next, report } = applyOffline(game, -HOUR, cfg);
    expect(report).toBeNull();
    expect(next).toBe(game);
  });

  it('ohne Generatoren wird nichts gutgeschrieben', () => {
    const { report } = applyOffline(playingGame(), HOUR, cfg);
    expect(report?.gained).toEqual(zeroResources());
  });
});

describe('advance (zentrale Zeitfunktion)', () => {
  it('kleine Lücken laufen als normaler Takt', () => {
    const game = withIncome();
    const { game: next, offline } = advance(game, game.lastActiveAt + 1000, cfg);
    expect(offline).toBeNull();
    expect(next.run?.playMs).toBe(1000);
    expect(next.lastActiveAt).toBe(game.lastActiveAt + 1000);
  });

  it('große Lücken laufen als Offline-Zeit', () => {
    const game = withIncome();
    const { game: next, offline } = advance(game, game.lastActiveAt + HOUR, cfg);
    expect(offline?.creditedMs).toBe(HOUR);
    expect(next.run?.playMs).toBe(0);
  });

  it('keine doppelte Gutschrift bei wiederholtem Aufruf', () => {
    const game = withIncome();
    const now = game.lastActiveAt + HOUR;
    const once = advance(game, now, cfg).game;
    const twice = advance(once, now, cfg).game;
    expect(twice.run?.resources.money).toBe(once.run?.resources.money);
  });

  it('Uhr zurückgestellt: nichts gutschreiben, Zeitstempel neu ansetzen', () => {
    const game = withIncome();
    const back = game.lastActiveAt - HOUR;
    const { game: next, offline } = advance(game, back, cfg);
    expect(offline).toBeNull();
    expect(next.run?.resources.money).toBe(0);
    expect(next.lastActiveAt).toBe(back);
    // Danach läuft die Zeit normal weiter
    const later = advance(next, back + 1000, cfg).game;
    expect(later.run?.resources.money).toBeCloseTo(moneyPerSecond);
  });
});

describe('sanitizeGame', () => {
  it('ersetzt NaN, Infinity und negative Werte', () => {
    const game = playingGame({
      resources: { ...zeroResources(), money: Number.NaN, influence: -5, followers: Infinity },
      approval: 140,
    });
    const { game: clean, issues } = sanitizeGame(game);
    expect(clean.run?.resources.money).toBe(0);
    expect(clean.run?.resources.influence).toBe(0);
    expect(Number.isFinite(clean.run?.resources.followers)).toBe(true);
    expect(clean.run?.approval).toBe(100);
    expect(issues.length).toBeGreaterThan(0);
  });

  it('gibt dasselbe Objekt zurück, wenn alles stimmt', () => {
    const game = playingGame();
    expect(sanitizeGame(game).game).toBe(game);
  });
});
