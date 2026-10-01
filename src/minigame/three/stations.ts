import { Group, type Object3D } from 'three';
import type { CounterStyle, PropKind, SourceKind, Theme } from '../themes';
import { ROOM } from '../layout';
import { makeItem } from './items';
import { at, type Kit } from './kit';

// Räume, Quellen (Maschinen), Theken und Deko der Minispiele.
// Jedes Bauteil liefert seine Gruppe und optional eine Animation pro Bild.

export interface Built {
  group: Group;
  tick?: (time: number, active: boolean) => void;
}

// ---------------------------------------------------------------- Raum

export function buildRoom(kit: Kit, theme: Theme): Group {
  const g = new Group();
  const { halfW, halfD } = ROOM;
  // Boden als große Platte mit Fliesen bzw. Rasenstreifen
  g.add(
    at(
      kit.box(halfW * 2 + 6, 0.2, halfD * 2 + 6, theme.outdoor ? '#5fae52' : '#9aa7b8', 0),
      0,
      -0.2,
      0,
    ),
  );
  g.add(at(kit.box(halfW * 2, 0.2, halfD * 2, theme.floor[0], 0.08), 0, -0.1, 0));
  const tile = 2;
  for (let x = -halfW; x < halfW; x += tile) {
    for (let z = -halfD; z < halfD; z += tile) {
      if ((Math.round((x + z) / tile) & 1) === 0) continue;
      const t = kit.box(tile - 0.04, 0.02, tile - 0.04, theme.floor[1], 0.01);
      t.castShadow = false;
      g.add(at(t, x + tile / 2, 0.005, z + tile / 2));
    }
  }
  if (theme.outdoor) {
    // Zaun hinten und links, ein Weg zum Ausgang rechts
    for (let x = -halfW; x <= halfW; x += 1.2) g.add(fencePost(kit, x, -halfD));
    for (let z = -halfD + 1.2; z <= halfD; z += 1.2) g.add(fencePost(kit, -halfW, z));
    g.add(at(kit.box(0.08, 0.1, halfD * 2, '#b9733a', 0.02), -halfW, 0.55, 0));
    g.add(at(kit.box(halfW * 2, 0.1, 0.08, '#b9733a', 0.02), 0, 0.55, -halfD));
    g.add(at(kit.box(1.8, 0.03, halfD * 2 + 4, '#e6c48f', 0.01), 4.7, 0.01, 1));
  } else {
    // Hinterwand mit Sockel und Fenstern, linke Wand niedriger
    g.add(at(kit.box(halfW * 2 + 0.6, 2.6, 0.4, theme.wall, 0.05), 0, 1.3, -halfD - 0.2));
    g.add(at(kit.box(halfW * 2 + 0.6, 0.35, 0.46, theme.wallTrim, 0.04), 0, 0.17, -halfD - 0.2));
    g.add(at(kit.box(halfW * 2 + 0.6, 0.18, 0.5, theme.wallTrim, 0.04), 0, 2.6, -halfD - 0.2));
    for (const x of [-1, 1.8, 4.6]) {
      g.add(at(kit.box(1.4, 1, 0.1, '#bfe6ff', 0.04), x, 1.45, -halfD + 0.02));
      g.add(at(kit.box(1.55, 0.1, 0.16, theme.wallTrim, 0.03), x, 0.92, -halfD + 0.05));
    }
    g.add(at(kit.box(0.4, 1.4, halfD * 2 + 0.4, theme.wall, 0.05), -halfW - 0.2, 0.7, 0));
    g.add(at(kit.box(0.46, 0.25, halfD * 2 + 0.4, theme.wallTrim, 0.04), -halfW - 0.2, 1.4, 0));
    // Fußmatte am Ausgang
    g.add(at(kit.box(1.6, 0.03, 1.2, '#7a4a2a', 0.02), 4.8, 0.02, halfD - 0.6));
  }
  // Geländer zwischen Spielfläche und Kundengang
  for (const z of [0.6, 2.4, 4.2])
    g.add(at(kit.cyl(0.06, 0.06, 0.9, '#f2b51a', 10), 3.15, 0.45, z));
  g.add(at(kit.box(0.09, 0.09, 3.8, '#f2b51a', 0.04), 3.15, 0.9, 2.4));
  return g;
}

function fencePost(kit: Kit, x: number, z: number): Object3D {
  return at(kit.box(0.16, 0.8, 0.16, '#c98a4b', 0.04), x, 0.4, z);
}

// ---------------------------------------------------------------- Quellen

/** Maschine bzw. Arbeitsplatz hinter der Quelle; der Stapel liegt davor (bei z + 0). */
export function buildSource(kit: Kit, kind: SourceKind, theme: Theme): Built {
  const g = new Group();
  // Ablage, auf der der Stapel liegt
  g.add(at(kit.box(1.1, 0.12, 0.9, '#8f9bad', 0.04), 0, 0.06, 0));
  const back = new Group();
  back.position.z = -1.4;
  g.add(back);
  let tick: Built['tick'];

  switch (kind) {
    case 'conveyor': {
      // Förderband mit Rollen, Maschine mit Schornstein, Kisten fahren mit
      back.add(at(kit.box(3.2, 0.5, 0.9, '#4a5568', 0.08), 0, 0.55, 0.3));
      back.add(at(kit.box(3.3, 0.08, 0.95, '#2b2f36', 0.03), 0, 0.82, 0.3));
      const machine = at(kit.box(1.3, 1.7, 1.2, '#3f7fd6', 0.12), -1.4, 0.85, -0.2);
      back.add(machine);
      back.add(at(kit.box(0.7, 0.4, 0.05, '#bfe6ff', 0.03), -1.4, 1.2, 0.42));
      back.add(at(kit.cyl(0.18, 0.22, 1.1, '#6b7a90'), -1.7, 2.1, -0.4));
      const lamp = at(kit.sphere(0.09, '#5be37f'), -1.0, 1.55, 0.42);
      back.add(lamp);
      const rolling: Object3D[] = [];
      for (let i = 0; i < 3; i++) {
        const crate = makeItem(kit, 'crate');
        crate.scale.setScalar(0.85);
        back.add(crate);
        rolling.push(crate);
      }
      tick = (time, active) => {
        for (const [i, c] of rolling.entries()) {
          const p = ((time * (active ? 0.5 : 0.15) + i / 3) % 1) * 2.4;
          c.position.set(-0.8 + p, 0.86, 0.3);
        }
        lamp.visible = Math.sin(time * 6) > -0.3;
      };
      break;
    }
    case 'beerTap': {
      back.add(at(kit.box(3.2, 1.0, 0.9, '#7a4a2a', 0.08), 0, 0.5, 0.2));
      back.add(at(kit.box(3.3, 0.1, 1.0, '#a86b3c', 0.04), 0, 1.04, 0.2));
      for (const x of [-0.8, 0, 0.8]) {
        back.add(at(kit.cyl(0.05, 0.05, 0.5, '#d9dde3', 10), x, 1.35, 0.3));
        back.add(at(kit.box(0.1, 0.22, 0.1, '#ffc533', 0.03), x, 1.62, 0.3));
      }
      for (const x of [-1.2, 1.2]) {
        const barrel = at(kit.cyl(0.42, 0.42, 0.8, '#9a5f30'), x, 1.6, -0.35);
        barrel.rotation.z = Math.PI / 2;
        back.add(barrel);
      }
      break;
    }
    case 'pallet': {
      back.add(at(kit.box(2.4, 0.18, 1.4, '#c98a4b', 0.03), 0, 0.09, 0));
      for (let i = 0; i < 6; i++) {
        const crate = makeItem(kit, 'fruit');
        crate.position.set(
          -0.7 + (i % 3) * 0.7,
          0.18 + Math.floor(i / 3) * 0.28,
          (i % 2) * 0.3 - 0.1,
        );
        back.add(crate);
      }
      // Lieferwagen dahinter
      back.add(at(kit.box(2.6, 1.2, 1.4, '#e05a47', 0.18), 0.2, 0.9, -1.2));
      back.add(at(kit.box(1.0, 0.9, 1.3, '#f2f0ea', 0.12), 1.7, 0.8, -1.2));
      for (const x of [-0.6, 1.4]) {
        const wheel = at(kit.cyl(0.3, 0.3, 0.2, '#2b2f36'), x, 0.3, -0.45);
        wheel.rotation.x = Math.PI / 2;
        back.add(wheel);
      }
      break;
    }
    case 'printer':
    case 'copier': {
      const color = kind === 'printer' ? '#e8ecf2' : '#5a6f92';
      back.add(at(kit.box(2.2, 1.0, 1.1, color, 0.14), 0, 0.5, 0.2));
      back.add(at(kit.box(1.6, 0.12, 0.6, '#c3c9d3', 0.04), 0, 1.06, 0.2));
      back.add(
        at(kit.box(1.2, 0.05, 0.5, kind === 'printer' ? '#ea4c89' : '#ffffff', 0.02), 0, 1.15, 0.2),
      );
      const light = at(kit.sphere(0.08, '#ff5466'), 0.85, 0.8, 0.77);
      back.add(light);
      const sheet = at(kit.box(0.5, 0.02, 0.36, '#ffffff', 0.005), 0, 0.7, 0.8);
      back.add(sheet);
      tick = (time, active) => {
        const p = (time * (active ? 1.6 : 0.4)) % 1;
        sheet.position.z = 0.75 + p * 0.5;
        sheet.position.y = 0.7 - p * 0.3;
        light.visible = Math.sin(time * 8) > 0;
      };
      break;
    }
    case 'stampDesk':
    case 'writingDesk': {
      back.add(at(kit.box(2.6, 0.12, 1.2, '#a8794a', 0.04), 0, 0.85, 0.2));
      for (const [x, z] of [
        [-1.15, -0.25],
        [1.15, -0.25],
        [-1.15, 0.65],
        [1.15, 0.65],
      ] as const)
        back.add(at(kit.box(0.12, 0.8, 0.12, '#7a5634', 0.03), x, 0.4, z));
      back.add(at(makeItem(kit, kind === 'stampDesk' ? 'file' : 'speech'), -0.6, 0.92, 0.1));
      back.add(at(makeItem(kit, kind === 'stampDesk' ? 'file' : 'speech'), -0.6, 1.02, 0.1));
      // Lampe
      back.add(at(kit.cyl(0.04, 0.04, 0.5, '#2b2f36', 8), 0.9, 1.15, 0));
      back.add(at(kit.cyl(0.08, 0.22, 0.2, '#3fc95e'), 0.9, 1.45, 0.05));
      if (kind === 'stampDesk') {
        const stamp = at(kit.cyl(0.09, 0.12, 0.25, '#e0343f'), 0.2, 1.06, 0.2);
        back.add(stamp);
        tick = (time, active) => {
          stamp.position.y = 1.06 + Math.max(0, Math.sin(time * (active ? 9 : 3))) * 0.18;
        };
      } else {
        back.add(at(kit.box(0.6, 0.18, 0.4, '#2b2f36', 0.05), 0.2, 1.0, 0.15));
        back.add(at(kit.box(0.5, 0.25, 0.04, '#fffaf0', 0.01), 0.2, 1.2, 0.0));
      }
      break;
    }
    case 'press': {
      back.add(at(kit.box(3.0, 1.4, 1.2, '#3b4b66', 0.12), 0, 0.7, 0));
      const rollers: Object3D[] = [];
      for (const x of [-0.9, 0, 0.9]) {
        const r = at(kit.cyl(0.32, 0.32, 1.25, '#9aa7b8'), x, 1.55, 0.05);
        r.rotation.x = Math.PI / 2;
        back.add(r);
        rollers.push(r);
      }
      back.add(at(kit.box(3.0, 0.06, 1.0, '#f1efe8', 0.01), 0, 1.42, 0.65));
      tick = (time, active) => {
        for (const r of rollers) r.rotation.y = time * (active ? 4 : 1);
      };
      break;
    }
    case 'vault': {
      back.add(at(kit.box(3.0, 2.2, 0.8, '#6b7a90', 0.1), 0, 1.1, -0.2));
      const door = new Group();
      door.position.set(0, 1.1, 0.25);
      const disc = kit.cyl(0.85, 0.85, 0.2, '#c9cfd8', 32);
      disc.rotation.x = Math.PI / 2;
      door.add(disc);
      const ring = kit.torus(0.6, 0.06, '#8f9bad');
      ring.position.z = 0.11;
      door.add(ring);
      const wheel = new Group();
      wheel.position.z = 0.16;
      for (let i = 0; i < 3; i++) {
        const spoke = kit.box(0.9, 0.08, 0.06, '#ffc533', 0.03);
        spoke.rotation.z = (i * Math.PI) / 3;
        wheel.add(spoke);
      }
      door.add(wheel);
      back.add(door);
      tick = (time, active) => {
        wheel.rotation.z = time * (active ? 1.5 : 0.3);
      };
      break;
    }
    case 'giftTable': {
      back.add(at(kit.box(2.8, 0.12, 1.1, '#ffffff', 0.04), 0, 0.85, 0.2));
      back.add(at(kit.box(2.6, 0.7, 0.9, theme.wallTrim, 0.06), 0, 0.42, 0.2));
      for (const [x, c] of [
        [-0.9, '#ea4c89'],
        [-0.5, '#3fb8f0'],
        [-0.1, '#ffd23f'],
      ] as const) {
        const roll = at(kit.cyl(0.1, 0.1, 0.9, c), x, 1.0, 0.05);
        roll.rotation.x = Math.PI / 2;
        back.add(roll);
      }
      back.add(at(makeItem(kit, 'gift'), 0.8, 0.91, 0.2));
      break;
    }
    case 'treasury': {
      back.add(at(kit.box(2.0, 0.9, 1.1, '#8a4a20', 0.12), 0, 0.45, 0));
      back.add(at(kit.box(2.05, 0.12, 1.15, '#ffcf3d', 0.04), 0, 0.92, 0));
      const lid = new Group();
      lid.position.set(0, 0.98, -0.55);
      lid.add(at(kit.box(2.0, 0.3, 1.1, '#8a4a20', 0.12), 0, 0.12, 0.55));
      back.add(lid);
      for (let i = 0; i < 5; i++)
        back.add(at(kit.sphere(0.12, '#ffcf3d', 12), -0.6 + i * 0.3, 1.0, 0.1 + (i % 2) * 0.15));
      tick = (time, active) => {
        lid.rotation.x = -0.9 - Math.sin(time * (active ? 3 : 1)) * 0.1;
      };
      break;
    }
  }
  return { group: g, tick };
}

// ---------------------------------------------------------------- Theke

export function buildCounter(kit: Kit, style: CounterStyle): Group {
  const g = new Group();
  g.add(at(kit.box(1.1, 0.95, 2.8, style.body, 0.1), 0, 0.48, 0));
  g.add(at(kit.box(1.25, 0.12, 2.95, style.top, 0.05), 0, 1.0, 0));
  if (style.stripes) {
    for (let i = 0; i < 5; i++) {
      const s = at(kit.box(0.02, 0.18, 0.4, '#2b2f36', 0.01), -0.56, 0.5, -1.0 + i * 0.5);
      s.rotation.x = 0.6;
      g.add(s);
    }
  }
  if (style.glass) {
    g.add(at(kit.box(0.06, 0.8, 2.6, '#bfe6ff', 0.02), 0.45, 1.5, 0));
    g.add(at(kit.box(0.1, 0.08, 2.7, style.body, 0.03), 0.45, 1.92, 0));
  }
  if (style.awning) {
    for (const z of [-1.3, 1.3]) g.add(at(kit.cyl(0.05, 0.05, 2.1, '#8a6238', 8), 0.4, 1.05, z));
    for (let i = 0; i < 6; i++) {
      const stripe = at(
        kit.box(1.5, 0.08, 0.5, i % 2 === 0 ? style.awning[0] : style.awning[1], 0.03),
        0.1,
        2.1,
        -1.25 + i * 0.5,
      );
      stripe.rotation.z = -0.25;
      g.add(stripe);
    }
  }
  // Kasse
  g.add(at(kit.box(0.4, 0.22, 0.4, '#9aa7b8', 0.05), 0.15, 1.17, 0.9));
  g.add(at(kit.box(0.3, 0.16, 0.04, '#3fb8f0', 0.02), 0.15, 1.33, 0.78));
  return g;
}

// ---------------------------------------------------------------- Deko

export function buildProps(kit: Kit, props: PropKind[], theme: Theme): Group {
  const g = new Group();
  for (const [i, kind] of props.entries()) {
    // Feste Plätze für Deko: hinten rechts, links Mitte, hinten Mitte
    const spot = [
      { x: 0.6, z: -5.6 },
      { x: -5.2, z: 0.6 },
      { x: 2.2, z: -4.2 },
    ][i] ?? { x: 0, z: -5.5 };
    g.add(at(prop(kit, kind, theme), spot.x, 0, spot.z));
  }
  return g;
}

function prop(kit: Kit, kind: PropKind, theme: Theme): Group {
  const g = new Group();
  switch (kind) {
    case 'pallets':
      for (let i = 0; i < 3; i++)
        g.add(at(kit.box(1.2, 0.14, 1.0, '#c98a4b', 0.02), 0, 0.07 + i * 0.16, 0));
      g.add(at(makeItem(kit, 'crate'), 0, 0.5, 0));
      break;
    case 'barrels':
      g.add(at(kit.cyl(0.35, 0.35, 0.8, '#9a5f30'), 0, 0.4, 0));
      g.add(at(kit.cyl(0.3, 0.3, 0.7, '#9a5f30'), 0.6, 0.35, 0.3));
      {
        const hoop = at(kit.torus(0.355, 0.03, '#5b4a3a'), 0, 0.6, 0);
        hoop.rotation.x = Math.PI / 2;
        g.add(hoop);
      }
      break;
    case 'tables':
      g.add(at(kit.cyl(0.55, 0.55, 0.08, '#a86b3c'), 0, 0.75, 0));
      g.add(at(kit.cyl(0.07, 0.12, 0.72, '#5e3a22', 10), 0, 0.37, 0));
      for (const a of [0, Math.PI])
        g.add(
          at(
            kit.cyl(0.22, 0.22, 0.45, '#7a4a2a'),
            Math.cos(a) * 0.85,
            0.22,
            Math.sin(a) * 0.85 + 0.2,
          ),
        );
      g.add(at(makeItem(kit, 'beer'), 0.15, 0.79, 0));
      break;
    case 'plants':
      g.add(at(kit.cyl(0.28, 0.22, 0.5, '#e07a3a'), 0, 0.25, 0));
      g.add(at(kit.sphere(0.45, '#4caf50'), 0, 0.85, 0));
      g.add(at(kit.sphere(0.3, '#5cc561'), 0.2, 1.15, 0.1));
      break;
    case 'shelves':
      g.add(at(kit.box(1.6, 1.8, 0.5, '#8a6238', 0.05), 0, 0.9, 0));
      for (const y of [0.45, 1.05, 1.6])
        for (const x of [-0.45, 0.15, 0.55])
          g.add(
            at(
              kit.box(0.35, 0.3, 0.35, theme.item === 'newspaper' ? '#f1efe8' : '#d79a55', 0.03),
              x,
              y,
              0.1,
            ),
          );
      break;
    case 'flags':
      for (const [x, c] of [
        [-0.4, '#e0343f'],
        [0.4, '#3f7fd6'],
      ] as const) {
        g.add(at(kit.cyl(0.04, 0.04, 2.4, '#c9a227', 8), x, 1.2, 0));
        g.add(at(kit.box(0.7, 0.45, 0.03, c, 0.01), x + 0.36, 2.1, 0));
      }
      break;
    case 'columns':
      g.add(at(kit.cyl(0.32, 0.36, 2.6, '#f2ede0'), 0, 1.3, 0));
      g.add(at(kit.box(0.85, 0.2, 0.85, theme.wallTrim, 0.04), 0, 2.65, 0));
      g.add(at(kit.box(0.85, 0.2, 0.85, theme.wallTrim, 0.04), 0, 0.1, 0));
      break;
    case 'carpet':
      g.add(at(kit.box(2.4, 0.03, 3.6, '#b4232f', 0.02), 0, 0.02, 1.5));
      g.add(at(kit.box(2.0, 0.032, 3.2, '#d9a21b', 0.02), 0, 0.022, 1.5));
      g.add(at(kit.box(1.8, 0.034, 3.0, '#b4232f', 0.02), 0, 0.024, 1.5));
      break;
    case 'sofa':
      g.add(at(kit.box(1.8, 0.45, 0.8, '#2f6b5a', 0.15), 0, 0.3, 0));
      g.add(at(kit.box(1.8, 0.6, 0.25, '#2f6b5a', 0.12), 0, 0.6, -0.3));
      break;
    case 'paperPiles':
      for (let i = 0; i < 3; i++)
        g.add(
          at(
            kit.box(0.5, 0.25 + i * 0.12, 0.4, '#f6f3ea', 0.02),
            -0.6 + i * 0.6,
            0.12 + i * 0.06,
            (i % 2) * 0.3,
          ),
        );
      break;
    case 'lamps':
      g.add(at(kit.cyl(0.04, 0.04, 2.2, '#2b2f36', 8), 0, 1.1, 0));
      g.add(at(kit.sphere(0.25, '#fff4c2'), 0, 2.3, 0));
      break;
    case 'fountain':
      g.add(at(kit.cyl(1.0, 1.1, 0.4, '#e8e2d2'), 0, 0.2, 0));
      g.add(at(kit.cyl(0.85, 0.85, 0.05, '#5ec8f0'), 0, 0.38, 0));
      g.add(at(kit.cyl(0.12, 0.18, 1.0, '#e8e2d2'), 0, 0.8, 0));
      g.add(at(kit.sphere(0.25, '#9fe3ff'), 0, 1.35, 0));
      break;
    case 'trees':
      g.add(at(kit.cyl(0.12, 0.16, 1.0, '#8a5a32', 10), 0, 0.5, 0));
      g.add(at(kit.sphere(0.75, '#4caf50'), 0, 1.5, 0));
      g.add(at(kit.sphere(0.5, '#66c35a'), 0.35, 1.85, 0.2));
      break;
    case 'benches':
      g.add(at(kit.box(1.6, 0.1, 0.5, '#c98a4b', 0.04), 0, 0.45, 0));
      g.add(at(kit.box(1.6, 0.4, 0.08, '#c98a4b', 0.04), 0, 0.7, -0.22));
      for (const x of [-0.65, 0.65])
        g.add(at(kit.box(0.1, 0.45, 0.45, '#5b4a3a', 0.02), x, 0.22, 0));
      break;
  }
  return g;
}
