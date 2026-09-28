import { act, render, screen } from '@testing-library/react';
import { defaultConfig } from '../../config';
import { createNewGame, startRun } from '../../engine/game';
import { gameStore } from '../../store';
import { testCharacter } from '../../test/fixtures';
import { InvestTab } from './InvestTab';

function startTestRun(stage = 1) {
  const game = startRun(
    createNewGame(0, 1),
    { character: testCharacter, stateId: 'rhenania', profession: 'office' },
    0,
    defaultConfig,
  );
  const run = game.run;
  if (!run) throw new Error('run');
  act(() => {
    gameStore.setState({ game: { ...game, run: { ...run, stage } }, hydrated: true });
  });
}

describe('InvestTab', () => {
  // Bug: Endlosschleife („Maximum update depth exceeded“), weil der Gruppen-Selektor
  // bei jedem Aufruf ein neues Array lieferte.
  it('rendert ohne Endlosschleife und zeigt die Generatoren', () => {
    startTestRun();
    render(<InvestTab />);
    expect(screen.getByTestId('generator-overtime')).toBeInTheDocument();
    expect(screen.getByTestId('generator-regularsTable')).toBeInTheDocument();
  });

  it('zeigt gesperrte Anhänger mit Freischalt-Stufe', () => {
    startTestRun(1);
    render(<InvestTab />);
    expect(screen.getByTestId('invest-group-followers')).toHaveTextContent('Stufe 2');
  });

  it('zeigt den nächsten gesperrten Generator als Ausblick', () => {
    startTestRun(1);
    render(<InvestTab />);
    expect(screen.getByTestId('generator-smallBusiness')).toHaveTextContent('Ab Stufe 3');
  });

  it('bleibt stabil, wenn sich der Spielstand im Takt ändert', () => {
    startTestRun(2);
    render(<InvestTab />);
    act(() => {
      for (let i = 0; i < 20; i++) gameStore.getState().debugAddResources(1);
    });
    expect(screen.getByTestId('generator-flyers')).toBeInTheDocument();
  });
});
