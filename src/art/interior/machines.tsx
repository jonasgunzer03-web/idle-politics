import type { ReactNode } from 'react';
import type { MachineId } from '../../engine/ids';

// Maschinen in den Innenräumen. Jede wächst mit ihrer Stufe (1–5) und bewegt sich über
// CSS-Klassen (spin, belt, blink, fly, bob …, siehe Interior.module.css).
// Koordinaten: Raum 400 × 300, Boden bei FLOOR.

export const FLOOR = 238;

function Gear({
  cx,
  cy,
  r,
  color = '#5c6770',
}: {
  cx: number;
  cy: number;
  r: number;
  color?: string;
}) {
  const teeth = 8;
  const d: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    d.push(`M${cx} ${cy} L${x} ${y}`);
  }
  return (
    <g className="spin" style={{ transformOrigin: `${cx}px ${cy}px` }}>
      <circle cx={cx} cy={cy} r={r} fill={color} />
      <circle cx={cx} cy={cy} r={r * 0.45} fill="#2b2f36" />
      <path d={d.join(' ')} stroke="#2b2f36" strokeWidth={r * 0.18} />
    </g>
  );
}

function Screen({
  x,
  y,
  w,
  h,
  color = '#6fd0ff',
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  color?: string;
}) {
  return (
    <g>
      <rect x={x - 2} y={y - 2} width={w + 4} height={h + 4} rx={2} fill="#1c1f24" />
      <rect x={x} y={y} width={w} height={h} fill={color} className="flicker" />
      <rect x={x + 2} y={y + 3} width={w * 0.6} height={1.5} fill="rgb(255 255 255 / 60%)" />
      <rect x={x + 2} y={y + 7} width={w * 0.4} height={1.5} fill="rgb(255 255 255 / 45%)" />
    </g>
  );
}

function Leds({ x, y, cols, rows }: { x: number; y: number; cols: number; rows: number }) {
  const out: ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out.push(
        <circle
          key={`${r}-${c}`}
          cx={x + c * 5}
          cy={y + r * 6}
          r={1.3}
          fill={(r + c) % 3 === 0 ? '#ff5a4f' : '#39d98a'}
          className="blink"
          style={{ animationDelay: `${-((r * 7 + c * 3) % 10) * 0.17}s` }}
        />,
      );
    }
  }
  return <g>{out}</g>;
}

interface MachineProps {
  level: number;
  office: boolean;
  /** Streik: Maschinen stehen still. */
  stopped: boolean;
}

/** Zeichnet eine Maschine auf ihrem festen Platz im Raum. Stufe 0 = nicht vorhanden. */
export function MachineArt({
  id,
  level,
  office,
  stopped,
}: MachineProps & { id: MachineId }): ReactNode {
  if (level <= 0) return null;
  const L = Math.min(5, level);
  const cls = stopped ? 'stopped' : '';
  switch (id) {
    case 'conveyor': {
      if (office) {
        return (
          <g className={cls}>
            {Array.from({ length: 1 + L }, (_, i) => (
              <g key={i}>
                <rect x={30 + i * 34} y={FLOOR - 58} width={4} height={24} fill="#5a5f66" />
                <Screen
                  x={20 + i * 34}
                  y={FLOOR - 80}
                  w={24}
                  h={16}
                  color={i % 2 ? '#8fe3b0' : '#6fd0ff'}
                />
              </g>
            ))}
          </g>
        );
      }
      const len = 120 + L * 30;
      return (
        <g className={cls}>
          <rect x={30} y={FLOOR - 36} width={len} height={10} rx={5} fill="#2b2f36" />
          <rect x={30} y={FLOOR - 36} width={len} height={3} fill="#4a4f57" />
          {Array.from({ length: Math.floor(len / 18) }, (_, i) => (
            <Gear key={i} cx={38 + i * 18} cy={FLOOR - 31} r={4} color="#6c7880" />
          ))}
          <rect x={34} y={FLOOR - 26} width={4} height={26} fill="#3b3f47" />
          <rect x={30 + len - 8} y={FLOOR - 26} width={4} height={26} fill="#3b3f47" />
          <g className="belt" style={{ ['--belt' as string]: `${len - 30}px` }}>
            {Array.from({ length: 2 + L }, (_, i) => (
              <rect
                key={i}
                x={34}
                y={FLOOR - 48}
                width={13}
                height={12}
                rx={1}
                fill="#b98a55"
                stroke="#8a6238"
                strokeWidth={0.8}
                className="beltItem"
                style={{ animationDelay: `${-i * (4 / (2 + L))}s` }}
              />
            ))}
          </g>
          {L >= 3 && (
            <g transform={`translate(${30 + len / 2} ${FLOOR - 36})`}>
              <rect x={-6} y={-6} width={12} height={6} fill="#c9a227" />
              <g className="robotArm">
                <rect x={-2.5} y={-40} width={5} height={36} rx={2} fill="#e0a800" />
                <rect x={-2.5} y={-44} width={22} height={5} rx={2} fill="#e0a800" />
                <rect x={17} y={-44} width={4} height={10} fill="#5a5f66" />
              </g>
            </g>
          )}
        </g>
      );
    }
    case 'warehouse': {
      const shelves = Math.min(4, 1 + Math.ceil(L / 2));
      return (
        <g>
          {Array.from({ length: shelves }, (_, s) => (
            <g key={s}>
              <rect
                x={250}
                y={FLOOR - 30 - s * 32}
                width={120}
                height={3}
                fill={office ? '#8f8a80' : '#6b4a32'}
              />
              {Array.from({ length: 3 + (L % 3) }, (_, i) => (
                <rect
                  key={i}
                  x={256 + i * 22}
                  y={FLOOR - 50 - s * 32}
                  width={office ? 14 : 18}
                  height={office ? 20 : 18}
                  rx={1}
                  fill={
                    office
                      ? (['#c0392b', '#1f5fa8', '#2e7d4f', '#c9a227'][i % 4] ?? '#999')
                      : '#b98a55'
                  }
                  stroke={office ? 'none' : '#8a6238'}
                  strokeWidth={0.8}
                />
              ))}
            </g>
          ))}
          <rect
            x={248}
            y={FLOOR - 30 - shelves * 32}
            width={3}
            height={shelves * 32 + 30}
            fill="#5a5f66"
          />
          <rect
            x={369}
            y={FLOOR - 30 - shelves * 32}
            width={3}
            height={shelves * 32 + 30}
            fill="#5a5f66"
          />
        </g>
      );
    }
    case 'beerTap':
      return (
        <g className={cls}>
          {Array.from({ length: 1 + L }, (_, i) => (
            <g key={i} transform={`translate(${60 + i * 22} ${FLOOR - 82})`}>
              <rect x={-2} y={0} width={4} height={14} fill="#c9a227" />
              <rect x={-4} y={-6} width={8} height={7} rx={2} fill="#2b2f36" />
              <rect x={-5} y={18} width={10} height={14} rx={1} fill="#f2b632" opacity={0.9} />
              <rect x={-5} y={17} width={10} height={4} rx={1} fill="#fff8e6" className="foam" />
            </g>
          ))}
        </g>
      );
    case 'jukebox':
      return (
        <g className={cls}>
          <path
            d={`M300 ${FLOOR} V${FLOOR - 60} Q320 ${FLOOR - 90} 340 ${FLOOR - 60} V${FLOOR} Z`}
            fill="#6b2a2a"
          />
          <path
            d={`M306 ${FLOOR - 56} Q320 ${FLOOR - 80} 334 ${FLOOR - 56}`}
            fill="none"
            stroke="#ff6fb1"
            strokeWidth={3}
            className="glowCycle"
          />
          <rect
            x={308}
            y={FLOOR - 50}
            width={24}
            height={20}
            fill="#ffd34d"
            opacity={0.8}
            className="flicker"
          />
          {Array.from({ length: Math.min(4, L) }, (_, i) => (
            <text
              key={i}
              x={316 + i * 6}
              y={FLOOR - 94}
              fontSize={10}
              fill="#ffd34d"
              className="note"
              style={{ animationDelay: `${-i * 0.8}s` }}
            >
              ♪
            </text>
          ))}
        </g>
      );
    case 'stalls':
      return (
        <g>
          {Array.from({ length: Math.min(4, L) }, (_, i) => {
            const x = 40 + i * 58;
            const color = ['#c0392b', '#2e7d4f', '#1f5fa8', '#c9a227'][i] ?? '#c0392b';
            return (
              <g key={i}>
                <rect x={x} y={FLOOR - 34} width={48} height={34} fill="#8b6b4a" />
                <path
                  d={`M${x - 4} ${FLOOR - 58} H${x + 52} L${x + 48} ${FLOOR - 48} H${x} Z`}
                  fill={color}
                />
                {[0, 1, 2, 3].map((k) => (
                  <circle
                    key={k}
                    cx={x + 8 + k * 11}
                    cy={FLOOR - 37}
                    r={4.5}
                    fill={['#e67e22', '#c0392b', '#2e7d4f', '#f2c14e'][(k + i) % 4] ?? '#e67e22'}
                  />
                ))}
              </g>
            );
          })}
        </g>
      );
    case 'register':
      return (
        <g className={cls}>
          <rect x={270} y={FLOOR - 62} width={60} height={30} rx={3} fill="#2b2f36" />
          <rect x={276} y={FLOOR - 58} width={26} height={9} fill="#39d98a" className="flicker" />
          <rect x={306} y={FLOOR - 58} width={20} height={20} rx={2} fill="#4a4f57" />
          <rect
            x={272}
            y={FLOOR - 36}
            width={56}
            height={6}
            fill="#c9a227"
            className={L >= 2 ? 'drawer' : ''}
          />
          {L >= 3 && (
            <text
              x={300}
              y={FLOOR - 70}
              textAnchor="middle"
              fontSize={12}
              fill="#c9a227"
              className="coin"
            >
              €
            </text>
          )}
        </g>
      );
    case 'printer': {
      const s = 0.8 + L * 0.12;
      return (
        <g className={cls} transform={`translate(80 ${FLOOR}) scale(${s})`}>
          <rect x={-40} y={-50} width={80} height={50} rx={4} fill="#4a4f57" />
          <Gear cx={-18} cy={-28} r={12} color="#6c7880" />
          <Gear cx={16} cy={-28} r={12} color="#6c7880" />
          <rect x={30} y={-40} width={30} height={4} fill="#efe9dc" />
          {Array.from({ length: 3 }, (_, i) => (
            <rect
              key={i}
              x={40}
              y={-44}
              width={16}
              height={12}
              fill="#f4efe2"
              stroke="#c2336b"
              strokeWidth={0.8}
              className="sheet"
              style={{ animationDelay: `${-i * 0.7}s` }}
            />
          ))}
        </g>
      );
    }
    case 'phoneBank':
      return (
        <g className={cls}>
          <rect x={250} y={FLOOR - 44} width={110} height={6} fill="#8b6b4a" />
          {Array.from({ length: 1 + L }, (_, i) => (
            <g key={i}>
              <rect x={256 + i * 20} y={FLOOR - 54} width={14} height={10} rx={2} fill="#2b2f36" />
              <circle
                cx={263 + i * 20}
                cy={FLOOR - 58}
                r={2}
                fill="#ff5a4f"
                className="blink"
                style={{ animationDelay: `${-i * 0.4}s` }}
              />
            </g>
          ))}
        </g>
      );
    case 'counter':
      return (
        <g>
          {Array.from({ length: Math.min(4, L) }, (_, i) => (
            <g key={i}>
              <rect x={40 + i * 70} y={FLOOR - 46} width={60} height={46} fill="#8b6b4a" />
              <rect x={40 + i * 70} y={FLOOR - 50} width={60} height={5} fill="#6b4a32" />
              <rect x={60 + i * 70} y={FLOOR - 96} width={20} height={14} rx={2} fill="#1c1f24" />
              <text
                x={70 + i * 70}
                y={FLOOR - 85}
                textAnchor="middle"
                fontSize={9}
                fontWeight={800}
                fill="#ff5a4f"
                className="flicker"
              >
                {i + 1}
              </text>
            </g>
          ))}
        </g>
      );
    case 'archive':
    case 'fileLift': {
      const lift = id === 'fileLift';
      return (
        <g className={cls}>
          {Array.from({ length: Math.min(5, 1 + L) }, (_, r) => (
            <g key={r}>
              <rect x={286} y={FLOOR - 26 - r * 26} width={90} height={3} fill="#6b4a32" />
              {Array.from({ length: 8 }, (_, k) => (
                <rect
                  key={k}
                  x={290 + k * 10}
                  y={FLOOR - 46 - r * 26}
                  width={7}
                  height={20}
                  fill={['#c9b797', '#8f5a3c', '#4b5a70', '#c0392b'][(k + r) % 4] ?? '#999'}
                />
              ))}
            </g>
          ))}
          {lift && (
            <g>
              <rect x={266} y={FLOOR - 170} width={14} height={170} fill="#5a5f66" />
              <rect x={264} y={FLOOR - 30} width={18} height={14} fill="#c9a227" className="lift" />
            </g>
          )}
        </g>
      );
    }
    case 'rotary': {
      const s = 0.8 + L * 0.1;
      return (
        <g className={cls} transform={`translate(110 ${FLOOR}) scale(${s})`}>
          <rect x={-80} y={-60} width={160} height={60} rx={4} fill="#3b3f47" />
          {[-50, -10, 30].map((x) => (
            <Gear key={x} cx={x} cy={-32} r={16} color="#6c7880" />
          ))}
          <path d="M-80 -60 Q0 -110 80 -60" fill="none" stroke="#efe9dc" strokeWidth={6} />
          <path
            d="M-80 -60 Q0 -110 80 -60"
            fill="none"
            stroke="#b9b3a6"
            strokeWidth={6}
            strokeDasharray="10 14"
            className="paperWeb"
          />
        </g>
      );
    }
    case 'photoLab':
      return (
        <g>
          <rect x={300} y={FLOOR - 120} width={70} height={120} fill="#2b1414" />
          <rect
            x={300}
            y={FLOOR - 120}
            width={70}
            height={120}
            fill="#ff3b3b"
            opacity={0.25}
            className="flicker"
          />
          <path d={`M300 ${FLOOR - 100} H370`} stroke="#8f8a80" strokeWidth={1} />
          {Array.from({ length: 1 + L }, (_, i) => (
            <rect key={i} x={304 + i * 12} y={FLOOR - 99} width={9} height={11} fill="#f4efe2" />
          ))}
        </g>
      );
    case 'tickerBoard':
      return (
        <g className={cls}>
          <rect x={30} y={40} width={200} height={24} rx={2} fill="#111" />
          <g>
            <text
              x={40}
              y={57}
              fontSize={12}
              fontWeight={800}
              fill="#39d98a"
              className="tickerText"
              fontFamily="var(--font-sans)"
            >
              {'▲ +2,4 %   ▼ −0,8 %   ▲ +5,1 %   ▲ +1,2 %'.slice(0, 14 + L * 4)}
            </text>
          </g>
        </g>
      );
    case 'vault':
      return (
        <g className={cls}>
          <circle
            cx={320}
            cy={FLOOR - 70}
            r={44 + L * 3}
            fill="#8a8f96"
            stroke="#5a5f66"
            strokeWidth={6}
          />
          <circle cx={320} cy={FLOOR - 70} r={30} fill="#9aa0a6" />
          <g className="spinSlow" style={{ transformOrigin: `320px ${FLOOR - 70}px` }}>
            <path
              d={`M296 ${FLOOR - 70} H344 M320 ${FLOOR - 94} V${FLOOR - 46}`}
              stroke="#c9a227"
              strokeWidth={5}
              strokeLinecap="round"
            />
          </g>
          {L >= 3 &&
            [0, 1, 2].map((i) => (
              <rect
                key={i}
                x={262 + i * 12}
                y={FLOOR - 18 - i * 6}
                width={22}
                height={6}
                fill="#d9b54a"
              />
            ))}
        </g>
      );
    case 'mics':
      return (
        <g className={cls}>
          {Array.from({ length: 1 + L }, (_, i) => (
            <g key={i} transform={`translate(${60 + i * 50} ${FLOOR - 40})`}>
              <path d="M0 0 Q0 -18 10 -24" fill="none" stroke="#2b2f36" strokeWidth={1.5} />
              <circle cx={10} cy={-25} r={2.5} fill="#2b2f36" />
              <circle
                cx={0}
                cy={2}
                r={2}
                fill="#ff5a4f"
                className="blink"
                style={{ animationDelay: `${-i * 0.5}s` }}
              />
            </g>
          ))}
        </g>
      );
    case 'votingBoard':
      return (
        <g className={cls}>
          <rect x={280} y={30} width={90} height={60} rx={3} fill="#111" />
          <Leds x={288} y={40} cols={Math.min(16, 8 + L * 2)} rows={Math.min(8, 3 + L)} />
        </g>
      );
    case 'mainframe':
      return (
        <g className={cls}>
          {Array.from({ length: 1 + L }, (_, i) => (
            <g key={i}>
              <rect x={30 + i * 32} y={FLOOR - 120} width={28} height={120} rx={2} fill="#2b2f36" />
              <Leds x={36 + i * 32} y={FLOOR - 110} cols={4} rows={14} />
            </g>
          ))}
        </g>
      );
    case 'interpreters':
      return (
        <g>
          {Array.from({ length: Math.min(4, L) }, (_, i) => (
            <g key={i}>
              <rect
                x={40 + i * 60}
                y={70}
                width={50}
                height={40}
                rx={3}
                fill="url(#roomGlass)"
                stroke="#5a5f66"
                strokeWidth={2}
              />
              <circle cx={65 + i * 60} cy={90} r={6} fill="#d9a57e" />
              <path
                d={`M${57 + i * 60} 88 Q${65 + i * 60} 78 ${73 + i * 60} 88`}
                fill="none"
                stroke="#2b2f36"
                strokeWidth={2}
              />
            </g>
          ))}
        </g>
      );
    case 'banquet':
      return (
        <g>
          <rect x={60} y={FLOOR - 34} width={60 + L * 36} height={8} fill="#f4efe2" />
          <rect x={60} y={FLOOR - 26} width={60 + L * 36} height={26} fill="#e8dcc6" />
          {Array.from({ length: 2 + L * 2 }, (_, i) => (
            <g key={i}>
              <circle
                cx={74 + i * 18}
                cy={FLOOR - 38}
                r={5}
                fill={['#e67e22', '#c0392b', '#f2c14e', '#2e7d4f'][i % 4] ?? '#e67e22'}
              />
              {i % 2 === 0 && (
                <g>
                  <rect x={72 + i * 18} y={FLOOR - 54} width={3} height={12} fill="#f4efe2" />
                  <ellipse
                    cx={73.5 + i * 18}
                    cy={FLOOR - 57}
                    rx={2}
                    ry={3.5}
                    fill="#ffd34d"
                    className="candle"
                  />
                </g>
              )}
            </g>
          ))}
        </g>
      );
    case 'tvStudio':
      return (
        <g className={cls}>
          {Array.from({ length: Math.min(3, L) }, (_, i) => (
            <g key={i} transform={`translate(${40 + i * 70} ${FLOOR})`}>
              <path d="M0 0 L10 -40 L20 0" fill="none" stroke="#2b2f36" strokeWidth={2} />
              <rect x={-4} y={-58} width={30} height={18} rx={3} fill="#2b2f36" />
              <circle cx={28} cy={-49} r={6} fill="#4a4f57" />
              <circle cx={0} cy={-56} r={1.8} fill="#ff3b3b" className="blink" />
            </g>
          ))}
          <rect x={280} y={30} width={60} height={18} rx={3} fill="#b3261e" className="blink" />
          <text x={310} y={43} textAnchor="middle" fontSize={10} fontWeight={800} fill="#fff">
            ON AIR
          </text>
        </g>
      );
    case 'balcony':
      return (
        <g>
          <rect x={240} y={40} width={120} height={FLOOR - 40} rx={6} fill="url(#roomSky)" />
          <rect
            x={240}
            y={40}
            width={120}
            height={FLOOR - 40}
            rx={6}
            fill="none"
            stroke="#c9a227"
            strokeWidth={5}
          />
          <path d={`M300 40 V${FLOOR}`} stroke="#c9a227" strokeWidth={3} />
          <path
            d="M232 36 Q246 120 236 238 L246 238 Q254 120 250 36 Z M368 36 Q354 120 364 238 L354 238 Q346 120 350 36 Z"
            fill="#8b1e1e"
          />
          {Array.from({ length: L * 3 }, (_, i) => (
            <circle
              key={i}
              cx={252 + ((i * 17) % 100)}
              cy={FLOOR - 8 - (i % 3) * 4}
              r={3}
              fill="#3b3f47"
              className="crowd"
              style={{ animationDelay: `${-i * 0.2}s` }}
            />
          ))}
        </g>
      );
  }
}
