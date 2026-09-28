import { Briefcase } from 'lucide-react';
import { de } from '../../i18n/de';
import { useGame } from '../../store';
import { Placeholder } from './Placeholder';

export function CareerTab() {
  const hasRun = useGame((s) => s.game.run !== null);
  return (
    <Placeholder
      icon={Briefcase}
      title={de.tabs.career}
      text={hasRun ? de.placeholders.careerRunning : de.placeholders.careerEmpty}
    />
  );
}
