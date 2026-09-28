import { withGameSpeed } from '../config';
import { cfg, playingGame } from '../test/fixtures';
import {
  applyTap,
  buyGenerator,
  canAfford,
  generatorCost,
  maxAffordable,
  missingFor,
  productionRates,
  resourceMultiplier,
  zeroResources,
} from './economy';
import { findGenerator } from './unlocks';

function def(id: string) {
  const d = findGenerator(id, cfg);
  if (!d) throw new Error(id);
  return d;
}

describe('Kostenformel', () => {
  it('erstes Exemplar kostet den Grundpreis', () => {
    expect(generatorCost(def('overtime'), 0, 1, cfg).money).toBeCloseTo(10);
  });

  it('steigt pro Kauf um den Faktor 1,15', () => {
    expect(generatorCost(def('overtime'), 1, 1, cfg).money).toBeCloseTo(11.5);
    expect(generatorCost(def('overtime'), 5, 1, cfg).money).toBeCloseTo(10 * 1.15 ** 5);
  });

  it('Mehrfachkauf entspricht der Summe der Einzelkäufe', () => {
    let sum = 0;
    for (let i = 3; i < 13; i++) sum += generatorCost(def('overtime'), i, 1, cfg).money ?? 0;
    expect(generatorCost(def('overtime'), 3, 10, cfg).money).toBeCloseTo(sum, 6);
  });

  it('kennt Kosten in mehreren Ressourcen', () => {
    const cost = generatorCost(def('clubWork'), 0, 1, cfg);
    expect(cost.money).toBeCloseTo(300);
    expect(cost.influence).toBeCloseTo(10);
    expect(cost.followers).toBeUndefined();
  });

  it('GAME_SPEED 0,05 macht alles zwanzigmal teurer', () => {
    const slow = withGameSpeed(cfg, 0.05);
    expect(generatorCost(def('overtime'), 0, 1, slow).money).toBeCloseTo(200);
  });
});

describe('maxAffordable', () => {
  it('berechnet die größte bezahlbare Menge exakt', () => {
    const res = { ...zeroResources(), money: 1000 };
    const n = maxAffordable(def('overtime'), 0, res, cfg);
    expect(canAfford(res, generatorCost(def('overtime'), 0, n, cfg))).toBe(true);
    expect(canAfford(res, generatorCost(def('overtime'), 0, n + 1, cfg))).toBe(false);
  });

  it('berücksichtigt die knappste Ressource', () => {
    const res = { ...zeroResources(), money: 1e9, influence: 10 };
    expect(maxAffordable(def('clubWork'), 0, res, cfg)).toBe(1);
  });

  it('liefert 0 ohne Mittel', () => {
    expect(maxAffordable(def('overtime'), 0, zeroResources(), cfg)).toBe(0);
  });
});

describe('Erträge', () => {
  it('Multiplikatoren aus Beruf und Staat werden kombiniert', () => {
    const run = playingGame().run;
    if (!run) throw new Error();
    // Facharbeiter 0,7 × Rhenanien 0,9
    expect(resourceMultiplier(run, 'money', cfg)).toBeCloseTo(0.63);
    expect(resourceMultiplier(run, 'influence', cfg)).toBeCloseTo(1.5);
  });

  it('Rate = Anzahl × Grundertrag × Multiplikator', () => {
    const run = playingGame({ generators: { overtime: 10, regularsTable: 2 } }).run;
    if (!run) throw new Error();
    const rates = productionRates(run, cfg);
    expect(rates.money).toBeCloseTo(10 * 0.3 * 0.63);
    expect(rates.influence).toBeCloseTo(2 * 0.1 * 1.5);
    expect(rates.followers).toBe(0);
  });
});

describe('Tippen', () => {
  it('bringt Geld mit Multiplikator und zählt den Tipp', () => {
    const { game, gained, resource } = applyTap(playingGame(), 'work', cfg);
    expect(resource).toBe('money');
    expect(gained).toBeCloseTo(0.63);
    expect(game.run?.resources.money).toBeCloseTo(0.63);
    expect(game.stats.totalTaps).toBe(1);
  });

  it('bewirkt nichts außerhalb des Spiels', () => {
    const setup = { ...playingGame(), phase: 'setup' as const };
    expect(applyTap(setup, 'work', cfg).game).toBe(setup);
  });
});

describe('Kaufen', () => {
  it('zieht die Kosten ab und erhöht die Anzahl', () => {
    const game = playingGame({ resources: { ...zeroResources(), money: 25 } });
    const { game: next, bought } = buyGenerator(game, 'overtime', 1, cfg);
    expect(bought).toBe(1);
    expect(next.run?.generators.overtime).toBe(1);
    expect(next.run?.resources.money).toBeCloseTo(15);
  });

  it('lehnt ab, wenn Mittel fehlen, und ändert nichts', () => {
    const game = playingGame({ resources: { ...zeroResources(), money: 9.99 } });
    const result = buyGenerator(game, 'overtime', 1, cfg);
    expect(result.bought).toBe(0);
    expect(result.game).toBe(game);
  });

  it('schnelles Mehrfachtippen kauft nie mehr als bezahlbar und nie ins Minus', () => {
    let game = playingGame({ resources: { ...zeroResources(), money: 30 } });
    let total = 0;
    for (let i = 0; i < 50; i++) {
      const r = buyGenerator(game, 'overtime', 1, cfg);
      game = r.game;
      total += r.bought;
    }
    // 10 + 11,5 = 21,5; das dritte kostet 13,225
    expect(total).toBe(2);
    expect(game.run?.resources.money).toBeCloseTo(8.5);
    expect(game.run?.resources.money).toBeGreaterThanOrEqual(0);
  });

  it('×10 kauft nur, wenn alle zehn bezahlbar sind', () => {
    const game = playingGame({ resources: { ...zeroResources(), money: 100 } });
    expect(buyGenerator(game, 'overtime', 10, cfg).bought).toBe(0);
    const rich = playingGame({ resources: { ...zeroResources(), money: 1000 } });
    expect(buyGenerator(rich, 'overtime', 10, cfg).bought).toBe(10);
  });

  it('Max kauft alles Bezahlbare, Rest bleibt ≥ 0', () => {
    const game = playingGame({ resources: { ...zeroResources(), money: 1000 } });
    const { game: next, bought } = buyGenerator(game, 'overtime', 'max', cfg);
    expect(bought).toBe(
      maxAffordable(def('overtime'), 0, game.run?.resources ?? zeroResources(), cfg),
    );
    expect(next.run?.resources.money).toBeGreaterThanOrEqual(0);
  });

  it('gesperrte Generatoren lassen sich nicht kaufen', () => {
    const game = playingGame({ resources: { ...zeroResources(), money: 1e9, influence: 1e9 } });
    // Flyer erst ab Stufe 2 (Anhänger)
    expect(buyGenerator(game, 'flyers', 1, cfg).bought).toBe(0);
    const stage2 = playingGame({
      stage: 2,
      resources: { ...zeroResources(), money: 1e9, influence: 1e9 },
    });
    expect(buyGenerator(stage2, 'flyers', 1, cfg).bought).toBe(1);
  });

  it('missingFor nennt nur die fehlenden Beträge', () => {
    const res = { ...zeroResources(), money: 100, influence: 4 };
    expect(missingFor(res, { money: 60, influence: 5 })).toEqual({ influence: 1 });
  });
});
