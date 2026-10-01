import { memo, type ReactNode } from 'react';
import { defaultConfig } from '../../config';
import type { LocationId, MachineId } from '../../engine/ids';
import { hash32, workerProfile } from '../../engine/people';
import type { Character } from '../../engine/schema';
import { Figure } from '../figure/Figure';
import type { Outfit } from '../figure/outfit';
import { Worker, type WorkerAction, type WorkerOutfit } from '../people/Worker';
import type { ArchPalette } from '../world/palette';
import { FLOOR, MachineArt } from './machines';
import styles from './Interior.module.css';

// Innenräume: Raum mit Tiefe (Rückwand, Fenster mit Tag und Nacht, Boden), Maschinen je
// Stufe, arbeitende und laufende Mitarbeiter, im Parteibüro der Beratertisch.
// Der Raum wächst mit der Ausbaustufe: mehr Arbeitsplätze, edlere Ausstattung.

const cfg = defaultConfig;
const W = 400;

type Mood = 'happy' | 'neutral' | 'angry';

interface Station {
  x: number;
  action: WorkerAction;
  flip?: boolean;
  /** Steht hinter dem Tresen (die Theke verdeckt die Beine). */
  behind?: boolean;
}

interface RoomDef {
  wall: string;
  wainscot: string;
  floor: string;
  floorKind: 'planks' | 'tiles' | 'stone' | 'carpet' | 'concrete';
  outfit: WorkerOutfit;
  /** Arbeitsplätze in der Reihenfolge, in der sie besetzt werden. */
  stations: Station[];
  /** Laufweg für zusätzliche Mitarbeiter. */
  walk: [number, number];
  /** Tragen die Laufenden Kisten? */
  carry: boolean;
  /** Fenster in der Rückwand. */
  windows: number[];
  /** Gäste (Kundschaft), die unabhängig von der Belegschaft da sind. */
  guests: number;
}

const ROOMS: Record<LocationId, RoomDef> = {
  workplace: {
    wall: '#f6c37a',
    wainscot: '#d98f45',
    floor: '#9fb0c4',
    floorKind: 'concrete',
    outfit: 'overall',
    stations: [
      { x: 70, action: 'work' },
      { x: 130, action: 'work' },
      { x: 190, action: 'work' },
      { x: 235, action: 'work', flip: true },
      { x: 100, action: 'work', flip: true },
      { x: 160, action: 'work', flip: true },
    ],
    walk: [60, 300],
    carry: true,
    windows: [40, 150, 260],
    guests: 0,
  },
  pub: {
    wall: '#d0614a',
    wainscot: '#7a2f22',
    floor: '#b0703f',
    floorKind: 'planks',
    outfit: 'apron',
    stations: [
      { x: 90, action: 'work', behind: true },
      { x: 150, action: 'work', behind: true },
      { x: 50, action: 'talk', behind: true },
      { x: 200, action: 'talk', flip: true, behind: true },
    ],
    walk: [220, 320],
    carry: false,
    windows: [300],
    guests: 3,
  },
  market: {
    wall: '#c4ebff',
    wainscot: '#ffb84d',
    floor: '#eadcb4',
    floorKind: 'tiles',
    outfit: 'apron',
    stations: [
      { x: 64, action: 'work' },
      { x: 122, action: 'work' },
      { x: 180, action: 'work' },
      { x: 238, action: 'work' },
      { x: 300, action: 'talk', flip: true },
    ],
    walk: [40, 280],
    carry: true,
    windows: [30, 140, 250],
    guests: 3,
  },
  partyOffice: {
    wall: '#fff1d6',
    wainscot: '#ea4c89',
    floor: '#c98a4b',
    floorKind: 'planks',
    outfit: 'shirt',
    stations: [
      { x: 40, action: 'work' },
      { x: 76, action: 'work', flip: true },
    ],
    walk: [30, 90],
    carry: false,
    windows: [30, 330],
    guests: 0,
  },
  townHall: {
    wall: '#fff0c9',
    wainscot: '#c9a24a',
    floor: '#c49460',
    floorKind: 'stone',
    outfit: 'blazer',
    stations: [
      { x: 70, action: 'work' },
      { x: 140, action: 'work' },
      { x: 210, action: 'work' },
      { x: 280, action: 'work' },
    ],
    walk: [60, 320],
    carry: false,
    windows: [30, 180, 330],
    guests: 2,
  },
  newspaper: {
    wall: '#d3e4f8',
    wainscot: '#3f6fb0',
    floor: '#9aabc4',
    floorKind: 'concrete',
    outfit: 'shirt',
    stations: [
      { x: 220, action: 'work' },
      { x: 270, action: 'work' },
      { x: 320, action: 'work', flip: true },
      { x: 60, action: 'work' },
    ],
    walk: [40, 320],
    carry: true,
    windows: [220, 320],
    guests: 0,
  },
  bank: {
    wall: '#d9f2e6',
    wainscot: '#2f8a6a',
    floor: '#eadfc6',
    floorKind: 'stone',
    outfit: 'suit',
    stations: [
      { x: 70, action: 'work', behind: true },
      { x: 130, action: 'work', behind: true },
      { x: 190, action: 'work', behind: true },
      { x: 240, action: 'talk', flip: true, behind: true },
    ],
    walk: [40, 260],
    carry: false,
    windows: [40, 160],
    guests: 2,
  },
  parliament: {
    wall: '#eaf0fd',
    wainscot: '#3f6fb0',
    floor: '#4f7fd6',
    floorKind: 'carpet',
    outfit: 'suit',
    stations: [
      { x: 200, action: 'talk' },
      { x: 60, action: 'sit' },
      { x: 110, action: 'sit' },
      { x: 290, action: 'sit', flip: true },
      { x: 340, action: 'sit', flip: true },
      { x: 150, action: 'sit' },
    ],
    walk: [60, 340],
    carry: false,
    windows: [],
    guests: 0,
  },
  ministry: {
    wall: '#e8eff9',
    wainscot: '#5a7fb0',
    floor: '#bfcbdc',
    floorKind: 'planks',
    outfit: 'suit',
    stations: [
      { x: 200, action: 'work' },
      { x: 250, action: 'work' },
      { x: 150, action: 'work', flip: true },
      { x: 300, action: 'work', flip: true },
    ],
    walk: [60, 320],
    carry: false,
    windows: [200, 300],
    guests: 0,
  },
  embassy: {
    wall: '#fff7e8',
    wainscot: '#d9a21b',
    floor: '#d8b98a',
    floorKind: 'stone',
    outfit: 'suit',
    stations: [
      { x: 90, action: 'talk' },
      { x: 150, action: 'talk', flip: true },
      { x: 230, action: 'talk' },
      { x: 290, action: 'talk', flip: true },
    ],
    walk: [60, 330],
    carry: false,
    windows: [30, 330],
    guests: 3,
  },
  palace: {
    wall: '#fff3dc',
    wainscot: '#c9a227',
    floor: '#c0333d',
    floorKind: 'carpet',
    outfit: 'suit',
    stations: [
      { x: 100, action: 'work' },
      { x: 170, action: 'talk', flip: true },
      { x: 60, action: 'idle' },
      { x: 220, action: 'idle' },
    ],
    walk: [60, 220],
    carry: false,
    windows: [],
    guests: 0,
  },
};

const FACTION_COLORS: Record<string, string> = {
  economic: '#1f5fa8',
  social: '#c0392b',
  security: '#3e4a33',
  liberty: '#c9a227',
  populist: '#7b3fa0',
};

function Floor({ room }: { room: RoomDef }) {
  const lines: ReactNode[] = [];
  if (room.floorKind === 'planks') {
    for (let y = FLOOR + 8; y < 300; y += 9)
      lines.push(
        <line key={y} x1={0} y1={y} x2={W} y2={y} stroke="rgb(0 0 0 / 18%)" strokeWidth={1} />,
      );
    for (let x = -40; x < W + 40; x += 38)
      lines.push(
        <line
          key={`v${x}`}
          x1={x}
          y1={FLOOR}
          x2={x - 30}
          y2={300}
          stroke="rgb(0 0 0 / 12%)"
          strokeWidth={1}
        />,
      );
  } else if (room.floorKind === 'tiles' || room.floorKind === 'stone') {
    for (let y = FLOOR + 10; y < 300; y += 14)
      lines.push(
        <line key={y} x1={0} y1={y} x2={W} y2={y} stroke="rgb(0 0 0 / 14%)" strokeWidth={1} />,
      );
    for (let x = 0; x < W + 60; x += 30)
      lines.push(
        <line
          key={`v${x}`}
          x1={x}
          y1={FLOOR}
          x2={(x - W / 2) * 1.6 + W / 2}
          y2={300}
          stroke="rgb(0 0 0 / 12%)"
          strokeWidth={1}
        />,
      );
  } else if (room.floorKind === 'carpet') {
    lines.push(<rect key="c" x={60} y={FLOOR + 4} width={280} height={70} fill="#9e1b1b" />);
    lines.push(
      <rect
        key="c2"
        x={66}
        y={FLOOR + 8}
        width={268}
        height={62}
        fill="none"
        stroke="#d9b54a"
        strokeWidth={2}
      />,
    );
  }
  return (
    <g>
      <rect x={0} y={FLOOR} width={W} height={300 - FLOOR} fill={room.floor} />
      {lines}
      <rect x={0} y={FLOOR} width={W} height={300 - FLOOR} fill="url(#floorFade)" />
    </g>
  );
}

function BackWall({ room, level, p }: { room: RoomDef; level: number; p: ArchPalette }) {
  return (
    <g>
      <rect x={0} y={0} width={W} height={FLOOR} fill={room.wall} />
      <rect x={0} y={0} width={W} height={FLOOR} fill="url(#wallLight)" />
      {/* Täfelung */}
      <rect x={0} y={FLOOR - 46} width={W} height={46} fill={room.wainscot} opacity={0.85} />
      <rect x={0} y={FLOOR - 48} width={W} height={3} fill="rgb(0 0 0 / 18%)" />
      {level >= 3 &&
        Array.from({ length: 8 }, (_, i) => (
          <rect
            key={i}
            x={8 + i * 50}
            y={FLOOR - 40}
            width={40}
            height={32}
            fill="none"
            stroke="rgb(0 0 0 / 15%)"
            strokeWidth={1.5}
          />
        ))}
      {/* Fenster mit Himmel: tagsüber hell, nachts dunkel mit Sternen */}
      {room.windows.map((x) => (
        <g key={x}>
          <rect x={x} y={34} width={56} height={84} fill="url(#roomSky)" />
          <rect x={x} y={34} width={56} height={84} fill="#0b1633" className="night" />
          <g className="dusk">
            <rect x={x} y={34} width={56} height={84} fill="#ff8a3d" opacity={0.3} />
          </g>
          <circle cx={x + 40} cy={50} r={1.2} fill="#fff" className="night" />
          <circle cx={x + 16} cy={64} r={1} fill="#fff" className="night" />
          <rect
            x={x}
            y={34}
            width={56}
            height={84}
            fill="none"
            stroke={level >= 4 ? '#d9b54a' : '#6f675c'}
            strokeWidth={4}
          />
          <path
            d={`M${x + 28} 34 V118 M${x} 76 H${x + 56}`}
            stroke={level >= 4 ? '#d9b54a' : '#6f675c'}
            strokeWidth={2}
          />
          <rect x={x - 4} y={118} width={64} height={4} fill="rgb(0 0 0 / 20%)" />
          {level >= 2 && (
            <path
              d={`M${x - 8} 28 Q${x - 2} 80 ${x - 6} 124 L${x + 4} 124 Q${x + 2} 80 ${x + 6} 28 Z M${x + 64} 28 Q${x + 58} 80 ${x + 62} 124 L${x + 52} 124 Q${x + 54} 80 ${x + 50} 28 Z`}
              fill={p.accent}
              opacity={0.85}
            />
          )}
        </g>
      ))}
      {/* Deckenleiste und Lampen */}
      <rect x={0} y={0} width={W} height={10} fill="rgb(0 0 0 / 18%)" />
      {[80, 200, 320].map((x) => (
        <g key={x}>
          <line x1={x} y1={0} x2={x} y2={level >= 4 ? 18 : 26} stroke="#3b3f47" strokeWidth={1.2} />
          {level >= 4 ? (
            <g>
              <path d={`M${x - 16} 20 Q${x} 34 ${x + 16} 20 Z`} fill="#d9b54a" />
              {[-12, -4, 4, 12].map((dx) => (
                <circle key={dx} cx={x + dx} cy={22} r={2.4} fill="#fff4c2" />
              ))}
            </g>
          ) : (
            <path d={`M${x - 10} 26 H${x + 10} L${x + 6} 32 H${x - 6} Z`} fill="#3b3f47" />
          )}
          <ellipse cx={x} cy={level >= 4 ? 26 : 33} rx={46} ry={22} fill="url(#lampWarm)" />
        </g>
      ))}
    </g>
  );
}

/** Einrichtung je Ort (hinter den Figuren). */
function Furniture({
  location,
  level,
  office,
  partyColor,
  p,
}: {
  location: LocationId;
  level: number;
  office: boolean;
  partyColor: string;
  p: ArchPalette;
}): ReactNode {
  const desk = (x: number, key: string, monitor = true) => (
    <g key={key}>
      <rect x={x - 26} y={FLOOR - 32} width={52} height={5} fill="#8b6b4a" />
      <rect x={x - 22} y={FLOOR - 27} width={4} height={27} fill="#6b4a32" />
      <rect x={x + 18} y={FLOOR - 27} width={4} height={27} fill="#6b4a32" />
      {monitor && (
        <g>
          <rect x={x - 10} y={FLOOR - 50} width={20} height={14} rx={1} fill="#1c1f24" />
          <rect
            x={x - 8}
            y={FLOOR - 48}
            width={16}
            height={10}
            fill="#8fc4dc"
            className="flicker"
          />
          <rect x={x - 2} y={FLOOR - 36} width={4} height={4} fill="#1c1f24" />
        </g>
      )}
    </g>
  );
  const plant = (x: number) => (
    <g key={`plant-${x}`}>
      <rect x={x - 8} y={FLOOR - 16} width={16} height={16} fill="#b5502c" />
      <path
        d={`M${x} ${FLOOR - 16} Q${x - 16} ${FLOOR - 40} ${x - 4} ${FLOOR - 48} M${x} ${FLOOR - 16} Q${x + 14} ${FLOOR - 38} ${x + 6} ${FLOOR - 50} M${x} ${FLOOR - 16} V${FLOOR - 54}`}
        stroke="#3f7a4a"
        strokeWidth={5}
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
  const portrait = (x: number, y: number) => (
    <g key={`portrait-${x}`}>
      <rect x={x - 18} y={y} width={36} height={46} fill={level >= 4 ? '#d9b54a' : '#8b6b4a'} />
      <rect x={x - 14} y={y + 4} width={28} height={38} fill="#e8dcc6" />
      <circle cx={x} cy={y + 18} r={7} fill="#c98c64" />
      <rect x={x - 9} y={y + 26} width={18} height={14} fill="#2f3440" />
    </g>
  );
  const flag = (x: number, color: string) => (
    <g key={`flag-${x}`}>
      <rect x={x} y={70} width={3} height={FLOOR - 70} fill="#c9a227" />
      <path d={`M${x + 3} 74 h34 v38 h-34 Z`} fill={color} className="clothWave" />
    </g>
  );
  const items: ReactNode[] = [];
  switch (location) {
    case 'workplace':
      if (office) {
        [70, 130, 190, 250].slice(0, 1 + level).forEach((x) => items.push(desk(x, `d${x}`)));
      } else {
        [70, 130, 190, 235].forEach((x, i) =>
          items.push(
            <g key={`b${x}`}>
              <rect x={x - 22} y={FLOOR - 30} width={44} height={6} fill="#6b4a32" />
              <rect x={x - 20} y={FLOOR - 24} width={4} height={24} fill="#4a3526" />
              <rect x={x + 16} y={FLOOR - 24} width={4} height={24} fill="#4a3526" />
              <rect
                x={x - 8}
                y={FLOOR - 36}
                width={10}
                height={6}
                fill={i % 2 ? '#8a8f96' : '#b98a55'}
              />
            </g>,
          ),
        );
      }
      if (level >= 3) items.push(plant(360));
      break;
    case 'pub':
      items.push(
        <g key="bar">
          <rect x={20} y={80} width={200} height={70} fill="#3b2a20" />
          {Array.from({ length: 12 }, (_, i) => (
            <rect
              key={i}
              x={28 + i * 16}
              y={90 + (i % 2) * 30}
              width={8}
              height={24}
              rx={3}
              fill={['#2e7d4f', '#b5502c', '#c9a227', '#1f5fa8', '#8b1e1e'][i % 5] ?? '#2e7d4f'}
            />
          ))}
          {[250, 330].map((x) => (
            <g key={x}>
              <ellipse cx={x + 20} cy={FLOOR - 30} rx={26} ry={5} fill="#8b6b4a" />
              <rect x={x + 17} y={FLOOR - 30} width={6} height={30} fill="#5a3b24" />
            </g>
          ))}
          {level >= 3 && (
            <path
              d="M0 40 Q100 60 200 40 Q300 60 400 40"
              fill="none"
              stroke="#3b3f47"
              strokeWidth={1}
            />
          )}
          {level >= 3 &&
            Array.from({ length: 14 }, (_, i) => (
              <circle
                key={`l${i}`}
                cx={14 + i * 28}
                cy={46 + Math.sin(i) * 3}
                r={2.5}
                fill={['#ffd34d', '#ff6fb1', '#6fd08c'][i % 3] ?? '#ffd34d'}
                className="bulb"
                style={{ animationDelay: `${-i * 0.3}s` }}
              />
            ))}
        </g>,
      );
      break;
    case 'market':
      if (level >= 4)
        items.push(<rect key="esc" x={320} y={60} width={60} height={FLOOR - 60} fill="#b5bec5" />);
      break;
    case 'partyOffice':
      items.push(
        <g key="posters">
          <rect x={120} y={40} width={50} height={66} fill={partyColor} />
          <circle cx={145} cy={66} r={14} fill="#f4efe2" />
          <circle cx={145} cy={66} r={6} fill={partyColor} />
          <rect
            x={180}
            y={44}
            width={40}
            height={56}
            fill="#f4efe2"
            stroke={partyColor}
            strokeWidth={3}
          />
          <rect x={186} y={52} width={28} height={6} fill={partyColor} />
          <rect x={186} y={64} width={22} height={3} fill="#8f8a80" />
          <rect x={186} y={71} width={26} height={3} fill="#8f8a80" />
          {level >= 3 && flag(240, partyColor)}
          {level >= 4 && portrait(290, 40)}
          <rect x={20} y={FLOOR - 70} width={70} height={70} fill="#c9b797" />
          {[0, 1].map((i) => (
            <rect key={i} x={24} y={FLOOR - 64 + i * 32} width={62} height={26} fill="#e8dcc6" />
          ))}
        </g>,
      );
      break;
    case 'townHall':
      items.push(portrait(200, 32), flag(120, p.accent));
      if (level >= 3) items.push(flag(262, '#f4efe2'));
      if (level >= 2) items.push(plant(30), plant(370));
      break;
    case 'newspaper':
      items.push(desk(220, 'd1'), desk(290, 'd2'));
      items.push(
        <g key="head">
          <rect x={180} y={40} width={180} height={36} fill="#1c1f24" />
          <text
            x={270}
            y={64}
            textAnchor="middle"
            fontSize={16}
            fontWeight={700}
            fill="#f4efe2"
            fontFamily="var(--font-serif)"
          >
            TAGESBOTE
          </text>
        </g>,
      );
      break;
    case 'bank':
      items.push(
        <g key="columns">
          {[20, 380].map((x) => (
            <rect key={x} x={x - 9} y={10} width={18} height={FLOOR - 10} fill={p.stone} />
          ))}
          {[60, 120, 180, 240].map((x) => (
            <rect
              key={x}
              x={x - 14}
              y={FLOOR - 92}
              width={28}
              height={40}
              fill="url(#roomGlass)"
              stroke="#6b4a32"
              strokeWidth={2}
            />
          ))}
        </g>,
      );
      break;
    case 'parliament':
      items.push(
        <g key="rows">
          {[0, 1, 2].map((row) => (
            <path
              key={row}
              d={`M${10 + row * 20} ${170 + row * 22} Q200 ${110 + row * 22} ${390 - row * 20} ${170 + row * 22}`}
              fill="none"
              stroke="#3a6ea5"
              strokeWidth={14}
            />
          ))}
          <rect x={172} y={FLOOR - 58} width={56} height={58} fill="#8b6b4a" />
          <rect x={166} y={FLOOR - 64} width={68} height={8} fill="#6b4a32" />
          <rect x={164} y={36} width={72} height={52} fill={p.accent} />
          <circle cx={200} cy={62} r={16} fill={p.trim} />
        </g>,
      );
      break;
    case 'ministry':
      items.push(
        <g key="desk">
          <rect x={150} y={FLOOR - 42} width={150} height={10} fill="#5a3b24" />
          <rect x={150} y={FLOOR - 32} width={150} height={32} fill="#6b4a32" />
        </g>,
        portrait(250, 30),
        flag(330, p.accent),
      );
      break;
    case 'embassy':
      items.push(
        ...['#1f3a5f', '#12848a', '#2e7d4f', '#9e1b1b'].map((c, i) => flag(80 + i * 70, c)),
        <path
          key="chandelier"
          d="M200 20 V46 M178 46 H222 L212 70 H188 Z"
          stroke="#c9a227"
          strokeWidth={3}
          fill="#f6e7b0"
        />,
      );
      break;
    case 'palace':
      items.push(
        <g key="throne">
          {[30, 210].map((x) => (
            <rect key={x} x={x - 10} y={10} width={20} height={FLOOR - 10} fill="#c9a227" />
          ))}
          <path
            d="M120 16 V38 M96 38 H144 L132 66 H108 Z"
            stroke="#f6e7b0"
            strokeWidth={3}
            fill="#f6e7b0"
          />
          <rect x={90} y={FLOOR - 70} width={60} height={70} fill="#5a3b24" />
          <rect x={84} y={FLOOR - 80} width={72} height={12} fill="#c9a227" />
          {portrait(120, 90)}
          {flag(170, partyColor)}
        </g>,
      );
      break;
  }
  return <g>{items}</g>;
}

/** Tresen und Schalter vor dem Personal (verdecken die Beine). */
function Counter({ location }: { location: LocationId }): ReactNode {
  if (location === 'pub') {
    return (
      <g>
        <rect x={10} y={FLOOR - 50} width={230} height={14} fill="#8b6b4a" />
        <rect x={10} y={FLOOR - 36} width={230} height={44} fill="#5a3b24" />
        {[40, 100, 160, 210].map((x) => (
          <rect
            key={x}
            x={x - 14}
            y={FLOOR - 30}
            width={28}
            height={30}
            fill="none"
            stroke="rgb(0 0 0 / 22%)"
            strokeWidth={2}
          />
        ))}
      </g>
    );
  }
  if (location === 'bank') {
    return (
      <g>
        <rect x={20} y={FLOOR - 52} width={250} height={12} fill="#6b4a32" />
        <rect x={20} y={FLOOR - 40} width={250} height={48} fill="#8b6b4a" />
        <rect x={20} y={FLOOR - 42} width={250} height={3} fill="#d9b54a" />
      </g>
    );
  }
  return null;
}

export interface InteriorSceneProps {
  location: LocationId;
  level: number;
  /** Stufen der beiden Maschinen als „a,b“. */
  machines: string;
  staff: number;
  runSeed: number;
  mood: Mood;
  striking: boolean;
  p: ArchPalette;
  partyColor: string;
  office: boolean;
  character: Character;
  outfit: Outfit;
  /** Berater als „seed:flügel,…“ (für den Tisch im Parteibüro). */
  advisors: string;
}

export const InteriorScene = memo(function InteriorScene({
  location,
  level,
  machines,
  staff,
  runSeed,
  mood,
  striking,
  p,
  partyColor,
  office,
  character,
  outfit,
  advisors,
}: InteriorSceneProps) {
  const room = ROOMS[location];
  const building = cfg.industry.buildings.find((b) => b.location === location);
  const [mA = 0, mB = 0] = machines.split(',').map(Number);
  const machineIds: MachineId[] = building ? [...building.machines] : [];
  const slots = Math.min(room.stations.length, 2 + level);
  const atStations = Math.min(staff, slots);
  const walkers = Math.min(3, Math.max(0, staff - atStations));
  const signs = ['Streik!', 'Mehr Lohn!', 'Faire Arbeit!'];
  const seats = advisors ? advisors.split(',') : [];

  const people: ReactNode[] = [];
  const behind: ReactNode[] = [];
  for (let i = 0; i < atStations; i++) {
    const s = room.stations[i];
    if (!s) continue;
    const profile = workerProfile(runSeed, location, i);
    const back = s.behind === true && !striking;
    const x = striking ? 120 + i * 30 : s.x;
    const y = back ? FLOOR - 8 : FLOOR + 8 + (i % 2) * 4;
    (back ? behind : people).push(
      <g key={`s${i}`} transform={`translate(${x} ${y})`}>
        <Worker
          seed={profile.look}
          outfit={room.outfit}
          action={striking ? 'strike' : s.action}
          flip={s.flip}
          sign={signs[i % signs.length]}
          accent={partyColor}
        />
        {!striking && i === 0 && mood === 'happy' && (
          <text x={0} y={-92} textAnchor="middle" fontSize={11} className="heart">
            ♥
          </text>
        )}
      </g>,
    );
  }
  for (let i = 0; i < walkers; i++) {
    const profile = workerProfile(runSeed, location, atStations + i);
    const [a, b] = room.walk;
    people.push(
      <g key={`w${i}`} transform={`translate(${a} ${FLOOR + 16 + i * 3})`}>
        <g
          className="walkRoute"
          style={{
            ['--route' as string]: `${b - a}px`,
            animationDelay: `${-i * 3.1}s`,
            animationDuration: `${7 + i * 1.5}s`,
          }}
        >
          <Worker
            seed={profile.look}
            outfit={room.outfit}
            action={striking ? 'strike' : room.carry ? 'carry' : 'walk'}
          />
        </g>
      </g>,
    );
  }
  // Kundschaft
  for (let i = 0; i < room.guests; i++) {
    const x = 240 + i * 34 - (location === 'pub' ? 0 : 60);
    people.push(
      <g key={`g${i}`} transform={`translate(${x} ${FLOOR + 20})`}>
        <Worker
          seed={hash32(runSeed, 700 + i)}
          outfit="casual"
          action={i % 2 ? 'talk' : 'idle'}
          flip={i % 2 === 0}
        />
      </g>,
    );
  }

  return (
    <div className={styles.scene} data-striking={striking ? 'true' : 'false'}>
      <svg
        viewBox={`0 0 ${W} 300`}
        preserveAspectRatio="xMidYMax slice"
        className={styles.interior}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="roomSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8cc3e6" />
            <stop offset="1" stopColor="#e3f1f8" />
          </linearGradient>
          <linearGradient id="roomGlass" x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0" stopColor="#dff0f8" stopOpacity="0.9" />
            <stop offset="1" stopColor="#8fb6cc" stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id="wallLight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity="0.2" />
            <stop offset="0.35" stopColor="#fff" stopOpacity="0.08" />
            <stop offset="1" stopColor="#000" stopOpacity="0.12" />
          </linearGradient>
          <linearGradient id="floorFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity="0.28" />
            <stop offset="0.3" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.22" />
          </linearGradient>
          <radialGradient id="lampWarm" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#fff1c4" stopOpacity="0.55" />
            <stop offset="1" stopColor="#fff1c4" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="vignette" cx="50%" cy="45%" r="75%">
            <stop offset="0.6" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.35" />
          </radialGradient>
        </defs>
        <BackWall room={room} level={level} p={p} />
        <Floor room={room} />
        <Furniture
          location={location}
          level={level}
          office={office}
          partyColor={partyColor}
          p={p}
        />
        {machineIds[0] && (
          <MachineArt id={machineIds[0]} level={mA} office={office} stopped={striking} />
        )}
        {machineIds[1] && (
          <MachineArt id={machineIds[1]} level={mB} office={office} stopped={striking} />
        )}
        {location === 'partyOffice' && (
          <g>
            {/* Berater hinter dem Tisch: Stuhllehnen, Figuren, dann die Tischplatte davor */}
            {seats.map((entry, i) => {
              const [seedText = '0', faction = 'economic'] = entry.split(':');
              const x = 200 + (i - (seats.length - 1) / 2) * 46;
              const color = FACTION_COLORS[faction] ?? '#999';
              return (
                <g key={seedText}>
                  <rect x={x - 14} y={FLOOR - 58} width={28} height={40} rx={5} fill="#5a3b24" />
                  <rect
                    x={x - 11}
                    y={FLOOR - 55}
                    width={22}
                    height={34}
                    rx={4}
                    fill={color}
                    opacity={0.85}
                  />
                  <g transform={`translate(${x} ${FLOOR + 14})`}>
                    <Worker
                      seed={Number(seedText)}
                      outfit="blazer"
                      action={i % 2 ? 'talk' : 'idle'}
                      accent={color}
                      flip={x > 200}
                    />
                  </g>
                </g>
              );
            })}
            <path
              d={`M92 ${FLOOR - 4} Q200 ${FLOOR - 26} 308 ${FLOOR - 4} L300 ${FLOOR + 30} H100 Z`}
              fill="#6b4526"
            />
            <ellipse cx={200} cy={FLOOR - 6} rx={110} ry={16} fill="#a9774e" />
            <ellipse cx={200} cy={FLOOR - 7} rx={92} ry={11} fill="#b98a5e" />
            {[0, 1, 2, 3].map((i) => (
              <rect
                key={i}
                x={150 + i * 26}
                y={FLOOR - 11}
                width={14}
                height={9}
                fill="#f4efe2"
                transform={`rotate(${i * 9 - 12} ${157 + i * 26} ${FLOOR - 7})`}
              />
            ))}
            <rect x={196} y={FLOOR - 20} width={8} height={12} rx={2} fill={partyColor} />
          </g>
        )}
        {behind}
        <Counter location={location} />
        {people}
        <rect x={0} y={0} width={W} height={300} fill="url(#vignette)" />
        <g className="night">
          <rect x={0} y={0} width={W} height={300} fill="#0b1633" opacity={0.18} />
        </g>
      </svg>
      <div className={styles.player}>
        <Figure character={character} outfit={outfit} facing="left" />
      </div>
    </div>
  );
});
