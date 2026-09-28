import type { ReactNode } from 'react';
import { GROUND } from './buildings';

// Straßenausstattung. Je prächtiger das Viertel (grandeur 0–3), desto mehr und schöner.

export function Lamp({ x, grandeur }: { x: number; grandeur: number }) {
  const color = grandeur >= 3 ? '#c9a227' : '#3b3f47';
  return (
    <g>
      <rect x={x - 1.5} y={GROUND - 70} width={3} height={70} fill={color} />
      {grandeur >= 1 ? (
        <g>
          <path d={`M${x - 8} ${GROUND - 70} Q${x} ${GROUND - 80} ${x + 8} ${GROUND - 70}`} fill="none" stroke={color} strokeWidth={2} />
          <circle className="lamp" cx={x - 8} cy={GROUND - 66} r={4} />
          <circle className="lamp" cx={x + 8} cy={GROUND - 66} r={4} />
        </g>
      ) : (
        <g>
          <rect x={x - 1} y={GROUND - 72} width={12} height={3} fill={color} />
          <circle className="lamp" cx={x + 10} cy={GROUND - 67} r={3.5} />
        </g>
      )}
    </g>
  );
}

export function Tree({ x, grandeur }: { x: number; grandeur: number }) {
  return (
    <g>
      <rect x={x - 3} y={GROUND - 40} width={6} height={40} fill="#6b4a32" />
      {grandeur >= 2 ? (
        <ellipse cx={x} cy={GROUND - 58} rx={18} ry={24} fill="#3f7a4a" />
      ) : (
        <g fill="#4d8a52">
          <circle cx={x - 10} cy={GROUND - 48} r={13} />
          <circle cx={x + 10} cy={GROUND - 50} r={14} />
          <circle cx={x} cy={GROUND - 62} r={15} />
        </g>
      )}
    </g>
  );
}

export function Bench({ x }: { x: number }) {
  return (
    <g fill="#6b4a32">
      <rect x={x - 16} y={GROUND - 12} width={32} height={3} />
      <rect x={x - 16} y={GROUND - 20} width={32} height={3} />
      <rect x={x - 14} y={GROUND - 9} width={2} height={9} fill="#3b3f47" />
      <rect x={x + 12} y={GROUND - 9} width={2} height={9} fill="#3b3f47" />
    </g>
  );
}

export function Bin({ x }: { x: number }) {
  return <rect x={x - 5} y={GROUND - 16} width={10} height={16} rx={2} fill="#4a5a4a" />;
}

export function FlowerPot({ x }: { x: number }) {
  return (
    <g>
      <rect x={x - 9} y={GROUND - 12} width={18} height={12} fill="#b5502c" />
      <circle cx={x - 5} cy={GROUND - 15} r={4} fill="#e25b7a" />
      <circle cx={x + 4} cy={GROUND - 16} r={4} fill="#f2c14e" />
      <circle cx={x} cy={GROUND - 19} r={3} fill="#e25b7a" />
    </g>
  );
}

export function Hedge({ x }: { x: number }) {
  return <rect x={x - 26} y={GROUND - 16} width={52} height={16} rx={7} fill="#2f6b3e" />;
}

export function FlagPole({ x, flag }: { x: number; flag: ReactNode }) {
  return (
    <g>
      <rect x={x - 1} y={GROUND - 110} width={2} height={110} fill="#8f8a80" />
      <g className="flagWave" transform={`translate(${x + 1} ${GROUND - 110})`}>
        {flag}
      </g>
    </g>
  );
}

export function Statue({ x }: { x: number }) {
  return (
    <g fill="#9aa0a6">
      <rect x={x - 14} y={GROUND - 26} width={28} height={26} />
      <rect x={x - 5} y={GROUND - 56} width={10} height={30} />
      <circle cx={x} cy={GROUND - 62} r={6} />
      <rect x={x + 5} y={GROUND - 52} width={12} height={3} />
    </g>
  );
}

export function Fountain({ x }: { x: number }) {
  return (
    <g>
      <ellipse cx={x} cy={GROUND - 4} rx={34} ry={7} fill="#cfc8b8" />
      <ellipse cx={x} cy={GROUND - 7} rx={28} ry={4} className="water" />
      <rect x={x - 4} y={GROUND - 34} width={8} height={28} fill="#cfc8b8" />
      <ellipse cx={x} cy={GROUND - 34} rx={14} ry={4} fill="#cfc8b8" />
      <path className="spray" d={`M${x} ${GROUND - 36} Q${x - 10} ${GROUND - 56} ${x - 16} ${GROUND - 36} M${x} ${GROUND - 36} Q${x + 10} ${GROUND - 56} ${x + 16} ${GROUND - 36}`} fill="none" strokeWidth={2} />
    </g>
  );
}

export function Camera({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width={12} height={6} rx={1} fill="#2b2f36" />
      <circle cx={x + 1} cy={y + 3} r={2} fill="#c0392b" className="blink" />
    </g>
  );
}

export function Carpet({ x, width }: { x: number; width: number }) {
  return <rect x={x - width / 2} y={GROUND + 1} width={width} height={10} fill="#9e1b1b" />;
}

/** Absperrung am Anfang eines gesperrten Viertels. */
export function Barrier({ x, label }: { x: number; label: string }) {
  return (
    <g>
      <rect x={x - 3} y={GROUND - 40} width={6} height={40} fill="#3b3f47" />
      <rect x={x - 40} y={GROUND - 36} width={80} height={10} fill="#c0392b" />
      <path d={`M${x - 36} ${GROUND - 36} l8 10 M${x - 20} ${GROUND - 36} l8 10 M${x - 4} ${GROUND - 36} l8 10 M${x + 12} ${GROUND - 36} l8 10 M${x + 28} ${GROUND - 36} l8 10`} stroke="#fff" strokeWidth={3} />
      <rect x={x - 50} y={GROUND - 72} width={100} height={20} rx={3} fill="#1c1f24" />
      <text x={x} y={GROUND - 58} textAnchor="middle" className="signText" fill="#f4efe2">
        {label}
      </text>
    </g>
  );
}
