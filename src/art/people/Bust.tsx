import { memo, useId } from 'react';
import { hash32 } from '../../engine/people';

// Porträt (Kopf und Schultern) für Mitarbeiter, Berater und den Rivalen. Alles wird aus
// einem Seed abgeleitet, damit eine Person immer gleich aussieht.

const SKINS = ['#f6d3b3', '#eec19c', '#d9a57e', '#b97f57', '#8d5a3b', '#613d29'];
const HAIRS = ['#2b1d16', '#4a2f1f', '#7a4a26', '#b07a3e', '#d8b26a', '#8f8f8f', '#1b1b1f', '#a23d24'];

export type BustOutfit = 'overall' | 'shirt' | 'suit' | 'apron' | 'blazer' | 'uniform';
export type BustMood = 'happy' | 'neutral' | 'angry';

interface Props {
  seed: number;
  outfit?: BustOutfit;
  /** Farbe von Krawatte, Halstuch oder Anstecker (z. B. Flügel- oder Parteifarbe). */
  accent?: string;
  mood?: BustMood;
  /** Hintergrundkreis (null = keiner). */
  background?: string | null;
  className?: string;
  title?: string;
}

function pick<T>(list: readonly T[], n: number, fallback: T): T {
  return list[n % list.length] ?? fallback;
}

export const Bust = memo(function Bust({
  seed,
  outfit = 'shirt',
  accent = '#b3261e',
  mood = 'neutral',
  background = null,
  className,
  title,
}: Props) {
  const uid = useId().replace(/:/g, '');
  const skin = pick(SKINS, hash32(seed, 1), '#eec19c');
  const hair = pick(HAIRS, hash32(seed, 2), '#2b1d16');
  const style = hash32(seed, 3) % 6;
  const glasses = hash32(seed, 4) % 5 === 0;
  const beard = hash32(seed, 5) % 6 === 0 && style !== 3;
  const shirtHue = hash32(seed, 6) % 360;
  const shirt = `hsl(${shirtHue} 35% 45%)`;
  const eyeColor = pick(['#3b2a20', '#2e5d8a', '#3f6b3f', '#5b4636'], hash32(seed, 7), '#3b2a20');
  const faceWidth = 15 + (hash32(seed, 8) % 3);

  const body = (() => {
    switch (outfit) {
      case 'overall':
        return (
          <g>
            <path d="M8 64 Q10 46 32 44 Q54 46 56 64 Z" fill="#35577d" />
            <path d="M22 46 V64 M42 46 V64" stroke="#2a4563" strokeWidth={3} />
            <circle cx={22} cy={52} r={1.6} fill="#d9c27a" />
            <circle cx={42} cy={52} r={1.6} fill="#d9c27a" />
            <path d="M26 45 L32 52 L38 45" fill={shirt} />
          </g>
        );
      case 'suit':
        return (
          <g>
            <path d="M8 64 Q10 46 32 44 Q54 46 56 64 Z" fill="#2b2f38" />
            <path d="M26 45 L32 60 L38 45 Z" fill="#f2efe8" />
            <path d="M31 48 L33 48 L34 60 L32 62 L30 60 Z" style={{ fill: accent }} />
            <path d="M26 45 L30 56 L24 52 Z M38 45 L34 56 L40 52 Z" fill="#1f232a" />
          </g>
        );
      case 'apron':
        return (
          <g>
            <path d="M8 64 Q10 46 32 44 Q54 46 56 64 Z" fill={shirt} />
            <path d="M20 50 H44 V64 H20 Z" fill="#f1ece0" />
            <path d="M22 50 L26 45 M42 50 L38 45" stroke="#f1ece0" strokeWidth={2.5} />
          </g>
        );
      case 'blazer':
        return (
          <g>
            <path d="M8 64 Q10 46 32 44 Q54 46 56 64 Z" fill={`hsl(${shirtHue} 30% 32%)`} />
            <path d="M27 45 L32 56 L37 45 Z" fill="#f7f4ee" />
            <circle cx={42} cy={53} r={2.2} style={{ fill: accent }} />
          </g>
        );
      case 'uniform':
        return (
          <g>
            <path d="M8 64 Q10 46 32 44 Q54 46 56 64 Z" fill="#3e4a33" />
            <path d="M14 50 H22 M42 50 H50" stroke="#c9a227" strokeWidth={2} />
            <path d="M27 45 L32 52 L37 45 Z" fill="#2f3826" />
          </g>
        );
      default:
        return (
          <g>
            <path d="M8 64 Q10 46 32 44 Q54 46 56 64 Z" fill={shirt} />
            <path d="M26 45 L32 51 L38 45" fill="none" stroke="rgb(0 0 0 / 25%)" strokeWidth={1.5} />
          </g>
        );
    }
  })();

  const hairBack =
    style === 2 ? (
      <path d="M14 26 Q13 46 20 48 L44 48 Q51 46 50 26 Q48 10 32 10 Q16 10 14 26 Z" fill={hair} />
    ) : style === 3 ? (
      <circle cx={32} cy={9} r={6} fill={hair} />
    ) : null;

  const hairFront = (() => {
    switch (style) {
      case 0:
        return <path d="M16 25 Q16 11 32 11 Q48 11 48 25 Q42 17 32 18 Q22 17 16 25 Z" fill={hair} />;
      case 1:
        return <path d="M16 26 Q15 10 34 11 Q49 12 48 26 Q46 18 40 17 Q30 22 16 26 Z" fill={hair} />;
      case 2:
        return <path d="M16 28 Q15 11 32 11 Q49 11 48 28 Q44 17 32 17 Q20 17 16 28 Z" fill={hair} />;
      case 3:
        return <path d="M16 25 Q17 12 32 12 Q47 12 48 25 Q40 16 32 16 Q24 16 16 25 Z" fill={hair} />;
      case 4:
        // Glatze mit Haarkranz
        return (
          <path
            d="M16 30 Q15 22 18 19 Q18 26 20 28 Z M48 30 Q49 22 46 19 Q46 26 44 28 Z"
            fill={hair}
          />
        );
      default:
        // Locken
        return (
          <g fill={hair}>
            {[18, 23, 28, 33, 38, 43, 46].map((x, i) => (
              <circle key={x} cx={x} cy={16 + (i % 2) * 2} r={5} />
            ))}
          </g>
        );
    }
  })();

  const mouth =
    mood === 'happy' ? (
      <path d="M27 36 Q32 41 37 36" fill="none" stroke="#7a3b2e" strokeWidth={1.6} strokeLinecap="round" />
    ) : mood === 'angry' ? (
      <path d="M27 39 Q32 35 37 39" fill="none" stroke="#7a3b2e" strokeWidth={1.6} strokeLinecap="round" />
    ) : (
      <path d="M28 37.5 H36" stroke="#7a3b2e" strokeWidth={1.5} strokeLinecap="round" />
    );
  const brows =
    mood === 'angry' ? (
      <path d="M23 24 L29 26 M41 24 L35 26" stroke={hair} strokeWidth={1.8} strokeLinecap="round" />
    ) : (
      <path d="M23 25 Q26 23 29 25 M35 25 Q38 23 41 25" fill="none" stroke={hair} strokeWidth={1.6} strokeLinecap="round" />
    );

  return (
    <svg viewBox="0 0 64 64" className={className} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <defs>
        <radialGradient id={`face-${uid}`} cx="45%" cy="40%" r="65%">
          <stop offset="0%" stopColor={skin} />
          <stop offset="100%" stopColor={skin} stopOpacity={0.85} />
        </radialGradient>
        <clipPath id={`clip-${uid}`}>
          <circle cx={32} cy={32} r={32} />
        </clipPath>
      </defs>
      <g clipPath={background ? `url(#clip-${uid})` : undefined}>
        {background && <circle cx={32} cy={32} r={32} style={{ fill: background }} />}
        {hairBack}
        {body}
        {/* Hals */}
        <path d="M27 38 H37 V47 Q32 50 27 47 Z" fill={skin} />
        <path d="M27 42 Q32 45 37 42 V44 Q32 47 27 44 Z" fill="rgb(0 0 0 / 12%)" />
        {/* Ohren */}
        <ellipse cx={32 - faceWidth} cy={29} rx={2.6} ry={3.6} fill={skin} />
        <ellipse cx={32 + faceWidth} cy={29} rx={2.6} ry={3.6} fill={skin} />
        {/* Gesicht */}
        <ellipse cx={32} cy={28} rx={faceWidth} ry={17} fill={`url(#face-${uid})`} />
        <ellipse cx={24} cy={33} rx={3} ry={2} fill="#e0876a" opacity={0.25} />
        <ellipse cx={40} cy={33} rx={3} ry={2} fill="#e0876a" opacity={0.25} />
        {hairFront}
        {brows}
        {/* Augen mit Glanzpunkt */}
        <ellipse cx={26} cy={29} rx={2.2} ry={2.5} fill="#fff" />
        <ellipse cx={38} cy={29} rx={2.2} ry={2.5} fill="#fff" />
        <circle cx={26.3} cy={29.4} r={1.5} fill={eyeColor} />
        <circle cx={38.3} cy={29.4} r={1.5} fill={eyeColor} />
        <circle cx={26.8} cy={28.8} r={0.5} fill="#fff" />
        <circle cx={38.8} cy={28.8} r={0.5} fill="#fff" />
        {/* Nase */}
        <path d="M32 29 Q30.5 33 32.5 34" fill="none" stroke="rgb(0 0 0 / 22%)" strokeWidth={1.2} strokeLinecap="round" />
        {beard && <path d="M18 32 Q20 46 32 46 Q44 46 46 32 Q42 40 32 40 Q22 40 18 32 Z" fill={hair} />}
        {mouth}
        {glasses && (
          <g fill="none" stroke="#2b2f36" strokeWidth={1.3}>
            <circle cx={26} cy={29} r={4} />
            <circle cx={38} cy={29} r={4} />
            <path d="M30 29 H34" />
          </g>
        )}
      </g>
    </svg>
  );
});
