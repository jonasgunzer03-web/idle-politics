import { cfg, playingGame, runOf, testCharacter } from '../test/fixtures';
import { runForElection } from './career';
import { zeroResources } from './economy';
import {
  beginNewRunSetup,
  buyLegacy,
  canBuyLegacy,
  checkAchievements,
  completeEmigration,
  continueRuling,
  createNewGame,
  emigrationCost,
  endRun,
  legacyPointsFor,
  pendingHints,
  retire,
  rulingYears,
  startEmigration,
  startRun,
  unlockedAccessories,
  updateCharacter,
} from './game';
import { tickPolitics } from './politics';
import { nextRandom } from './rng';
import { findLocation } from './unlocks';

const rich = { ...zeroResources(), money: 1e9, influence: 1e9, followers: 1e9, diplomacy: 0 };

describe('Start eines Durchlaufs', () => {
  it('Arbeiter auf Stufe 1, im Werk, Pfad nach Staat', () => {
    const game = playingGame();
    expect(game.phase).toBe('playing');
    expect(runOf(game)).toMatchObject({ stage: 1, path: 'democratic', vehicle: 'feet' });
    expect(runOf(playingGame({}, { stateId: 'zentralia' })).path).toBe('autocratic');
    expect(game.meta.runsStarted).toBe(1);
  });

  it('Vermächtnis: Startvorsprung und Startgeld', () => {
    const base = createNewGame(0, 1);
    const withLegacy = { ...base, meta: { ...base.meta, legacy: { headStart: 2, startCapital: 1 } } };
    const run = runOf(startRun(withLegacy, { character: testCharacter, stateId: 'novaria', profession: 'office' }, 0, cfg));
    expect(run.generators.overtime).toBe(10);
    expect(run.resources.money).toBe(500);
  });

  it('ohne Charakter kein Start', () => {
    const game = createNewGame(0, 1);
    expect(startRun(game, { stateId: 'novaria', profession: 'office' }, 0, cfg)).toBe(game);
  });
});

describe('Sturz und Neustart (keine Sackgassen)', () => {
  it('Sturz beendet den Durchlauf mit Vermächtnis-Punkten', () => {
    const game = playingGame({ stage: 6, highestStage: 7, earned: { ...zeroResources(), money: 1e6 } });
    const ended = endRun(game, 'coup', cfg);
    expect(ended.phase).toBe('runEnded');
    expect(ended.run).toBeNull();
    expect(ended.pending.runEnd).toMatchObject({ reason: 'coup', highestStage: 7 });
    const points = legacyPointsFor(runOf(game), false, cfg);
    expect(points).toBe(Math.floor(0.35 * 49 + 6));
    expect(ended.meta.legacyPoints).toBe(points);
    expect(ended.meta.overthrows).toBe(1);
  });

  it('danach Neustart mit freier Staatswahl; Charakter, Vermächtnis, Erfolge bleiben', () => {
    const ended = endRun({ ...playingGame(), meta: { ...playingGame().meta, achievements: ['firstShift'] } }, 'revolution', cfg);
    const setup = beginNewRunSetup(ended);
    expect(setup.phase).toBe('setup');
    const restarted = startRun(setup, { stateId: 'borealis', profession: 'skilled' }, 5, cfg);
    expect(restarted.phase).toBe('playing');
    expect(restarted.character?.name).toBe(testCharacter.name);
    expect(runOf(restarted).stateId).toBe('borealis');
    expect(restarted.meta.achievements).toContain('firstShift');
    expect(restarted.meta.legacyPoints).toBe(ended.meta.legacyPoints);
  });

  it('nach einer Wahlniederlage kann man weiterspielen', () => {
    let seed = 1;
    while (nextRandom(seed).value < 0.5) seed++;
    const game = {
      ...playingGame({
        stage: 2,
        approval: 0,
        resources: { ...rich, followers: 1 },
        world: { posX: findLocation('partyOffice', cfg)?.x ?? 0, target: null, inside: true },
      }),
      rngState: seed,
    };
    const { game: after } = runForElection(game, 0, cfg);
    expect(after.phase).toBe('playing');
    expect(runOf(after).stage).toBe(1);
  });

  it('nach einem Rücktritt kann man weiterspielen', () => {
    const game = playingGame({ stage: 4, unrest: 100, criticalSince: 0, playMs: 100_000 });
    const { game: after, signal } = tickPolitics(game, 100, cfg);
    expect(signal).toBe('resigned');
    expect(after.phase).toBe('playing');
  });
});

describe('Sieg, Ruhestand und Weiterregieren', () => {
  const victory = () => ({ ...playingGame({ stage: 12, highestStage: 12 }), phase: 'victory' as const });

  it('Ruhestand: doppelte Vermächtnis-Punkte, Durchlauf endet', () => {
    const game = victory();
    const retired = retire(game, cfg);
    expect(retired.phase).toBe('runEnded');
    expect(retired.pending.runEnd?.reason).toBe('retired');
    expect(retired.pending.runEnd?.points).toBe(legacyPointsFor(runOf(game), true, cfg));
    expect(retired.meta.retirements).toBe(1);
  });

  it('Weiterregieren: Amtsjahre zählen hoch', () => {
    const ruling = continueRuling(victory());
    expect(ruling.phase).toBe('playing');
    const run = runOf(ruling);
    expect(rulingYears({ ...run, playMs: run.playMs + 5 * 120_000 }, cfg)).toBe(5);
  });
});

describe('Auswandern', () => {
  it('ab Stufe 5, kostet Geld, das restliche Geld bleibt', () => {
    const cost = emigrationCost(playingGame(), cfg);
    const low = playingGame({ stage: 4, resources: rich });
    expect(startEmigration(low, 'novaria', cfg)).toBe(low);
    const game = playingGame({ stage: 7, resources: { ...rich, money: cost + 1000 }, groups: { unions: 90 } });
    const leaving = startEmigration(game, 'novaria', cfg);
    expect(leaving.phase).toBe('emigrating');
    const arrived = completeEmigration(leaving, 'office', 10, cfg);
    const run = runOf(arrived);
    expect(arrived.phase).toBe('playing');
    expect(run).toMatchObject({ stateId: 'novaria', stage: 1, profession: 'office' });
    expect(run.resources.money).toBe(1000);
    expect(run.resources.influence).toBe(0);
    expect(run.groups).toEqual({});
    expect(arrived.meta.emigrations).toBe(1);
    // Die nächste Auswanderung wird teurer
    expect(emigrationCost(arrived, cfg)).toBe(cost * 2);
  });

  it('nicht in den eigenen Staat', () => {
    const game = playingGame({ stage: 7, resources: rich });
    expect(startEmigration(game, 'rhenania', cfg)).toBe(game);
  });
});

describe('Vermächtnis-Baum', () => {
  it('kaufen mit Punkten, Voraussetzungen beachten', () => {
    const base = playingGame();
    const game = { ...base, meta: { ...base.meta, legacyPoints: 20 } };
    expect(canBuyLegacy(game, 'followersBoost', cfg)).toBe(false);
    const a = buyLegacy(game, 'influenceBoost', cfg);
    expect(a.meta.legacy.influenceBoost).toBe(1);
    expect(a.meta.legacyPoints).toBe(18);
    expect(canBuyLegacy(a, 'followersBoost', cfg)).toBe(true);
  });

  it('nicht über die Höchststufe hinaus', () => {
    const base = playingGame();
    const game = { ...base, meta: { ...base.meta, legacyPoints: 999, legacy: { swiftFeet: 2 } } };
    expect(buyLegacy(game, 'swiftFeet', cfg)).toBe(game);
  });
});

describe('Erfolge und Accessoires', () => {
  it('Erfolge werden einmal freigeschaltet', () => {
    const game = playingGame({ generators: { overtime: 1 } });
    const { game: a, unlocked } = checkAchievements(game, cfg);
    expect(unlocked).toContain('firstInvestment');
    expect(checkAchievements(a, cfg).unlocked).toEqual([]);
  });

  it('Accessoires nur nach dem passenden Erfolg', () => {
    const game = playingGame();
    expect(unlockedAccessories(game, cfg)).toEqual([]);
    const withPin = { ...game, meta: { ...game.meta, achievements: ['firstElection' as const] } };
    expect(unlockedAccessories(withPin, cfg)).toEqual(['partyPin']);
    const updated = updateCharacter(withPin, { ...testCharacter, accessories: ['partyPin', 'medal'] }, cfg);
    expect(updated.character?.accessories).toEqual(['partyPin']);
  });
});

describe('Hinweise', () => {
  it('bei Freischaltungen, jeweils einmal', () => {
    expect(pendingHints(playingGame({ stage: 1 }), cfg)).toEqual([]);
    expect(pendingHints(playingGame({ stage: 2 }), cfg)).toEqual(['followersUnlocked', 'networkUnlocked']);
    const seen = playingGame({ stage: 2 });
    const marked = { ...seen, flags: { ...seen.flags, hintsSeen: ['followersUnlocked' as const, 'networkUnlocked' as const] } };
    expect(pendingHints(marked, cfg)).toEqual([]);
  });
});
