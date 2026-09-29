import { useEffect } from 'react';
import { Trophy } from 'lucide-react';
import { de } from '../../i18n/de';
import { gameStore, useGame } from '../../store';
import styles from './Toasts.module.css';

const TOAST_MS = 3200;

/** Kurze Einblendung bei neuen Erfolgen. Blockiert nichts und verschwindet von selbst. */
export function Toasts() {
  const current = useGame((s) => s.toasts[0] ?? null);
  useEffect(() => {
    if (!current) return;
    const id = window.setTimeout(() => {
      gameStore.getState().dismissToast();
    }, TOAST_MS);
    return () => {
      window.clearTimeout(id);
    };
  }, [current]);
  if (!current) return null;
  const text = de.achievements.list[current];
  return (
    <div className={styles.toast} role="status" key={current} data-testid="achievement-toast">
      <Trophy size={20} aria-hidden="true" className={styles.icon} />
      <div>
        <p className={styles.kicker}>{de.achievements.unlocked}</p>
        <p className={styles.name}>{text.name}</p>
      </div>
    </div>
  );
}
