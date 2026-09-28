import { memo } from 'react';
import { defaultConfig } from '../../config';
import { productionRates } from '../../engine/economy';
import { formatNumber } from '../../engine/format';
import { RESOURCE_IDS, type ResourceId } from '../../engine/ids';
import { isResourceUnlocked } from '../../engine/rules';
import { de } from '../../i18n/de';
import { useGame } from '../../store';
import { ResourceIcon } from './ResourceIcon';
import styles from './ResourceBar.module.css';

const cfg = defaultConfig;

const ResourceChip = memo(function ResourceChip({ resource }: { resource: ResourceId }) {
  const amount = useGame((s) => s.game.run?.resources[resource] ?? 0);
  const rate = useGame((s) => (s.game.run ? productionRates(s.game, cfg)[resource] : 0));
  const currency = useGame((s) =>
    resource === 'money' && s.game.run ? cfg.states[s.game.run.stateId].currency : '',
  );
  return (
    <div className={styles.chip} data-testid={`resource-${resource}`}>
      <ResourceIcon resource={resource} size={16} />
      <span className={styles.label}>{de.resources[resource]}</span>
      <span className={`${styles.amount} num`} data-testid={`resource-${resource}-amount`}>
        {formatNumber(amount)}
        {currency && ` ${currency}`}
      </span>
      {rate > 0 && (
        <span className={`${styles.rate} num`}>
          {formatNumber(rate, { signed: true, smallDecimals: 1, rounding: 'round' })}
          {de.common.perSecond}
        </span>
      )}
    </div>
  );
});

/** Ressourcenleiste oben. Zeigt nur freigeschaltete Ressourcen. */
export function ResourceBar() {
  // Liste als String selektieren, damit die Leiste nur bei Freischaltungen neu rendert
  const unlocked = useGame((s) => {
    const run = s.game.run;
    if (!run) return '';
    return RESOURCE_IDS.filter((id) => isResourceUnlocked(run, id, cfg)).join(',');
  });
  if (!unlocked) return null;
  return (
    <div className={styles.bar}>
      {unlocked.split(',').map((id) => (
        <ResourceChip key={id} resource={id as ResourceId} />
      ))}
    </div>
  );
}
