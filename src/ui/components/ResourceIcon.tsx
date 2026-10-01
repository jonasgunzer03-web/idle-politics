import type { JSX } from 'react';
import type { ResourceId } from '../../engine/ids';

// Bunte Spiel-Icons für die Währungen (eigene Zeichnungen statt Strich-Icons):
// Münze, Megafon, Menschen, Globus. viewBox 24×24, mit dunkler Kontur.

interface Props {
  resource: ResourceId;
  size?: number;
}

function Coin() {
  return (
    <>
      <ellipse cx={12} cy={14.2} rx={9.2} ry={8.4} fill="#c98a12" />
      <circle cx={12} cy={12} r={9} fill="#ffcf3d" stroke="#b77a0c" strokeWidth={1.4} />
      <circle cx={12} cy={12} r={6.4} fill="none" stroke="#f0a91a" strokeWidth={1.4} />
      <path
        d="M14.6 9.2 Q12.9 7.9 11.2 8.6 Q9.2 9.5 9.3 12 Q9.4 14.6 11.6 15.3 Q13.2 15.8 14.6 14.7 M8.2 11.1 H12.6 M8.2 13.1 H12"
        fill="none"
        stroke="#9a6206"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <path
        d="M6.6 8.4 Q8 6 10.6 5.4"
        fill="none"
        stroke="#fff6c9"
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </>
  );
}

function Influence() {
  // Megafon in einem violetten Abzeichen
  return (
    <>
      <circle cx={12} cy={13} r={10} fill="#6b34c9" />
      <circle cx={12} cy={12} r={10} fill="#9a62f5" stroke="#5b2bb3" strokeWidth={1.3} />
      <path
        d="M6.5 10.4 L13.6 7.2 V16.8 L6.5 13.6 Z"
        fill="#fff"
        stroke="#4a2196"
        strokeWidth={1}
        strokeLinejoin="round"
      />
      <rect
        x={5}
        y={10.2}
        width={2.6}
        height={3.6}
        rx={0.8}
        fill="#ffd34d"
        stroke="#4a2196"
        strokeWidth={0.9}
      />
      <path
        d="M15.6 9.6 Q17.2 12 15.6 14.4 M17.4 8.2 Q20 12 17.4 15.8"
        fill="none"
        stroke="#fff"
        strokeWidth={1.3}
        strokeLinecap="round"
      />
      <path
        d="M8 14.4 L9 17.6 H10.6 L10 14.9"
        fill="#fff"
        stroke="#4a2196"
        strokeWidth={0.9}
        strokeLinejoin="round"
      />
    </>
  );
}

function Followers() {
  return (
    <>
      <circle cx={12} cy={13} r={10} fill="#1767c9" />
      <circle cx={12} cy={12} r={10} fill="#4aa0ff" stroke="#1a63c0" strokeWidth={1.3} />
      <circle cx={7.6} cy={10.2} r={2.2} fill="#cfe6ff" />
      <path d="M3.9 16.6 Q4.6 12.9 7.6 12.9 Q10 12.9 10.8 15" fill="#cfe6ff" />
      <circle cx={16.4} cy={10.2} r={2.2} fill="#cfe6ff" />
      <path d="M13.2 15 Q14 12.9 16.4 12.9 Q19.4 12.9 20.1 16.6" fill="#cfe6ff" />
      <circle cx={12} cy={9.2} r={2.9} fill="#fff" stroke="#1a63c0" strokeWidth={0.9} />
      <path
        d="M6.8 18.6 Q7.4 13.2 12 13.2 Q16.6 13.2 17.2 18.6 Z"
        fill="#fff"
        stroke="#1a63c0"
        strokeWidth={0.9}
      />
    </>
  );
}

function Diplomacy() {
  return (
    <>
      <circle cx={12} cy={13} r={10} fill="#08818b" />
      <circle cx={12} cy={12} r={10} fill="#3fd0db" stroke="#0a8a94" strokeWidth={1.3} />
      <path
        d="M5.5 8.6 Q8 7.4 9.2 9 Q10.6 10.6 9 12.1 Q7.8 13.4 8.6 15.6 Q6.2 14.6 5.2 12.2 Q4.8 10.2 5.5 8.6 Z M12.6 5.2 Q15.6 5.4 17 7.2 Q15.6 8.6 14 8 Q12.4 7.4 12.6 5.2 Z M14.2 11.4 Q16.6 10.4 18.6 12 Q18.8 15.2 16.6 17.4 Q14.6 16.8 14.6 14.6 Q13.2 13.4 14.2 11.4 Z"
        fill="#5ee38f"
        stroke="#0a7a52"
        strokeWidth={0.8}
        strokeLinejoin="round"
      />
      <path
        d="M5.8 6.8 Q7.6 4.6 10.4 3.9"
        stroke="#d6fbff"
        strokeWidth={1.3}
        strokeLinecap="round"
        fill="none"
      />
    </>
  );
}

const ICONS: Record<ResourceId, () => JSX.Element> = {
  money: Coin,
  influence: Influence,
  followers: Followers,
  diplomacy: Diplomacy,
};

export function ResourceIcon({ resource, size = 16 }: Props) {
  const Icon = ICONS[resource];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ flexShrink: 0, overflow: 'visible' }}
    >
      <Icon />
    </svg>
  );
}
