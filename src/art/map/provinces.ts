import type { RegionId } from '../../engine/ids';
import type { Pt } from './geography';

// Das eigene Land wird für die Karte in vier Provinzen geteilt: zwei Diagonalen durch den
// Schwerpunkt schneiden Nord, Ost, Süd und West heraus. Reine Geometrie, ohne React.

/** Polygon auf die Seite a·x + b·y ≤ c beschneiden (Sutherland-Hodgman, eine Kante). */
export function clipHalfPlane(poly: readonly Pt[], a: number, b: number, c: number): Pt[] {
  const out: Pt[] = [];
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % n];
    if (!p || !q) continue;
    const fp = a * p[0] + b * p[1] - c;
    const fq = a * q[0] + b * q[1] - c;
    if (fp <= 0) out.push(p);
    if (fp < 0 !== fq < 0 && fp !== fq) {
      const t = fp / (fp - fq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return out;
}

/** Fläche eines Polygons (Betrag). */
export function area(poly: readonly Pt[]): number {
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    if (p && q) sum += p[0] * q[1] - q[0] * p[1];
  }
  return Math.abs(sum) / 2;
}

/** Schwerpunkt eines Polygons. */
export function centroid(poly: readonly Pt[]): Pt {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    if (!p || !q) continue;
    const cross = p[0] * q[1] - q[0] * p[1];
    a += cross;
    cx += (p[0] + q[0]) * cross;
    cy += (p[1] + q[1]) * cross;
  }
  if (Math.abs(a) < 1e-9) return poly[0] ?? [0, 0];
  return [cx / (3 * a), cy / (3 * a)];
}

/**
 * Provinz des eigenen Landes: Keil zwischen den Diagonalen durch `center`.
 * Norden = oben (kleines y), Osten = rechts.
 */
export function province(poly: readonly Pt[], center: Pt, region: RegionId): Pt[] {
  const [cx, cy] = center;
  // Diagonalen: (y − cy) = ±(x − cx)
  const d1 = cy - cx; // y − x ≤ d1  ⇔  oberhalb/rechts der fallenden Diagonale
  const d2 = cy + cx; // y + x ≤ d2  ⇔  oberhalb/links der steigenden Diagonale
  switch (region) {
    case 'north':
      return clipHalfPlane(clipHalfPlane(poly, -1, 1, d1), 1, 1, d2);
    case 'east':
      return clipHalfPlane(clipHalfPlane(poly, -1, 1, d1), -1, -1, -d2);
    case 'south':
      return clipHalfPlane(clipHalfPlane(poly, 1, -1, -d1), -1, -1, -d2);
    case 'west':
      return clipHalfPlane(clipHalfPlane(poly, 1, -1, -d1), 1, 1, d2);
  }
}

export function toPath(poly: readonly Pt[]): string {
  return poly.length === 0
    ? ''
    : `M${poly.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L')} Z`;
}
