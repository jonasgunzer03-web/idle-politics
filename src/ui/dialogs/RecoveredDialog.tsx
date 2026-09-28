import { de } from '../../i18n/de';
import { BottomSheet } from '../components/BottomSheet';
import { Button } from '../components/Button';

export function RecoveredDialog({ onClose }: { onClose: () => void }) {
  return (
    <BottomSheet title={de.recovered.title} onClose={onClose}>
      <p>{de.recovered.text}</p>
      <Button block onClick={onClose}>
        {de.common.ok}
      </Button>
    </BottomSheet>
  );
}
