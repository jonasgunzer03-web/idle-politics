import { cfg, playingGame, runOf } from '../test/fixtures';
import { demote } from './career';
import { findLocation } from './unlocks';
import { tick } from './tick';
import { clampToWorld, currentLocation, enterBuilding, leaveBuilding, moveFigure, stopWalking, travelSeconds, walkTo } from './world';

const x = (id: Parameters<typeof findLocation>[0]) => findLocation(id, cfg)?.x ?? -1;

describe('Bewegung durch die Welt', () => {
  it('Start im Werk, drinnen', () => {
    const run = runOf(playingGame());
    expect(currentLocation(run, cfg)).toBe('workplace');
    expect(run.world.inside).toBe(true);
  });

  it('Laufen verlässt das Gebäude und kommt nach der Wegzeit an', () => {
    let game = walkTo(playingGame(), 'pub', cfg);
    expect(runOf(game).world).toMatchObject({ inside: false, target: 'pub' });
    expect(currentLocation(runOf(game), cfg)).toBeNull();
    const seconds = travelSeconds(game, 'pub', cfg);
    expect(seconds).toBeCloseTo((x('pub') - x('workplace')) / 150);
    game = tick(game, (seconds / 2) * 1000, cfg);
    expect(runOf(game).world.posX).toBeGreaterThan(x('workplace'));
    expect(runOf(game).world.posX).toBeLessThan(x('pub'));
    for (let i = 0; i < 10; i++) game = tick(game, 1000, cfg);
    expect(currentLocation(runOf(game), cfg)).toBe('pub');
    expect(runOf(game).world.target).toBeNull();
  });

  it('Rückwärts laufen funktioniert ebenso', () => {
    let game = playingGame({ world: { posX: x('partyOffice'), target: null, inside: false } });
    game = walkTo(game, 'workplace', cfg);
    game = moveFigure(game, 60_000, cfg);
    expect(currentLocation(runOf(game), cfg)).toBe('workplace');
  });

  it('gesperrte Viertel sind nicht erreichbar', () => {
    const game = playingGame();
    expect(walkTo(game, 'townHall', cfg)).toBe(game);
    const stage4 = playingGame({ stage: 4 });
    expect(runOf(walkTo(stage4, 'townHall', cfg)).world.target).toBe('townHall');
  });

  it('Betreten nur vor einem offenen Gebäude', () => {
    const outside = playingGame({ world: { posX: x('pub'), target: null, inside: false } });
    expect(runOf(enterBuilding(outside, cfg)).world.inside).toBe(true);
    const between = playingGame({ world: { posX: 300, target: null, inside: false } });
    expect(enterBuilding(between, cfg)).toBe(between);
    // Marktplatz erst ab Stufe 2 betretbar, aber erreichbar
    const market = playingGame({ world: { posX: x('market'), target: null, inside: false } });
    expect(enterBuilding(market, cfg)).toBe(market);
  });

  it('Hinausgehen und Stehenbleiben', () => {
    expect(runOf(leaveBuilding(playingGame())).world.inside).toBe(false);
    const walking = walkTo(playingGame(), 'pub', cfg);
    expect(runOf(stopWalking(walking)).world.target).toBeNull();
  });

  it('schnelleres Fahrzeug = kürzere Wege', () => {
    const feet = travelSeconds(playingGame(), 'partyOffice', cfg);
    const car = travelSeconds(playingGame({ vehicle: 'car' }), 'partyOffice', cfg);
    expect(car).toBeLessThan(feet / 5);
  });

  it('nach einem Abstieg kehrt die Figur aus gesperrten Vierteln zurück', () => {
    const run = runOf(playingGame({ stage: 7, world: { posX: x('parliament'), target: null, inside: true } }));
    const down = demote(run, 2, cfg);
    expect(down.stage).toBe(5);
    expect(down.world.posX).toBe(x('partyOffice'));
    expect(down.world.inside).toBe(false);
    // Im offenen Viertel bleibt alles, wie es ist
    expect(clampToWorld(runOf(playingGame()), cfg)).toEqual(runOf(playingGame()));
  });
});
