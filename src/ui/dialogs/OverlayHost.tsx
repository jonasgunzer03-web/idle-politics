import { useGame } from '../../store';
import { HintDialog } from './HintDialog';
import { IntroDialog } from './IntroDialog';
import { OfflineDialog } from './OfflineDialog';
import { RecoveredDialog } from './RecoveredDialog';

/**
 * Zeigt immer nur den ersten Dialog der Warteschlange. So liegen nie zwei Overlays
 * übereinander; der nächste erscheint erst, wenn der aktuelle geschlossen ist.
 */
export function OverlayHost() {
  const overlay = useGame((s) => s.overlays[0] ?? null);
  const dismiss = useGame((s) => s.dismissOverlay);
  if (!overlay) return null;
  switch (overlay.kind) {
    case 'offline':
      return <OfflineDialog report={overlay.report} onClose={dismiss} />;
    case 'recovered':
      return <RecoveredDialog onClose={dismiss} />;
    case 'intro':
      return <IntroDialog onDone={dismiss} />;
    case 'hint':
      return <HintDialog hint={overlay.hint} onClose={dismiss} />;
  }
}
