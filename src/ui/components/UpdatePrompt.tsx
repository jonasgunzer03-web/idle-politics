import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw } from 'lucide-react';
import { de } from '../../i18n/de';
import styles from './Banner.module.css';

const HOUR_MS = 3_600_000;

/** Zeigt „Update verfügbar – neu laden“, sobald eine neue Version bereitliegt. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // Stündlich nach Updates schauen, solange die App offen ist
      window.setInterval(() => {
        if (document.visibilityState === 'visible') {
          registration.update().catch(() => undefined);
        }
      }, HOUR_MS);
    },
  });

  if (!needRefresh) return null;
  return (
    <div className={`${styles.banner} ${styles.info} ${styles.floating}`} role="status">
      <span>{de.update.available}</span>
      <button
        type="button"
        className={styles.action}
        onClick={() => {
          updateServiceWorker(true).catch(() => {
            window.location.reload();
          });
        }}
      >
        <RefreshCw size={16} aria-hidden="true" />
        {de.update.reload}
      </button>
    </div>
  );
}
