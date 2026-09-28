import { cfg, playingGame, runOf } from '../test/fixtures';
import {
  campaignCost,
  canTurnAutocratic,
  careerStatus,
  electionChance,
  finishCeremony,
  isElectionStage,
  promote,
  runForElection,
  turnAutocratic,
} from './career';
import { zeroResources } from './economy';
import { findLocation } from './unlocks';
import { nextRequirement } from './rules';
import { nextRandom } from './rng';

/** Seed, dessen erste Zufallszahl über `min` liegt (für sichere Niederlagen). */
function seedAbove(min: number): number {
  for (let seed = 1; seed < 1000; seed++) if (nextRandom(seed).value > min) return seed;
  throw new Error('kein Seed');
}
import type { RunState } from './schema';

const rich = { ...zeroResources(), money: 1e10, influence: 1e10, followers: 1e10, diplomacy: 0 };
const at = (id: Parameters<typeof findLocation>[0], inside = true): RunState['world'] => ({
  posX: findLocation(id, cfg)?.x ?? 0,
  target: null,
  inside,
});

describe('Anforderungen', () => {
  it('Rhenanien ×1,2, autokratischer Pfad ×0,7 ohne Anhänger, dafür Loyalität', () => {
    const base = cfg.stageRequirements[4];
    const rhen = nextRequirement(runOf(playingGame({ stage: 5 })), cfg);
    expect(rhen.money).toBe(Math.ceil((base?.money ?? 0) * 1.2));
    const auto = nextRequirement(runOf(playingGame({ stage: 5, path: 'autocratic' })), cfg);
    expect(auto.money).toBe(Math.ceil((base?.money ?? 0) * 1.2 * 0.7));
    expect(auto.followers).toBe(0);
    expect(auto.loyalty).toBe(base?.loyalty);
  });

  it('Wahl-Stufen laut Leiter, keine Wahlen auf dem autokratischen Pfad', () => {
    expect(isElectionStage(runOf(playingGame({ stage: 1 })), cfg)).toBe(true); // → Betriebsrat (W)
    expect(isElectionStage(runOf(playingGame({ stage: 6 })), cfg)).toBe(false); // → Landesminister
    expect(isElectionStage(runOf(playingGame({ stage: 1, path: 'autocratic' })), cfg)).toBe(false);
    expect(isElectionStage(runOf(playingGame({ stage: 12 })), cfg)).toBe(false);
  });
});

describe('Wahlen', () => {
  it('Siegchance liegt immer zwischen 5 und 95 %', () => {
    const low = playingGame({ stage: 2, approval: 0, resources: zeroResources() });
    const high = playingGame({ stage: 2, approval: 100, resources: rich });
    expect(electionChance(low, 0, cfg)).toBe(5);
    expect(electionChance(high, 3, cfg)).toBe(95);
  });

  it('Wahlkampfbudget erhöht die Chance und kostet Geld (Novaria ×1,5)', () => {
    const game = playingGame({ stage: 3, resources: { ...zeroResources(), followers: 400 } });
    expect(electionChance(game, 2, cfg)).toBeGreaterThan(electionChance(game, 0, cfg));
    const nov = playingGame({ stage: 3 }, { stateId: 'novaria' });
    const rhen = playingGame({ stage: 3 });
    const novReq = nextRequirement(runOf(nov), cfg).money;
    const rhenReq = nextRequirement(runOf(rhen), cfg).money;
    expect(campaignCost(nov, 1, cfg) / novReq).toBeCloseTo((campaignCost(rhen, 1, cfg) / rhenReq) * 1.5, 2);
  });

  it('Kandidieren nur im Parteibüro (bzw. am jeweiligen Wahlort)', () => {
    const inWerk = playingGame({ resources: rich });
    expect(runForElection(inWerk, 0, cfg).outcome).toBeNull();
    const inOffice = playingGame({ resources: rich, world: at('partyOffice') });
    expect(runForElection(inOffice, 0, cfg).outcome).not.toBeNull();
  });

  it('Sieg: Stufe + 1, Zeremonie, Kosten bezahlt', () => {
    const game = playingGame({ resources: rich, approval: 100, world: at('partyOffice') });
    const { game: next, outcome } = runForElection(game, 3, cfg);
    expect(outcome?.won).toBe(true);
    expect(next.phase).toBe('ceremony');
    expect(next.pending.ceremony?.stage).toBe(2);
    expect(runOf(next).stage).toBe(2);
    expect(runOf(next).resources.money).toBeLessThan(rich.money);
  });

  it('Niederlage: zwei Stufen zurück (mindestens 1), Anhänger bleiben, Kosten weg', () => {
    // Chance 5 %: mit einem Seed, dessen Zufallszahl über 0,5 liegt, verliert man sicher
    const game = playingGame({
      stage: 3,
      approval: 0,
      resources: { ...zeroResources(), money: 1e6, influence: 1e6, followers: 1 },
      world: at('partyOffice'),
    });
    const { game: next, outcome } = runForElection({ ...game, rngState: seedAbove(0.5) }, 0, cfg);
    expect(outcome?.won).toBe(false);
    expect(runOf(next).stage).toBe(1);
    expect(next.phase).toBe('playing');
    expect(runOf(next).resources.followers).toBe(1);
    expect(runOf(next).resources.money).toBeLessThan(1e6);
    expect(runOf(next).stats.electionsLost).toBe(1);
  });

  it('ohne genug Geld keine Kandidatur', () => {
    const game = playingGame({ world: at('partyOffice') });
    expect(runForElection(game, 0, cfg).game).toBe(game);
  });
});

describe('Ernennung und Macht ausbauen', () => {
  it('Stufen ohne Wahl: Aufstieg, wenn die Kosten bezahlbar sind', () => {
    const game = playingGame({ stage: 6, resources: rich, world: at('townHall') });
    const next = promote(game, cfg);
    expect(runOf(next).stage).toBe(7);
    expect(next.phase).toBe('ceremony');
  });

  it('Wahl-Stufen lassen sich nicht einfach übernehmen', () => {
    const game = playingGame({ stage: 2, resources: rich, world: at('partyOffice') });
    expect(promote(game, cfg)).toBe(game);
  });

  it('Macht ausbauen kostet Loyalität und erhöht die Unruhe', () => {
    const game = playingGame(
      { stage: 5, loyalty: 80, unrest: 10, resources: rich, world: at('townHall') },
      { stateId: 'borealis' },
    );
    const next = promote(game, cfg);
    expect(runOf(next).stage).toBe(6);
    expect(runOf(next).loyalty).toBe(70);
    expect(runOf(next).unrest).toBe(20);
  });

  it('zu wenig Loyalität verhindert den Aufstieg', () => {
    const game = playingGame(
      { stage: 5, loyalty: 10, resources: rich, world: at('townHall') },
      { stateId: 'borealis' },
    );
    expect(careerStatus(game, cfg)?.loyaltyOk).toBe(false);
    expect(promote(game, cfg)).toBe(game);
  });
});

describe('Zeremonie und Sieg', () => {
  it('nach der Zeremonie geht das Spiel weiter und die Stufe gilt als gesehen', () => {
    const game = { ...playingGame({ stage: 4 }), phase: 'ceremony' as const, pending: { ceremony: { stage: 4 }, runEnd: null, emigration: null } };
    const next = finishCeremony(game);
    expect(next.phase).toBe('playing');
    expect(next.meta.ceremoniesSeen).toContain(4);
  });

  it('an der Spitze folgt der Siegesbildschirm', () => {
    const game = { ...playingGame({ stage: 12 }), phase: 'ceremony' as const };
    expect(finishCeremony(game).phase).toBe('victory');
  });
});

describe('Autoritärer Kurs', () => {
  it('erst ab Stufe 5, nur in Demokratien, unumkehrbar', () => {
    expect(canTurnAutocratic(playingGame({ stage: 4 }), cfg)).toBe(false);
    expect(canTurnAutocratic(playingGame({ stage: 5 }, { stateId: 'borealis' }), cfg)).toBe(false);
    const game = playingGame({ stage: 5, unrest: 10 });
    const next = turnAutocratic(game, cfg);
    expect(runOf(next).path).toBe('autocratic');
    expect(runOf(next).unrest).toBe(25);
    expect(runOf(next).groups.civilSociety).toBeLessThan(25);
    expect(turnAutocratic(next, cfg)).toBe(next);
  });
});
