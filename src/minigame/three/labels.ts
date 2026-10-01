import {
  CanvasTexture,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  Sprite,
  SpriteMaterial,
} from 'three';

// Beschriftungen als Bild auf einer Fläche (Bodenfelder) bzw. als Sprite (Sprechblasen).
// Die Texturen werden nur neu gezeichnet, wenn sich der Text ändert.

const FONT = "'Fredoka', 'Nunito', -apple-system, sans-serif";

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export interface FloorLabelSpec {
  title: string;
  sub: string;
  /** Rahmenfarbe (z. B. Blau = bereit, Grau = gesperrt). */
  color: string;
  /** Untertitel rot (zu teuer). */
  warn: boolean;
}

/** Bodenfeld mit gestricheltem Rahmen und zwei Textzeilen (wie „SELL“-Felder). */
export class FloorLabel {
  readonly mesh: Mesh;
  private readonly canvas: HTMLCanvasElement;
  private readonly texture: CanvasTexture;
  private key = '';

  constructor(size: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 256;
    this.canvas.height = 256;
    this.texture = new CanvasTexture(this.canvas);
    this.texture.colorSpace = SRGBColorSpace;
    this.texture.anisotropy = 4;
    const mat = new MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
    });
    this.mesh = new Mesh(new PlaneGeometry(size, size), mat);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = 0.03;
    this.mesh.renderOrder = 2;
  }

  set(spec: FloorLabelSpec): void {
    const key = `${spec.title}|${spec.sub}|${spec.color}|${spec.warn}`;
    if (key === this.key) return;
    this.key = key;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 256, 256);
    roundRect(ctx, 14, 14, 228, 228, 34);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fill();
    ctx.setLineDash([26, 16]);
    ctx.lineWidth = 12;
    ctx.strokeStyle = spec.color;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#24304a';
    ctx.font = `600 40px ${FONT}`;
    wrap(ctx, spec.title, 128, 92, 210, 44);
    ctx.fillStyle = spec.warn ? '#e0343f' : '#1d8f4a';
    // Preis notfalls auf zwei Zeilen (Geld · Einfluss) und kleiner, damit er hineinpasst
    const parts = spec.sub.split(' · ');
    const lines = parts.length > 1 ? parts : [spec.sub];
    let size = lines.length > 1 ? 34 : 44;
    ctx.font = `700 ${size}px ${FONT}`;
    while (size > 22 && Math.max(...lines.map((l) => ctx.measureText(l).width)) > 210) {
      size -= 2;
      ctx.font = `700 ${size}px ${FONT}`;
    }
    const top = lines.length > 1 ? 172 : 190;
    for (const [i, l] of lines.slice(0, 2).entries())
      ctx.fillText(l, 128, top + i * (size + 4), 220);
    this.texture.needsUpdate = true;
  }

  dispose(): void {
    this.texture.dispose();
    this.mesh.geometry.dispose();
    (this.mesh.material as MeshBasicMaterial).dispose();
  }
}

function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  line: number,
): void {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    if (ctx.measureText(test).width > maxW && current) {
      lines.push(current);
      current = w;
    } else current = test;
  }
  if (current) lines.push(current);
  const start = y - ((lines.length - 1) * line) / 2;
  for (const [i, l] of lines.slice(0, 2).entries()) ctx.fillText(l, x, start + i * line, maxW);
}

/** Sprechblase über einem Kopf mit einer Zahl (z. B. wie viele Stücke ein Kunde will). */
export class Bubble {
  readonly sprite: Sprite;
  private readonly canvas: HTMLCanvasElement;
  private readonly texture: CanvasTexture;
  private key = '';

  constructor(private readonly accent: string) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 128;
    this.canvas.height = 96;
    this.texture = new CanvasTexture(this.canvas);
    this.texture.colorSpace = SRGBColorSpace;
    this.sprite = new Sprite(new SpriteMaterial({ map: this.texture, depthWrite: false }));
    this.sprite.scale.set(0.75, 0.56, 1);
    this.sprite.renderOrder = 3;
  }

  set(text: string): void {
    if (text === this.key) return;
    this.key = text;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 128, 96);
    roundRect(ctx, 6, 6, 116, 70, 22);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = this.accent;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(52, 74);
    ctx.lineTo(64, 92);
    ctx.lineTo(76, 74);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.fillStyle = '#24304a';
    ctx.font = `700 44px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 64, 43);
    this.texture.needsUpdate = true;
  }

  dispose(): void {
    this.texture.dispose();
    this.sprite.material.dispose();
  }
}
