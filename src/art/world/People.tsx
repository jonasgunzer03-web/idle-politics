import { memo } from 'react';
import styles from './People.module.css';

// Einfache Nebenfiguren: Passanten, Demonstranten, Soldaten, Mitarbeiter.

const SHIRTS = ['#8a4f3d', '#2e6b8a', '#6a3d9a', '#3f7a4a', '#b5502c', '#5a5f66', '#c9a227'];
const SKINS = ['#f1c9a8', '#d9a888', '#b07a55', '#7a4f33'];
const HAIRS = ['#3b2a20', '#1d1a18', '#a07548', '#8e8e8e'];

export type NpcKind = 'civilian' | 'protester' | 'soldier' | 'worker';

interface NpcProps {
  seed: number;
  kind?: NpcKind;
  /** Text auf dem Protestschild. */
  sign?: string;
  className?: string;
}

/** Eine Person, 30 × 70 Einheiten. */
export const Npc = memo(function Npc({ seed, kind = 'civilian', sign, className }: NpcProps) {
  const shirt = kind === 'soldier' ? '#4b5a3a' : (SHIRTS[seed % SHIRTS.length] ?? '#8a4f3d');
  const skin = SKINS[(seed * 3) % SKINS.length] ?? '#d9a888';
  const hair = HAIRS[(seed * 5) % HAIRS.length] ?? '#3b2a20';
  const pants = kind === 'soldier' ? '#3c4a2e' : '#3b3f47';
  return (
    <svg viewBox="-10 -30 50 100" className={`${styles.npc} ${className ?? ''}`} aria-hidden="true">
      <g className={styles.legs}>
        <rect x="9" y="42" width="5" height="24" rx="2" fill={pants} />
        <rect x="16" y="42" width="5" height="24" rx="2" fill={pants} />
      </g>
      <rect x="6" y="18" width="18" height="28" rx="6" fill={shirt} />
      <circle cx="15" cy="11" r="8" fill={skin} />
      {kind === 'soldier' ? (
        <path d="M6 9 Q7 0 15 0 Q23 0 24 9 Z" fill="#3c4a2e" />
      ) : (
        <path d="M7 10 Q8 2 15 2 Q22 2 23 10 Q18 6 7 10 Z" fill={hair} />
      )}
      {kind === 'protester' && (
        <g className={styles.sign}>
          <rect x="22" y="-26" width="2" height="48" fill="#6b4a32" />
          <rect x="4" y="-28" width="36" height="18" fill="#f4efe2" stroke="#1c1f24" strokeWidth="1" />
          <text x="22" y="-15" textAnchor="middle" fontSize="7" fontWeight="700" fill="#b3261e">
            {sign ?? '!'}
          </text>
        </g>
      )}
      {kind === 'soldier' && <rect x="22" y="10" width="3" height="30" fill="#2b2f36" />}
    </svg>
  );
});
