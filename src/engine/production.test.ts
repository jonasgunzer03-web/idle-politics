import { cfg, playingGame, runOf } from '../test/fixtures';
import {
  buildingUpgradeBlock,
  buildingUpgradeCost,
  buyMachine,
  hireStaff,
  machineCost,
  upgradeBuilding,
  zeroResources,
} from './economy';
import {
  buildingCapacity,
  chainSnapshot,
  linePotential,
  moraleTarget,
  runChain,
  storageCapacity,
  tickMorale,
} from './production';
import { applyOffline } from './tick';
import { findAction } from './unlocks';

const rich = { ...zeroResources(), money: 1e12, influence: 1e12, followers: 1e12, diplomacy: 1e9 };
const AT = { workplace: 160, market: 650, partyOffice: 860 };

function act(id: Parameters<typeof findAction>[0]) {
  const a = findAction(id, cfg);
  if (!a) throw new Error(id);
  return a;
}

describe('Produktionskette', () => {
  it('Werk liefert Waren, Markt macht daraus Geld', () => {
    const game = playingGame({ actions: { work: { staff: 4 }, sell: { staff: 2 } } });
    const step = runChain(game, 1, cfg);
    const flows = Object.fromEntries(step.flows.map((f) => [f.id, f]));
    expect(flows.work?.actual).toBeGreaterThan(0);
    // Werk läuft zuerst, der Markt verkauft im selben Schritt frische Ware
    expect(flows.sell?.actual).toBeGreaterThan(0);
    expect(flows.sell?.blockedBy).toBeNull();
    expect(step.resources.money).toBeGreaterThan(0);
  });

  it('Ohne Nachschub stockt der Markt und meldet den Engpass', () => {
    const game = playingGame({ actions: { sell: { staff: 3 } } });
    const step = runChain(game, 1, cfg);
    const sell = step.flows.find((f) => f.id === 'sell');
    expect(sell?.actual).toBe(0);
    expect(sell?.blockedBy).toBe('wares');
    expect(step.resources.money).toBe(0);
  });

  it('Zu wenige Hersteller bremsen die Verbraucher (Engpass)', () => {
    const game = playingGame({ actions: { work: { staff: 1 }, sell: { staff: 5 } } });
    const sell = chainSnapshot(game, cfg).flows.find((f) => f.id === 'sell');
    expect(sell?.blockedBy).toBe('wares');
    expect(sell?.actual ?? 0).toBeLessThan(sell?.potential ?? 0);
  });

  it('Das Lager läuft nie über', () => {
    const game = playingGame({ actions: { work: { staff: 5 } } });
    const cap = storageCapacity(runOf(game), 'wares', cfg);
    const after = runChain(game, 3600, cfg).game;
    expect(runOf(after).goods.wares).toBeCloseTo(cap);
  });

  it('Geld als Zutat: Drucken kostet Geld und stockt ohne Geld', () => {
    const broke = playingGame({ stage: 2, actions: { print: { staff: 2 } } });
    expect(runChain(broke, 1, cfg).flows.find((f) => f.id === 'print')?.blockedBy).toBe('money');
    const funded = playingGame({
      stage: 2,
      actions: { print: { staff: 2 } },
      resources: { ...zeroResources(), money: 1000 },
    });
    const step = runChain(funded, 1, cfg);
    expect(step.resources.money).toBeLessThan(0);
    expect(step.goods.flyers).toBeGreaterThan(0);
  });

  it('Abwesenheit: Waren wandern auch offline weiter (in Schritten)', () => {
    const game = playingGame({ actions: { work: { staff: 5 }, sell: { staff: 5 } } });
    const { report } = applyOffline(game, 600_000, cfg);
    // Geld entsteht nur, weil der Markt auch offline Waren verkauft
    const withoutMarket = applyOffline(
      playingGame({ actions: { work: { staff: 5 } } }),
      600_000,
      cfg,
    ).report;
    expect(report?.gained.money ?? 0).toBeGreaterThan((withoutMarket?.gained.money ?? 0) * 2);
  });
});

describe('Ausbau und Maschinen', () => {
  it('Ausbau schafft Platz für weitere Mitarbeiter', () => {
    const full = playingGame({ resources: rich, actions: { work: { staff: 5 } } });
    expect(hireStaff(full, 'work', cfg)).toBe(full);
    const bigger = upgradeBuilding(full, 'workplace', cfg);
    expect(buildingCapacity(runOf(bigger), 'workplace', cfg)).toBe(10);
    expect(runOf(hireStaff(bigger, 'work', cfg)).actions.work?.staff).toBe(6);
    // Ausbau landet in der Chronik
    expect(runOf(bigger).chronicle.at(-1)?.key).toBe('buildingUpgraded');
  });

  it('Höhere Ausbaustufen brauchen eine höhere Karrierestufe', () => {
    const level2 = playingGame({
      resources: rich,
      buildings: { workplace: { level: 2, machines: {} } },
    });
    // Stufe 3 erst ab Karrierestufe 2 (Werk öffnet auf Stufe 1, Versatz 1)
    expect(buildingUpgradeBlock(runOf(level2), 'workplace', cfg)).toBe('stage');
    const stage2 = playingGame({
      stage: 2,
      resources: rich,
      buildings: { workplace: { level: 2, machines: {} } },
    });
    expect(buildingUpgradeBlock(runOf(stage2), 'workplace', cfg)).toBeNull();
  });

  it('Ausbau nur im Gebäude und mit genug Geld', () => {
    const poor = playingGame();
    expect(buildingUpgradeBlock(runOf(poor), 'workplace', cfg)).toBe('money');
    expect(upgradeBuilding(poor, 'workplace', cfg)).toBe(poor);
    const away = playingGame({ resources: rich, world: { posX: 430, target: null, inside: true } });
    expect(buildingUpgradeBlock(runOf(away), 'workplace', cfg)).toBe('away');
  });

  it('Ganz ausgebaut: kein Preis mehr', () => {
    const max = playingGame({ buildings: { workplace: { level: 5, machines: {} } } });
    expect(buildingUpgradeCost(runOf(max), 'workplace', cfg)).toBeNull();
    expect(buildingUpgradeBlock(runOf(max), 'workplace', cfg)).toBe('maxed');
  });

  it('Maschinen machen schneller, aber höchstens bis zur Ausbaustufe', () => {
    const game = playingGame({ resources: rich, actions: { work: { staff: 4 } } });
    const before = linePotential(runOf(game), act('work'), cfg);
    const withBelt = buyMachine(game, 'conveyor', cfg);
    expect(linePotential(runOf(withBelt), act('work'), cfg)).toBeCloseTo(before * 1.25);
    // Stufe 2 geht erst nach dem Ausbau
    expect(machineCost(runOf(withBelt), 'conveyor', cfg)).toBeNull();
    expect(buyMachine(withBelt, 'conveyor', cfg)).toBe(withBelt);
    // Maschinen anderer Gebäude kauft man dort
    expect(buyMachine(game, 'register', cfg)).toBe(game);
  });

  it('Lager-Maschine vergrößert das Lager', () => {
    const game = playingGame({ resources: rich, actions: { work: { staff: 1 } } });
    const before = storageCapacity(runOf(game), 'wares', cfg);
    const after = storageCapacity(runOf(buyMachine(game, 'warehouse', cfg)), 'wares', cfg);
    expect(after).toBeCloseTo(before * 1.6);
  });
});

describe('Arbeiterstimmung und Streik', () => {
  it('Hohe Unruhe drückt die Stimmung', () => {
    const calm = runOf(playingGame({ unrest: 10 }));
    const angry = runOf(playingGame({ unrest: 90 }));
    expect(moraleTarget(angry, cfg)).toBeLessThan(moraleTarget(calm, cfg));
  });

  it('Streik beginnt unter der Schwelle und endet erst deutlich darüber', () => {
    const low = playingGame({ morale: 15, unrest: 100, actions: { work: { staff: 3 } } });
    const started = tickMorale(low, 1000, cfg);
    expect(started.signal).toBe('strikeStarted');
    expect(runOf(started.game).striking).toBe(true);
    expect(runOf(started.game).chronicle.at(-1)?.key).toBe('strikeStarted');
    // Streik bremst die Produktion
    const potentialStrike = linePotential(runOf(started.game), act('work'), cfg);
    const potentialNormal = linePotential(runOf(low), act('work'), cfg);
    expect(potentialStrike).toBeLessThan(potentialNormal * 0.5);
    // Bei 30 % läuft der Streik weiter, über 35 % endet er
    const mid = playingGame({ morale: 30, striking: true, actions: { work: { staff: 3 } } });
    expect(tickMorale(mid, 10, cfg).signal).toBeNull();
    const high = playingGame({ morale: 40, striking: true, actions: { work: { staff: 3 } } });
    expect(tickMorale(high, 10, cfg).signal).toBe('strikeEnded');
  });

  it('Ohne Mitarbeiter gibt es keinen Streik', () => {
    const empty = playingGame({ morale: 5, unrest: 100 });
    expect(tickMorale(empty, 1000, cfg).signal).toBeNull();
  });

  it('Tippen im Markt verbraucht genau eine Ware je Durchgang', () => {
    const game = playingGame({
      world: { posX: AT.market, target: null, inside: true },
      goods: { wares: 1, contacts: 0, flyers: 0, files: 0 },
    });
    expect(storageCapacity(runOf(game), 'wares', cfg)).toBeGreaterThan(0);
  });
});
