import { memo } from 'react';
import styles from './TitleScene.module.css';

// Hintergrund des Titelbildschirms: Himmel mit Sonne und ziehenden Wolken, unten eine bunte
// Stadt mit Rathaus, Fabrik und Parlament. Reine Illustration (SVG + CSS-Animationen).

const HOUSES: { x: number; w: number; h: number; color: string; roof: string }[] = [
  { x: 0, w: 46, h: 70, color: '#ff8a5c', roof: '#d9603a' },
  { x: 44, w: 40, h: 96, color: '#ffd166', roof: '#e0a83a' },
  { x: 82, w: 52, h: 60, color: '#7cc8ff', roof: '#3f8fd6' },
  { x: 250, w: 44, h: 84, color: '#a98bff', roof: '#7c5ce0' },
  { x: 292, w: 40, h: 62, color: '#5ad69a', roof: '#2f9e6a' },
  { x: 330, w: 50, h: 92, color: '#ff8fb1', roof: '#e05a85' },
];

export const TitleScene = memo(function TitleScene() {
  return (
    <div className={styles.scene} aria-hidden="true">
      <div className={styles.sun} />
      <div className={`${styles.cloud} ${styles.c1}`} />
      <div className={`${styles.cloud} ${styles.c2}`} />
      <div className={`${styles.cloud} ${styles.c3}`} />
      <svg className={styles.city} viewBox="0 0 380 170" preserveAspectRatio="xMidYMax slice">
        {/* Hügel */}
        <ellipse cx={70} cy={175} rx={160} ry={60} fill="#7fd27a" />
        <ellipse cx={320} cy={178} rx={170} ry={58} fill="#6cc867" />
        {/* Häuser */}
        {HOUSES.map((h) => (
          <g key={h.x} transform={`translate(${h.x} ${170 - h.h})`}>
            <rect width={h.w} height={h.h} rx={6} fill={h.color} />
            <rect width={h.w} height={10} rx={5} fill={h.roof} />
            {Array.from({ length: Math.floor((h.h - 22) / 20) }, (_, r) =>
              Array.from({ length: Math.floor(h.w / 16) }, (_, c) => (
                <rect
                  key={`${r}-${c}`}
                  x={7 + c * 15}
                  y={18 + r * 20}
                  width={8}
                  height={10}
                  rx={2}
                  fill="#fff7d6"
                />
              )),
            )}
          </g>
        ))}
        {/* Parlament mit Kuppel in der Mitte */}
        <g transform="translate(134 52)">
          <rect x={6} y={46} width={104} height={72} rx={6} fill="#ffffff" />
          <rect x={0} y={40} width={116} height={10} rx={5} fill="#d3e2f1" />
          <path d="M18 40 Q58 -6 98 40 Z" fill="#ffc533" />
          <rect x={54} y={0} width={8} height={14} rx={2} fill="#d9961a" />
          <path d="M62 2 h18 l-4 6 4 6 h-18 z" fill="#ff5466" />
          {[18, 38, 58, 78, 98].map((x) => (
            <rect key={x} x={x - 4} y={56} width={8} height={52} rx={3} fill="#e6eef8" />
          ))}
          <rect x={44} y={92} width={28} height={26} rx={4} fill="#3fa9ff" />
        </g>
        {/* Bäume */}
        {[120, 246, 372].map((x) => (
          <g key={x} transform={`translate(${x} 150)`}>
            <rect x={-2} y={8} width={4} height={12} fill="#8a5a32" />
            <circle r={11} fill="#3fae4a" />
            <circle cx={-3} cy={-4} r={5} fill="#5cc95f" />
          </g>
        ))}
      </svg>
      <div className={styles.ground} />
    </div>
  );
});
