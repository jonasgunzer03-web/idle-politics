import { memo } from 'react';
import { hairColors, partyColors, skinTones } from '../../config/appearance';
import type { AccessoryId } from '../../engine/ids';
import type { Character } from '../../engine/schema';
import type { Outfit } from './outfit';
import styles from './Figure.module.css';

// Die Figur wird aus SVG-Einzelteilen zusammengesetzt: Schatten, Beine, Rumpf mit Kleidung,
// Arme, Hals, Kopf (Gesichtsform), Gesicht, Bart, Brille, Frisur, Accessoires.
// Koordinaten: 120 × 230. Illustrationsfarben stehen hier bei der Zeichnung.

const CX = 60;
const HEAD_CY = 56;

/** Halbe Schulterbreite je Körperbau (schmal, mittel, kräftig). */
const SHOULDER: readonly number[] = [19, 23, 28];

interface OutfitStyle {
  shirt: string;
  sleeves: string;
  pants: string;
  shoes: string;
  jacket?: string;
  lapel?: string;
  overlay?: 'bib' | 'collar';
  tie?: boolean;
}

const OUTFITS: Record<Outfit, OutfitStyle> = {
  overalls: {
    shirt: '#c9ccd1',
    sleeves: '#c9ccd1',
    pants: '#2f5d8c',
    shoes: '#4a3526',
    overlay: 'bib',
  },
  officeShirt: {
    shirt: '#d7e6f5',
    sleeves: '#d7e6f5',
    pants: '#3b3f47',
    shoes: '#1f2226',
    overlay: 'collar',
  },
  blazer: {
    shirt: '#f2f2ef',
    sleeves: '#6b5a48',
    pants: '#4a4f57',
    shoes: '#2a2420',
    jacket: '#6b5a48',
    lapel: '#5a4b3c',
  },
  suit: {
    shirt: '#ffffff',
    sleeves: '#2f3440',
    pants: '#2f3440',
    shoes: '#15171b',
    jacket: '#2f3440',
    lapel: '#252a33',
    tie: true,
  },
  stateSuit: {
    shirt: '#ffffff',
    sleeves: '#1c2230',
    pants: '#1c2230',
    shoes: '#0f1115',
    jacket: '#1c2230',
    lapel: '#141925',
    tie: true,
  },
  sashSuit: {
    shirt: '#ffffff',
    sleeves: '#15161b',
    pants: '#15161b',
    shoes: '#0b0c0f',
    jacket: '#15161b',
    lapel: '#0f1014',
    tie: true,
  },
  uniform: {
    shirt: '#4b5a3a',
    sleeves: '#4b5a3a',
    pants: '#3c4a2e',
    shoes: '#111',
    jacket: '#4b5a3a',
    lapel: '#3f4d30',
  },
};

function darken(hex: string, amount: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.round(c * (1 - amount)));
  return `rgb(${f((n >> 16) & 255)} ${f((n >> 8) & 255)} ${f(n & 255)})`;
}

function Head({ shape, skin }: { shape: number; skin: string }) {
  if (shape === 1) return <ellipse cx={CX} cy={HEAD_CY} rx={20} ry={26} fill={skin} />;
  if (shape === 2) return <rect x={38} y={31} width={44} height={50} rx={15} fill={skin} />;
  return <ellipse cx={CX} cy={HEAD_CY} rx={22} ry={24} fill={skin} />;
}

function HairBack({ style, color }: { style: number; color: string }) {
  if (style === 4) {
    return (
      <path
        d="M35 48 Q35 25 60 25 Q85 25 85 48 L88 100 Q74 94 60 95 Q46 94 32 100 Z"
        fill={color}
      />
    );
  }
  if (style === 7) {
    return (
      <path d="M35 50 Q35 26 60 26 Q85 26 85 50 L86 80 Q73 84 60 84 Q47 84 34 80 Z" fill={color} />
    );
  }
  return null;
}

function HairFront({ style, color }: { style: number; color: string }) {
  const cap = 'M37 54 Q36 28 60 28 Q84 28 83 54 Q80 40 60 38 Q40 40 37 54 Z';
  switch (style) {
    case 0:
      return null;
    case 2:
      return <path d="M36 56 Q35 26 60 26 Q85 26 84 56 Q82 40 70 36 Q58 45 39 44 Z" fill={color} />;
    case 3:
      return <path d={cap} fill={color} opacity={0.55} />;
    case 4:
    case 7:
      return <path d="M36 52 Q36 27 60 27 Q84 27 84 52 Q76 38 66 40 Q56 46 36 52 Z" fill={color} />;
    case 5:
      return (
        <g fill={color}>
          <circle cx={CX} cy={24} r={9} />
          <path d={cap} />
        </g>
      );
    case 6: {
      const curls: [number, number][] = [
        [40, 44],
        [44, 34],
        [52, 28],
        [60, 26],
        [68, 28],
        [76, 34],
        [80, 44],
        [38, 52],
        [82, 52],
      ];
      return (
        <g fill={color}>
          {curls.map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={8} />
          ))}
        </g>
      );
    }
    default:
      return <path d={cap} fill={color} />;
  }
}

function Beard({ kind, color }: { kind: number; color: string }) {
  switch (kind) {
    case 1:
      return (
        <path
          d="M44 64 Q46 80 60 82 Q74 80 76 64 Q70 76 60 77 Q50 76 44 64 Z"
          fill={color}
          opacity={0.35}
        />
      );
    case 2:
      return <path d="M51 67 Q60 63 69 67 Q66 70 60 69 Q54 70 51 67 Z" fill={color} />;
    case 3:
      return <path d="M53 74 Q60 72 67 74 Q66 84 60 86 Q54 84 53 74 Z" fill={color} />;
    case 4:
      return (
        <path
          d="M40 58 Q41 84 60 88 Q79 84 80 58 Q76 72 69 74 Q60 70 51 74 Q44 72 40 58 Z"
          fill={color}
        />
      );
    default:
      return null;
  }
}

function Glasses({ kind }: { kind: number }) {
  const stroke = '#2a2320';
  switch (kind) {
    case 1:
      return (
        <g fill="rgb(255 255 255 / 25%)" stroke={stroke} strokeWidth={1.6}>
          <circle cx={52} cy={56} r={6} />
          <circle cx={68} cy={56} r={6} />
          <path d="M58 56 H62" fill="none" />
        </g>
      );
    case 2:
      return (
        <g fill="rgb(255 255 255 / 25%)" stroke={stroke} strokeWidth={1.6}>
          <rect x={45} y={51} width={13} height={10} rx={2} />
          <rect x={62} y={51} width={13} height={10} rx={2} />
          <path d="M58 55 H62" fill="none" />
        </g>
      );
    case 3:
      return (
        <g fill="none" stroke={stroke} strokeWidth={1.8}>
          <path d="M45 53 H58 M62 53 H75 M58 54 H62" />
          <path
            d="M45 53 Q46 61 52 61 Q57 61 58 53 M62 53 Q63 61 68 61 Q74 61 75 53"
            strokeWidth={0.8}
          />
        </g>
      );
    default:
      return null;
  }
}

export interface FigureProps {
  character: Pick<
    Character,
    | 'build'
    | 'skinTone'
    | 'faceShape'
    | 'hairStyle'
    | 'hairColor'
    | 'beard'
    | 'glasses'
    | 'party'
    | 'accessories'
  >;
  outfit: Outfit;
  /** Atmen und Blinzeln an/aus (z. B. aus für kleine Vorschaubilder). */
  animated?: boolean;
  /** Schritt-Animation beim Laufen. */
  walking?: boolean;
  /** Blickrichtung. */
  facing?: 'left' | 'right';
  className?: string;
  title?: string;
}

export const Figure = memo(function Figure({
  character,
  outfit,
  animated = true,
  walking = false,
  facing = 'right',
  className,
  title,
}: FigureProps) {
  const skin = skinTones[character.skinTone] ?? skinTones[0];
  const hair = hairColors[character.hairColor] ?? hairColors[0];
  const party = partyColors[character.party.color] ?? partyColors[0];
  const w = SHOULDER[character.build] ?? 23;
  const c = OUTFITS[outfit];
  const has = (a: AccessoryId) => character.accessories.includes(a);
  const torso = `M${CX - w} 104 Q${CX - w} 95 ${CX - w + 9} 93 L${CX + w - 9} 93 Q${CX + w} 95 ${CX + w} 104 L${CX + w - 3} 162 L${CX - w + 3} 162 Z`;
  const showTie = c.tie || has('tie');
  const showSash = outfit === 'sashSuit' || has('sash');
  const showMedal = outfit === 'uniform' || has('medal');
  const showPin = outfit === 'stateSuit' || has('partyPin');
  const classes = [
    styles.figure,
    animated ? styles.animated : '',
    walking ? styles.walking : '',
    facing === 'left' ? styles.left : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <svg
      viewBox="0 0 120 230"
      className={classes}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <ellipse cx={CX} cy={220} rx={w + 8} ry={5} fill="rgb(0 0 0 / 18%)" />

      {/* Beine und Schuhe */}
      <g className={styles.legL}>
        <rect x={CX - 15} y={156} width={13} height={58} rx={4} fill={c.pants} />
        <ellipse cx={CX - 9} cy={215} rx={10} ry={5} fill={c.shoes} />
      </g>
      <g className={styles.legR}>
        <rect x={CX + 2} y={156} width={13} height={58} rx={4} fill={c.pants} />
        <ellipse cx={CX + 9} cy={215} rx={10} ry={5} fill={c.shoes} />
      </g>

      <g className={styles.upper}>
        <HairBack style={character.hairStyle} color={hair} />

        {/* Arme */}
        <rect x={CX - w - 10} y={97} width={11} height={60} rx={5.5} fill={c.sleeves} />
        <rect x={CX + w - 1} y={97} width={11} height={60} rx={5.5} fill={c.sleeves} />
        <circle cx={CX - w - 4.5} cy={160} r={5.5} fill={skin} />
        <circle cx={CX + w + 4.5} cy={160} r={5.5} fill={skin} />

        {/* Rumpf */}
        <path d={torso} fill={c.shirt} />
        {c.overlay === 'bib' && (
          <g>
            <rect x={CX - w + 6} y={112} width={2 * w - 12} height={52} rx={3} fill={c.pants} />
            <path
              d={`M${CX - w + 8} 94 L${CX - w + 9} 114 M${CX + w - 8} 94 L${CX + w - 9} 114`}
              stroke={c.pants}
              strokeWidth={4}
              strokeLinecap="round"
            />
            <rect x={CX - 7} y={120} width={14} height={10} rx={2} fill={darken(c.pants, 0.2)} />
          </g>
        )}
        {c.overlay === 'collar' && (
          <g>
            <path
              d={`M${CX - 9} 93 L${CX} 104 L${CX + 9} 93`}
              fill="none"
              stroke={darken(c.shirt, 0.18)}
              strokeWidth={2}
            />
            <line
              x1={CX}
              y1={104}
              x2={CX}
              y2={160}
              stroke={darken(c.shirt, 0.15)}
              strokeWidth={1.2}
            />
            <rect x={CX - w + 3} y={156} width={2 * w - 6} height={5} fill={darken(c.pants, 0.3)} />
          </g>
        )}
        {showTie && (
          <path
            d={`M${CX - 3} 97 L${CX + 3} 97 L${CX + 4} 132 L${CX} 138 L${CX - 4} 132 Z`}
            fill={has('tie') ? party : '#7a1f2b'}
          />
        )}
        {c.jacket && (
          <g>
            <path
              d={`M${CX - w} 104 Q${CX - w} 95 ${CX - w + 9} 93 L${CX - 7} 93 L${CX - 2} 150 L${CX - w + 3} 162 Z`}
              fill={c.jacket}
            />
            <path
              d={`M${CX + w} 104 Q${CX + w} 95 ${CX + w - 9} 93 L${CX + 7} 93 L${CX + 2} 150 L${CX + w - 3} 162 Z`}
              fill={c.jacket}
            />
            <path
              d={`M${CX - 7} 93 L${CX - 2} 118 L${CX - 12} 106 Z M${CX + 7} 93 L${CX + 2} 118 L${CX + 12} 106 Z`}
              fill={c.lapel ?? c.jacket}
            />
            {outfit === 'uniform' && (
              <g>
                <rect x={CX - w - 2} y={94} width={12} height={5} rx={2} fill="#c9a227" />
                <rect x={CX + w - 10} y={94} width={12} height={5} rx={2} fill="#c9a227" />
                <path d={`M${CX - w + 3} 150 H${CX + w - 3}`} stroke="#2a2a1e" strokeWidth={5} />
              </g>
            )}
          </g>
        )}
        {showSash && (
          <path
            d={`M${CX + w - 6} 95 L${CX + w - 1} 101 L${CX - w + 5} 160 L${CX - w + 1} 152 Z`}
            fill={party}
            opacity={0.95}
          />
        )}
        {showPin && (
          <circle cx={CX - w + 12} cy={110} r={3} fill={party} stroke="#c9a227" strokeWidth={1} />
        )}
        {showMedal && (
          <g>
            <rect x={CX + 8} y={106} width={10} height={5} fill={party} />
            <circle cx={CX + 13} cy={117} r={4.5} fill="#d9b44a" stroke="#8a6d1f" strokeWidth={1} />
          </g>
        )}

        {/* Hals und Kopf */}
        <rect x={CX - 6} y={78} width={12} height={18} rx={4} fill={darken(skin, 0.08)} />
        <ellipse cx={CX - 21} cy={58} rx={4} ry={6} fill={darken(skin, 0.06)} />
        <ellipse cx={CX + 21} cy={58} rx={4} ry={6} fill={darken(skin, 0.06)} />
        <Head shape={character.faceShape} skin={skin} />

        {/* Gesicht */}
        <path
          d="M47 49 q5 -3 10 0 M63 49 q5 -3 10 0"
          stroke={character.hairStyle === 0 ? darken(skin, 0.45) : hair}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
        />
        <g className={styles.eyes}>
          <circle cx={52} cy={56} r={2.6} fill="#2a2320" />
          <circle cx={68} cy={56} r={2.6} fill="#2a2320" />
        </g>
        <path
          d="M60 58 q-2.5 6 1 7"
          stroke={darken(skin, 0.25)}
          strokeWidth={1.5}
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M54 70 q6 4 12 0"
          stroke="#7a3b2e"
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
        />
        <Beard kind={character.beard} color={hair} />
        <Glasses kind={character.glasses} />

        <HairFront style={character.hairStyle} color={hair} />
      </g>
    </svg>
  );
});
