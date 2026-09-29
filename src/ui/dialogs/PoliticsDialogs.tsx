import type { ElectionOutcome } from '../../engine/career';
import { de, fill } from '../../i18n/de';
import { useGame } from '../../store';
import { BottomSheet } from '../components/BottomSheet';
import { Button } from '../components/Button';
import { careerTitle } from '../gameText';

/** Ergebnis einer verlorenen Wahl (ein Sieg führt direkt in die Zeremonie). */
export function ElectionDialog({
  outcome,
  onClose,
}: {
  outcome: ElectionOutcome;
  onClose: () => void;
}) {
  const run = useGame((s) => s.game.run);
  const title = run ? careerTitle({ ...run, stage: outcome.stage }) : '';
  return (
    <BottomSheet
      title={outcome.won ? de.election.wonTitle : de.election.lostTitle}
      onClose={onClose}
      testId="election-dialog"
    >
      <p>
        {outcome.won
          ? fill(de.election.wonText, { chance: outcome.chance })
          : fill(de.election.lostText, { chance: outcome.chance, stage: outcome.stage, title })}
      </p>
      <Button block onClick={onClose}>
        {de.common.ok}
      </Button>
    </BottomSheet>
  );
}

export function ResignedDialog({ stage, onClose }: { stage: number; onClose: () => void }) {
  return (
    <BottomSheet title={de.resigned.title} onClose={onClose} testId="resigned-dialog">
      <p>{fill(de.resigned.text, { stage })}</p>
      <Button block onClick={onClose}>
        {de.common.ok}
      </Button>
    </BottomSheet>
  );
}
