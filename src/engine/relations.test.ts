import { cfg, playingGame, runOf } from '../test/fixtures';
import { investCost, investInGroup } from './alliances';
import { autocracyAction, isAutocracyAvailable } from './autocracy';
import { advancementCost } from './career';
import { zeroResources } from './economy';
import { foreignAction, foreignActionBlock } from './foreign';
import { groupsFor, relation, resourceMultiplier } from './rules';

const rich = { ...zeroResources(), money: 1e10, influence: 1e10, followers: 1e10, diplomacy: 1e6 };

describe('Allianzen', () => {
  it('Gruppen erscheinen nach Stufe, Staat und Pfad', () => {
    expect(groupsFor(runOf(playingGame({ stage: 1 })), cfg)).toHaveLength(0);
    const rhen = groupsFor(runOf(playingGame({ stage: 7 })), cfg).map((g) => g.id);
    expect(rhen).toContain('civilSociety');
    expect(rhen).not.toContain('security');
    expect(rhen).not.toContain('oligarchs');
    const bor = groupsFor(runOf(playingGame({ stage: 7 }, { stateId: 'borealis' })), cfg).map((g) => g.id);
    expect(bor).toContain('oligarchs');
    expect(bor).toContain('security');
    expect(bor).not.toContain('civilSociety');
  });

  it('Umwerben erhöht die Loyalität und verärgert Gegenspieler', () => {
    const game = playingGame({ stage: 3, resources: rich });
    const next = runOf(investInGroup(game, 'unions', cfg));
    expect(next.groups.unions).toBe(35);
    expect(next.groups.business).toBe(21);
  });

  it('Koalitionen sind in Rhenanien günstiger', () => {
    const rhen = runOf(playingGame({ stage: 3 }));
    const nov = runOf(playingGame({ stage: 3 }, { stateId: 'novaria' }));
    const rhenCost = (investCost(rhen, 'unions', cfg).influence ?? 0) / 1.2;
    const novCost = investCost(nov, 'unions', cfg).influence ?? 0;
    expect(rhenCost / novCost).toBeCloseTo(0.75, 1);
  });

  it('Bonus ab 50 % und 80 % Loyalität', () => {
    const none = resourceMultiplier(playingGame({ stage: 3, groups: { business: 30 } }), 'money', cfg);
    const t1 = resourceMultiplier(playingGame({ stage: 3, groups: { business: 55 } }), 'money', cfg);
    const t2 = resourceMultiplier(playingGame({ stage: 3, groups: { business: 85 } }), 'money', cfg);
    expect(t1 / none).toBeCloseTo(1.1);
    expect(t2 / none).toBeCloseTo(1.25);
  });

  it('ohne Mittel kein Umwerben', () => {
    const game = playingGame({ stage: 3 });
    expect(investInGroup(game, 'unions', cfg)).toBe(game);
  });
});

describe('Außenpolitik', () => {
  it('erst ab Stufe 8', () => {
    expect(foreignActionBlock(playingGame({ stage: 7, resources: rich }), 'novaria', 'stateVisit', cfg)).toBe('locked');
    expect(foreignActionBlock(playingGame({ stage: 8, resources: rich }), 'novaria', 'stateVisit', cfg)).toBeNull();
  });

  it('Staatsbesuch verbessert die Beziehung und kostet diplomatisches Kapital', () => {
    const game = playingGame({ stage: 8, resources: rich });
    const next = runOf(foreignAction(game, 'borealis', 'stateVisit', cfg));
    expect(relation(next, 'borealis', cfg)).toBe(-5 + 15);
    expect(next.resources.diplomacy).toBe(rich.diplomacy - 20);
    expect(foreignActionBlock({ ...game, run: next }, 'borealis', 'stateVisit', cfg)).toBe('cooldown');
  });

  it('Handelsabkommen braucht gute Beziehungen und bringt dauerhaft mehr Geld', () => {
    const game = playingGame({ stage: 8, resources: rich });
    expect(foreignActionBlock(game, 'borealis', 'tradeAgreement', cfg)).toBe('relation');
    const before = resourceMultiplier(game, 'money', cfg);
    const next = foreignAction(game, 'novaria', 'tradeAgreement', cfg);
    expect(runOf(next).treaties.novaria?.trade).toBe(true);
    expect(resourceMultiplier(next, 'money', cfg) / before).toBeCloseTo(1.06);
    expect(foreignActionBlock(next, 'novaria', 'tradeAgreement', cfg)).toBe('already');
  });

  it('Sanktionen: Zustimmung im Inland, Abkommen enden', () => {
    const game = playingGame({ stage: 8, resources: rich, treaties: { novaria: { trade: true, alliance: true } } });
    const next = runOf(foreignAction(game, 'novaria', 'sanctions', cfg));
    expect(next.treaties.novaria).toEqual({ trade: false, alliance: false });
    expect(next.approval).toBe(55);
    expect(relation(next, 'novaria', cfg)).toBe(5);
  });

  it('Manöver nur autokratisch, stärkt das Militär und provoziert eine Krise', () => {
    const dem = playingGame({ stage: 8, resources: rich });
    expect(foreignActionBlock(dem, 'borealis', 'maneuver', cfg)).toBe('autocraticOnly');
    const auto = playingGame({ stage: 8, resources: rich, path: 'autocratic' });
    const next = runOf(foreignAction(auto, 'borealis', 'maneuver', cfg));
    expect(next.groups.military).toBe(35);
    expect(next.events.crisisAt).not.toBeNull();
  });

  it('sich selbst gegenüber gibt es keine Außenpolitik', () => {
    expect(foreignActionBlock(playingGame({ stage: 8, resources: rich }), 'rhenania', 'stateVisit', cfg)).toBe('locked');
  });
});

describe('Autokratische Aktionen', () => {
  const auto = { path: 'autocratic' as const, stage: 6, resources: rich };

  it('nur auf dem autokratischen Pfad mit freigeschalteter Loyalität', () => {
    expect(isAutocracyAvailable(runOf(playingGame({ stage: 6 })), cfg)).toBe(false);
    expect(isAutocracyAvailable(runOf(playingGame(auto)), cfg)).toBe(true);
  });

  it('Repression senkt die Unruhe sofort, kostet Zustimmung', () => {
    const game = playingGame({ ...auto, unrest: 70, approval: 50 });
    const next = runOf(autocracyAction(game, 'repression', cfg));
    expect(next.unrest).toBe(50);
    expect(next.approval).toBe(42);
  });

  it('alle anderen Aktionen erhöhen die Unruhe', () => {
    for (const id of ['pressControl', 'harassOpposition', 'fixElection', 'emergency', 'buyLoyalty'] as const) {
      const next = runOf(autocracyAction(playingGame({ ...auto, unrest: 20 }), id, cfg));
      expect(next.unrest).toBeGreaterThan(20);
    }
  });

  it('Wartezeit verhindert Mehrfachnutzung', () => {
    const once = autocracyAction(playingGame({ ...auto }), 'buyLoyalty', cfg);
    expect(autocracyAction(once, 'buyLoyalty', cfg)).toBe(once);
  });

  it('Wahlergebnis korrigieren verbilligt das nächste „Macht ausbauen“', () => {
    const game = playingGame({ ...auto });
    const before = advancementCost(game, cfg).money ?? 0;
    const after = advancementCost(autocracyAction(game, 'fixElection', cfg), cfg).money ?? 0;
    expect(after / before).toBeCloseTo(0.6, 1);
  });

  it('Borealis: Loyalität günstiger zu kaufen', () => {
    const rhen = playingGame({ ...auto, resources: { ...rich } });
    const bor = playingGame({ ...auto, resources: { ...rich } }, { stateId: 'borealis' });
    const spentRhen = rich.money - runOf(autocracyAction(rhen, 'buyLoyalty', cfg)).resources.money;
    const spentBor = rich.money - runOf(autocracyAction(bor, 'buyLoyalty', cfg)).resources.money;
    expect(spentBor / spentRhen).toBeCloseTo((0.6 * 0.9) / 1.2, 1);
  });
});
