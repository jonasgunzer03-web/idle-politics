import { cfg, playingGame, runOf } from '../test/fixtures';
import { comboAfterTap, comboValue, NO_COMBO } from './combo';
import { performAction } from './economy';

describe('Tipp-Kombo', () => {
  const c = cfg.balancing.tapCombo;

  it('steigt mit jedem Tipp bis zum Deckel', () => {
    let combo = NO_COMBO;
    for (let i = 0; i < 100; i++) combo = comboAfterTap(combo, 1000 + i * 100, cfg);
    expect(comboValue(combo, combo.at, cfg)).toBe(c.max);
  });

  it('bleibt kurz stehen und sinkt dann auf ×1 zurück', () => {
    let combo = NO_COMBO;
    for (let i = 0; i < 10; i++) combo = comboAfterTap(combo, 1000 + i * 100, cfg);
    const peak = comboValue(combo, combo.at, cfg);
    expect(peak).toBeCloseTo(1 + 10 * c.perTap);
    expect(comboValue(combo, combo.at + c.holdSeconds * 1000, cfg)).toBeCloseTo(peak);
    expect(comboValue(combo, combo.at + 60_000, cfg)).toBe(1);
  });

  it('vervielfacht nur die Währungen eines Tipps, gedeckelt', () => {
    const game = playingGame();
    const normal = performAction(game, 'work', cfg);
    const boosted = performAction(game, 'work', cfg, 2);
    expect(boosted.gained.money).toBeCloseTo((normal.gained.money ?? 0) * 2);
    expect(boosted.goods.wares).toBe(normal.goods.wares);
    const capped = performAction(game, 'work', cfg, 99);
    expect(capped.gained.money).toBeCloseTo((normal.gained.money ?? 0) * c.max);
    expect(runOf(performAction(game, 'work', cfg, -5).game).resources.money).toBeCloseTo(
      runOf(normal.game).resources.money,
    );
  });
});
