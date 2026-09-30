import type { ReactNode } from 'react';
import { hash32 } from '../../engine/people';
import type { ArchPalette } from './palette';

// Zeichen-Baukasten für die Straße. Ein Painter sammelt drei Ebenen:
// body (das Gebäude selbst), lights (was nachts leuchtet) und fx (Rauch, Blinklichter).
// Die Straße legt zwischen body und lights eine Nachtfärbung, die im Tagesrhythmus
// ein- und ausblendet – so leuchten nachts nur Fenster, Laternen und Schilder.

export const GROUND = 250;

export interface ShapeOpts {
  rx?: number;
  opacity?: number;
  stroke?: string;
  sw?: number;
  className?: string;
}

export class Painter {
  readonly body: ReactNode[] = [];
  readonly lights: ReactNode[] = [];
  readonly fx: ReactNode[] = [];
  private k = 0;

  constructor(
    private readonly prefix: string,
    /** Grundlage für die Frage, welche Fenster nachts brennen. */
    readonly seed = 1,
  ) {}

  key(): string {
    return `${this.prefix}-${this.k++}`;
  }

  rect(x: number, y: number, w: number, h: number, fill: string, o: ShapeOpts = {}): void {
    this.body.push(
      <rect
        key={this.key()}
        x={x}
        y={y}
        width={Math.max(0, w)}
        height={Math.max(0, h)}
        fill={fill}
        rx={o.rx}
        opacity={o.opacity}
        stroke={o.stroke}
        strokeWidth={o.sw}
        className={o.className}
      />,
    );
  }

  path(d: string, fill: string, o: ShapeOpts = {}): void {
    this.body.push(
      <path
        key={this.key()}
        d={d}
        fill={fill}
        opacity={o.opacity}
        stroke={o.stroke}
        strokeWidth={o.sw}
        className={o.className}
        strokeLinejoin="round"
      />,
    );
  }

  circle(cx: number, cy: number, r: number, fill: string, o: ShapeOpts = {}): void {
    this.body.push(
      <circle
        key={this.key()}
        cx={cx}
        cy={cy}
        r={r}
        fill={fill}
        opacity={o.opacity}
        stroke={o.stroke}
        strokeWidth={o.sw}
        className={o.className}
      />,
    );
  }

  line(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    stroke: string,
    sw = 1,
    opacity?: number,
  ): void {
    this.body.push(
      <line
        key={this.key()}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={stroke}
        strokeWidth={sw}
        opacity={opacity}
        strokeLinecap="round"
      />,
    );
  }

  text(
    x: number,
    y: number,
    content: string,
    fill: string,
    o: { size?: number; weight?: number; family?: 'sans' | 'serif'; glow?: boolean } = {},
  ): void {
    const node = (glow: boolean) => (
      <text
        key={this.key()}
        x={x}
        y={y}
        textAnchor="middle"
        fontSize={o.size ?? 7.5}
        fontWeight={o.weight ?? 700}
        fontFamily={o.family === 'serif' ? 'var(--font-serif)' : 'var(--font-sans)'}
        fill={glow ? '#fff4c2' : fill}
        letterSpacing={0.3}
      >
        {content}
      </text>
    );
    this.body.push(node(false));
    if (o.glow) this.lights.push(node(true));
  }

  /** Beliebiges Element in eine Ebene legen. */
  add(node: ReactNode, layer: 'body' | 'lights' | 'fx' = 'body'): void {
    this[layer].push(<g key={this.key()}>{node}</g>);
  }

  /** Brennt dieses Fenster nachts? (deterministisch aus Position und Seed) */
  private lit(x: number, y: number, share: number): boolean {
    return hash32(this.seed, Math.round(x * 3), Math.round(y * 3)) % 100 < share * 100;
  }

  /**
   * Fenster mit Rahmen, Glas-Spiegelung und Sims. Nachts leuchtet es warm
   * (je nach `lit` ein Teil der Fenster).
   */
  win(
    x: number,
    y: number,
    w: number,
    h: number,
    o: { arched?: boolean; frame?: string; lit?: number; sill?: boolean; cross?: boolean } = {},
  ): void {
    const frame = o.frame ?? '#f4efe6';
    const shape = o.arched
      ? `M${x} ${y + h} V${y + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2} V${y + h} Z`
      : `M${x} ${y} H${x + w} V${y + h} H${x} Z`;
    this.body.push(
      <g key={this.key()}>
        <path d={shape} fill="url(#glass)" stroke={frame} strokeWidth={2} />
        <path
          d={`M${x + 1} ${y + h - 1} L${x + w - 1} ${y + (o.arched ? w / 2 : 1)}`}
          stroke="rgb(255 255 255 / 45%)"
          strokeWidth={Math.max(1, w * 0.12)}
        />
        {o.cross !== false && w >= 10 && (
          <path
            d={`M${x + w / 2} ${y + (o.arched ? 2 : 0)} V${y + h} M${x} ${y + h * 0.45} H${x + w}`}
            stroke={frame}
            strokeWidth={1.2}
          />
        )}
        {o.sill !== false && (
          <rect x={x - 1.5} y={y + h} width={w + 3} height={2} fill="rgb(0 0 0 / 25%)" />
        )}
      </g>,
    );
    if (this.lit(x, y, o.lit ?? 0.6)) {
      this.lights.push(<path key={this.key()} d={shape} fill="url(#windowGlow)" />);
    }
  }

  /** Fensterraster. */
  windows(
    x: number,
    y: number,
    cols: number,
    rows: number,
    w: number,
    h: number,
    gx: number,
    gy: number,
    o: { arched?: boolean; frame?: string; lit?: number; cross?: boolean } = {},
  ): void {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) this.win(x + c * (w + gx), y + r * (h + gy), w, h, o);
    }
  }

  /** Große beleuchtete Glasfläche (Schaufenster, Glasfassade). */
  glass(x: number, y: number, w: number, h: number, lit = true, frame = '#3b3f47'): void {
    this.rect(x, y, w, h, 'url(#glass)');
    this.rect(x, y, w, h, 'none', { stroke: frame, sw: 1.5 });
    for (let gx = x + 12; gx < x + w - 4; gx += 12) this.line(gx, y, gx, y + h, frame, 0.8, 0.8);
    if (lit)
      this.lights.push(
        <rect key={this.key()} x={x} y={y} width={w} height={h} fill="url(#windowGlow)" />,
      );
  }

  /** Wand mit leichter Licht-/Schattierung und dunklerer Seitenkante (Tiefe). */
  wall(x: number, y: number, w: number, h: number, fill: string, depth = 5): void {
    this.rect(x, y, w, h, fill);
    this.rect(x, y, w, h, 'url(#facadeShade)');
    if (depth > 0) this.rect(x + w - depth, y, depth, h, 'rgb(0 0 0 / 16%)');
    this.rect(x, GROUND - 3, w, 3, 'rgb(0 0 0 / 18%)');
  }

  /** Klinker-Struktur (Arbeiterviertel). */
  bricks(x: number, y: number, w: number, h: number): void {
    this.rect(x, y, w, h, 'url(#bricks)', { opacity: 0.55 });
  }

  /** Gesims über die ganze Breite. */
  cornice(x: number, y: number, w: number, color: string, h = 4): void {
    this.rect(x - 3, y, w + 6, h, color);
    this.rect(x - 3, y + h, w + 6, 1.5, 'rgb(0 0 0 / 22%)');
  }

  door(cx: number, w: number, h: number, color = '#4a3a2e', arched = false): void {
    const x = cx - w / 2;
    const y = GROUND - h;
    const d = arched
      ? `M${x} ${GROUND} V${y + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2} V${GROUND} Z`
      : `M${x} ${GROUND} V${y} H${x + w} V${GROUND} Z`;
    this.path(d, '#2b2520');
    this.path(d, color, { opacity: 0.95 });
    this.line(cx, y + (arched ? w / 2 : 2), cx, GROUND, 'rgb(0 0 0 / 35%)', 1);
    this.circle(cx - 3, GROUND - h / 2, 1.2, '#d9b54a');
    this.circle(cx + 3, GROUND - h / 2, 1.2, '#d9b54a');
    this.lights.push(
      <rect
        key={this.key()}
        x={x + 2}
        y={y + 2}
        width={w - 4}
        height={Math.min(8, h / 5)}
        fill="url(#windowGlow)"
        opacity={0.7}
      />,
    );
  }

  /** Schild mit Schrift; nachts beleuchtet. */
  sign(
    cx: number,
    y: number,
    label: string,
    bg: string,
    fg = '#ffffff',
    width = 76,
    glow = true,
  ): void {
    this.rect(cx - width / 2, y, width, 13, bg, { rx: 2 });
    this.rect(cx - width / 2, y, width, 5, 'rgb(255 255 255 / 12%)', { rx: 2 });
    this.text(cx, y + 9.5, label, fg, { glow });
  }

  /** Leuchtschrift auf dem Dach (nur ab höheren Ausbaustufen). */
  neon(cx: number, y: number, label: string, color: string, width = 70): void {
    this.rect(cx - 1, y + 12, 2, 8, '#4a4f57');
    this.rect(cx - width / 2, y, width, 13, '#1c1f24', { rx: 2 });
    this.body.push(
      <text
        key={this.key()}
        x={cx}
        y={y + 10}
        textAnchor="middle"
        fontSize={9}
        fontWeight={800}
        fontFamily="var(--font-sans)"
        fill={color}
      >
        {label}
      </text>,
    );
    this.lights.push(
      <text
        key={this.key()}
        x={cx}
        y={y + 10}
        textAnchor="middle"
        fontSize={9}
        fontWeight={800}
        fontFamily="var(--font-sans)"
        fill={color}
        className="neonGlow"
      >
        {label}
      </text>,
    );
  }

  /** Schornstein mit Rauch. */
  chimney(x: number, top: number, w: number, color: string, striped = false): void {
    this.rect(x - w / 2, top, w, GROUND - top, color);
    this.rect(x - w / 2, top, w, GROUND - top, 'url(#facadeShade)');
    this.rect(x - w / 2 - 1.5, top, w + 3, 4, 'rgb(0 0 0 / 30%)');
    if (striped) {
      for (let y = top + 8; y < top + 40; y += 12) this.rect(x - w / 2, y, w, 5, '#e8e2d6');
      this.fx.push(<circle key={this.key()} cx={x} cy={top - 3} r={2} className="beacon" />);
    }
    for (let i = 0; i < 3; i++) {
      this.fx.push(
        <circle
          key={this.key()}
          cx={x}
          cy={top - 4}
          r={w * 0.55}
          className="smoke"
          style={{ animationDelay: `${-i * 1.3}s` }}
        />,
      );
    }
  }

  /** Fahnenmast mit wehender Fahne. */
  flag(x: number, top: number, color: string, h = 40): void {
    this.rect(x - 0.8, top, 1.6, h, '#8f8a80');
    this.circle(x, top, 1.6, '#d9b54a');
    this.fx.push(
      <path
        key={this.key()}
        d={`M${x + 1} ${top + 2} h16 v10 h-16 Z`}
        fill={color}
        className="flagWave"
      />,
    );
  }

  /** Lichterkette zwischen zwei Punkten. */
  festoon(x1: number, x2: number, y: number, sag = 6): void {
    this.path(`M${x1} ${y} Q${(x1 + x2) / 2} ${y + sag * 2} ${x2} ${y}`, 'none', {
      stroke: '#3b3f47',
      sw: 0.8,
    });
    const n = Math.max(3, Math.round((x2 - x1) / 9));
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const bx = x1 + (x2 - x1) * t;
      const by = y + sag * 4 * t * (1 - t) * 1;
      const color = ['#f2c14e', '#e25b7a', '#6fd08c', '#6fa8e8'][i % 4] ?? '#f2c14e';
      this.circle(bx, by + 1.5, 1.4, color);
      this.lights.push(
        <circle key={this.key()} cx={bx} cy={by + 1.5} r={2.6} fill={color} opacity={0.9} />,
      );
    }
  }

  /** Markise über einem Schaufenster. */
  awning(x: number, y: number, w: number, color: string): void {
    this.path(`M${x - 3} ${y} H${x + w + 3} L${x + w} ${y + 9} H${x} Z`, color);
    const stripes = Math.max(2, Math.round(w / 8));
    for (let i = 0; i < stripes; i += 2) {
      const sx = x + (w / stripes) * i;
      this.path(`M${sx} ${y} h${w / stripes} v9 h-${w / stripes} Z`, 'rgb(255 255 255 / 35%)');
    }
    for (let sx = x; sx <= x + w; sx += 6) this.circle(sx + 3, y + 9.5, 3, color);
  }

  /** Säulenportikus mit Giebel. */
  portico(
    cx: number,
    width: number,
    top: number,
    count: number,
    p: ArchPalette,
    pediment = true,
  ): void {
    const left = cx - width / 2;
    if (pediment) {
      this.path(`M${left - 10} ${top} L${cx} ${top - 22} L${left + width + 10} ${top} Z`, p.stone);
      this.path(
        `M${left - 2} ${top - 2} L${cx} ${top - 16} L${left + width + 2} ${top - 2} Z`,
        'rgb(0 0 0 / 10%)',
      );
    }
    this.rect(left - 10, top, width + 20, 6, p.stone);
    this.rect(left - 10, top + 6, width + 20, 1.5, 'rgb(0 0 0 / 25%)');
    const gap = width / Math.max(1, count - 1);
    for (let i = 0; i < count; i++) {
      const x = left + i * gap;
      this.rect(x - 3.5, top + 7, 7, GROUND - top - 13, p.stone);
      this.rect(x + 1, top + 7, 2.5, GROUND - top - 13, 'rgb(0 0 0 / 14%)');
      this.rect(x - 5, top + 7, 10, 3, p.stone);
    }
    this.rect(left - 14, GROUND - 6, width + 28, 3, p.stone);
    this.rect(left - 18, GROUND - 3, width + 36, 3, p.stone);
  }

  /** Kuppel im Stil des Staates. */
  dome(cx: number, top: number, r: number, p: ArchPalette, gilded = false): void {
    const gold = '#d9b54a';
    switch (p.domeShape) {
      case 'onion':
        this.path(
          `M${cx - r} ${top} Q${cx - r * 1.15} ${top - r} ${cx} ${top - r * 1.9} Q${cx + r * 1.15} ${top - r} ${cx + r} ${top} Z`,
          gilded ? gold : '#c9a227',
        );
        this.path(
          `M${cx - r * 0.4} ${top} Q${cx - r * 0.5} ${top - r} ${cx} ${top - r * 1.8} Q${cx - r * 0.2} ${top - r} ${cx - r * 0.1} ${top} Z`,
          'rgb(255 255 255 / 25%)',
        );
        this.rect(cx - 1, top - r * 2.3, 2, r * 0.45, '#8a6d1f');
        break;
      case 'tiered':
        this.path(
          `M${cx - r * 1.4} ${top} Q${cx} ${top - 8} ${cx + r * 1.4} ${top} L${cx + r} ${top - 10} L${cx - r} ${top - 10} Z`,
          p.roof,
        );
        this.path(
          `M${cx - r} ${top - 12} Q${cx} ${top - 20} ${cx + r} ${top - 12} L${cx + r * 0.6} ${top - 22} L${cx - r * 0.6} ${top - 22} Z`,
          p.roof,
        );
        this.circle(cx, top - 26, 3, gilded ? gold : p.trim);
        break;
      case 'glass':
        this.path(`M${cx - r} ${top} A${r} ${r} 0 0 1 ${cx + r} ${top} Z`, 'url(#glass)');
        this.path(
          `M${cx - r} ${top} A${r} ${r} 0 0 1 ${cx + r} ${top} M${cx} ${top - r} V${top} M${cx - r * 0.7} ${top - r * 0.7} L${cx} ${top} M${cx + r * 0.7} ${top - r * 0.7} L${cx} ${top}`,
          'none',
          { stroke: p.trim, sw: 1.2 },
        );
        this.lights.push(
          <path
            key={this.key()}
            d={`M${cx - r} ${top} A${r} ${r} 0 0 1 ${cx + r} ${top} Z`}
            fill="url(#windowGlow)"
            opacity={0.8}
          />,
        );
        break;
      default:
        this.rect(cx - r * 0.9, top - 8, r * 1.8, 8, p.stone);
        this.path(
          `M${cx - r} ${top - 8} A${r} ${r * 0.95} 0 0 1 ${cx + r} ${top - 8} Z`,
          gilded ? gold : p.stone,
        );
        this.path(
          `M${cx - r * 0.6} ${top - 10} A${r * 0.6} ${r * 0.7} 0 0 1 ${cx} ${top - 8 - r * 0.9}`,
          'none',
          { stroke: 'rgb(255 255 255 / 35%)', sw: 3 },
        );
        this.rect(cx - 2, top - 8 - r * 0.95 - 8, 4, 8, gilded ? gold : p.stone);
    }
  }

  /** Dach passend zum Baustil. */
  roof(left: number, width: number, top: number, p: ArchPalette, height = 24): void {
    switch (p.roofShape) {
      case 'gable':
        this.path(
          `M${left - 6} ${top} L${left + width / 2} ${top - height - 8} L${left + width + 6} ${top} Z`,
          p.roof,
        );
        this.path(
          `M${left + width / 2} ${top - height - 8} L${left + width + 6} ${top} H${left + width / 2} Z`,
          'rgb(0 0 0 / 14%)',
        );
        break;
      case 'pagoda':
        this.path(
          `M${left - 14} ${top + 2} Q${left + width / 2} ${top - 10} ${left + width + 14} ${top + 2} L${left + width - 4} ${top - height * 0.6} L${left + 4} ${top - height * 0.6} Z`,
          p.roof,
        );
        this.rect(left + 8, top - height * 0.6 - 3, width - 16, 4, p.trim);
        break;
      case 'mansard':
        this.path(
          `M${left - 4} ${top} L${left + 10} ${top - height} H${left + width - 10} L${left + width + 4} ${top} Z`,
          p.roof,
        );
        break;
      default:
        this.rect(left - 4, top - 8, width + 8, 8, p.trim);
        this.rect(left - 2, top - 11, width + 4, 3, p.roof);
        this.rect(left - 4, top, width + 8, 1.5, 'rgb(0 0 0 / 25%)');
    }
  }

  /** Weicher Schatten des Gebäudes auf dem Gehweg. */
  shadow(cx: number, w: number): void {
    this.body.unshift(
      <ellipse
        key={this.key()}
        cx={cx + 6}
        cy={GROUND + 3}
        rx={w / 2 + 8}
        ry={5}
        fill="url(#groundShadow)"
      />,
    );
  }
}

/** Kurzform für Wandfarben aus der Palette. */
export function wallColor(p: ArchPalette, i: number): string {
  return p.walls[i % p.walls.length] ?? p.walls[0] ?? '#d6c9b0';
}
