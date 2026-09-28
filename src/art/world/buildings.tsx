import type { ReactNode } from 'react';
import type { LocationId } from '../../engine/ids';
import type { ArchPalette } from './palette';

// Gebäude der Straße. Alle stehen auf der Bodenlinie GROUND (y = 250) und sind um x zentriert.
// Fenster tragen die Klasse „win“, damit sie nachts leuchten (siehe Street.module.css).

export const GROUND = 250;

interface BuildingProps {
  x: number;
  p: ArchPalette;
  /** 0–3: Ausstattung des Viertels. */
  grandeur: number;
  label: string;
  /** Parteifarbe (für das Parteibüro). */
  partyColor: string;
  /** Autokratisch: Propaganda statt Werbung. */
  autocratic: boolean;
}

function Windows({ x, y, cols, rows, w = 14, h = 18, gx = 8, gy = 10, arched = false }: {
  x: number;
  y: number;
  cols: number;
  rows: number;
  w?: number;
  h?: number;
  gx?: number;
  gy?: number;
  arched?: boolean;
}) {
  const items: ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = x + c * (w + gx);
      const wy = y + r * (h + gy);
      items.push(
        arched ? (
          <path key={`${r}-${c}`} className="win" d={`M${wx} ${wy + h} V${wy + w / 2} A${w / 2} ${w / 2} 0 0 1 ${wx + w} ${wy + w / 2} V${wy + h} Z`} />
        ) : (
          <rect key={`${r}-${c}`} className="win" x={wx} y={wy} width={w} height={h} rx={1.5} />
        ),
      );
    }
  }
  return <g>{items}</g>;
}

/** Dach passend zum Baustil über einem Rechteck [left, left+width] mit Oberkante top. */
export function Roof({ left, width, top, p, height = 26 }: { left: number; width: number; top: number; p: ArchPalette; height?: number }) {
  switch (p.roofShape) {
    case 'gable':
      return <path d={`M${left - 6} ${top} L${left + width / 2} ${top - height - 8} L${left + width + 6} ${top} Z`} fill={p.roof} />;
    case 'pagoda':
      return (
        <g fill={p.roof}>
          <path d={`M${left - 14} ${top + 2} Q${left + width / 2} ${top - 10} ${left + width + 14} ${top + 2} L${left + width - 4} ${top - height * 0.6} L${left + 4} ${top - height * 0.6} Z`} />
          <rect x={left + 8} y={top - height * 0.6 - 3} width={width - 16} height={4} fill={p.trim} />
        </g>
      );
    case 'mansard':
      return <path d={`M${left - 4} ${top} L${left + 10} ${top - height} H${left + width - 10} L${left + width + 4} ${top} Z`} fill={p.roof} />;
    default:
      return (
        <g>
          <rect x={left - 4} y={top - 8} width={width + 8} height={8} fill={p.trim} />
          <rect x={left - 2} y={top - 11} width={width + 4} height={3} fill={p.roof} />
        </g>
      );
  }
}

function Sign({ x, y, text, color = '#2b2f36', fg = '#ffffff', width = 76 }: { x: number; y: number; text: string; color?: string; fg?: string; width?: number }) {
  return (
    <g>
      <rect x={x - width / 2} y={y} width={width} height={13} rx={2} fill={color} />
      <text x={x} y={y + 9.5} textAnchor="middle" className="signText" fill={fg}>
        {text}
      </text>
    </g>
  );
}

function Door({ x, w = 24, h = 34, color = '#4a3a2e' }: { x: number; w?: number; h?: number; color?: string }) {
  return (
    <g>
      <rect x={x - w / 2} y={GROUND - h} width={w} height={h} rx={2} fill={color} />
      <circle cx={x + w / 2 - 5} cy={GROUND - h / 2} r={1.5} fill="#c9a227" />
    </g>
  );
}

function Dome({ x, top, r, p }: { x: number; top: number; r: number; p: ArchPalette }) {
  switch (p.domeShape) {
    case 'onion':
      return (
        <g>
          <path d={`M${x - r} ${top} Q${x - r * 1.1} ${top - r} ${x} ${top - r * 1.9} Q${x + r * 1.1} ${top - r} ${x + r} ${top} Z`} fill="#c9a227" />
          <rect x={x - 1} y={top - r * 2.3} width={2} height={r * 0.5} fill="#8a6d1f" />
        </g>
      );
    case 'tiered':
      return (
        <g fill={p.roof}>
          <path d={`M${x - r * 1.4} ${top} Q${x} ${top - 8} ${x + r * 1.4} ${top} L${x + r} ${top - 10} L${x - r} ${top - 10} Z`} />
          <path d={`M${x - r} ${top - 12} Q${x} ${top - 20} ${x + r} ${top - 12} L${x + r * 0.6} ${top - 22} L${x - r * 0.6} ${top - 22} Z`} />
          <circle cx={x} cy={top - 26} r={3} fill={p.trim} />
        </g>
      );
    case 'glass':
      return (
        <g>
          <path d={`M${x - r} ${top} A${r} ${r} 0 0 1 ${x + r} ${top} Z`} className="win" opacity={0.85} />
          <path d={`M${x - r} ${top} A${r} ${r} 0 0 1 ${x + r} ${top} M${x} ${top - r} V${top} M${x - r * 0.7} ${top - r * 0.7} L${x} ${top}`} fill="none" stroke={p.trim} strokeWidth={1.2} />
        </g>
      );
    default:
      return (
        <g>
          <rect x={x - r * 0.9} y={top - 8} width={r * 1.8} height={8} fill={p.stone} />
          <path d={`M${x - r} ${top - 8} A${r} ${r * 0.95} 0 0 1 ${x + r} ${top - 8} Z`} fill={p.stone} />
          <rect x={x - 2} y={top - 8 - r * 0.95 - 8} width={4} height={8} fill={p.stone} />
        </g>
      );
  }
}

function Columns({ x, width, top, count, p }: { x: number; width: number; top: number; count: number; p: ArchPalette }) {
  const gap = width / (count - 1);
  return (
    <g fill={p.stone}>
      <path d={`M${x - width / 2 - 10} ${top} L${x} ${top - 20} L${x + width / 2 + 10} ${top} Z`} />
      <rect x={x - width / 2 - 10} y={top} width={width + 20} height={6} />
      {Array.from({ length: count }, (_, i) => (
        <rect key={i} x={x - width / 2 + i * gap - 3} y={top + 6} width={6} height={GROUND - top - 12} />
      ))}
      <rect x={x - width / 2 - 12} y={GROUND - 6} width={width + 24} height={6} />
    </g>
  );
}

/** Werkhalle oder Bürogebäude. */
function Workplace({ x, p, label, office }: BuildingProps & { office: boolean }) {
  if (office) {
    return (
      <g>
        <rect x={x - 80} y={120} width={160} height={130} fill={p.walls[2]} />
        <Roof left={x - 80} width={160} top={120} p={{ ...p, roofShape: 'flat' }} />
        <Windows x={x - 70} y={132} cols={6} rows={4} w={16} h={14} gx={8} gy={10} />
        <rect x={x - 22} y={GROUND - 36} width={44} height={36} className="win" opacity={0.8} />
        <Sign x={x} y={GROUND - 50} text={label} />
      </g>
    );
  }
  return (
    <g>
      <rect x={x + 50} y={112} width={12} height={60} fill="#7f3f2e" />
      <path d={`M${x - 90} 175 L${x - 90} 150 L${x - 60} 132 L${x - 60} 150 L${x - 30} 132 L${x - 30} 150 L${x} 132 L${x} 150 L${x + 30} 132 L${x + 30} 150 L${x + 60} 132 L${x + 60} 150 L${x + 90} 132 L${x + 90} 175 Z`} fill="#a5563f" />
      <rect x={x - 90} y={150} width={180} height={100} fill="#a5563f" />
      <rect x={x - 90} y={150} width={180} height={5} fill="#6f675c" />
      <Windows x={x - 80} y={165} cols={2} rows={1} w={20} h={26} gx={10} />
      <Windows x={x + 30} y={165} cols={2} rows={1} w={20} h={26} gx={10} />
      <rect x={x - 26} y={GROUND - 70} width={52} height={70} fill="#5c6770" />
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1={x - 26} y1={GROUND - 60 + i * 12} x2={x + 26} y2={GROUND - 60 + i * 12} stroke="#47515a" strokeWidth={1.5} />
      ))}
      <Sign x={x} y={GROUND - 84} text={label} color="#c9a227" fg="#2b2f36" />
    </g>
  );
}

function Pub({ x, p, label, grandeur }: BuildingProps) {
  return (
    <g>
      <rect x={x - 55} y={150} width={110} height={100} fill={p.walls[1]} />
      <Roof left={x - 55} width={110} top={150} p={p} />
      <Windows x={x - 45} y={162} cols={3} rows={1} w={20} h={18} gx={15} />
      <rect x={x - 48} y={GROUND - 46} width={30} height={30} className="win" />
      <rect x={x + 18} y={GROUND - 46} width={30} height={30} className="win" />
      <Door x={x} color="#5a3b24" />
      <path d={`M${x - 55} ${GROUND - 52} H${x + 55} L${x + 50} ${GROUND - 44} H${x - 50} Z`} fill="#2e6b3f" />
      <Sign x={x} y={GROUND - 66} text={label} color="#2e6b3f" />
      {grandeur > 0 && <circle cx={x + 62} cy={GROUND - 60} r={8} fill="#c9a227" />}
    </g>
  );
}

function Market({ x, label, p }: BuildingProps) {
  const stall = (sx: number, color: string) => (
    <g key={sx}>
      <rect x={sx - 22} y={GROUND - 30} width={44} height={30} fill="#8b6b4a" />
      <path d={`M${sx - 26} ${GROUND - 30} L${sx - 20} ${GROUND - 46} H${sx + 20} L${sx + 26} ${GROUND - 30} Z`} fill={color} />
      <path d={`M${sx - 26} ${GROUND - 30} H${sx + 26}`} stroke="#fff" strokeWidth={2} strokeDasharray="6 6" />
    </g>
  );
  return (
    <g>
      {stall(x - 55, '#c0392b')}
      {stall(x, '#2e7d4f')}
      {stall(x + 55, '#1f5fa8')}
      <rect x={x - 3} y={GROUND - 80} width={6} height={34} fill={p.trim} />
      <Sign x={x} y={GROUND - 94} text={label} color={p.accent} />
    </g>
  );
}

function PartyOffice({ x, p, label, partyColor, autocratic }: BuildingProps) {
  return (
    <g>
      <rect x={x - 60} y={140} width={120} height={110} fill={p.walls[0]} />
      <Roof left={x - 60} width={120} top={140} p={p} />
      <Windows x={x - 50} y={152} cols={4} rows={1} w={16} h={18} gx={12} />
      <rect x={x - 52} y={GROUND - 50} width={104} height={46} fill={partyColor} />
      <rect x={x - 44} y={GROUND - 44} width={34} height={34} className="win" />
      <rect x={x + 10} y={GROUND - 44} width={34} height={34} className="win" />
      <rect x={x - 8} y={GROUND - 40} width={16} height={40} fill="#3a2e24" />
      <Sign x={x} y={GROUND - 66} text={label} color={partyColor} />
      {autocratic && <rect x={x - 60} y={140} width={120} height={8} fill="#8b1e1e" />}
    </g>
  );
}

function TownHall({ x, p, label, grandeur }: BuildingProps) {
  return (
    <g>
      <rect x={x - 95} y={130} width={190} height={120} fill={p.walls[4]} />
      <Roof left={x - 95} width={190} top={130} p={p} />
      <rect x={x - 18} y={70} width={36} height={80} fill={p.walls[4]} />
      <Roof left={x - 18} width={36} top={70} p={p} height={22} />
      <circle cx={x} cy={92} r={11} fill="#f4efe2" stroke={p.trim} strokeWidth={2} />
      <path d={`M${x} ${92} V${85} M${x} ${92} L${x + 6} ${94}`} stroke="#2b2f36" strokeWidth={1.6} />
      <Windows x={x - 85} y={145} cols={3} rows={2} w={14} h={20} gx={10} gy={14} arched />
      <Windows x={x + 23} y={145} cols={3} rows={2} w={14} h={20} gx={10} gy={14} arched />
      <path d={`M${x - 20} ${GROUND} V${GROUND - 30} A20 20 0 0 1 ${x + 20} ${GROUND - 30} V${GROUND} Z`} fill="#4a3a2e" />
      <Sign x={x} y={118} text={label} color={p.accent} width={86} />
      {grandeur >= 1 && <rect x={x - 95} y={GROUND - 6} width={190} height={6} fill={p.stone} />}
    </g>
  );
}

function Newspaper({ x, p, label }: BuildingProps) {
  return (
    <g>
      <rect x={x - 70} y={125} width={140} height={125} fill={p.walls[2]} />
      <Roof left={x - 70} width={140} top={125} p={{ ...p, roofShape: p.roofShape === 'pagoda' ? 'pagoda' : 'mansard' }} height={20} />
      <rect x={x - 70} y={138} width={140} height={16} fill="#1c1f24" />
      <text x={x} y={150} textAnchor="middle" className="signText" fill="#f4efe2">
        TAGESBOTE
      </text>
      <Windows x={x - 60} y={162} cols={5} rows={2} w={16} h={18} gx={10} gy={10} />
      <Door x={x} w={30} />
      <Sign x={x} y={GROUND - 48} text={label} />
    </g>
  );
}

function Bank({ x, p, label }: BuildingProps) {
  return (
    <g>
      <rect x={x - 80} y={140} width={160} height={110} fill={p.stone} />
      <Columns x={x} width={120} top={140} count={6} p={p} />
      <Door x={x} w={26} h={40} color="#2b2f36" />
      <Sign x={x} y={124} text={label} color={p.accent} width={70} />
    </g>
  );
}

function Parliament({ x, p, label }: BuildingProps) {
  return (
    <g>
      <rect x={x - 130} y={140} width={260} height={110} fill={p.walls[2]} />
      <Roof left={x - 130} width={260} top={140} p={{ ...p, roofShape: p.roofShape === 'gable' ? 'flat' : p.roofShape }} />
      <Dome x={x} top={140} r={40} p={p} />
      <Columns x={x} width={110} top={150} count={6} p={p} />
      <Windows x={x - 122} y={155} cols={3} rows={3} w={14} h={18} gx={10} gy={10} />
      <Windows x={x + 58} y={155} cols={3} rows={3} w={14} h={18} gx={10} gy={10} />
      <rect x={x - 70} y={GROUND - 8} width={140} height={8} fill={p.stone} />
      <Sign x={x} y={GROUND - 22} text={label} color={p.accent} width={80} />
    </g>
  );
}

function Ministry({ x, p, label }: BuildingProps) {
  return (
    <g>
      <rect x={x - 100} y={100} width={200} height={150} fill={p.walls[1]} />
      <Roof left={x - 100} width={200} top={100} p={p} />
      <Windows x={x - 90} y={112} cols={8} rows={5} w={15} h={17} gx={9} gy={9} />
      <rect x={x - 26} y={GROUND - 40} width={52} height={40} fill={p.stone} />
      <Door x={x} w={30} h={34} color="#2b2f36" />
      <Sign x={x} y={GROUND - 54} text={label} color={p.accent} width={82} />
    </g>
  );
}

function Embassy({ x, p, label }: BuildingProps) {
  return (
    <g>
      <rect x={x - 75} y={150} width={150} height={100} fill={p.walls[2]} />
      <Roof left={x - 75} width={150} top={150} p={p} />
      <Windows x={x - 65} y={165} cols={5} rows={2} w={16} h={20} gx={12} gy={10} arched />
      <Door x={x} w={26} h={38} color="#2b2f36" />
      {[-60, -30, 30, 60].map((dx, i) => (
        <g key={dx}>
          <rect x={x + dx - 1} y={GROUND - 110} width={2} height={110} fill="#8f8a80" />
          <rect x={x + dx + 1} y={GROUND - 110} width={16} height={10} fill={['#1f3a5f', '#12848a', '#2e7d4f', '#9e1b1b'][i]} />
        </g>
      ))}
      <Sign x={x} y={132} text={label} color={p.accent} width={100} />
    </g>
  );
}

function Palace({ x, p, label, autocratic }: BuildingProps) {
  return (
    <g>
      <rect x={x - 170} y={120} width={340} height={130} fill={p.walls[2]} />
      <Roof left={x - 170} width={340} top={120} p={p} />
      <rect x={x - 60} y={70} width={120} height={60} fill={p.walls[2]} />
      <Dome x={x} top={70} r={46} p={p} />
      <Columns x={x} width={100} top={130} count={6} p={p} />
      <Windows x={x - 160} y={135} cols={4} rows={3} w={16} h={20} gx={10} gy={12} arched />
      <Windows x={x + 58} y={135} cols={4} rows={3} w={16} h={20} gx={10} gy={12} arched />
      <rect x={x - 40} y={GROUND - 4} width={80} height={16} fill="#9e1b1b" />
      <Sign x={x} y={GROUND - 30} text={label} color={p.accent} width={94} />
      {autocratic && (
        <g>
          <rect x={x - 150} y={150} width={40} height={60} fill="#8b1e1e" />
          <rect x={x + 110} y={150} width={40} height={60} fill="#8b1e1e" />
        </g>
      )}
    </g>
  );
}

/** Zeichnet das Gebäude eines Ortes. */
export function LocationBuilding({ id, office, ...props }: BuildingProps & { id: LocationId; office: boolean }) {
  switch (id) {
    case 'workplace':
      return <Workplace {...props} office={office} />;
    case 'pub':
      return <Pub {...props} />;
    case 'market':
      return <Market {...props} />;
    case 'partyOffice':
      return <PartyOffice {...props} />;
    case 'townHall':
      return <TownHall {...props} />;
    case 'newspaper':
      return <Newspaper {...props} />;
    case 'bank':
      return <Bank {...props} />;
    case 'parliament':
      return <Parliament {...props} />;
    case 'ministry':
      return <Ministry {...props} />;
    case 'embassy':
      return <Embassy {...props} />;
    case 'palace':
      return <Palace {...props} />;
  }
}

/** Füllhaus zwischen den Orten; `seed` variiert Höhe und Farbe. */
export function FillerHouse({ x, width, p, seed, grandeur, poster }: {
  x: number;
  width: number;
  p: ArchPalette;
  seed: number;
  grandeur: number;
  /** Propagandaplakat (autokratisch). */
  poster: ReactNode;
}) {
  const height = 80 + ((seed * 37) % 60) + grandeur * 10;
  const top = GROUND - height;
  const wall = p.walls[seed % p.walls.length] ?? p.walls[0] ?? '#ccc';
  const cols = Math.max(1, Math.floor((width - 16) / 24));
  const rows = Math.max(1, Math.floor((height - 40) / 30));
  return (
    <g>
      <rect x={x - width / 2} y={top} width={width} height={height} fill={wall} />
      <Roof left={x - width / 2} width={width} top={top} p={p} height={18} />
      <Windows x={x - width / 2 + 10} y={top + 12} cols={cols} rows={rows} w={14} h={18} gx={10} gy={12} arched={grandeur >= 1 && seed % 2 === 0} />
      {grandeur >= 1 && (
        <g fill="#c0392b">
          {Array.from({ length: cols }, (_, i) => (
            <rect key={i} x={x - width / 2 + 10 + i * 24} y={top + 31} width={14} height={3} fill={i % 2 ? '#e67e22' : '#c0392b'} />
          ))}
        </g>
      )}
      {poster}
    </g>
  );
}
