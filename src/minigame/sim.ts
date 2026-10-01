import type { MinigameConfig } from '../config/minigames';

// Ablauf des Minispiels ohne Grafik (reine Funktionen, testbar): Figur läuft, nimmt an der
// Quelle Stücke auf, legt sie auf der Theke ab, Kunden kaufen und lassen Geld liegen, das
// Einsammeln meldet Verkäufe. Ausbau-Felder melden, wenn man lange genug darauf steht.
// Koordinaten in Metern auf dem Boden (x nach rechts, z nach vorne/unten im Bild).

export interface Vec {
  x: number;
  z: number;
}

export type PadId = 'hire' | 'upgrade' | 'machine';

export interface Layout {
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  start: Vec;
  source: Vec;
  counter: Vec;
  /** Wo der Kunde vor der Theke steht. */
  serve: Vec;
  cash: Vec;
  /** Wo Kunden hereinkommen und wieder gehen. */
  door: Vec;
  /** Richtung, in der sich die Warteschlange hinter `serve` aufreiht. */
  queueDir: Vec;
  pads: Record<PadId, Vec>;
  /** Hindernisse (Rechtecke), um die Figuren nicht laufen. */
  blocks: { x: number; z: number; w: number; d: number }[];
}

export interface Customer {
  id: number;
  pos: Vec;
  want: number;
  got: number;
  phase: 'in' | 'wait' | 'buy' | 'out';
  timer: number;
  seed: number;
}

export interface Helper {
  pos: Vec;
  carry: number;
  goal: 'source' | 'counter';
  timer: number;
  facing: number;
}

export interface SimState {
  time: number;
  rng: number;
  player: { pos: Vec; facing: number; carry: number; moving: boolean; handTimer: number };
  source: { stock: number; timer: number };
  counter: number;
  cash: number;
  cashTimer: number;
  customers: Customer[];
  nextCustomer: number;
  customerTimer: number;
  helpers: Helper[];
  pads: Record<PadId, number>;
  /** Nach einem Kauf kurz Pause auf dem Feld, damit nicht mehrfach gekauft wird. */
  padCooldown: Record<PadId, number>;
}

export interface SimParams {
  cfg: MinigameConfig;
  level: number;
  helpers: number;
}

export type SimEvent =
  | { kind: 'pickup' }
  | { kind: 'drop' }
  | { kind: 'sold'; customer: number }
  | { kind: 'cash'; count: number }
  | { kind: 'pad'; pad: PadId };

/** Eingabe des Joysticks: Richtung mit Länge 0…1. */
export interface Input {
  x: number;
  z: number;
}

const REACH = 1.1;
const PAD_REACH = 0.9;

/** Kleiner seedbarer Zufall (nur für die Darstellung der Kunden). */
function nextRandom(seed: number): { seed: number; value: number } {
  const s = (Math.imul(seed ^ (seed >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) >>> 0;
  return { seed: s, value: s / 0x100000000 };
}

export function dist(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export function carryCapacity(p: SimParams): number {
  return p.cfg.carryBase + p.cfg.carryPerLevel * (p.level - 1);
}

export function sourceCapacity(p: SimParams): number {
  return p.cfg.sourceMax + p.cfg.sourceMaxPerLevel * (p.level - 1);
}

export function produceInterval(p: SimParams): number {
  return p.cfg.produceSeconds / (1 + p.cfg.produceBoostPerLevel * (p.level - 1));
}

export function createSim(layout: Layout, p: SimParams, seed: number): SimState {
  const helpers: Helper[] = [];
  for (let i = 0; i < p.helpers; i++) helpers.push(newHelper(layout, i));
  return {
    time: 0,
    rng: seed >>> 0 || 1,
    player: { pos: { ...layout.start }, facing: 0, carry: 0, moving: false, handTimer: 0 },
    source: { stock: Math.min(3, sourceCapacity(p)), timer: 0 },
    counter: 0,
    cash: 0,
    cashTimer: 0,
    customers: [],
    nextCustomer: 1,
    customerTimer: 0.6,
    helpers,
    pads: { hire: 0, upgrade: 0, machine: 0 },
    padCooldown: { hire: 0, upgrade: 0, machine: 0 },
  };
}

function newHelper(layout: Layout, i: number): Helper {
  return {
    pos: { x: layout.source.x + 0.8 + i * 0.5, z: layout.source.z + 1.2 },
    carry: 0,
    goal: 'source',
    timer: 0,
    facing: 0,
  };
}

/** Anzahl der Helfer anpassen (z. B. nach einem Kauf im Minispiel). */
export function setHelpers(state: SimState, layout: Layout, count: number): SimState {
  if (count === state.helpers.length) return state;
  const helpers = state.helpers.slice(0, count);
  while (helpers.length < count) helpers.push(newHelper(layout, helpers.length));
  return { ...state, helpers };
}

function clampToBounds(v: Vec, layout: Layout): Vec {
  const b = layout.bounds;
  let x = Math.min(b.maxX, Math.max(b.minX, v.x));
  let z = Math.min(b.maxZ, Math.max(b.minZ, v.z));
  // Aus Hindernissen herausschieben (kürzester Weg)
  for (const r of layout.blocks) {
    const hw = r.w / 2 + 0.3;
    const hd = r.d / 2 + 0.3;
    const dx = x - r.x;
    const dz = z - r.z;
    if (Math.abs(dx) < hw && Math.abs(dz) < hd) {
      const px = hw - Math.abs(dx);
      const pz = hd - Math.abs(dz);
      if (px < pz) x = r.x + Math.sign(dx || 1) * hw;
      else z = r.z + Math.sign(dz || 1) * hd;
    }
  }
  return { x, z };
}

/** Schritt in Richtung Ziel; liefert neue Position und ob angekommen. */
function moveTowards(
  pos: Vec,
  target: Vec,
  speed: number,
  dt: number,
): { pos: Vec; arrived: boolean } {
  const dx = target.x - pos.x;
  const dz = target.z - pos.z;
  const d = Math.hypot(dx, dz);
  const step = speed * dt;
  if (d <= step || d < 1e-6) return { pos: { ...target }, arrived: true };
  return { pos: { x: pos.x + (dx / d) * step, z: pos.z + (dz / d) * step }, arrived: false };
}

function queueSpot(layout: Layout, index: number): Vec {
  return {
    x: layout.serve.x + layout.queueDir.x * index * 1.2,
    z: layout.serve.z + layout.queueDir.z * index * 1.2,
  };
}

/** Einen Zeitschritt rechnen. Liefert den neuen Zustand und die Ereignisse dieses Schritts. */
export function stepSim(
  prev: SimState,
  layout: Layout,
  p: SimParams,
  input: Input,
  dtRaw: number,
): { state: SimState; events: SimEvent[] } {
  const dt = Math.min(0.1, Math.max(0, dtRaw));
  const cfg = p.cfg;
  const events: SimEvent[] = [];
  let rng = prev.rng;

  // --- Figur bewegen
  const len = Math.min(1, Math.hypot(input.x, input.z));
  const player = { ...prev.player, pos: { ...prev.player.pos } };
  player.moving = len > 0.08;
  if (player.moving) {
    const k = (cfg.playerSpeed * len * dt) / Math.max(1e-6, Math.hypot(input.x, input.z));
    player.pos = clampToBounds(
      { x: player.pos.x + input.x * k, z: player.pos.z + input.z * k },
      layout,
    );
    player.facing = Math.atan2(input.x, input.z);
  }

  // --- Quelle füllt sich
  const source = { ...prev.source };
  const cap = sourceCapacity(p);
  if (source.stock < cap) {
    source.timer += dt;
    const interval = produceInterval(p);
    while (source.timer >= interval && source.stock < cap) {
      source.timer -= interval;
      source.stock += 1;
    }
  } else {
    source.timer = 0;
  }

  // --- Aufnehmen und Ablegen (Takt)
  let counter = prev.counter;
  player.handTimer = Math.max(0, player.handTimer - dt);
  const carryCap = carryCapacity(p);
  if (player.handTimer <= 0) {
    if (dist(player.pos, layout.source) < REACH && source.stock > 0 && player.carry < carryCap) {
      source.stock -= 1;
      player.carry += 1;
      player.handTimer = cfg.handSeconds;
      events.push({ kind: 'pickup' });
    } else if (
      dist(player.pos, layout.counter) < REACH + 0.2 &&
      player.carry > 0 &&
      counter < cfg.counterMax
    ) {
      player.carry -= 1;
      counter += 1;
      player.handTimer = cfg.handSeconds;
      events.push({ kind: 'drop' });
    }
  }

  // --- Helfer pendeln zwischen Quelle und Theke
  const helpers = prev.helpers.map((h) => ({ ...h, pos: { ...h.pos } }));
  for (const [i, h] of helpers.entries()) {
    // Helfer verteilen sich vor der Quelle und an der Theke, statt sich zu stapeln
    const offset = { x: (i % 2 === 0 ? -0.75 : 0.75) * (1 + Math.floor(i / 2) * 0.9), z: 0.9 };
    const target =
      h.goal === 'source'
        ? { x: layout.source.x + offset.x, z: layout.source.z + offset.z }
        : { x: layout.counter.x - 1.1, z: layout.counter.z + (i - 1.5) * 0.6 };
    const before = h.pos;
    const moved = moveTowards(h.pos, target, cfg.helperSpeed, dt);
    h.pos = moved.pos;
    if (!moved.arrived) {
      h.facing = Math.atan2(h.pos.x - before.x, h.pos.z - before.z);
      continue;
    }
    h.timer -= dt;
    if (h.timer > 0) continue;
    if (h.goal === 'source') {
      if (source.stock > 0 && h.carry < cfg.helperCarry) {
        source.stock -= 1;
        h.carry += 1;
        h.timer = cfg.handSeconds * 2;
      } else if (h.carry > 0) {
        h.goal = 'counter';
      }
    } else if (h.carry > 0 && counter < cfg.counterMax) {
      h.carry -= 1;
      counter += 1;
      h.timer = cfg.handSeconds * 2;
    } else if (h.carry === 0) {
      h.goal = 'source';
    }
  }

  // --- Kunden kommen, stellen sich an, kaufen, gehen
  let customers = prev.customers.map((c) => ({ ...c, pos: { ...c.pos } }));
  let nextCustomer = prev.nextCustomer;
  let customerTimer = prev.customerTimer - dt;
  const waiting = customers.filter((c) => c.phase !== 'out').length;
  if (customerTimer <= 0) {
    customerTimer = cfg.customerSeconds;
    if (waiting < cfg.maxQueue) {
      const r1 = nextRandom(rng);
      const r2 = nextRandom(r1.seed);
      rng = r2.seed;
      customers.push({
        id: nextCustomer,
        pos: { ...layout.door },
        want: 1 + Math.floor(r1.value * cfg.maxWant),
        got: 0,
        phase: 'in',
        timer: 0,
        seed: Math.floor(r2.value * 0xffffffff),
      });
      nextCustomer += 1;
    }
  }
  let cash = prev.cash;
  let queueIndex = 0;
  for (const c of customers) {
    if (c.phase === 'out') {
      c.pos = moveTowards(c.pos, layout.door, cfg.customerSpeed * 1.2, dt).pos;
      continue;
    }
    const first = queueIndex === 0;
    const spot = queueSpot(layout, queueIndex);
    queueIndex += 1;
    const moved = moveTowards(c.pos, spot, cfg.customerSpeed, dt);
    c.pos = moved.pos;
    if (!moved.arrived) {
      c.phase = 'in';
      continue;
    }
    // Nur der Erste in der Schlange kauft
    if (first) {
      c.phase = 'buy';
      c.timer -= dt;
      if (c.timer <= 0 && counter > 0 && c.got < c.want) {
        counter -= 1;
        c.got += 1;
        c.timer = cfg.buySeconds;
      }
      if (c.got >= c.want) {
        c.phase = 'out';
        cash = Math.min(cfg.cashPileMax, cash + c.want);
        events.push({ kind: 'sold', customer: c.id });
      }
    } else {
      c.phase = 'wait';
    }
  }
  customers = customers.filter((c) => !(c.phase === 'out' && dist(c.pos, layout.door) < 0.05));

  // --- Geld einsammeln (alles auf einmal, sobald man drüberläuft)
  let cashTimer = Math.max(0, prev.cashTimer - dt);
  if (cash > 0 && cashTimer <= 0 && dist(player.pos, layout.cash) < REACH) {
    events.push({ kind: 'cash', count: cash });
    cash = 0;
    cashTimer = 0.3;
  }

  // --- Ausbau-Felder
  const pads = { ...prev.pads };
  const padCooldown = { ...prev.padCooldown };
  for (const id of Object.keys(pads) as PadId[]) {
    padCooldown[id] = Math.max(0, padCooldown[id] - dt);
    const on = dist(player.pos, layout.pads[id]) < PAD_REACH && !player.moving;
    if (on && padCooldown[id] <= 0) {
      pads[id] = Math.min(1, pads[id] + dt / cfg.padSeconds);
      if (pads[id] >= 1) {
        events.push({ kind: 'pad', pad: id });
        pads[id] = 0;
        padCooldown[id] = 1.2;
      }
    } else if (!on) {
      pads[id] = Math.max(0, pads[id] - dt * 2);
    }
  }

  return {
    state: {
      time: prev.time + dt,
      rng,
      player,
      source,
      counter,
      cash,
      cashTimer,
      customers,
      nextCustomer,
      customerTimer,
      helpers,
      pads,
      padCooldown,
    },
    events,
  };
}

/** Wohin der Hinweis-Pfeil zeigt: nächster sinnvoller Schritt für Neulinge. */
export function hintTarget(state: SimState, layout: Layout): Vec | null {
  if (state.cash > 0) return layout.cash;
  if (state.player.carry > 0) return layout.counter;
  if (state.source.stock > 0) return layout.source;
  return null;
}
