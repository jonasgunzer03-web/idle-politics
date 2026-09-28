import { act, fireEvent, render, screen } from '@testing-library/react';
import { defaultConfig } from '../../config';
import { zeroResources } from '../../engine/economy';
import { createNewGame, startRun } from '../../engine/game';
import { gameStore } from '../../store';
import { testCharacter } from '../../test/fixtures';
import { CareerTab } from './CareerTab';

function startTestRun(money = 0) {
  const game = startRun(
    createNewGame(0, 1),
    { character: testCharacter, stateId: 'rhenania', profession: 'skilled' },
    0,
    defaultConfig,
  );
  const run = game.run;
  if (!run) throw new Error('run');
  act(() => {
    gameStore.setState({
      game: { ...game, run: { ...run, resources: { ...zeroResources(), money } } },
      hydrated: true,
    });
  });
}

describe('CareerTab', () => {
  it('zeigt Szene, Amtstitel und Stufe', () => {
    startTestRun();
    render(<CareerTab />);
    expect(screen.getByTestId('scene')).toBeInTheDocument();
    expect(screen.getByTestId('career-title')).toHaveTextContent('Arbeiter');
    expect(screen.getByText('Stufe 1 von 12')).toBeInTheDocument();
  });

  it('Tippen auf „Schicht arbeiten“ bringt Geld', () => {
    startTestRun();
    render(<CareerTab />);
    fireEvent.click(screen.getByTestId('tap-work'));
    fireEvent.click(screen.getByTestId('tap-work'));
    // Facharbeiter in Rhenanien: 0,63 € pro Tipp
    expect(gameStore.getState().game.run?.resources.money).toBeCloseTo(1.26);
  });

  it('Kauf-Button ist ohne Geld deaktiviert und nennt den Fehlbetrag', () => {
    startTestRun(4);
    render(<CareerTab />);
    const button = screen.getByTestId('buy-overtime');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Fehlt: 6 €');
  });

  it('Mehrfachtippen auf Kaufen kauft nur, was bezahlbar ist', () => {
    startTestRun(25);
    render(<CareerTab />);
    const button = screen.getByTestId('buy-overtime');
    for (let i = 0; i < 10; i++) fireEvent.click(button);
    // 10 € + 12 € = 22 €; das dritte (14 €) ist nicht mehr bezahlbar
    expect(gameStore.getState().game.run?.generators.overtime).toBe(2);
    expect(gameStore.getState().game.run?.resources.money).toBe(3);
  });
});
