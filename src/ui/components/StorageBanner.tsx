import { de } from '../../i18n/de';
import { useGame } from '../../store';
import styles from './Banner.module.css';

/** Hinweis, wenn nicht gespeichert werden kann. Das Spiel läuft trotzdem weiter. */
export function StorageBanner() {
  const status = useGame((s) => s.storageStatus);
  if (status === 'ok') return null;
  return (
    <div className={`${styles.banner} ${styles.warn}`} role="status" data-testid="storage-banner">
      {de.storage[status]}
    </div>
  );
}
