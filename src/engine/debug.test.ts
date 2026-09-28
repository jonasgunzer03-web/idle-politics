import { playingGame } from '../test/fixtures';
import { debugAddResources, debugSetStage, debugShiftTime } from './debug';
import { createNewGame } from './game';

describe('Debug-Hilfen', () => {
  it('fügt Ressourcen hinzu, ignoriert ungültige Beträge', () => {
    const game = playingGame();
    expect(debugAddResources(game, 50).run?.resources.influence).toBe(50);
    expect(debugAddResources(game, Number.NaN)).toBe(game);
    expect(debugAddResources(game, -5)).toBe(game);
  });

  it('setzt die Stufe nur im Bereich 1–12', () => {
    const game = playingGame();
    expect(debugSetStage(game, 99).run?.stage).toBe(12);
    expect(debugSetStage(game, 0).run?.stage).toBe(1);
  });

  it('Zeitsprung verschiebt den letzten aktiven Zeitpunkt', () => {
    const game = playingGame();
    expect(debugShiftTime(game, 1000).lastActiveAt).toBe(game.lastActiveAt - 1000);
    expect(debugShiftTime(game, -1000)).toBe(game);
  });

  it('ohne Durchlauf passiert nichts', () => {
    const game = createNewGame(0, 1);
    expect(debugAddResources(game, 10)).toBe(game);
    expect(debugSetStage(game, 3)).toBe(game);
  });
});
