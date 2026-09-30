import { withGameSpeed } from '../config';
import { cfg, playingGame, runOf } from '../test/fixtures';
import {
  buildProject,
  buyGenerator,
  buyVehicle,
  canAfford,
  generatorCost,
  maxAffordable,
  missingFor,
  performAction,
  hireCost,
  hireStaff,
  productionRates,
  zeroResources,
} from './economy';
import { cycleOutputs, lineSpeedFactor } from './production';
import { resourceMultiplier } from './rules';
import { findAction, findGenerator } from './unlocks';

function gen(id: string) {
  const d = findGenerator(id, cfg);
  if (!d) throw new Error(id);
  return d;
}
function act(id: Parameters<typeof findAction>[0]) {
  const a = findAction(id, cfg);
  if (!a) throw new Error(id);
  return a;
}
const rich = { ...zeroResources(), money: 1e9, influence: 1e9, followers: 1e9, diplomacy: 1e9 };

describe('Kostenformel', () => {
  it('erstes Exemplar kostet den Grundpreis, danach ×1,15 aufgerundet', () => {
    expect(generatorCost(gen('overtime'), 0, 1, cfg).money).toBe(10);
    expect(generatorCost(gen('overtime'), 1, 1, cfg).money).toBe(12);
    expect(generatorCost(gen('overtime'), 5, 1, cfg).money).toBe(Math.ceil(10 * 1.15 ** 5));
  });

  it('Preise sind immer ganze Zahlen', () => {
    for (let owned = 0; owned < 200; owned++) {
      const money = generatorCost(gen('overtime'), owned, 1, cfg).money ?? 0;
      expect(Number.isInteger(money)).toBe(true);
    }
  });

  it('GAME_SPEED 0,05 macht alles zwanzigmal teurer', () => {
    expect(generatorCost(gen('overtime'), 0, 1, withGameSpeed(cfg, 0.05)).money).toBe(200);
  });

  it('maxAffordable ist exakt und berücksichtigt die knappste Währung', () => {
    const res = { ...zeroResources(), money: 1000 };
    const n = maxAffordable(gen('overtime'), 0, res, cfg);
    expect(canAfford(res, generatorCost(gen('overtime'), 0, n, cfg))).toBe(true);
    expect(canAfford(res, generatorCost(gen('overtime'), 0, n + 1, cfg))).toBe(false);
    expect(maxAffordable(gen('clubWork'), 0, { ...res, money: 1e9, influence: 10 }, cfg)).toBe(1);
  });

  it('missingFor nennt nur Fehlbeträge', () => {
    expect(
      missingFor({ ...zeroResources(), money: 100, influence: 4 }, { money: 60, influence: 5 }),
    ).toEqual({
      influence: 1,
    });
  });
});

describe('Produktionslinien an Orten', () => {
  it('Arbeiten geht nur im Werk (drinnen)', () => {
    const inside = playingGame();
    const r1 = performAction(inside, 'work', cfg);
    expect(r1.gained.money).toBeGreaterThan(0);
    expect(r1.goods.wares).toBeCloseTo(1);
    const outside = playingGame({ world: { ...runOf(inside).world, inside: false } });
    expect(performAction(outside, 'work', cfg).gained).toEqual({});
    // Netzwerken geht im Werk nicht (das ist in der Kneipe)
    expect(performAction(inside, 'network', cfg).gained).toEqual({});
  });

  it('Ertrag wächst mit der Stufe', () => {
    const base = cycleOutputs(playingGame(), act('work'), cfg).money ?? 0;
    const stage3 = cycleOutputs(playingGame({ stage: 3 }), act('work'), cfg).money ?? 0;
    expect(stage3 / base).toBeCloseTo(cfg.balancing.tapStageGrowth ** 2);
  });

  it('Facharbeiter in Rhenanien: 0,5 € × 0,7 × 0,9 Lohn pro Schicht', () => {
    expect(cycleOutputs(playingGame(), act('work'), cfg).money).toBeCloseTo(0.315);
  });

  it('Verkaufen braucht Waren, sonst passiert nichts', () => {
    const atMarket = playingGame({ world: { posX: 650, target: null, inside: true } });
    const empty = performAction(atMarket, 'sell', cfg);
    expect(empty.game).toBe(atMarket);
    expect(empty.blockedBy).toBe('wares');
    const stocked = playingGame({
      world: { posX: 650, target: null, inside: true },
      goods: { wares: 3, contacts: 0, flyers: 0, files: 0 },
    });
    const sold = performAction(stocked, 'sell', cfg);
    expect(runOf(sold.game).goods.wares).toBeCloseTo(2);
    expect(sold.gained.money).toBeGreaterThan(0);
  });

  it('Mitarbeiter erzeugen automatische Erträge', () => {
    const game = playingGame({ actions: { work: { staff: 4 } } });
    const run = runOf(game);
    // 4 Mitarbeiter × 0,5 Durchgänge/s × Lohn × Tempo (Belegschaft) × Stimmung (60 % → 1,04)
    const speed = lineSpeedFactor(run, act('work'), cfg);
    const wage = cycleOutputs(game, act('work'), cfg).money ?? 0;
    expect(productionRates(game, cfg).money).toBeCloseTo(4 * 0.5 * wage * speed * 1.04);
  });

  it('Mitarbeiter stellt man nur im Gebäude ein', () => {
    const inside = playingGame({ resources: rich });
    const hired = hireStaff(inside, 'work', cfg);
    expect(runOf(hired).actions.work?.staff).toBe(1);
    const outside = playingGame({
      resources: rich,
      world: { posX: 160, target: null, inside: false },
    });
    expect(hireStaff(outside, 'work', cfg)).toBe(outside);
  });

  it('Ein volles Gebäude nimmt niemanden mehr auf', () => {
    const full = playingGame({ resources: rich, actions: { work: { staff: 5 } } });
    expect(hireStaff(full, 'work', cfg)).toBe(full);
  });

  it('Mitarbeiter werden teurer', () => {
    const run0 = runOf(playingGame());
    const run5 = runOf(playingGame({ actions: { work: { staff: 5 } } }));
    expect((hireCost(run5, act('work'), cfg).money ?? 0) > (hireCost(run0, act('work'), cfg).money ?? 0)).toBe(
      true,
    );
  });
});

describe('Erträge und Multiplikatoren', () => {
  it('Multiplikatoren aus Beruf und Staat werden kombiniert', () => {
    const game = playingGame();
    expect(resourceMultiplier(game, 'money', cfg)).toBeCloseTo(0.63);
    expect(resourceMultiplier(game, 'influence', cfg)).toBeCloseTo(1.5);
  });

  it('Generator-Rate = Anzahl × Grundertrag × Multiplikator', () => {
    const game = playingGame({ generators: { overtime: 10 } });
    expect(productionRates(game, cfg).money).toBeCloseTo(10 * gen('overtime').baseOutput * 0.63);
  });

  it('staatsspezifische Generatoren gibt es nur im eigenen Staat', () => {
    const rhen = playingGame({ stage: 4, resources: rich });
    expect(buyGenerator(rhen, 'rawMaterials', 1, cfg).bought).toBe(0);
    const bor = playingGame({ stage: 4, resources: rich }, { stateId: 'borealis' });
    expect(buyGenerator(bor, 'rawMaterials', 1, cfg).bought).toBe(1);
  });
});

describe('Kaufen', () => {
  it('schnelles Mehrfachtippen kauft nie mehr als bezahlbar und nie ins Minus', () => {
    let game = playingGame({ resources: { ...zeroResources(), money: 30 } });
    let total = 0;
    for (let i = 0; i < 50; i++) {
      const r = buyGenerator(game, 'overtime', 1, cfg);
      game = r.game;
      total += r.bought;
    }
    expect(total).toBe(2);
    expect(runOf(game).resources.money).toBe(8);
  });

  it('×10 nur, wenn alle zehn bezahlbar sind', () => {
    expect(
      buyGenerator(
        playingGame({ resources: { ...zeroResources(), money: 100 } }),
        'overtime',
        10,
        cfg,
      ).bought,
    ).toBe(0);
    expect(
      buyGenerator(
        playingGame({ resources: { ...zeroResources(), money: 1000 } }),
        'overtime',
        10,
        cfg,
      ).bought,
    ).toBe(10);
  });

  it('gesperrte Generatoren lassen sich nicht kaufen', () => {
    expect(buyGenerator(playingGame({ resources: rich }), 'flyers', 1, cfg).bought).toBe(0);
    expect(buyGenerator(playingGame({ stage: 2, resources: rich }), 'flyers', 1, cfg).bought).toBe(
      1,
    );
  });

  it('Fahrzeuge nur in Reihenfolge und ab ihrer Stufe', () => {
    const game = playingGame({ resources: rich });
    expect(buyVehicle(game, 'moped', cfg)).toBe(game);
    const bike = buyVehicle(game, 'bicycle', cfg);
    expect(runOf(bike).vehicle).toBe('bicycle');
    expect(buyVehicle(bike, 'moped', cfg)).toBe(bike); // Moped erst ab Stufe 3
    expect(
      runOf(buyVehicle({ ...bike, run: { ...runOf(bike), stage: 3 } }, 'moped', cfg)).vehicle,
    ).toBe('moped');
  });

  it('Regionalprojekte erst ab Stufe 8, danach bis zur Höchststufe', () => {
    expect(
      buildProject(playingGame({ resources: rich, stage: 7 }), 'port', cfg).run?.projects.port,
    ).toBeUndefined();
    let game = playingGame({ resources: rich, stage: 8 });
    for (let i = 0; i < 10; i++) game = buildProject(game, 'port', cfg);
    expect(runOf(game).projects.port).toBe(5);
    expect(productionRates(game, cfg).money).toBeGreaterThan(0);
  });
});
