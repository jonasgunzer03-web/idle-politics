import { defaultConfig } from '../../config';
import { formatDuration, formatNumber } from '../../engine/format';
import { RESOURCE_IDS } from '../../engine/ids';
import type { OfflineReport } from '../../engine/tick';
import { de, fill } from '../../i18n/de';
import { useGame } from '../../store';
import { BottomSheet } from '../components/BottomSheet';
import { Button } from '../components/Button';
import { ResourceIcon } from '../components/ResourceIcon';
import styles from './Dialogs.module.css';

export function OfflineDialog({ report, onClose }: { report: OfflineReport; onClose: () => void }) {
  const currency = useGame((s) =>
    s.game.run ? defaultConfig.states[s.game.run.stateId].currency : '',
  );
  const gains = RESOURCE_IDS.filter((id) => report.gained[id] >= 1);
  return (
    <BottomSheet title={de.offline.title} onClose={onClose} testId="offline-dialog">
      <p className={styles.muted}>
        {fill(de.offline.awayFor, { duration: formatDuration(report.elapsedMs) })}
        {report.elapsedMs - report.creditedMs >=
          defaultConfig.balancing.time.offlineCapNoticeMinSeconds * 1000 &&
          ` ${fill(de.offline.capped, { cap: formatDuration(report.creditedMs) })}`}
      </p>
      <p>{de.offline.gainedIntro}</p>
      <ul className={styles.gainList}>
        {gains.map((id) => (
          <li key={id} className={styles.gainItem}>
            <ResourceIcon resource={id} size={20} />
            <span>{de.resources[id]}</span>
            <strong className="num">
              {formatNumber(report.gained[id], { signed: true })}
              {id === 'money' && currency ? ` ${currency}` : ''}
            </strong>
          </li>
        ))}
      </ul>
      <Button block onClick={onClose}>
        {de.common.ok}
      </Button>
    </BottomSheet>
  );
}
