import type { ReactNode } from 'react';
import type { FlagDef } from '../../config/states';

interface Props {
  flag: FlagDef;
  /** Breite in px; Höhe ergibt sich aus dem Seitenverhältnis 3:2. */
  width?: number;
  className?: string;
  title?: string;
}

function Emblem({
  kind,
  color,
  cx,
  cy,
  r,
}: {
  kind: FlagDef['emblem'];
  color: string;
  cx: number;
  cy: number;
  r: number;
}) {
  switch (kind) {
    case 'none':
      return null;
    case 'star': {
      const points = Array.from({ length: 10 }, (_, i) => {
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        const radius = i % 2 === 0 ? r : r * 0.42;
        return `${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`;
      }).join(' ');
      return <polygon points={points} fill={color} />;
    }
    case 'circle':
      return (
        <circle cx={cx} cy={cy} r={r * 0.8} fill="none" stroke={color} strokeWidth={r * 0.25} />
      );
    case 'gear': {
      const teeth = Array.from({ length: 8 }, (_, i) => (
        <rect
          key={i}
          x={cx - r * 0.18}
          y={cy - r}
          width={r * 0.36}
          height={r * 0.4}
          fill={color}
          transform={`rotate(${i * 45} ${cx} ${cy})`}
        />
      ));
      return (
        <g>
          {teeth}
          <circle cx={cx} cy={cy} r={r * 0.68} fill={color} />
          <circle cx={cx} cy={cy} r={r * 0.3} fill="rgb(0 0 0 / 25%)" />
        </g>
      );
    }
    case 'wave':
      return (
        <path
          d={`M${cx - r} ${cy} q${r / 2} ${-r / 2} ${r} 0 t${r} 0`}
          fill="none"
          stroke={color}
          strokeWidth={r * 0.3}
          strokeLinecap="round"
        />
      );
    case 'peak':
      return (
        <path
          d={`M${cx - r} ${cy + r * 0.6} L${cx} ${cy - r * 0.7} L${cx + r} ${cy + r * 0.6} Z`}
          fill={color}
        />
      );
    case 'oak':
      // Stilisiertes Eichenblatt
      return (
        <g fill={color}>
          <ellipse cx={cx} cy={cy} rx={r * 0.45} ry={r * 0.85} />
          <ellipse cx={cx - r * 0.45} cy={cy - r * 0.15} rx={r * 0.3} ry={r * 0.22} />
          <ellipse cx={cx + r * 0.45} cy={cy - r * 0.15} rx={r * 0.3} ry={r * 0.22} />
          <ellipse cx={cx - r * 0.4} cy={cy + r * 0.35} rx={r * 0.26} ry={r * 0.2} />
          <ellipse cx={cx + r * 0.4} cy={cy + r * 0.35} rx={r * 0.26} ry={r * 0.2} />
        </g>
      );
  }
}

/** Flagge als SVG-Gruppe im Koordinatensystem 60 × 40 (zum Einbetten in andere SVGs). */
export function FlagGraphic({ flag }: { flag: FlagDef }) {
  const w = 60;
  const h = 40;
  const { layout, colors, emblem, emblemColor } = flag;
  let body: ReactNode;
  let emblemPos = { cx: w / 2, cy: h / 2, r: 9 };
  if (layout === 'canton') {
    body = (
      <>
        <rect width={w} height={h} fill={colors[0]} />
        <rect width={w * 0.45} height={h * 0.55} fill={colors[1] ?? colors[0]} />
      </>
    );
    emblemPos = { cx: w * 0.225, cy: h * 0.275, r: 7 };
  } else {
    const n = Math.max(1, colors.length);
    body = colors.map((c, i) =>
      layout === 'horizontal' ? (
        <rect key={i} y={(h / n) * i} width={w} height={h / n + 0.5} fill={c} />
      ) : (
        <rect key={i} x={(w / n) * i} width={w / n + 0.5} height={h} fill={c} />
      ),
    );
  }
  return (
    <g>
      {body}
      <Emblem kind={emblem} color={emblemColor} {...emblemPos} />
      <rect width={w} height={h} fill="none" stroke="rgb(0 0 0 / 18%)" strokeWidth="1" />
    </g>
  );
}

/** Fiktive Staatsflagge als eigenständiges Bild. */
export function Flag({ flag, width = 48, className, title }: Props) {
  return (
    <svg
      viewBox="0 0 60 40"
      width={width}
      height={(width * 40) / 60}
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <FlagGraphic flag={flag} />
    </svg>
  );
}
