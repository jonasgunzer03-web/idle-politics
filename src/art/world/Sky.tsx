import { memo } from 'react';
import styles from './Sky.module.css';

/** Himmel mit Sonne bzw. Mond und ziehenden Wolken (feste Ebene hinter der Straße). */
export const Sky = memo(function Sky({ grey = false }: { grey?: boolean }) {
  return (
    <div className={`${styles.sky} ${grey ? styles.grey : ''}`} aria-hidden="true">
      <div className={styles.sun} />
      {[0, 1, 2].map((i) => (
        <div key={i} className={`${styles.cloud} ${styles[`cloud${i}`] ?? ''}`}>
          <svg viewBox="0 0 80 30" className={styles.cloudSvg}>
            <g className={styles.cloudFill}>
              <ellipse cx="25" cy="20" rx="20" ry="9" />
              <ellipse cx="42" cy="14" rx="16" ry="11" />
              <ellipse cx="58" cy="20" rx="17" ry="8" />
            </g>
          </svg>
        </div>
      ))}
    </div>
  );
});
