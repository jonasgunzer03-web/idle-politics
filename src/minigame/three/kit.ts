import {
  BoxGeometry,
  CapsuleGeometry,
  CircleGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
  type Material,
  type Object3D,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Baukasten für die 3D-Minispiele: weiche, runde Formen in kräftigen Farben (Spielzeug-Look).
// Geometrien und Materialien werden zwischengespeichert und beim Schließen freigegeben.

export class Kit {
  private readonly materials = new Map<string, MeshStandardMaterial>();
  private readonly geometries = new Map<string, BufferGeometry>();

  mat(color: string, opts: { rough?: number; metal?: number; emissive?: string } = {}): Material {
    const key = `${color}|${opts.rough ?? 0.75}|${opts.metal ?? 0}|${opts.emissive ?? ''}`;
    let m = this.materials.get(key);
    if (!m) {
      m = new MeshStandardMaterial({
        color,
        roughness: opts.rough ?? 0.75,
        metalness: opts.metal ?? 0,
      });
      if (opts.emissive) {
        m.emissive.set(opts.emissive);
        m.emissiveIntensity = 0.6;
      }
      this.materials.set(key, m);
    }
    return m;
  }

  private geo<T extends BufferGeometry>(key: string, make: () => T): T {
    let g = this.geometries.get(key);
    if (!g) {
      g = make();
      this.geometries.set(key, g);
    }
    return g as T;
  }

  /** Abgerundeter Quader (Mitte im Ursprung). */
  box(w: number, h: number, d: number, color: string, radius = 0.06): Mesh {
    const r = Math.min(radius, w / 2.01, h / 2.01, d / 2.01);
    const g =
      r > 0.001
        ? this.geo(`rb${w}|${h}|${d}|${r}`, () => new RoundedBoxGeometry(w, h, d, 3, r))
        : this.geo(`b${w}|${h}|${d}`, () => new BoxGeometry(w, h, d));
    return this.shadowed(new Mesh(g, this.mat(color)));
  }

  cyl(rTop: number, rBottom: number, h: number, color: string, seg = 20): Mesh {
    const g = this.geo(
      `c${rTop}|${rBottom}|${h}|${seg}`,
      () => new CylinderGeometry(rTop, rBottom, h, seg),
    );
    return this.shadowed(new Mesh(g, this.mat(color)));
  }

  sphere(r: number, color: string, seg = 20): Mesh {
    const g = this.geo(`s${r}|${seg}`, () => new SphereGeometry(r, seg, Math.max(8, seg * 0.75)));
    return this.shadowed(new Mesh(g, this.mat(color)));
  }

  capsule(r: number, len: number, color: string): Mesh {
    const g = this.geo(`k${r}|${len}`, () => new CapsuleGeometry(r, len, 6, 14));
    return this.shadowed(new Mesh(g, this.mat(color)));
  }

  disc(r: number, color: string, seg = 32): Mesh {
    const g = this.geo(`d${r}|${seg}`, () => new CircleGeometry(r, seg));
    const m = new Mesh(g, this.mat(color));
    m.rotation.x = -Math.PI / 2;
    m.receiveShadow = true;
    return m;
  }

  torus(r: number, tube: number, color: string): Mesh {
    const g = this.geo(`t${r}|${tube}`, () => new TorusGeometry(r, tube, 10, 28));
    return this.shadowed(new Mesh(g, this.mat(color)));
  }

  shadowed<T extends Mesh>(m: T): T {
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  dispose(): void {
    for (const m of this.materials.values()) m.dispose();
    for (const g of this.geometries.values()) g.dispose();
    this.materials.clear();
    this.geometries.clear();
  }
}

/** Objekt an Position setzen und zurückgeben (für kompakte Baupläne). */
export function at<T extends Object3D>(obj: T, x: number, y: number, z: number): T {
  obj.position.set(x, y, z);
  return obj;
}

/** Mehrere Objekte in eine Gruppe packen. */
export function group(...children: Object3D[]): Group {
  const g = new Group();
  for (const c of children) g.add(c);
  return g;
}
