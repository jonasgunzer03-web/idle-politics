import { memo } from 'react';
import { FOREIGN_IDS, REGION_IDS, type ForeignId, type RegionId } from '../../engine/ids';
import { COAST, COUNTRY_SHAPES, type Pt } from './geography';
import { centroid, province, toPath } from './provinces';
import styles from './WorldMap.module.css';

// Die Weltkarte als Spielbrett: Meer, ein erfundener Kontinent mit sechs Ländern, Berge,
// Wälder, ein Fluss, Inseln. Das eigene Land ist in vier Provinzen geteilt, die mit dem
// Ausbau satter werden. Beziehungen färben die Grenzen, Handel zieht goldene Routen.

export const MAP_W = 360;
export const MAP_H = 420;

/** Grundfarbe je Land auf der Karte. */
const LAND: Record<ForeignId, string> = {
  novaria: '#8fd18b',
  rhenania: '#f5d76e',
  borealis: '#b5def2',
  zentralia: '#f2a9a1',
  valmora: '#c9a7e8',
  lysania: '#f7b97a',
};

/** Etwas dunklere Töne für ausgebaute Provinzen (Stufe 0 … 3). */
function provinceFill(base: string, level: number): string {
  const mix = [0, 18, 32, 46][Math.min(3, level)] ?? 0;
  return `color-mix(in srgb, ${base} ${100 - mix}%, #3a7d2c)`;
}

export interface MapPartner {
  id: ForeignId;
  relation: number;
  trade: boolean;
  alliance: boolean;
}

interface Props {
  own: ForeignId;
  partners: MapPartner[];
  /** Ausbaustufe je Provinz (0 = nichts gebaut, 3 = viel gebaut). */
  levels: Record<RegionId, number>;
}

/** Positionen der Provinz-Mittelpunkte (für Knöpfe). */
export function provinceCenters(own: ForeignId): Record<RegionId, Pt> {
  const shape = COUNTRY_SHAPES[own];
  const result = {} as Record<RegionId, Pt>;
  for (const r of REGION_IDS) result[r] = centroid(province(shape.points, shape.center, r));
  return result;
}

function Mountains({ at }: { at: Pt[] }) {
  return (
    <g>
      {at.map(([x, y]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
          <path d="M-11 6 L0 -10 L11 6 Z" fill="#9aa3ad" />
          <path d="M0 -10 L11 6 L3 6 Z" fill="#7d8792" />
          <path d="M-4.2 -3.8 L0 -10 L4.2 -3.8 L1.8 -2.4 L0 -4.2 L-1.8 -2.4 Z" fill="#ffffff" />
        </g>
      ))}
    </g>
  );
}

function Trees({ at }: { at: Pt[] }) {
  return (
    <g>
      {at.map(([x, y]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
          <rect x={-1.2} y={2} width={2.4} height={4} fill="#8a5a32" />
          <circle cx={0} cy={0} r={5} fill="#3f9a4a" />
          <circle cx={-1.6} cy={-1.6} r={2.2} fill="#5cbf5f" />
        </g>
      ))}
    </g>
  );
}

export const WorldMap = memo(function WorldMap({ own, partners, levels }: Props) {
  const ownShape = COUNTRY_SHAPES[own];
  const byId = new Map(partners.map((p) => [p.id, p]));
  return (
    <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className={styles.svg} role="img" aria-hidden="true">
      <defs>
        <linearGradient id="map-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6fd0f5" />
          <stop offset="1" stopColor="#3aa9e6" />
        </linearGradient>
        <pattern id="map-waves" width="40" height="26" patternUnits="userSpaceOnUse">
          <path
            d="M4 10 q4 -4 8 0 t8 0 M24 22 q4 -4 8 0 t8 0"
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.45"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </pattern>
        <pattern
          id="map-hostile"
          width="7"
          height="7"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="3" height="7" fill="#e0343f" fillOpacity="0.22" />
        </pattern>
      </defs>

      {/* Meer mit Wellen */}
      <rect width={MAP_W} height={MAP_H} fill="url(#map-sea)" />
      <rect width={MAP_W} height={MAP_H} fill="url(#map-waves)" />

      {/* Inseln */}
      {(
        [
          [24, 40, 10],
          [348, 270, 7],
          [22, 402, 9],
          [338, 394, 6],
        ] as const
      ).map(([x, y, r]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r={r + 3} fill="#ffffff" fillOpacity="0.6" />
          <circle cx={x} cy={y} r={r} fill="#f3e2b0" />
          <circle cx={x - r * 0.15} cy={y - r * 0.15} r={r * 0.6} fill="#7cc96a" />
        </g>
      ))}

      {/* Brandung und Strand */}
      <path
        d={COAST}
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.75"
        strokeWidth={13}
        strokeLinejoin="round"
      />
      <path d={COAST} fill="#f3e2b0" stroke="#f3e2b0" strokeWidth={7} strokeLinejoin="round" />

      {/* Länder */}
      {FOREIGN_IDS.map((id) => {
        const shape = COUNTRY_SHAPES[id];
        const p = byId.get(id);
        const hostile = p !== undefined && p.relation <= -25;
        const friend = p !== undefined && p.relation >= 25;
        return (
          <g key={id} className={id === own ? styles.own : styles.country}>
            <path d={shape.path} fill={LAND[id]} />
            {hostile && <path d={shape.path} fill="url(#map-hostile)" />}
            {friend && (
              <path
                d={shape.path}
                fill="none"
                stroke="#2fbf55"
                strokeOpacity="0.55"
                strokeWidth={6}
                strokeLinejoin="round"
              />
            )}
          </g>
        );
      })}

      {/* Eigenes Land: Provinzen, je nach Ausbau satter */}
      {REGION_IDS.map((r) => (
        <path
          key={r}
          d={toPath(province(ownShape.points, ownShape.center, r))}
          fill={provinceFill(LAND[own], levels[r])}
          stroke="#ffffff"
          strokeWidth={1.4}
          strokeDasharray="4 3"
          strokeLinejoin="round"
        />
      ))}

      {/* Landschaft */}
      <path
        d="M206 118 C 186 150, 210 176, 190 206 S 172 262, 196 298 S 184 336, 187 352"
        fill="none"
        stroke="#4fb6ec"
        strokeWidth={3.2}
        strokeLinecap="round"
      />
      <ellipse cx={244} cy={108} rx={13} ry={7} fill="#4fb6ec" />
      <Mountains
        at={[
          [132, 70],
          [148, 60],
          [226, 72],
          [302, 204],
          [318, 222],
          [276, 352],
          [60, 336],
        ]}
      />
      <Trees
        at={[
          [56, 150],
          [70, 160],
          [84, 246],
          [48, 214],
          [94, 296],
          [140, 352],
          [152, 170],
          [258, 270],
          [292, 300],
        ]}
      />

      {/* Grenzen: weiß, bei Feinden rot gestrichelt */}
      {FOREIGN_IDS.map((id) => {
        const p = byId.get(id);
        const hostile = p !== undefined && p.relation <= -25;
        return (
          <path
            key={`b-${id}`}
            d={COUNTRY_SHAPES[id].path}
            fill="none"
            stroke={hostile ? '#e0343f' : '#ffffff'}
            strokeWidth={hostile ? 2.4 : 2.2}
            strokeDasharray={hostile ? '6 4' : undefined}
            strokeLinejoin="round"
          />
        );
      })}
      <path
        d={ownShape.path}
        fill="none"
        stroke="#ffffff"
        strokeWidth={4}
        strokeLinejoin="round"
        className={styles.ownBorder}
      />

      {/* Handelsrouten und Bündnisse */}
      {partners.map((p) => {
        if (!p.trade && !p.alliance) return null;
        const [x1, y1] = ownShape.center;
        const [x2, y2] = COUNTRY_SHAPES[p.id].center;
        const mx = (x1 + x2) / 2 + (y2 - y1) * 0.18;
        const my = (y1 + y2) / 2 - (x2 - x1) * 0.18;
        return (
          <g key={`r-${p.id}`}>
            <path
              d={`M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`}
              fill="none"
              stroke={p.alliance ? '#2fbf55' : '#ffb31a'}
              strokeWidth={p.alliance ? 4 : 3}
              strokeDasharray={p.alliance ? undefined : '7 5'}
              strokeLinecap="round"
              opacity={0.9}
            />
            <g transform={`translate(${(x1 + 2 * mx + x2) / 4} ${(y1 + 2 * my + y2) / 4})`}>
              <g className={styles.bob}>
                <circle r={7} fill="#ffffff" />
                {p.alliance ? (
                  <path
                    d="M-3.4 0.2 L-0.9 2.8 L3.6 -2.4"
                    fill="none"
                    stroke="#2fbf55"
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : (
                  <>
                    <rect x={-4} y={-3.2} width={8} height={6.4} rx={1} fill="#d79a55" />
                    <path d="M-4 -0.6 H4 M0 -3.2 V3.2" stroke="#a8692f" strokeWidth={1} />
                  </>
                )}
              </g>
            </g>
          </g>
        );
      })}

      {/* Kompass */}
      <g transform="translate(336 30)">
        <circle r={13} fill="#ffffff" fillOpacity="0.85" />
        <path d="M0 -11 L3 0 L0 11 L-3 0 Z" fill="#e0343f" />
        <path d="M0 0 L3 0 L0 11 L-3 0 Z" fill="#24304a" />
        <text y={-14.5} textAnchor="middle" fontSize={7} fontWeight={800} fill="#ffffff">
          N
        </text>
      </g>
    </svg>
  );
});
