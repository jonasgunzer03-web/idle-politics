import { cfg, playingGame, runOf } from '../test/fixtures';
import { zeroResources } from './economy';
import {
  canPlayMinigame,
  minigameHelpers,
  minigameOffers,
  minigameSaleValue,
  minigameSell,
} from './minigame';
import { cycleOutputs } from './production';
import { findAction } from './unlocks';

const rich = { ...zeroResources(), money: 1e12, influence: 1e12, followers: 1e12, diplomacy: 1e9 };

describe('Minispiel: Verkäufe', () => {
  it('ein Verkauf ist ein Vielfaches eines Durchgangs plus laufender Ertrag', () => {
    const game = playingGame();
    const work = findAction('work', cfg);
    if (!work) throw new Error('work');
    const perCycle = cycleOutputs(game, work, cfg).money ?? 0;
    const value = minigameSaleValue(game, 'workplace', cfg);
    // Ohne Mitarbeiter und Beteiligungen gibt es keinen laufenden Ertrag
    expect(value.money).toBeCloseTo(perCycle * cfg.minigames.saleCycles);
    expect(value.influence).toBeUndefined();
  });

  it('wächst mit dem laufenden Ertrag', () => {
    const idle = playingGame();
    const busy = playingGame({ actions: { work: { staff: 6 } } });
    expect(minigameSaleValue(busy, 'workplace', cfg).money ?? 0).toBeGreaterThan(
      minigameSaleValue(idle, 'workplace', cfg).money ?? 0,
    );
  });

  it('schreibt Geldbündel gut und zählt die Verkäufe', () => {
    const game = playingGame();
    const result = minigameSell(game, 'workplace', 3, cfg);
    const unit = minigameSaleValue(game, 'workplace', cfg).money ?? 0;
    const run = runOf(result.game);
    expect(result.gained.money).toBeCloseTo(unit * 3);
    expect(run.resources.money).toBeCloseTo(runOf(game).resources.money + unit * 3);
    expect(run.stats.minigameSales).toBe(3);
  });

  it('nur im passenden Gebäude und nur ganze, gedeckelte Mengen', () => {
    const game = playingGame();
    expect(minigameSell(game, 'pub', 2, cfg).game).toBe(game);
    expect(minigameSell(game, 'workplace', 0, cfg).game).toBe(game);
    expect(minigameSell(game, 'workplace', -4, cfg).game).toBe(game);
    const huge = minigameSell(game, 'workplace', 1e9, cfg);
    expect(runOf(huge.game).stats.minigameSales).toBe(cfg.minigames.cashPileMax);
  });

  it('darf nur drinnen gestartet werden', () => {
    const inside = playingGame();
    expect(canPlayMinigame(inside, 'workplace', cfg)).toBe(true);
    expect(canPlayMinigame(inside, 'market', cfg)).toBe(false);
    const run = runOf(inside);
    const outside = playingGame({ world: { ...run.world, inside: false } });
    expect(canPlayMinigame(outside, 'workplace', cfg)).toBe(false);
  });
});

describe('Minispiel: Ausbau-Felder', () => {
  it('bietet Mitarbeiter, Ausbau und Maschine mit Preisen an', () => {
    const game = playingGame({ resources: rich });
    const offers = minigameOffers(runOf(game), 'workplace', cfg);
    expect(offers.map((o) => o.kind)).toEqual(['hire', 'upgrade', 'machine']);
    const hire = offers[0];
    expect(hire?.target).toBe('work');
    expect(hire?.affordable).toBe(true);
    expect(offers[2]?.cost).not.toBeNull();
  });

  it('ohne Geld nicht bezahlbar, bei vollem Gebäude kein Mitarbeiter', () => {
    const poor = minigameOffers(runOf(playingGame()), 'workplace', cfg);
    expect(poor[0]?.affordable).toBe(false);
    const full = playingGame({ resources: rich, actions: { work: { staff: 5 } } });
    expect(minigameOffers(runOf(full), 'workplace', cfg)[0]?.cost).toBeNull();
  });

  it('Helfer: so viele wie Mitarbeiter, höchstens der Deckel', () => {
    expect(minigameHelpers(runOf(playingGame()), 'workplace', cfg)).toBe(0);
    const many = playingGame({ actions: { work: { staff: 5 } } });
    expect(minigameHelpers(runOf(many), 'workplace', cfg)).toBe(
      Math.min(5, cfg.minigames.maxHelpers),
    );
  });
});
