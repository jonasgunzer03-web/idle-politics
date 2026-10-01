import { minigames } from '../config/minigames';
import { layout } from './layout';
import {
  carryCapacity,
  createSim,
  hintTarget,
  setHelpers,
  stepSim,
  type Input,
  type SimEvent,
  type SimParams,
  type SimState,
  type Vec,
} from './sim';

const params: SimParams = { cfg: minigames, level: 1, helpers: 0 };
const still: Input = { x: 0, z: 0 };

/** Figur direkt an einen Ort setzen. */
function place(state: SimState, pos: Vec): SimState {
  return { ...state, player: { ...state.player, pos: { ...pos } } };
}

/** Viele kleine Schritte rechnen und alle Ereignisse sammeln. */
function run(
  state: SimState,
  seconds: number,
  input: Input = still,
  p: SimParams = params,
): { state: SimState; events: SimEvent[] } {
  let s = state;
  const events: SimEvent[] = [];
  for (let t = 0; t < seconds; t += 0.05) {
    const r = stepSim(s, layout, p, input, 0.05);
    s = r.state;
    events.push(...r.events);
  }
  return { state: s, events };
}

describe('Minispiel-Simulation', () => {
  it('die Quelle füllt sich bis zur Grenze', () => {
    const s = run(createSim(layout, params, 1), 60).state;
    expect(s.source.stock).toBe(minigames.sourceMax);
  });

  it('an der Quelle nimmt die Figur bis zur Tragkraft auf', () => {
    let s = createSim(layout, params, 1);
    s = { ...s, source: { stock: 20, timer: 0 } };
    s = run(place(s, layout.source), 3).state;
    expect(s.player.carry).toBe(carryCapacity(params));
  });

  it('an der Theke legt sie alles ab', () => {
    let s = createSim(layout, params, 1);
    s = { ...s, player: { ...s.player, carry: 4 }, customerTimer: 999 };
    s = run(place(s, { x: layout.bounds.maxX, z: layout.counter.z }), 2).state;
    expect(s.player.carry).toBe(0);
    expect(s.counter).toBe(4);
  });

  it('Kunden kaufen von der Theke und lassen Geld liegen', () => {
    let s = createSim(layout, params, 7);
    s = { ...s, counter: 20 };
    const r = run(s, 20);
    expect(r.events.some((e) => e.kind === 'sold')).toBe(true);
    expect(r.state.counter).toBeLessThan(20);
    expect(r.state.cash).toBeGreaterThan(0);
  });

  it('beim Drüberlaufen wird das Geld auf einmal eingesammelt', () => {
    let s = createSim(layout, params, 1);
    s = { ...s, cash: 5, customerTimer: 999 };
    const r = run(place(s, layout.cash), 0.2);
    expect(r.events).toContainEqual({ kind: 'cash', count: 5 });
    expect(r.state.cash).toBe(0);
  });

  it('Ausbau-Feld löst nach kurzem Stehen genau einmal aus', () => {
    const s = place(createSim(layout, params, 1), layout.pads.upgrade);
    const r = run(s, minigames.padSeconds + 0.3);
    expect(r.events.filter((e) => e.kind === 'pad')).toEqual([{ kind: 'pad', pad: 'upgrade' }]);
  });

  it('beim Laufen löst kein Feld aus', () => {
    const s = place(createSim(layout, params, 1), layout.pads.hire);
    const r = run(s, 2, { x: 0.2, z: 0 });
    expect(r.events.some((e) => e.kind === 'pad')).toBe(false);
  });

  it('die Figur bleibt im Raum und läuft nicht durch die Theke', () => {
    const s = run(createSim(layout, params, 1), 8, { x: 1, z: 0 }).state;
    expect(s.player.pos.x).toBeLessThanOrEqual(layout.bounds.maxX + 1e-9);
    const up = run(createSim(layout, params, 1), 8, { x: 0, z: -1 }).state;
    expect(up.player.pos.z).toBeGreaterThanOrEqual(layout.bounds.minZ - 1e-9);
  });

  it('Helfer bringen Stücke von der Quelle zur Theke', () => {
    const p: SimParams = { ...params, helpers: 2 };
    let s = createSim(layout, p, 3);
    s = { ...s, customerTimer: 999 };
    const r = run(s, 30, still, p);
    expect(r.state.counter).toBeGreaterThan(0);
    expect(setHelpers(r.state, layout, 3).helpers).toHaveLength(3);
    expect(setHelpers(r.state, layout, 0).helpers).toHaveLength(0);
  });

  it('der Hinweis-Pfeil zeigt den nächsten Schritt', () => {
    const s = createSim(layout, params, 1);
    expect(hintTarget(s, layout)).toBe(layout.source);
    expect(hintTarget({ ...s, player: { ...s.player, carry: 1 } }, layout)).toBe(layout.counter);
    expect(hintTarget({ ...s, cash: 2 }, layout)).toBe(layout.cash);
  });

  it('größere Zeitsprünge werden gedeckelt (kein Durchtunneln)', () => {
    const s = createSim(layout, params, 1);
    const r = stepSim(s, layout, params, { x: 1, z: 0 }, 5);
    expect(r.state.time).toBeCloseTo(0.1);
  });
});
