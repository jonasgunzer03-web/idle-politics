import { memo, type ReactNode } from 'react';
import type { LocationId } from '../../engine/ids';
import type { ArchPalette } from './palette';
import styles from './Interior.module.css';

// Innenräume der Gebäude (390 × 300, unten mittig verankert). Möbel je Ort, Farben je Baustil.
// Die Figuren (Spieler und Mitarbeiter) legt die Oberfläche als eigene Ebene darüber.

const FLOOR = 250;

interface RoomProps {
  p: ArchPalette;
  partyColor: string;
  office: boolean;
  grandeur: number;
}

function Desk({ x, y = FLOOR - 32 }: { x: number; y?: number }) {
  return (
    <g>
      <rect x={x - 26} y={y} width={52} height={6} fill="#8b6b4a" />
      <rect x={x - 22} y={y + 6} width={4} height={FLOOR - y - 6} fill="#6b4a32" />
      <rect x={x + 18} y={y + 6} width={4} height={FLOOR - y - 6} fill="#6b4a32" />
      <rect x={x - 10} y={y - 16} width={20} height={14} rx={1} fill="#2b2f36" />
      <rect x={x - 8} y={y - 14} width={16} height={10} className="screen" />
    </g>
  );
}

function Window({ x, y, w = 50, h = 70 }: { x: number; y: number; w?: number; h?: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} className="sky" />
      <rect x={x} y={y} width={w} height={h} fill="none" stroke="#6f675c" strokeWidth={4} />
      <path
        d={`M${x + w / 2} ${y} V${y + h} M${x} ${y + h / 2} H${x + w}`}
        stroke="#6f675c"
        strokeWidth={2}
      />
    </g>
  );
}

function Flag({ x, color }: { x: number; color: string }) {
  return (
    <g>
      <rect x={x} y={120} width={3} height={FLOOR - 120} fill="#c9a227" />
      <path d={`M${x + 3} 124 h30 v34 h-30 Z`} fill={color} />
    </g>
  );
}

function Portrait({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 18} y={y} width={36} height={46} fill="#8b6b4a" />
      <rect x={x - 14} y={y + 4} width={28} height={38} fill="#e8dcc6" />
      <circle cx={x} cy={y + 18} r={7} fill="#c98c64" />
      <rect x={x - 9} y={y + 26} width={18} height={14} fill="#2f3440" />
    </g>
  );
}

function Room({ wall, floor, children }: { wall: string; floor: string; children: ReactNode }) {
  return (
    <g>
      <rect x={0} y={0} width={390} height={FLOOR} fill={wall} />
      <rect x={0} y={FLOOR - 8} width={390} height={8} fill="rgb(0 0 0 / 12%)" />
      <rect x={0} y={FLOOR} width={390} height={50} fill={floor} />
      {children}
    </g>
  );
}

function roomFor(id: LocationId, { p, partyColor, office, grandeur }: RoomProps): ReactNode {
  switch (id) {
    case 'workplace':
      return office ? (
        <Room wall="#e6e3dc" floor="#9aa3a8">
          <Window x={40} y={50} />
          <Window x={300} y={50} />
          <Desk x={90} />
          <Desk x={170} />
          <rect x={230} y={150} width={40} height={100} fill="#b9b4a8" />
          <rect x={234} y={156} width={32} height={8} fill="#8f8a80" />
          <rect x={234} y={176} width={32} height={8} fill="#8f8a80" />
        </Room>
      ) : (
        <Room wall="#b9b0a2" floor="#7d7a74">
          <rect x={0} y={30} width={390} height={20} className="sky" opacity={0.6} />
          <rect x={30} y={170} width={120} height={50} fill="#5c6770" />
          <rect x={40} y={160} width={30} height={14} fill="#c9a227" />
          <rect x={30} y={220} width={200} height={10} fill="#2b2f36" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <circle key={i} cx={40 + i * 36} cy={235} r={5} fill="#47515a" className="gear" />
          ))}
          <rect x={250} y={140} width={60} height={90} fill="#8f5a3c" />
          <rect x={256} y={150} width={48} height={20} fill="#c0392b" />
        </Room>
      );
    case 'pub':
      return (
        <Room wall="#6b4a32" floor="#4a3526">
          <rect x={20} y={80} width={150} height={60} fill="#3b2a20" />
          {[0, 1, 2, 3, 4].map((i) => (
            <rect
              key={i}
              x={30 + i * 28}
              y={90}
              width={10}
              height={40}
              rx={3}
              fill={['#2e7d4f', '#b5502c', '#c9a227', '#1f5fa8', '#8b1e1e'][i]}
            />
          ))}
          <rect x={10} y={190} width={210} height={16} fill="#8b6b4a" />
          <rect x={10} y={206} width={210} height={44} fill="#5a3b24" />
          <circle cx={290} cy={206} r={30} fill="#8b6b4a" />
          <rect x={286} y={206} width={8} height={44} fill="#5a3b24" />
          <Window x={320} y={60} w={50} h={60} />
        </Room>
      );
    case 'market':
      return (
        <Room wall="#bcd6e6" floor="#b7b2a7">
          <rect x={20} y={170} width={120} height={80} fill="#8b6b4a" />
          <path d="M10 170 L30 130 H130 L150 170 Z" fill="#c0392b" />
          {[0, 1, 2, 3].map((i) => (
            <circle
              key={i}
              cx={40 + i * 26}
              cy={172}
              r={9}
              fill={['#e67e22', '#c0392b', '#2e7d4f', '#f2c14e'][i]}
            />
          ))}
          <rect x={200} y={160} width={80} height={60} fill="#f4efe2" stroke="#2b2f36" />
          <rect x={205} y={166} width={70} height={16} fill={partyColor} />
          <rect x={210} y={188} width={60} height={4} fill="#8f8a80" />
          <rect x={210} y={198} width={50} height={4} fill="#8f8a80" />
          <rect x={236} y={220} width={8} height={30} fill="#6b4a32" />
        </Room>
      );
    case 'partyOffice':
      return (
        <Room wall="#efe9dd" floor="#8b6b4a">
          <rect x={30} y={40} width={80} height={100} fill={partyColor} />
          <circle cx={70} cy={80} r={20} fill="#f4efe2" />
          <rect
            x={140}
            y={50}
            width={60}
            height={80}
            fill="#f4efe2"
            stroke={partyColor}
            strokeWidth={3}
          />
          <rect x={148} y={60} width={44} height={8} fill={partyColor} />
          <Desk x={110} />
          <rect x={250} y={130} width={110} height={120} fill="#c9b797" />
          {[0, 1, 2].map((i) => (
            <rect key={i} x={256} y={140 + i * 36} width={98} height={28} fill="#e8dcc6" />
          ))}
        </Room>
      );
    case 'townHall':
      return (
        <Room wall="#e2d8c3" floor="#8f5a3c">
          <Window x={30} y={40} w={46} h={90} />
          <Window x={314} y={40} w={46} h={90} />
          <path d="M60 250 Q195 150 330 250" fill="none" stroke="#6b4a32" strokeWidth={18} />
          <rect x={170} y={170} width={50} height={60} fill="#6b4a32" />
          <Portrait x={195} y={60} />
          <Flag x={110} color={p.accent} />
        </Room>
      );
    case 'newspaper':
      return (
        <Room wall="#d6d0c2" floor="#6f675c">
          <rect x={20} y={140} width={140} height={100} fill="#3b3f47" />
          {[0, 1, 2].map((i) => (
            <circle key={i} cx={50 + i * 40} cy={190} r={22} fill="#5c6770" className="gear" />
          ))}
          <rect x={30} y={120} width={120} height={16} fill="#f4efe2" />
          <Desk x={230} />
          <Desk x={320} />
          <rect x={200} y={50} width={160} height={50} fill="#1c1f24" />
          <text
            x={280}
            y={82}
            textAnchor="middle"
            fontSize="16"
            fontWeight="700"
            fill="#f4efe2"
            fontFamily="serif"
          >
            TAGESBOTE
          </text>
        </Room>
      );
    case 'bank':
      return (
        <Room wall="#ece6d8" floor="#b9a98f">
          {[40, 130, 220, 310].map((x) => (
            <rect key={x} x={x} y={30} width={18} height={220} fill={p.stone} />
          ))}
          <rect x={20} y={180} width={350} height={20} fill="#6b4a32" />
          <rect x={20} y={200} width={350} height={50} fill="#8b6b4a" />
          <circle cx={300} cy={120} r={30} fill="#8f8a80" stroke="#5a5f66" strokeWidth={6} />
          <circle cx={300} cy={120} r={6} fill="#c9a227" />
        </Room>
      );
    case 'parliament':
      return (
        <Room wall="#1f3a5f" floor="#6b4a32">
          {[0, 1, 2].map((row) => (
            <path
              key={row}
              d={`M${10 + row * 20} ${170 + row * 25} Q195 ${110 + row * 25} ${380 - row * 20} ${170 + row * 25}`}
              fill="none"
              stroke="#3a6ea5"
              strokeWidth={14}
            />
          ))}
          <rect x={170} y={190} width={50} height={60} fill="#8b6b4a" />
          <rect x={160} y={40} width={70} height={50} fill={p.accent} />
          <circle cx={195} cy={65} r={16} fill={p.trim} />
        </Room>
      );
    case 'ministry':
      return (
        <Room wall="#d9cfbd" floor="#6b4a32">
          <Window x={40} y={40} w={60} h={100} />
          <rect x={150} y={180} width={130} height={10} fill="#5a3b24" />
          <rect x={150} y={190} width={130} height={60} fill="#6b4a32" />
          <Portrait x={215} y={50} />
          <Flag x={300} color={p.accent} />
          <rect x={310} y={170} width={50} height={80} fill="#8b6b4a" />
        </Room>
      );
    case 'embassy':
      return (
        <Room wall="#f2ece0" floor="#b9a98f">
          <path
            d="M195 20 V50 M175 50 H215 L205 80 H185 Z"
            stroke="#c9a227"
            strokeWidth={3}
            fill="#f6e7b0"
          />
          {[60, 120, 270, 330].map((x, i) => (
            <Flag key={x} x={x} color={['#1f3a5f', '#12848a', '#2e7d4f', '#9e1b1b'][i] ?? '#999'} />
          ))}
          <rect x={150} y={200} width={90} height={10} fill="#f4efe2" />
          <rect x={160} y={210} width={70} height={40} fill="#e8dcc6" />
        </Room>
      );
    case 'palace':
      return (
        <Room wall={grandeur >= 3 ? '#7a1f2b' : '#6b1f24'} floor="#c9a227">
          {[40, 350].map((x) => (
            <rect key={x} x={x - 10} y={20} width={20} height={230} fill="#c9a227" />
          ))}
          <path
            d="M195 20 V40 M170 40 H220 L208 70 H182 Z"
            stroke="#f6e7b0"
            strokeWidth={3}
            fill="#f6e7b0"
          />
          <rect x={150} y={250} width={90} height={50} fill="#9e1b1b" />
          <rect x={165} y={170} width={60} height={80} fill="#5a3b24" />
          <rect x={160} y={160} width={70} height={12} fill="#c9a227" />
          <Portrait x={195} y={70} />
          <Flag x={90} color={partyColor} />
          <Flag x={280} color={p.accent} />
        </Room>
      );
  }
}

export interface InteriorArtProps extends RoomProps {
  location: LocationId;
}

export const InteriorArt = memo(function InteriorArt({ location, ...props }: InteriorArtProps) {
  return (
    <svg
      viewBox="0 0 390 300"
      preserveAspectRatio="xMidYMax slice"
      className={styles.interior}
      aria-hidden="true"
    >
      {roomFor(location, props)}
    </svg>
  );
});
