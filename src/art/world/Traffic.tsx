import { memo } from 'react';
import type { GoodId } from '../../engine/ids';
import styles from './Traffic.module.css';

// Lieferwagen, die Waren zwischen Gebäuden fahren, und Busse im Straßenverkehr.

const GOOD_COLORS: Record<GoodId, string> = {
  wares: '#8d5a2b',
  contacts: '#c77700',
  flyers: '#c2336b',
  files: '#4b5a70',
};

/** Kleiner Lieferwagen, 60 × 30 Einheiten, fährt nach rechts. */
export const Truck = memo(function Truck({ good }: { good: GoodId }) {
  const color = GOOD_COLORS[good];
  return (
    <svg viewBox="0 0 60 30" className={styles.vehicle} aria-hidden="true">
      <ellipse cx="30" cy="27" rx="28" ry="2.5" fill="rgb(0 0 0 / 30%)" />
      <rect x="2" y="4" width="36" height="18" rx="2" fill="#f1ede4" />
      <rect x="2" y="4" width="36" height="5" rx="2" fill={color} />
      <rect x="8" y="12" width="12" height="7" rx="1" fill={color} opacity="0.85" />
      <path d="M38 9 H50 L57 16 V22 H38 Z" fill={color} />
      <path d="M41 11 H49 L54 16 H41 Z" fill="#bfe0f2" />
      <circle cx="12" cy="23" r="4" fill="#1c1f24" />
      <circle cx="48" cy="23" r="4" fill="#1c1f24" />
      <circle cx="12" cy="23" r="1.6" fill="#9aa0a6" />
      <circle cx="48" cy="23" r="1.6" fill="#9aa0a6" />
      <rect x="55" y="17" width="3" height="3" fill="#ffd97a" className="night" />
    </svg>
  );
});

/** Stadtbus mit Fahrgästen, 90 × 34 Einheiten. */
export const Bus = memo(function Bus({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 90 34" className={styles.vehicle} aria-hidden="true">
      <ellipse cx="45" cy="31" rx="42" ry="2.5" fill="rgb(0 0 0 / 30%)" />
      <rect x="2" y="3" width="84" height="24" rx="5" fill={color} />
      <rect x="2" y="20" width="84" height="3" fill="rgb(0 0 0 / 20%)" />
      {[8, 22, 36, 50, 64].map((x) => (
        <rect key={x} x={x} y="7" width="11" height="9" rx="1.5" fill="#bfe0f2" />
      ))}
      <rect x="76" y="7" width="8" height="12" rx="1.5" fill="#bfe0f2" />
      <circle cx="18" cy="27" r="4.2" fill="#1c1f24" />
      <circle cx="70" cy="27" r="4.2" fill="#1c1f24" />
      <rect x="84" y="21" width="3" height="3" fill="#ffd97a" className="night" />
    </svg>
  );
});
