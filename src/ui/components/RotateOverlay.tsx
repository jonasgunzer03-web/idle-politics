import { Smartphone } from 'lucide-react';
import { de } from '../../i18n/de';
import styles from './RotateOverlay.module.css';

/** iOS ignoriert die Orientierungssperre im Manifest, deshalb dieser Hinweis im Querformat. */
export function RotateOverlay() {
  return (
    <div className={styles.overlay} aria-hidden="true">
      <Smartphone size={48} className={styles.icon} />
      <p className={styles.title}>{de.rotate}</p>
      <p className={styles.hint}>{de.rotateHint}</p>
    </div>
  );
}
