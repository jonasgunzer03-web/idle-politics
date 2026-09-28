import { Globe, Network, TrendingUp } from 'lucide-react';
import { de } from '../../i18n/de';
import { Placeholder } from './Placeholder';

export function NetworkTab() {
  return (
    <Placeholder
      icon={Network}
      title={de.placeholders.network.title}
      text={de.placeholders.network.text}
    />
  );
}

export function InvestTab() {
  return (
    <Placeholder
      icon={TrendingUp}
      title={de.placeholders.invest.title}
      text={de.placeholders.invest.text}
    />
  );
}

export function WorldTab() {
  return (
    <Placeholder
      icon={Globe}
      title={de.placeholders.world.title}
      text={de.placeholders.world.text}
    />
  );
}
