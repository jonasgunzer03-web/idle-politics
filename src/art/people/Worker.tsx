import { memo } from 'react';
import { hash32 } from '../../engine/people';

// Ganzkörper-Figur für Innenräume: Mitarbeiter, Gäste, Berater. Gezeichnet als <g> für ein
// umgebendes SVG (Maßstab: 40 Einheiten breit, 84 hoch, Füße bei y = 0, Mitte bei x = 0).
// Bewegungen laufen über CSS-Klassen (siehe Interior.module.css).

const SKINS = ['#f6d3b3', '#eec19c', '#d9a57e', '#b97f57', '#8d5a3b', '#613d29'];
const HAIRS = ['#2b1d16', '#4a2f1f', '#7a4a26', '#b07a3e', '#d8b26a', '#8f8f8f', '#1b1b1f'];

export type WorkerOutfit = 'overall' | 'shirt' | 'suit' | 'apron' | 'blazer' | 'uniform' | 'casual';
export type WorkerAction = 'work' | 'walk' | 'carry' | 'strike' | 'sit' | 'talk' | 'idle';

interface Props {
  seed: number;
  outfit: WorkerOutfit;
  action: WorkerAction;
  /** Farbe von Krawatte, Halstuch oder Schild. */
  accent?: string;
  /** Blickrichtung. */
  flip?: boolean;
  /** Streikschild-Text. */
  sign?: string;
  className?: string;
}

function pick<T>(list: readonly T[], n: number, fallback: T): T {
  return list[n % list.length] ?? fallback;
}

export const Worker = memo(function Worker({
  seed,
  outfit,
  action,
  accent = '#b3261e',
  flip = false,
  sign,
  className,
}: Props) {
  const skin = pick(SKINS, hash32(seed, 1), '#eec19c');
  const hair = pick(HAIRS, hash32(seed, 2), '#2b1d16');
  const style = hash32(seed, 3) % 4;
  const hue = hash32(seed, 6) % 360;
  const shirt = `hsl(${hue} 38% 46%)`;
  const colors: Record<WorkerOutfit, { top: string; bottom: string }> = {
    overall: { top: '#35577d', bottom: '#2c4a6b' },
    shirt: { top: shirt, bottom: '#3b3f47' },
    suit: { top: '#2b2f38', bottom: '#23262d' },
    apron: { top: shirt, bottom: '#4a4038' },
    blazer: { top: `hsl(${hue} 28% 34%)`, bottom: '#2f333b' },
    uniform: { top: '#3e4a33', bottom: '#333d2a' },
    casual: { top: shirt, bottom: `hsl(${(hue + 180) % 360} 25% 32%)` },
  };
  const c = colors[outfit];
  const sitting = action === 'sit';
  const legClass =
    action === 'walk' || action === 'carry' ? 'legWalk' : action === 'strike' ? 'legStomp' : '';
  const armClass =
    action === 'work'
      ? 'armWork'
      : action === 'talk'
        ? 'armTalk'
        : action === 'strike'
          ? 'armWave'
          : '';
  const bodyClass =
    action === 'work' ? 'bodyBob' : action === 'idle' || action === 'sit' ? 'breathe' : '';

  return (
    <g className={className} transform={flip ? 'scale(-1 1)' : undefined}>
      <ellipse cx={0} cy={0} rx={12} ry={2.5} fill="rgb(0 0 0 / 25%)" />
      <g className={bodyClass}>
        {/* Beine */}
        {sitting ? (
          <g fill={c.bottom}>
            <rect x={-7} y={-30} width={16} height={6} rx={3} />
            <rect x={5} y={-28} width={5} height={26} rx={2} />
            <rect x={-6} y={-28} width={5} height={26} rx={2} />
          </g>
        ) : (
          <>
            <g className={`${legClass} legA`}>
              <rect x={-6} y={-32} width={5.5} height={30} rx={2.5} fill={c.bottom} />
              <rect x={-7} y={-4} width={8} height={4} rx={1.5} fill="#1f1b18" />
            </g>
            <g className={`${legClass} legB`}>
              <rect x={1} y={-32} width={5.5} height={30} rx={2.5} fill={c.bottom} />
              <rect x={0} y={-4} width={8} height={4} rx={1.5} fill="#1f1b18" />
            </g>
          </>
        )}
        {/* Oberkörper */}
        <rect x={-9} y={-60} width={18} height={30} rx={7} fill={c.top} />
        {outfit === 'overall' && (
          <>
            <rect x={-7} y={-46} width={14} height={14} fill={c.bottom} />
            <path d="M-5 -60 V-46 M5 -60 V-46" stroke={c.bottom} strokeWidth={2.5} />
          </>
        )}
        {outfit === 'apron' && <path d="M-7 -50 H7 V-30 H-7 Z" fill="#efe9dc" />}
        {(outfit === 'suit' || outfit === 'blazer') && (
          <>
            <path d="M-3 -60 L0 -48 L3 -60 Z" fill="#f2efe8" />
            {outfit === 'suit' && (
              <path d="M-1 -56 H1 L1.8 -46 L0 -44 L-1.8 -46 Z" style={{ fill: accent }} />
            )}
          </>
        )}
        {/* Arme */}
        <g className={`${armClass} armBack`}>
          <rect x={-12} y={-58} width={5} height={22} rx={2.5} fill={c.top} />
          <circle cx={-9.5} cy={-35} r={2.6} fill={skin} />
        </g>
        <g className={`${armClass} armFront`}>
          <rect x={7} y={-58} width={5} height={22} rx={2.5} fill={c.top} />
          <circle cx={9.5} cy={-35} r={2.6} fill={skin} />
          {action === 'carry' && (
            <rect
              x={4}
              y={-48}
              width={14}
              height={11}
              rx={1}
              fill="#b98a55"
              stroke="#8a6238"
              strokeWidth={0.8}
            />
          )}
        </g>
        {/* Kopf */}
        <rect x={-2.5} y={-64} width={5} height={5} fill={skin} />
        <circle cx={0} cy={-71} r={8} fill={skin} />
        {style === 0 && (
          <path d="M-8 -72 Q-8 -80 0 -80 Q8 -80 8 -72 Q5 -76 0 -76 Q-5 -76 -8 -72 Z" fill={hair} />
        )}
        {style === 1 && (
          <path d="M-8.5 -70 Q-9 -81 1 -80 Q9 -79 8.5 -70 L6 -74 Q-2 -73 -8.5 -70 Z" fill={hair} />
        )}
        {style === 2 && (
          <>
            <path
              d="M-8.5 -71 Q-8 -80 0 -80 Q8 -80 8.5 -71 L8.5 -62 L6 -62 L6 -72 Q0 -75 -6 -72 L-6 -62 L-8.5 -62 Z"
              fill={hair}
            />
          </>
        )}
        {style === 3 && outfit === 'overall' && (
          <path d="M-9 -73 Q-9 -82 0 -82 Q9 -82 9 -73 Z" fill="#f2c14e" />
        )}
        {style === 3 && outfit !== 'overall' && <circle cx={0} cy={-79} r={4} fill={hair} />}
        <circle cx={3} cy={-72} r={1} fill="#2b2f36" />
        <circle cx={-2} cy={-72} r={1} fill="#2b2f36" />
        <path
          d={action === 'strike' ? 'M-1 -66 Q1.5 -68 4 -66' : 'M-1 -67 Q1.5 -65 4 -67'}
          fill="none"
          stroke="#7a3b2e"
          strokeWidth={1}
          strokeLinecap="round"
        />
        {action === 'strike' && (
          <g className="armWave">
            <rect x={11} y={-96} width={1.8} height={50} fill="#6b4a32" />
            <rect
              x={0}
              y={-104}
              width={26}
              height={14}
              fill="#f4efe2"
              stroke="#1c1f24"
              strokeWidth={0.8}
            />
            <text x={13} y={-94.5} textAnchor="middle" fontSize={6} fontWeight={800} fill="#b3261e">
              {sign ?? '!'}
            </text>
          </g>
        )}
      </g>
    </g>
  );
});
