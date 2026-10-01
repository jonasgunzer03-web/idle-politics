import {
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  PCFShadowMap,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
  type Mesh,
} from 'three';
import type { PadId, SimState, Vec } from '../sim';
import { layout } from '../layout';
import type { Theme } from '../themes';
import { animateCharacter, makeCharacter, type Character, type Look } from './characters';
import { Stack } from './items';
import { at, Kit } from './kit';
import { Bubble, FloorLabel, type FloorLabelSpec } from './labels';
import { buildCounter, buildProps, buildRoom, buildSource, type Built } from './stations';

// Die 3D-Szene eines Minispiels. Sie wird einmal aufgebaut und dann in jedem Bild aus dem
// Simulationszustand (sim.ts) nachgeführt. Keine Spiellogik hier.

const SKINS = ['#f6d7c3', '#eec1a2', '#e0a883', '#c98c64', '#a8704b', '#6b3f27'];
const HAIRS = ['#2b1d16', '#4a2f1f', '#7a4a26', '#d8b26a', '#b5502c', '#8f8f8f'];

function seeded(seed: number, n: number): number {
  const s = Math.imul(seed ^ (seed >>> 13), 0x5bd1e995) ^ Math.imul(n + 1, 0x27d4eb2d);
  return ((s ^ (s >>> 15)) >>> 0) % 1000;
}

function seededLook(seed: number, shirt: string, pants: string, extra: Partial<Look> = {}): Look {
  return {
    skin: SKINS[seeded(seed, 1) % SKINS.length] ?? '#eec1a2',
    hair: HAIRS[seeded(seed, 2) % HAIRS.length] ?? '#2b1d16',
    shirt,
    pants,
    longHair: seeded(seed, 3) % 3 === 0,
    ...extra,
  };
}

interface Actor {
  char: Character;
  stack: Stack;
  phase: number;
}

interface CustomerActor extends Actor {
  bubble: Bubble;
  last: Vec;
}

export interface PadView {
  label: FloorLabelSpec;
}

export class MinigameScene {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(36, 1, 0.1, 120);
  private readonly kit = new Kit();
  private readonly camTarget = new Vector3();
  private readonly player: Actor;
  private readonly helpers: Actor[] = [];
  private readonly customers = new Map<number, CustomerActor>();
  private readonly sourceStack: Stack;
  private readonly counterStack: Stack;
  private readonly cashStack: Stack;
  private readonly pads = new Map<PadId, { label: FloorLabel; fill: Mesh }>();
  private readonly arrow = new Group();
  private readonly ticks: NonNullable<Built['tick']>[] = [];
  private readonly disposables: { dispose: () => void }[] = [];
  private lastPlayer: Vec;
  private time = 0;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly theme: Theme,
    playerLook: Look,
    labels: { cash: string },
  ) {
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFShadowMap;
    this.scene.background = new Color(theme.outdoor ? '#9dd8ff' : '#a9c8e8');

    // Licht: heller Himmel, warme Sonne mit weichen Schatten
    this.scene.add(new HemisphereLight('#ffffff', '#9fb2cc', 2.1));
    const sun = new DirectionalLight('#fff3dc', 2.4);
    sun.position.set(6, 14, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -10;
    sun.shadow.camera.right = 10;
    sun.shadow.camera.top = 10;
    sun.shadow.camera.bottom = -10;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 40;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.03;
    this.scene.add(sun, sun.target);

    const kit = this.kit;
    this.scene.add(buildRoom(kit, theme));
    this.scene.add(buildProps(kit, theme.props, theme));

    const source = buildSource(kit, theme.source, theme);
    at(source.group, layout.source.x, 0, layout.source.z);
    this.scene.add(source.group);
    if (source.tick) this.ticks.push(source.tick);
    this.sourceStack = new Stack(kit, theme.item, 4, 0.46);
    at(this.sourceStack.group, layout.source.x, 0.12, layout.source.z);
    this.scene.add(this.sourceStack.group);

    const counter = buildCounter(kit, theme.counter);
    at(counter, layout.counter.x, 0, layout.counter.z);
    this.scene.add(counter);
    this.counterStack = new Stack(kit, theme.item, 1, 0.5, 10);
    this.counterStack.group.rotation.y = Math.PI / 2;
    at(this.counterStack.group, layout.counter.x - 0.1, 1.06, layout.counter.z + 0.8);
    this.scene.add(this.counterStack.group);

    // Geldhaufen auf einem Feld
    const cashLabel = new FloorLabel(1.7);
    cashLabel.set({ title: '', sub: labels.cash, color: '#2fbf55', warn: false });
    at(cashLabel.mesh, layout.cash.x, 0.03, layout.cash.z);
    this.scene.add(cashLabel.mesh);
    this.disposables.push(cashLabel);
    this.cashStack = new Stack(kit, 'cash', 4, 0.42);
    at(this.cashStack.group, layout.cash.x, 0.02, layout.cash.z - 0.1);
    this.scene.add(this.cashStack.group);

    // Ausbau-Felder
    for (const id of ['hire', 'upgrade', 'machine'] as const) {
      const pos = layout.pads[id];
      const label = new FloorLabel(1.9);
      at(label.mesh, pos.x, 0.03, pos.z);
      const fill = kit.disc(0.8, '#3fc95e');
      fill.position.set(pos.x, 0.02, pos.z);
      fill.scale.setScalar(0.001);
      this.scene.add(fill, label.mesh);
      this.pads.set(id, { label, fill });
      this.disposables.push(label);
    }

    // Eigene Figur
    const playerChar = makeCharacter(kit, playerLook);
    this.player = { char: playerChar, stack: new Stack(kit, theme.item), phase: 0 };
    playerChar.stack.add(this.player.stack.group);
    at(playerChar.root, layout.start.x, 0, layout.start.z);
    this.scene.add(playerChar.root);
    this.lastPlayer = { ...layout.start };

    // Hinweis-Pfeil
    const cone = kit.cyl(0, 0.32, 0.5, '#3fb8f0', 4);
    cone.rotation.x = Math.PI;
    cone.rotation.y = Math.PI / 4;
    this.arrow.add(cone);
    this.arrow.add(at(kit.box(0.22, 0.4, 0.22, '#3fb8f0', 0.05), 0, 0.42, 0));
    this.arrow.visible = false;
    this.scene.add(this.arrow);
  }

  resize(width: number, height: number): void {
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(1, height);
    // Schmale Bildschirme: etwas weiter weg, damit genug vom Raum zu sehen ist
    this.camera.fov = this.camera.aspect < 0.7 ? 50 : 38;
    this.camera.updateProjectionMatrix();
  }

  /** Mitarbeiter-Figuren an die Anzahl der Helfer anpassen. */
  private syncHelpers(count: number): void {
    while (this.helpers.length < count) {
      const i = this.helpers.length;
      const s = this.theme.staff;
      const look = seededLook(9000 + i * 17, s.shirt, s.pants, { vest: s.vest, hat: s.hat });
      const char = makeCharacter(this.kit, look, 0.92);
      const actor: Actor = { char, stack: new Stack(this.kit, this.theme.item), phase: i * 1.7 };
      char.stack.add(actor.stack.group);
      this.scene.add(char.root);
      this.helpers.push(actor);
    }
    while (this.helpers.length > count) {
      const a = this.helpers.pop();
      if (a) this.scene.remove(a.char.root);
    }
  }

  private syncCustomers(state: SimState): void {
    const seen = new Set<number>();
    for (const c of state.customers) {
      seen.add(c.id);
      let actor = this.customers.get(c.id);
      if (!actor) {
        const shirts = this.theme.customers;
        const shirt = shirts[c.seed % shirts.length] ?? '#3f7fd6';
        const char = makeCharacter(this.kit, seededLook(c.seed, shirt, '#3b4252'), 0.95);
        const bubble = new Bubble('#3fb8f0');
        bubble.sprite.position.set(0, 2.25, 0);
        char.root.add(bubble.sprite);
        actor = {
          char,
          stack: new Stack(this.kit, this.theme.item),
          phase: c.id,
          bubble,
          last: { ...c.pos },
        };
        char.stack.add(actor.stack.group);
        this.scene.add(char.root);
        this.customers.set(c.id, actor);
      }
      const moving = Math.hypot(c.pos.x - actor.last.x, c.pos.z - actor.last.z) > 1e-4;
      if (moving)
        actor.char.root.rotation.y = Math.atan2(c.pos.x - actor.last.x, c.pos.z - actor.last.z);
      // Wer kauft, schaut zur Theke (nach links); wer wartet, schaut nach vorne in der Schlange
      else if (c.phase === 'buy') actor.char.root.rotation.y = -Math.PI / 2;
      else if (c.phase === 'wait') actor.char.root.rotation.y = Math.PI;
      actor.char.root.position.set(c.pos.x, 0, c.pos.z);
      actor.last = { ...c.pos };
      actor.stack.set(c.got);
      actor.bubble.sprite.visible = c.phase !== 'out';
      actor.bubble.set(String(Math.max(0, c.want - c.got)));
      animateCharacter(actor.char, this.time, moving, c.got > 0, actor.phase);
    }
    for (const [id, actor] of this.customers) {
      if (seen.has(id)) continue;
      this.scene.remove(actor.char.root);
      actor.bubble.dispose();
      this.customers.delete(id);
    }
  }

  setPads(views: Record<PadId, PadView>): void {
    for (const [id, pad] of this.pads) pad.label.set(views[id].label);
  }

  update(state: SimState, hint: Vec | null, dt: number): void {
    this.time += dt;
    const p = state.player;
    const root = this.player.char.root;
    root.position.set(p.pos.x, 0, p.pos.z);
    // Weich in Laufrichtung drehen
    const diff = Math.atan2(
      Math.sin(p.facing - root.rotation.y),
      Math.cos(p.facing - root.rotation.y),
    );
    if (p.moving) root.rotation.y += diff * Math.min(1, dt * 14);
    this.player.stack.set(p.carry);
    animateCharacter(this.player.char, this.time, p.moving, p.carry > 0);
    this.lastPlayer = p.pos;

    this.syncHelpers(state.helpers.length);
    for (const [i, h] of state.helpers.entries()) {
      const a = this.helpers[i];
      if (!a) continue;
      const before = a.char.root.position.clone();
      a.char.root.position.set(h.pos.x, 0, h.pos.z);
      const moving = before.distanceTo(a.char.root.position) > 1e-4;
      if (moving) a.char.root.rotation.y = h.facing;
      a.stack.set(h.carry);
      animateCharacter(a.char, this.time, moving, h.carry > 0, a.phase);
    }
    this.syncCustomers(state);

    this.sourceStack.set(state.source.stock);
    this.counterStack.set(state.counter);
    this.cashStack.set(state.cash);
    for (const [id, pad] of this.pads) {
      const v = state.pads[id];
      pad.fill.scale.setScalar(Math.max(0.001, v));
    }
    const active = state.helpers.length > 0 || p.moving;
    for (const tick of this.ticks) tick(this.time, active);

    if (hint) {
      this.arrow.visible = true;
      this.arrow.position.set(hint.x, 2.4 + Math.sin(this.time * 4) * 0.18, hint.z);
      this.arrow.rotation.y = this.time;
    } else this.arrow.visible = false;

    // Kamera folgt der Figur (weich), bleibt aber im Raum
    // Seitlich fast fest (der ganze Raum passt in die Breite), nach vorne/hinten mitlaufen
    const tx = 0.4 + Math.min(0.4, Math.max(-0.4, p.pos.x * 0.15));
    const tz = Math.min(2.2, Math.max(-1.4, p.pos.z));
    this.camTarget.lerp(new Vector3(tx, 0, tz), Math.min(1, dt * 4));
    this.camera.position.set(this.camTarget.x + 0.8, 19, this.camTarget.z + 14);
    this.camera.lookAt(this.camTarget.x, 0, this.camTarget.z - 0.6);
    this.renderer.render(this.scene, this.camera);
  }

  /** Bildschirmposition (CSS-Pixel) eines Punkts im Raum, z. B. für schwebende Zahlen. */
  project(pos: Vec, y: number, width: number, height: number): { x: number; y: number } {
    const v = new Vector3(pos.x, y, pos.z).project(this.camera);
    return { x: ((v.x + 1) / 2) * width, y: ((1 - v.y) / 2) * height };
  }

  playerPos(): Vec {
    return this.lastPlayer;
  }

  /** Kamera sofort auf die Figur setzen (beim Start). */
  snapCamera(): void {
    this.camTarget.set(this.lastPlayer.x, 0, this.lastPlayer.z);
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
    for (const c of this.customers.values()) c.bubble.dispose();
    this.kit.dispose();
    this.renderer.dispose();
  }
}
