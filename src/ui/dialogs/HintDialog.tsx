import type { HintId } from '../../engine/schema';
import { de } from '../../i18n/de';
import { BottomSheet } from '../components/BottomSheet';
import { Button } from '../components/Button';

export function HintDialog({ hint, onClose }: { hint: HintId; onClose: () => void }) {
  const text = de.hints[hint];
  return (
    <BottomSheet title={text.title} onClose={onClose} testId={`hint-${hint}`}>
      <p>{text.text}</p>
      <Button block onClick={onClose}>
        {de.common.ok}
      </Button>
    </BottomSheet>
  );
}
