import { render, screen } from '@testing-library/react';
import { zeroResources } from '../../engine/economy';
import type { OfflineReport } from '../../engine/tick';
import { OfflineDialog } from './OfflineDialog';

const HOUR = 3_600_000;

function report(elapsedMs: number, creditedMs: number): OfflineReport {
  return {
    elapsedMs,
    creditedMs,
    capped: elapsedMs > creditedMs,
    gained: { ...zeroResources(), money: 1234 },
  };
}

describe('OfflineDialog', () => {
  it('zeigt Dauer und Erträge', () => {
    render(<OfflineDialog report={report(2 * HOUR, 2 * HOUR)} onClose={() => undefined} />);
    expect(screen.getByText(/2 Std\. weg/)).toBeInTheDocument();
    expect(screen.getByText('+1.234')).toBeInTheDocument();
  });

  // Bug: Bei 8 Std. + wenigen Millisekunden erschien der Deckel-Hinweis mit „8 Std..“
  it('zeigt den Deckel-Hinweis nicht bei minimaler Überschreitung', () => {
    render(<OfflineDialog report={report(8 * HOUR + 40, 8 * HOUR)} onClose={() => undefined} />);
    expect(screen.queryByText(/Höchstwert/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\.\./)).not.toBeInTheDocument();
  });

  it('zeigt den Deckel-Hinweis bei deutlicher Überschreitung', () => {
    render(<OfflineDialog report={report(30 * HOUR, 8 * HOUR)} onClose={() => undefined} />);
    expect(screen.getByText(/Angerechnet wurden 8 Std\. \(Höchstwert\)/)).toBeInTheDocument();
  });
});
