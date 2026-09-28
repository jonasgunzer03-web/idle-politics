import { act, fireEvent, render, screen } from '@testing-library/react';
import { createNewGame } from '../../engine/game';
import { gameStore } from '../../store';
import { SetupFlow } from './SetupFlow';

describe('SetupFlow', () => {
  beforeEach(() => {
    act(() => {
      gameStore.setState({ game: createNewGame(0, 1), hydrated: true, overlays: [] });
    });
  });

  it('führt von Titel über Figur, Staat und Beruf zum Spielstart', () => {
    render(<SetupFlow />);
    fireEvent.click(screen.getByTestId('new-game'));

    const name = screen.getByTestId('character-name');
    fireEvent.change(name, { target: { value: '  ' } });
    expect(screen.getByTestId('setup-next')).toBeDisabled();
    fireEvent.change(name, { target: { value: 'Ida Brandt' } });
    fireEvent.click(screen.getByTestId('setup-next'));

    // Nur Rhenanien ist spielbar
    expect(screen.getByTestId('state-borealis')).toBeDisabled();
    expect(screen.getByTestId('state-rhenania')).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByTestId('setup-next'));

    expect(screen.getByTestId('setup-start')).toBeDisabled();
    fireEvent.click(screen.getByTestId('profession-skilled'));
    fireEvent.click(screen.getByTestId('setup-start'));

    const game = gameStore.getState().game;
    expect(game.phase).toBe('playing');
    expect(game.character?.name).toBe('Ida Brandt');
    expect(game.run?.stateId).toBe('rhenania');
    expect(game.run?.profession).toBe('skilled');
    expect(gameStore.getState().overlays[0]?.kind).toBe('intro');
  });

  it('Zurück führt zum vorherigen Schritt', () => {
    render(<SetupFlow />);
    fireEvent.click(screen.getByTestId('new-game'));
    fireEvent.click(screen.getByTestId('setup-next'));
    fireEvent.click(screen.getByRole('button', { name: 'Zurück' }));
    expect(screen.getByTestId('character-name')).toBeInTheDocument();
  });

  it('entfernt Leerzeichen um den Namen', () => {
    render(<SetupFlow />);
    fireEvent.click(screen.getByTestId('new-game'));
    fireEvent.change(screen.getByTestId('character-name'), { target: { value: '  Emil Tamm ' } });
    fireEvent.click(screen.getByTestId('setup-next'));
    fireEvent.click(screen.getByTestId('setup-next'));
    fireEvent.click(screen.getByTestId('profession-office'));
    fireEvent.click(screen.getByTestId('setup-start'));
    expect(gameStore.getState().game.character?.name).toBe('Emil Tamm');
  });
});
