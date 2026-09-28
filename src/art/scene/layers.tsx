import { useId, type ReactNode } from 'react';
import styles from './Scene.module.css';

// Szene aus Ebenen. Jede Ebene ist eine eigene Komponente mit eigenem SVG (390 × 300,
// unten mittig verankert). Einzelne Ebenen lassen sich so später durch echte
// Illustrationen ersetzen, ohne den Spielcode anzufassen.

const VIEW = '0 0 390 300';

function Layer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox={VIEW}
      preserveAspectRatio="xMidYMax slice"
      className={`${styles.layer} ${className ?? ''}`}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** Himmel mit Sonne bzw. Mond. */
export function SkyLayer() {
  const gradientId = useId();
  return (
    <Layer>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className={styles.skyTop} />
          <stop offset="1" className={styles.skyBottom} />
        </linearGradient>
      </defs>
      <rect width="390" height="300" fill={`url(#${gradientId})`} />
      <circle cx="320" cy="58" r="22" className={styles.sun} />
    </Layer>
  );
}

/** Wolken als eigene, bewegte Elemente (nur transform). */
export function CloudLayer() {
  return (
    <div className={styles.clouds} aria-hidden="true">
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
}

/** Hintergrund: Stadtsilhouette mit Giebeldächern, Kirchturm und Fernsehturm (Rhenanien). */
export function SkylineLayer() {
  return (
    <Layer>
      <g className={styles.far}>
        <rect x="18" y="150" width="6" height="90" />
        <circle cx="21" cy="150" r="9" />
        <rect x="19.5" y="112" width="3" height="30" />
        <path d="M0 240 V190 L20 172 L40 190 V240 Z" />
        <path d="M44 240 V175 L66 154 L88 175 V240 Z" />
        <rect x="92" y="186" width="44" height="54" />
        <path d="M140 240 V168 L152 168 L152 120 L160 96 L168 120 L168 168 L180 168 V240 Z" />
        <path d="M184 240 V182 L206 160 L228 182 V240 Z" />
        <rect x="232" y="170" width="38" height="70" />
        <path d="M274 240 V188 L298 166 L322 188 V240 Z" />
        <rect x="326" y="160" width="30" height="80" />
        <path d="M358 240 V184 L374 170 L390 184 V240 Z" />
      </g>
      <g className={styles.near}>
        <path d="M0 250 V214 L28 198 L56 214 V250 Z" />
        <path d="M334 250 V210 L362 194 L390 210 V250 Z" />
      </g>
    </Layer>
  );
}

/** Hauptgebäude: Werkhalle (Facharbeiter) oder Bürogebäude (Büroangestellter). */
export function WorkplaceLayer({ kind }: { kind: 'factory' | 'office' }) {
  return (
    <Layer>
      {kind === 'factory' ? (
        <g>
          <rect x="250" y="120" width="14" height="60" className={styles.brickDark} />
          <rect x="248" y="116" width="18" height="6" className={styles.trim} />
          {/* Sägezahndach */}
          <path
            d="M70 180 L70 150 L110 128 L110 150 L150 128 L150 150 L190 128 L190 150 L230 128 L230 150 L270 128 L270 150 L310 128 L310 180 Z"
            className={styles.brick}
          />
          <path
            d="M110 130 L110 150 M150 130 L150 150 M190 130 L190 150 M230 130 L230 150 M270 130 L270 150"
            className={styles.glassLine}
          />
          <rect x="70" y="150" width="240" height="100" className={styles.brick} />
          <rect x="70" y="150" width="240" height="6" className={styles.trim} />
          {[88, 124, 236, 272].map((x) => (
            <rect key={x} x={x} y="166" width="22" height="30" rx="2" className={styles.window} />
          ))}
          <rect x="162" y="176" width="56" height="74" className={styles.gate} />
          {[186, 198, 210, 222, 234].map((y) => (
            <line key={y} x1="162" y1={y} x2="218" y2={y} className={styles.gateLine} />
          ))}
          <rect x="164" y="160" width="52" height="11" rx="2" className={styles.sign} />
          <text x="190" y="168.5" textAnchor="middle" className={styles.signText}>
            WERK 2
          </text>
        </g>
      ) : (
        <g>
          <rect x="96" y="96" width="198" height="154" className={styles.concrete} />
          <rect x="92" y="90" width="206" height="8" className={styles.trim} />
          {[0, 1, 2, 3, 4].map((row) =>
            [0, 1, 2, 3, 4, 5].map((col) => (
              <rect
                key={`${row}-${col}`}
                x={108 + col * 30}
                y={108 + row * 24}
                width="20"
                height="15"
                rx="1.5"
                className={styles.window}
              />
            )),
          )}
          <rect x="170" y="212" width="50" height="38" className={styles.glassDoor} />
          <line x1="195" y1="212" x2="195" y2="250" className={styles.gateLine} />
          <rect x="162" y="204" width="66" height="8" className={styles.trim} />
        </g>
      )}
      {/* Gehweg und Straße */}
      <rect x="0" y="246" width="390" height="54" className={styles.street} />
      <rect x="0" y="246" width="390" height="14" className={styles.sidewalk} />
      <rect x="0" y="259" width="390" height="2" className={styles.curb} />
    </Layer>
  );
}

/** Ein Passant, der langsam durchs Bild läuft. */
export function PasserbyLayer() {
  return (
    <div className={styles.passerbyTrack} aria-hidden="true">
      <svg viewBox="0 0 30 70" className={styles.passerby}>
        <g className={styles.walk}>
          <rect x="9" y="42" width="5" height="24" rx="2" fill="#3b3f47" />
          <rect x="16" y="42" width="5" height="24" rx="2" fill="#3b3f47" />
        </g>
        <rect x="6" y="18" width="18" height="28" rx="6" fill="#8a4f3d" />
        <circle cx="15" cy="11" r="8" fill="#d9a888" />
        <path d="M7 10 Q8 2 15 2 Q22 2 23 10 Q18 6 7 10 Z" fill="#3b2a20" />
      </svg>
    </div>
  );
}
