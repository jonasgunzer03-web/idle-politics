import { outfitFor } from '../art/figure/outfit';
import { characterSchema } from '../engine/schema';
import { zeroResources } from '../engine/economy';
import { cfg, playingGame } from '../test/fixtures';
import { randomCharacter } from './characterDefaults';
import { careerTitle, formatResource } from './gameText';
import { generatorRowView, suggestedGenerators } from './generatorView';

describe('Anzeige-Helfer', () => {
  it('Zufallscharaktere sind immer gültig', () => {
    for (let seed = 0; seed < 200; seed++) {
      expect(characterSchema.safeParse(randomCharacter(seed)).success).toBe(true);
    }
  });

  it('gleicher Seed ergibt denselben Charakter', () => {
    expect(randomCharacter(5)).toEqual(randomCharacter(5));
  });

  it('Amtstitel je Stufe und Pfad', () => {
    expect(careerTitle({ stateId: 'rhenania', stage: 1, path: 'democratic' })).toBe('Arbeiter');
    expect(careerTitle({ stateId: 'rhenania', stage: 11, path: 'democratic' })).toBe(
      'Bundeskanzler',
    );
    expect(careerTitle({ stateId: 'rhenania', stage: 12, path: 'autocratic' })).toBe('Diktator');
    expect(careerTitle({ stateId: 'rhenania', stage: 5, path: 'autocratic' })).toBe(
      'Bürgermeister',
    );
    expect(careerTitle({ stateId: 'zentralia', stage: 12, path: 'autocratic' })).toBe(
      'Generalsekretär auf Lebenszeit',
    );
  });

  it('Kleidung nach Beruf', () => {
    expect(outfitFor({ profession: 'skilled' })).toBe('overalls');
    expect(outfitFor({ profession: 'office' })).toBe('officeShirt');
  });

  it('Geld mit Währungszeichen, andere Ressourcen ohne', () => {
    expect(formatResource('money', 1234, 'rhenania')).toBe('1.234 €');
    expect(formatResource('influence', 1234, 'rhenania')).toBe('1.234');
    expect(formatResource('money', 5, null)).toBe('5');
  });

  it('Generator-Zeile: Preis, Fehlbetrag und Raten', () => {
    const game = playingGame({ resources: { ...zeroResources(), money: 4.2 } });
    const view = generatorRowView(game, 'overtime', 1, cfg);
    expect(view.unlocked).toBe(true);
    expect(view.affordable).toBe(false);
    expect(view.costText).toBe('10 €');
    expect(view.missingText).toBe('Fehlt: 6 €');
    // 0,4 € × 0,63 (Facharbeiter in Rhenanien) ≈ 0,25 €/s
    expect(view.unitRateText).toBe('+0,3 €/s');
  });

  it('Generator-Zeile: Kosten in mehreren Ressourcen', () => {
    const game = playingGame({ stage: 2 });
    expect(generatorRowView(game, 'flyers', 1, cfg).costText).toBe('60 € · 5 Einfluss');
  });

  it('Generator-Zeile: Max zeigt die bezahlbare Menge', () => {
    const game = playingGame({ resources: { ...zeroResources(), money: 1000 } });
    const view = generatorRowView(game, 'overtime', 'max', cfg);
    expect(view.count).toBeGreaterThan(10);
    expect(view.affordable).toBe(true);
  });

  it('Vorschläge sind freigeschaltet und nach Preis sortiert', () => {
    const ids = suggestedGenerators(playingGame(), 3, cfg);
    expect(ids).toEqual(['overtime', 'regularsTable', 'sideJob']);
  });
});
