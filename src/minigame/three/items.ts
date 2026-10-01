import { Group } from 'three';
import { at, type Kit } from './kit';

// Die Stücke, die im Minispiel getragen und gestapelt werden. Jede Sorte hat eine Höhe,
// damit Stapel lückenlos wachsen.

export type ItemKind =
  | 'crate'
  | 'beer'
  | 'fruit'
  | 'flyer'
  | 'file'
  | 'newspaper'
  | 'moneybag'
  | 'speech'
  | 'gift'
  | 'medal'
  | 'cash';

/** Stapelhöhe je Stück. */
export const itemHeight: Record<ItemKind, number> = {
  crate: 0.25,
  beer: 0.3,
  fruit: 0.27,
  flyer: 0.07,
  file: 0.09,
  newspaper: 0.08,
  moneybag: 0.3,
  speech: 0.13,
  gift: 0.3,
  medal: 0.11,
  cash: 0.09,
};

export function makeItem(kit: Kit, kind: ItemKind): Group {
  const g = new Group();
  switch (kind) {
    case 'crate': {
      g.add(at(kit.box(0.44, 0.24, 0.36, '#d79a55', 0.03), 0, 0.12, 0));
      g.add(at(kit.box(0.46, 0.05, 0.38, '#a8692f', 0.015), 0, 0.2, 0));
      g.add(at(kit.box(0.46, 0.05, 0.38, '#a8692f', 0.015), 0, 0.05, 0));
      break;
    }
    case 'beer': {
      g.add(at(kit.cyl(0.11, 0.1, 0.24, '#f5b72c'), 0, 0.12, 0));
      g.add(at(kit.cyl(0.12, 0.12, 0.07, '#fffaf0'), 0, 0.26, 0));
      const handle = at(kit.torus(0.06, 0.018, '#ffe08a'), 0.13, 0.13, 0);
      handle.rotation.y = Math.PI / 2;
      g.add(handle);
      break;
    }
    case 'fruit': {
      g.add(at(kit.box(0.42, 0.14, 0.32, '#c8894c', 0.03), 0, 0.07, 0));
      const colors = ['#ef3e3a', '#7ac943', '#ef3e3a', '#ffb52e'];
      for (let i = 0; i < 4; i++) {
        g.add(
          at(
            kit.sphere(0.085, colors[i] ?? '#ef3e3a', 12),
            -0.1 + (i % 2) * 0.2,
            0.19,
            -0.07 + Math.floor(i / 2) * 0.14,
          ),
        );
      }
      break;
    }
    case 'flyer': {
      g.add(at(kit.box(0.36, 0.06, 0.26, '#ffffff', 0.01), 0, 0.03, 0));
      g.add(at(kit.box(0.3, 0.012, 0.2, '#ea4c89', 0.004), 0, 0.066, 0));
      break;
    }
    case 'file': {
      g.add(at(kit.box(0.36, 0.08, 0.27, '#4f7fe0', 0.02), 0, 0.04, 0));
      g.add(at(kit.box(0.32, 0.02, 0.23, '#fdfbf5', 0.006), 0, 0.085, 0));
      break;
    }
    case 'newspaper': {
      g.add(at(kit.box(0.38, 0.07, 0.27, '#f1efe8', 0.015), 0, 0.035, 0));
      g.add(at(kit.box(0.3, 0.012, 0.06, '#2b2f36', 0.004), 0, 0.073, -0.07));
      g.add(at(kit.box(0.14, 0.012, 0.1, '#7aa6d8', 0.004), 0.07, 0.073, 0.05));
      break;
    }
    case 'moneybag': {
      const sack = at(kit.sphere(0.16, '#d2ad6c'), 0, 0.15, 0);
      sack.scale.set(1, 0.95, 1);
      g.add(sack);
      g.add(at(kit.cyl(0.05, 0.07, 0.07, '#b48a48'), 0, 0.3, 0));
      g.add(at(kit.box(0.12, 0.012, 0.01, '#3a8f3a', 0.003), 0, 0.16, 0.158));
      break;
    }
    case 'speech': {
      const roll = at(kit.cyl(0.06, 0.06, 0.38, '#fff3d6'), 0, 0.065, 0);
      roll.rotation.z = Math.PI / 2;
      g.add(roll);
      const ribbon = at(kit.cyl(0.065, 0.065, 0.05, '#e0343f'), 0, 0.065, 0);
      ribbon.rotation.z = Math.PI / 2;
      g.add(ribbon);
      break;
    }
    case 'gift': {
      g.add(at(kit.box(0.32, 0.26, 0.32, '#3fb8f0', 0.03), 0, 0.13, 0));
      g.add(at(kit.box(0.06, 0.27, 0.33, '#ffd23f', 0.01), 0, 0.13, 0));
      g.add(at(kit.box(0.33, 0.27, 0.06, '#ffd23f', 0.01), 0, 0.13, 0));
      g.add(at(kit.sphere(0.05, '#ffd23f', 10), 0, 0.28, 0));
      break;
    }
    case 'medal': {
      g.add(at(kit.box(0.3, 0.1, 0.24, '#b4232f', 0.03), 0, 0.05, 0));
      const coin = at(kit.cyl(0.07, 0.07, 0.02, '#ffcf3d'), 0, 0.105, 0);
      g.add(coin);
      break;
    }
    case 'cash': {
      g.add(at(kit.box(0.38, 0.08, 0.2, '#47c467', 0.015), 0, 0.04, 0));
      g.add(at(kit.box(0.08, 0.085, 0.205, '#eaf7e0', 0.005), 0, 0.04, 0));
      break;
    }
  }
  return g;
}

/**
 * Stapel, der sich auf eine gewünschte Anzahl einstellt (Stücke werden wiederverwendet).
 * `columns` > 1 legt mehrere Säulen nebeneinander (für große Haufen).
 */
export class Stack {
  readonly group = new Group();
  private readonly items: Group[] = [];
  private shown = 0;

  constructor(
    private readonly kit: Kit,
    private readonly kind: ItemKind,
    private readonly columns = 1,
    private readonly spacing = 0.46,
    private readonly perColumn = 999,
  ) {}

  set(count: number): void {
    if (count === this.shown) return;
    while (this.items.length < count) {
      const i = this.items.length;
      const item = makeItem(this.kit, this.kind);
      const col = this.columns > 1 ? i % this.columns : Math.floor(i / this.perColumn);
      const row = this.columns > 1 ? Math.floor(i / this.columns) : i % this.perColumn;
      const cx = this.columns > 1 ? (col % 2) - 0.5 : col;
      const cz = this.columns > 1 ? Math.floor(col / 2) - (this.columns > 2 ? 0.5 : 0) : 0;
      item.position.set(cx * this.spacing, row * itemHeight[this.kind], cz * this.spacing * 0.8);
      item.rotation.y = ((i * 37) % 9) * 0.02 - 0.08;
      this.items.push(item);
      this.group.add(item);
    }
    for (const [i, item] of this.items.entries()) item.visible = i < count;
    this.shown = count;
  }
}
