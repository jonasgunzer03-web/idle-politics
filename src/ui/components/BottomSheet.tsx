import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { de } from '../../i18n/de';
import styles from './BottomSheet.module.css';

interface Props {
  title: string;
  children: ReactNode;
  onClose: () => void;
  /** false = kein Schließen über Hintergrund und X (nur über eigene Buttons). */
  dismissible?: boolean;
  testId?: string;
}

/** Fenster, das von unten hereinfährt. Bleibt mit dem Daumen gut erreichbar. */
export function BottomSheet({ title, children, onClose, dismissible = true, testId }: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  return (
    <div className={styles.root}>
      <div
        className={styles.backdrop}
        onClick={dismissible ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-testid={testId}
      >
        <div className={styles.handle} aria-hidden="true" />
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          {dismissible && (
            <button
              type="button"
              className={styles.close}
              onClick={onClose}
              aria-label={de.common.close}
            >
              <X size={22} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
