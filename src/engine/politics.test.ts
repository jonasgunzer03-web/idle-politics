import { withGameSpeed } from '../config';
import { cfg, playingGame, runOf } from '../test/fixtures';
import { coupRiskPerMinute, tickPolitics, unrestGraceLeft } from './politics';
import { approvalBase, unrestTarget } from './rules';
import { tick } from './tick';

const MIN = 60_000;

describe('Zustimmung und Unruhe', () => {
  it('Zustimmung wandert langsam zum Grundwert', () => {
    const game = playingGame({ approval: 20 });
    const next = runOf(tickPolitics(game, MIN, cfg).game);
    expect(next.approval).toBeCloseTo(20 + cfg.balancing.politics.approvalDriftPerMinute);
    expect(approvalBase(game, cfg)).toBe(50);
  });

  it('Unruhe sinkt in Rhenanien schneller (×1,5)', () => {
    const rhen = runOf(tickPolitics(playingGame({ unrest: 60 }), MIN, cfg).game);
    const nov = runOf(
      tickPolitics(playingGame({ unrest: 60 }, { stateId: 'novaria' }), MIN, cfg).game,
    );
    expect(60 - rhen.unrest).toBeCloseTo(6);
    expect(60 - nov.unrest).toBeCloseTo(4);
  });

  it('Autokraten: niedrige Zustimmung erhöht den Zielwert der Unruhe', () => {
    const happy = playingGame({ path: 'autocratic', approval: 90 });
    const unhappy = playingGame({ path: 'autocratic', approval: 10 });
    expect(unrestTarget(unhappy, cfg)).toBeGreaterThan(unrestTarget(happy, cfg));
  });
});

describe('Fairness bei hoher Unruhe', () => {
  it('zwischen 90 % und einem Sturz liegen mindestens 60 Sekunden', () => {
    // Unruhe springt auf 100 % (z. B. durch eine Karte): Frist beginnt, kein sofortiger Sturz
    let game = playingGame({ path: 'autocratic', unrest: 100, approval: 0, loyalty: 90, stage: 6 });
    for (let i = 0; i < 59; i++) {
      game = tick(game, 1000, cfg);
      expect(game.phase).toBe('playing');
      // Jemand treibt die Unruhe weiter auf 100 %
      game = { ...game, run: { ...runOf(game), unrest: 100 } };
    }
    expect(unrestGraceLeft(runOf(game), cfg)).toBeGreaterThan(0);
    // Nach Ablauf der Frist führt 100 % Unruhe zum Sturz
    for (let i = 0; i < 3 && game.phase === 'playing'; i++) {
      game = tick(game, 1000, cfg);
      if (game.run) game = { ...game, run: { ...game.run, unrest: 100 } };
    }
    expect(game.phase).toBe('runEnded');
    expect(game.pending.runEnd?.reason).toBe('revolution');
  });

  it('wer die Unruhe in der Frist senkt, wird nicht gestürzt', () => {
    let game = playingGame({ path: 'autocratic', unrest: 100, approval: 0, loyalty: 90, stage: 6 });
    game = tick(game, 1000, cfg);
    game = { ...game, run: { ...runOf(game), unrest: 60 } };
    for (let i = 0; i < 120; i++) game = tick(game, 1000, cfg);
    expect(game.phase).toBe('playing');
    expect(runOf(game).criticalSince).toBeNull();
  });

  it('Demokraten treten bei 100 % zurück: zwei Stufen zurück, Spiel geht weiter', () => {
    const game = playingGame({ stage: 5, unrest: 100, criticalSince: 0, playMs: 120_000 });
    const r = tickPolitics(game, 100, cfg);
    expect(r.signal).toBe('resigned');
    expect(runOf(r.game).stage).toBe(3);
    expect(runOf(r.game).unrest).toBe(cfg.balancing.politics.resignationUnrest);
    expect(r.game.phase).toBe('playing');
  });

  it('Revolution beendet den Durchlauf über tick', () => {
    const game = playingGame({
      path: 'autocratic',
      stage: 6,
      unrest: 100,
      criticalSince: 0,
      playMs: 120_000,
      loyalty: 90,
    });
    const next = tick(game, 500, cfg);
    expect(next.phase).toBe('runEnded');
    expect(next.pending.runEnd?.reason).toBe('revolution');
    expect(next.run).toBeNull();
  });

  it('Erfolg: bei 99 % Unruhe überlebt', () => {
    let game = playingGame({ unrest: 99.5, criticalSince: 0, playMs: 1000 });
    game = tickPolitics(game, 100, cfg).game;
    expect(runOf(game).stats.atBrink).toBe(true);
    game = { ...game, run: { ...runOf(game), unrest: 50 } };
    game = tickPolitics(game, 100, cfg).game;
    expect(runOf(game).stats.survivedUnrest).toBe(true);
  });
});

describe('Putsch und Säuberung', () => {
  it('kein Risiko für Demokraten, bei hoher Loyalität oder niedriger Unruhe', () => {
    expect(coupRiskPerMinute(playingGame({ stage: 6, loyalty: 0, unrest: 99 }), cfg).risk).toBe(0);
    const auto = { path: 'autocratic' as const, stage: 6 };
    expect(coupRiskPerMinute(playingGame({ ...auto, loyalty: 60, unrest: 99 }), cfg).risk).toBe(0);
    expect(coupRiskPerMinute(playingGame({ ...auto, loyalty: 5, unrest: 30 }), cfg).risk).toBe(0);
    expect(
      coupRiskPerMinute(playingGame({ ...auto, loyalty: 5, unrest: 95 }), cfg).risk,
    ).toBeGreaterThan(0);
  });

  it('Militär-Allianz senkt das Putschrisiko', () => {
    const base = { path: 'autocratic' as const, stage: 7, loyalty: 5, unrest: 95 };
    const plain = coupRiskPerMinute(playingGame(base), cfg).risk;
    const protectedRisk = coupRiskPerMinute(
      playingGame({ ...base, groups: { military: 90 } }),
      cfg,
    ).risk;
    expect(protectedRisk).toBeCloseTo(plain * 0.2);
  });

  it('Zentralia: Säuberung schon bei niedriger Loyalität ohne Unruhe', () => {
    const r = coupRiskPerMinute(
      playingGame({ stage: 4, loyalty: 5, unrest: 0 }, { stateId: 'zentralia' }),
      cfg,
    );
    expect(r.kind).toBe('purge');
    expect(r.risk).toBeGreaterThan(0);
  });

  it('bei hohem Risiko kommt es irgendwann zum Putsch (reproduzierbar)', () => {
    let game = playingGame({ path: 'autocratic', stage: 6, loyalty: 0, unrest: 99 });
    let signal = null;
    for (let i = 0; i < 600 && signal === null; i++) {
      const r = tickPolitics(
        { ...game, run: { ...runOf(game), unrest: 99, loyalty: 0 } },
        1000,
        cfg,
      );
      signal = r.signal;
      game = r.game;
    }
    expect(signal).toBe('coup');
  });
});

describe('Verfall skaliert mit GAME_SPEED', () => {
  // Bug: Allianzen verfielen pro echter Minute, das Umwerben wurde aber bei langsamem
  // Tempo 20-mal teurer. Bei GAME_SPEED 0,05 fraß das Halten der Allianzen allen Einfluss.
  it('Allianzen verfallen bei GAME_SPEED 0,05 zwanzigmal langsamer', () => {
    const slow = withGameSpeed(cfg, 0.05);
    const game = playingGame({ stage: 3, groups: { unions: 80 } });
    const fast = runOf(tickPolitics(game, 10 * MIN, cfg).game).groups.unions ?? 0;
    const slowed = runOf(tickPolitics(game, 10 * MIN, slow).game).groups.unions ?? 0;
    expect(80 - fast).toBeCloseTo(10);
    expect(80 - slowed).toBeCloseTo(0.5);
  });
});
