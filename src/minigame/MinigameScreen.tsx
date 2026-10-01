import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { defaultConfig } from '../config';
import { hairColors, partyColors, skinTones } from '../config/appearance';
import type { LocationId } from '../engine/ids';
import { minigameHelpers, minigameLevel, minigameOffers, type PadOffer } from '../engine/minigame';
import { de, fill } from '../i18n/de';
import { gameStore } from '../store';
import { ResourceBar } from '../ui/components/ResourceBar';
import { formatCost, formatGain } from '../ui/gameText';
import { layout } from './layout';
import {
  carryCapacity,
  createSim,
  hintTarget,
  setHelpers,
  stepSim,
  type Input,
  type PadId,
  type SimParams,
} from './sim';
import type { Look } from './three/characters';
import { MinigameScene, type PadView } from './three/scene';
import { themes } from './themes';
import styles from './MinigameScreen.module.css';

// Vollbild-Minispiel „Selbst anpacken“: 3D-Szene, Daumen-Joystick, Anzeigen obendrauf.
// Wird erst beim ersten Öffnen nachgeladen (three.js ist groß).

const cfg = defaultConfig;
const JOY_RADIUS = 56;

interface Floater {
  id: number;
  text: string;
  x: number;
  y: number;
}

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return canvas.getContext('webgl2') !== null || canvas.getContext('webgl') !== null;
  } catch {
    return false;
  }
}

function playerLook(): Look {
  const c = gameStore.getState().game.character;
  return {
    skin: skinTones[c?.skinTone ?? 1] ?? '#eec1a2',
    hair: hairColors[c?.hairColor ?? 0] ?? '#1d1a18',
    shirt: partyColors[c?.party.color ?? 1] ?? '#1f4e8c',
    pants: '#2f3542',
    longHair: (c?.hairStyle ?? 0) >= 5,
  };
}

function padViews(
  offers: PadOffer[],
  stateId: Parameters<typeof formatCost>[1],
): Record<PadId, PadView> {
  const subFor = (o: PadOffer): string => {
    if (o.cost) return formatCost(o.cost, stateId);
    if (o.kind === 'hire') return de.minigame.padState.full;
    if (o.kind === 'upgrade' && o.block === 'stage') return de.minigame.padState.stage;
    return de.minigame.padState.maxed;
  };
  const view = (o: PadOffer): PadView => {
    const sub = subFor(o);
    return {
      label: {
        title: de.minigame.pads[o.kind],
        sub,
        color: o.cost ? (o.affordable ? '#2f8cff' : '#f29a1a') : '#9aa7b8',
        warn: o.cost !== null && !o.affordable,
      },
    };
  };
  const by = (kind: PadId) => offers.find((o) => o.kind === kind);
  const fallback = (kind: PadId): PadOffer => ({
    kind,
    target: null,
    cost: null,
    affordable: false,
    block: null,
  });
  return {
    hire: view(by('hire') ?? fallback('hire')),
    upgrade: view(by('upgrade') ?? fallback('upgrade')),
    machine: view(by('machine') ?? fallback('machine')),
  };
}

export default function MinigameScreen({ location }: { location: LocationId }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const maxRef = useRef<HTMLDivElement>(null);
  const input = useRef<Input & { origin: { x: number; y: number } | null; pointer: number | null }>(
    {
      x: 0,
      z: 0,
      origin: null,
      pointer: null,
    },
  );
  const [failed, setFailed] = useState(() => !hasWebGL());
  const [hint, setHint] = useState<string>('');
  const [toast, setToast] = useState<{ id: number; text: string; good: boolean } | null>(null);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const theme = themes[location];
  const items = de.minigame.items[location];

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || failed) return;
    let scene: MinigameScene;
    try {
      scene = new MinigameScene(canvas, theme, playerLook(), { cash: de.minigame.cash });
    } catch {
      queueMicrotask(() => {
        setFailed(true);
      });
      return;
    }
    // Ausbaustufe und Helfer kommen aus dem Spielstand und können sich im Spiel ändern
    const readParams = (): SimParams => {
      const run = gameStore.getState().game.run;
      return {
        cfg: cfg.minigames,
        level: run ? minigameLevel(run, location) : 1,
        helpers: run ? minigameHelpers(run, location, cfg) : 0,
      };
    };
    let params = readParams();
    let paramsAge = 0;
    let sim = createSim(layout, params, Date.now() & 0xffffff);
    let raf = 0;
    let last = performance.now();
    let floaterId = 0;
    let lastHint = '';

    const resize = () => {
      scene.resize(wrap.clientWidth, wrap.clientHeight);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);

    const refreshPads = () => {
      const run = gameStore.getState().game.run;
      if (!run) return;
      scene.setPads(padViews(minigameOffers(run, location, cfg), run.stateId));
    };
    refreshPads();
    const padTimer = window.setInterval(refreshPads, 400);
    scene.snapCamera();

    const showToast = (text: string, good: boolean) => {
      setToast({ id: Date.now(), text, good });
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (document.hidden) return;
      paramsAge += dt;
      if (paramsAge > 0.25) {
        paramsAge = 0;
        params = readParams();
      }
      const p = params;
      if (sim.helpers.length !== p.helpers) sim = setHelpers(sim, layout, p.helpers);
      const result = stepSim(sim, layout, p, input.current, dt);
      sim = result.state;
      for (const e of result.events) {
        if (e.kind === 'cash') {
          const store = gameStore.getState();
          const gained = store.minigameSell(location, e.count);
          const stateId = store.game.run?.stateId ?? null;
          const text = formatGain(gained, stateId);
          if (text) {
            const pos = scene.project(layout.cash, 1.2, wrap.clientWidth, wrap.clientHeight);
            const id = ++floaterId;
            setFloaters((list) => [...list.slice(-4), { id, text, x: pos.x, y: pos.y }]);
            window.setTimeout(() => {
              setFloaters((list) => list.filter((f) => f.id !== id));
            }, 1400);
          }
        } else if (e.kind === 'pad') {
          const store = gameStore.getState();
          const run = store.game.run;
          const offer = run
            ? minigameOffers(run, location, cfg).find((o) => o.kind === e.pad)
            : undefined;
          if (!offer?.cost) continue;
          if (store.minigamePad(location, e.pad)) {
            const after = gameStore.getState().game.run;
            const newLevel = after ? minigameLevel(after, location) : 1;
            showToast(fill(de.minigame.bought[e.pad], { level: newLevel }), true);
            refreshPads();
          } else {
            showToast(de.minigame.tooExpensive, false);
          }
        }
      }
      const target = hintTarget(sim, layout);
      const nextHint =
        target === layout.cash
          ? de.minigame.hints.cash
          : target === layout.counter
            ? de.minigame.hints.counter
            : target === layout.source
              ? fill(de.minigame.hints.source, { items })
              : de.minigame.hints.wait;
      if (nextHint !== lastHint) {
        lastHint = nextHint;
        setHint(nextHint);
      }
      scene.update(sim, target, dt);
      // „MAX“ über dem Kopf, wenn die Arme voll sind
      const max = maxRef.current;
      if (max) {
        const full = sim.player.carry >= carryCapacity(p);
        max.style.opacity = full ? '1' : '0';
        if (full) {
          const pos = scene.project(sim.player.pos, 2.5, wrap.clientWidth, wrap.clientHeight);
          max.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%, -100%)`;
        }
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(padTimer);
      observer.disconnect();
      scene.dispose();
    };
  }, [location, theme, items, failed]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => {
      setToast(null);
    }, 1600);
    return () => {
      window.clearTimeout(t);
    };
  }, [toast]);

  // ------------------------------------------------------------ Joystick

  const placeJoystick = (x: number, y: number, kx: number, ky: number, visible: boolean) => {
    const base = baseRef.current;
    const knob = knobRef.current;
    if (!base || !knob) return;
    base.style.opacity = visible ? '1' : '0';
    base.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    knob.style.transform = `translate(${kx}px, ${ky}px) translate(-50%, -50%)`;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (input.current.pointer !== null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    input.current.pointer = e.pointerId;
    input.current.origin = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ohne Capture funktioniert der Joystick trotzdem, solange der Finger im Bild bleibt
    }
    placeJoystick(input.current.origin.x, input.current.origin.y, 0, 0, true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = input.current;
    if (s.pointer !== e.pointerId || !s.origin) return;
    const rect = e.currentTarget.getBoundingClientRect();
    let dx = e.clientX - rect.left - s.origin.x;
    let dy = e.clientY - rect.top - s.origin.y;
    const d = Math.hypot(dx, dy);
    if (d > JOY_RADIUS) {
      dx = (dx / d) * JOY_RADIUS;
      dy = (dy / d) * JOY_RADIUS;
    }
    s.x = dx / JOY_RADIUS;
    s.z = dy / JOY_RADIUS;
    placeJoystick(s.origin.x, s.origin.y, dx, dy, true);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = input.current;
    if (s.pointer !== e.pointerId) return;
    s.pointer = null;
    s.origin = null;
    s.x = 0;
    s.z = 0;
    placeJoystick(0, 0, 0, 0, false);
  };

  const close = () => {
    gameStore.getState().closeMinigame();
  };

  return (
    <div className={styles.screen} data-testid="minigame">
      <div className={styles.top}>
        <div className={styles.titleRow}>
          <h2 className={styles.title}>{de.minigame.titles[location]}</h2>
          <button
            type="button"
            className={styles.close}
            onClick={close}
            data-testid="minigame-close"
          >
            <X size={20} strokeWidth={3} aria-hidden="true" />
            {de.minigame.close}
          </button>
        </div>
        <ResourceBar />
      </div>
      <div
        ref={wrapRef}
        className={styles.stage}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-label={de.minigame.joystick}
        role="application"
      >
        <canvas ref={canvasRef} className={styles.canvas} />
        {failed && <p className={styles.failed}>{de.minigame.noWebgl}</p>}
        {hint && !failed && (
          <p className={styles.hint} key={hint}>
            {hint}
          </p>
        )}
        <div ref={maxRef} className={styles.max} aria-hidden="true">
          MAX
        </div>
        {floaters.map((f) => (
          <span key={f.id} className={`${styles.floater} game-num`} style={{ left: f.x, top: f.y }}>
            {f.text}
          </span>
        ))}
        {toast && (
          <p key={toast.id} className={styles.toast} data-good={toast.good} role="status">
            {toast.text}
          </p>
        )}
        <div ref={baseRef} className={styles.joyBase} aria-hidden="true">
          <div ref={knobRef} className={styles.joyKnob} />
        </div>
      </div>
    </div>
  );
}
