import { Group, type Object3D } from 'three';
import { at, type Kit } from './kit';

// Runde Spielfiguren (großer Kopf, kurze Beine) wie in Casual-Spielen. Füße bei y = 0,
// Blickrichtung +z. Die Figur hat einen „Stapel“-Anker vor der Brust für getragene Stücke.

export interface Look {
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
  /** Kappe/Mütze (optional). */
  hat?: string;
  /** Schürze, Weste o. Ä. über dem Hemd (optional). */
  vest?: string;
  /** Lange Haare (Zopf hinten). */
  longHair?: boolean;
}

export interface Character {
  root: Group;
  /** Hier werden getragene Stücke gestapelt. */
  stack: Group;
  legL: Group;
  legR: Group;
  armL: Group;
  armR: Group;
  body: Group;
}

function limb(kit: Kit, r: number, len: number, color: string, end: Object3D): Group {
  const pivot = new Group();
  pivot.add(at(kit.capsule(r, len, color), 0, -len / 2 - r * 0.4, 0));
  end.position.y = -len - r * 0.9;
  pivot.add(end);
  return pivot;
}

export function makeCharacter(kit: Kit, look: Look, scale = 1): Character {
  const root = new Group();
  const body = new Group();
  root.add(body);

  // Beine mit Schuhen
  const shoe = () => at(kit.box(0.17, 0.1, 0.26, '#2a2a33', 0.05), 0, 0.02, 0.04);
  const legL = limb(kit, 0.1, 0.3, look.pants, shoe());
  const legR = limb(kit, 0.1, 0.3, look.pants, shoe());
  legL.position.set(-0.13, 0.5, 0);
  legR.position.set(0.13, 0.5, 0);
  body.add(legL, legR);

  // Rumpf: Hose unten, Hemd oben
  body.add(at(kit.cyl(0.25, 0.24, 0.22, look.pants), 0, 0.6, 0));
  body.add(at(kit.capsule(0.27, 0.32, look.shirt), 0, 0.92, 0));
  if (look.vest) body.add(at(kit.box(0.42, 0.42, 0.1, look.vest, 0.05), 0, 0.86, 0.22));

  // Arme mit Händen
  const hand = () => kit.sphere(0.085, look.skin, 12);
  const armL = limb(kit, 0.08, 0.3, look.shirt, hand());
  const armR = limb(kit, 0.08, 0.3, look.shirt, hand());
  armL.position.set(-0.34, 1.13, 0);
  armR.position.set(0.34, 1.13, 0);
  body.add(armL, armR);

  // Kopf
  const head = new Group();
  head.position.set(0, 1.52, 0);
  head.add(kit.sphere(0.29, look.skin));
  const hair = kit.sphere(0.305, look.hair);
  hair.scale.set(1, 0.72, 1);
  hair.position.set(0, 0.1, -0.04);
  head.add(hair);
  if (look.longHair) head.add(at(kit.capsule(0.12, 0.22, look.hair), 0, -0.14, -0.22));
  const eye = (x: number) => at(kit.sphere(0.04, '#1e2230', 10), x, 0.02, 0.265);
  head.add(eye(-0.1), eye(0.1));
  head.add(at(kit.sphere(0.05, look.skin, 10), 0, -0.05, 0.29));
  if (look.hat) {
    head.add(at(kit.cyl(0.3, 0.31, 0.12, look.hat), 0, 0.2, 0));
    head.add(at(kit.box(0.34, 0.03, 0.22, look.hat, 0.015), 0, 0.15, 0.25));
  }
  body.add(head);

  // Stapel-Anker vor der Brust
  const stack = new Group();
  stack.position.set(0, 0.86, 0.42);
  root.add(stack);

  root.scale.setScalar(scale);
  return { root, stack, legL, legR, armL, armR, body };
}

/** Lauf-, Trage- und Steh-Animation. */
export function animateCharacter(
  c: Character,
  time: number,
  moving: boolean,
  carrying: boolean,
  phase = 0,
): void {
  const t = time * 10 + phase;
  const swing = moving ? Math.sin(t) * 0.7 : 0;
  c.legL.rotation.x = swing;
  c.legR.rotation.x = -swing;
  c.body.position.y = moving ? Math.abs(Math.sin(t)) * 0.06 : Math.sin(time * 2 + phase) * 0.012;
  if (carrying) {
    // Arme nach vorne, um den Stapel zu halten
    c.armL.rotation.x = -1.25;
    c.armR.rotation.x = -1.25;
    c.armL.rotation.z = 0.15;
    c.armR.rotation.z = -0.15;
  } else {
    c.armL.rotation.x = -swing * 0.8;
    c.armR.rotation.x = swing * 0.8;
    c.armL.rotation.z = 0.08;
    c.armR.rotation.z = -0.08;
  }
}
