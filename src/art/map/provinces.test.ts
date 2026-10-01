import { REGION_IDS } from '../../engine/ids';
import { COUNTRY_SHAPES } from './geography';
import { area, centroid, province } from './provinces';

describe('Provinzen der Weltkarte', () => {
  it.each(Object.keys(COUNTRY_SHAPES) as (keyof typeof COUNTRY_SHAPES)[])(
    '%s zerfällt lückenlos in vier Provinzen',
    (id) => {
      const shape = COUNTRY_SHAPES[id];
      const total = area(shape.points);
      const parts = REGION_IDS.map((r) => area(province(shape.points, shape.center, r)));
      for (const p of parts) expect(p).toBeGreaterThan(total * 0.08);
      expect(parts.reduce((a, b) => a + b, 0)).toBeCloseTo(total, 0);
    },
  );

  it('Norden liegt oben, Osten rechts', () => {
    const shape = COUNTRY_SHAPES.rhenania;
    const [cx, cy] = shape.center;
    const n = centroid(province(shape.points, shape.center, 'north'));
    const e = centroid(province(shape.points, shape.center, 'east'));
    const s = centroid(province(shape.points, shape.center, 'south'));
    const w = centroid(province(shape.points, shape.center, 'west'));
    expect(n[1]).toBeLessThan(cy);
    expect(s[1]).toBeGreaterThan(cy);
    expect(e[0]).toBeGreaterThan(cx);
    expect(w[0]).toBeLessThan(cx);
  });
});
