import { memo } from 'react';
import { hairColors, skinTones } from '../../config/appearance';
import type { Character } from '../../engine/schema';
import type { Outfit } from './outfit';
import styles from './Figure.module.css';

// Die Figur wird aus SVG-Einzelteilen zusammengesetzt: Schatten, Beine, Rumpf mit Kleidung,
// Arme, Hals, Kopf (Gesichtsform), Gesicht, Frisur. Koordinaten: 120 × 230.
// Illustrationsfarben (Kleidung, Schuhe) stehen hier bei der Zeichnung, nicht in der Config.

const CX = 60;
const HEAD_CY = 56;

/** Halbe Schulterbreite je Körperbau (schmal, mittel, kräftig). */
const SHOULDER: readonly number[] = [19, 23, 28];

const OUTFITS: Record<
  Outfit,
  { shirt: string; pants: string; shoes: string; overlay?: 'bib' | 'collar' }
> = {
  overalls: { shirt: '#c9ccd1', pants: '#2f5d8c', shoes: '#4a3526', overlay: 'bib' },
  officeShirt: { shirt: '#d7e6f5', pants: '#3b3f47', shoes: '#1f2226', overlay: 'collar' },
};

function darken(hex: string, amount: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.round(c * (1 - amount)));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `rgb(${r} ${g} ${b})`;
}

function Head({ shape, skin }: { shape: number; skin: string }) {
  if (shape === 1) return <ellipse cx={CX} cy={HEAD_CY} rx={20} ry={26} fill={skin} />;
  if (shape === 2) return <rect x={38} y={31} width={44} height={50} rx={15} fill={skin} />;
  return <ellipse cx={CX} cy={HEAD_CY} rx={22} ry={24} fill={skin} />;
}

/** Haarteile hinter dem Kopf (lange Haare, Bob). */
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

/** Haarteile vor dem Kopf (Oberkopf, Pony, Dutt, Locken). */
function HairFront({ style, color }: { style: number; color: string }) {
  const cap = 'M37 54 Q36 28 60 28 Q84 28 83 54 Q80 40 60 38 Q40 40 37 54 Z';
  switch (style) {
    case 0:
      return null;
    case 1:
      return <path d={cap} fill={color} />;
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

interface Props {
  character: Pick<Character, 'build' | 'skinTone' | 'faceShape' | 'hairStyle' | 'hairColor'>;
  outfit: Outfit;
  /** Atmen und Blinzeln an/aus (z. B. aus für kleine Vorschaubilder). */
  animated?: boolean;
  className?: string;
  title?: string;
}

export const Figure = memo(function Figure({
  character,
  outfit,
  animated = true,
  className,
  title,
}: Props) {
  const skin = skinTones[character.skinTone] ?? skinTones[0];
  const hair = hairColors[character.hairColor] ?? hairColors[0];
  const w = SHOULDER[character.build] ?? 23;
  const clothes = OUTFITS[outfit];
  const torso = `M${CX - w} 104 Q${CX - w} 95 ${CX - w + 9} 93 L${CX + w - 9} 93 Q${CX + w} 95 ${CX + w} 104 L${CX + w - 3} 162 L${CX - w + 3} 162 Z`;
  const classes = [styles.figure, animated ? styles.animated : '', className ?? '']
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
      <rect x={CX - 15} y={156} width={13} height={58} rx={4} fill={clothes.pants} />
      <rect x={CX + 2} y={156} width={13} height={58} rx={4} fill={clothes.pants} />
      <ellipse cx={CX - 9} cy={215} rx={10} ry={5} fill={clothes.shoes} />
      <ellipse cx={CX + 9} cy={215} rx={10} ry={5} fill={clothes.shoes} />

      <g className={styles.upper}>
        <HairBack style={character.hairStyle} color={hair} />

        {/* Arme */}
        <rect x={CX - w - 10} y={97} width={11} height={60} rx={5.5} fill={clothes.shirt} />
        <rect x={CX + w - 1} y={97} width={11} height={60} rx={5.5} fill={clothes.shirt} />
        <circle cx={CX - w - 4.5} cy={160} r={5.5} fill={skin} />
        <circle cx={CX + w + 4.5} cy={160} r={5.5} fill={skin} />

        {/* Rumpf */}
        <path d={torso} fill={clothes.shirt} />
        {clothes.overlay === 'bib' && (
          <g>
            <rect
              x={CX - w + 6}
              y={112}
              width={2 * w - 12}
              height={52}
              rx={3}
              fill={clothes.pants}
            />
            <path
              d={`M${CX - w + 8} 94 L${CX - w + 9} 114 M${CX + w - 8} 94 L${CX + w - 9} 114`}
              stroke={clothes.pants}
              strokeWidth={4}
              strokeLinecap="round"
            />
            <rect
              x={CX - 7}
              y={120}
              width={14}
              height={10}
              rx={2}
              fill={darken(clothes.pants, 0.2)}
            />
          </g>
        )}
        {clothes.overlay === 'collar' && (
          <g>
            <path
              d={`M${CX - 9} 93 L${CX} 104 L${CX + 9} 93`}
              fill="none"
              stroke={darken(clothes.shirt, 0.18)}
              strokeWidth={2}
            />
            <line
              x1={CX}
              y1={104}
              x2={CX}
              y2={160}
              stroke={darken(clothes.shirt, 0.15)}
              strokeWidth={1.2}
            />
            <rect
              x={CX - w + 3}
              y={156}
              width={2 * w - 6}
              height={5}
              fill={darken(clothes.pants, 0.3)}
            />
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

        <HairFront style={character.hairStyle} color={hair} />
      </g>
    </svg>
  );
});
