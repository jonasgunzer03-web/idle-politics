import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { Crosshair } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { Figure } from '../../art/figure/Figure';
import { outfitFor } from '../../art/figure/outfit';
import { InteriorScene } from '../../art/interior/InteriorScene';
import { architecture } from '../../art/world/palette';
import { Npc } from '../../art/world/People';
import { dayLight, dayPhase } from '../../art/world/dayCycle';
import { Precipitation, Sky, type Weather } from '../../art/world/Sky';
import { Bus, Truck } from '../../art/world/Traffic';
import { BUILDING_HALF_WIDTH, WORLD_HEIGHT, WORLD_WIDTH } from '../../art/world/geometry';
import { Skyline, StreetArt } from '../../art/world/Street';
import { defaultConfig } from '../../config';
import { hairColors, partyColors, skinTones } from '../../config/appearance';
import { careerVenue } from '../../config/careers';
import { LOCATION_IDS, type LocationId, type PolicyId } from '../../engine/ids';
import { hash32 } from '../../engine/people';
import {
  buildingLevel,
  chainSnapshot,
  goodRoutes,
  machineLevel,
  routeState,
  staffInBuilding,
  totalStaff,
} from '../../engine/production';
import { worldLimitX } from '../../engine/rules';
import { findLocation } from '../../engine/unlocks';
import { currentLocation } from '../../engine/world';
import { de, fill } from '../../i18n/de';
import { gameStore, useGame } from '../../store';
import { locationName } from '../gameText';
import { moodOf } from '../industry/crew';
import styles from './WorldView.module.css';

const cfg = defaultConfig;
/** Bodenlinie der Straße in Welt-Einheiten (siehe art/world/paint.tsx). */
const GROUND_Y = 250;
/** Ab so vielen Pixeln Bewegung gilt eine Berührung als Wischen statt Tippen. */
const DRAG_THRESHOLD = 8;
const ROUTES = goodRoutes(cfg);
/** Sprechblasen und Wetter werden alle … ms neu bestimmt. */
const BUBBLE_MS = 6500;
/** Tag und Nacht werden alle … ms nachgeführt (weiche Übergänge per CSS). */
const DAY_TICK_MS = 2000;

function lockedLabel(stage: number): string {
  return fill(de.ui.locked, { stage });
}

/** Wetter aus der Uhrzeit: wechselt alle paar Minuten, in jedem Staat anders. */
function weatherAt(now: number, stateIndex: number, snowy: boolean): Weather {
  const w = cfg.world.weather;
  const bucket = Math.floor(now / (w.changeMinutes * 60_000));
  const roll = (hash32(bucket, stateIndex, 5) % 1000) / 1000;
  if (roll < w.rain) return snowy ? 'snow' : 'rain';
  if (roll < w.rain + w.cloudy) return 'cloudy';
  return 'clear';
}

/** Sichtbare Welt: die Straße (draußen) oder der Innenraum eines Gebäudes (drinnen). */
export function WorldView() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 375, h: 280 });
  const view = useGame(
    useShallow((s) => {
      const run = s.game.run;
      if (!run) return null;
      const here = currentLocation(run, cfg);
      return {
        posX: run.world.posX,
        target: run.world.target,
        inside: run.world.inside && here !== null,
        here,
        stage: run.stage,
        stateId: run.stateId,
        path: run.path,
        profession: run.profession,
        unrest: run.unrest,
        approval: Math.round(run.approval),
        limit: worldLimitX(run, cfg),
        staffHere: here ? staffInBuilding(run, here, cfg) : 0,
        levelHere: here ? buildingLevel(run, here) : 1,
        levels: LOCATION_IDS.map((id) => buildingLevel(run, id)).join(','),
        population: totalStaff(run),
        seed: run.seed,
        mood: moodOf(run.morale, run.striking),
        striking: run.striking,
        rivalSeed: run.rival.seed,
        rivalStrength:
          run.stage >= cfg.party.rival.fromStage && run.rival.status === 'active'
            ? Math.round(run.rival.strength / 10)
            : 0,
        laws: Object.keys(run.laws).join(','),
      };
    }),
  );
  // Warenwege, auf denen gerade etwas fährt (für die Lieferwagen)
  const routes = useGame((s) => {
    const run = s.game.run;
    if (!run || run.world.inside) return '';
    const flows = chainSnapshot(s.game, cfg).flows;
    return ROUTES.map((r, i) => (routeState(run, r, flows, cfg) === 'flow' ? i : -1))
      .filter((i) => i >= 0)
      .join(',');
  });
  const machines = useGame((s) => {
    const run = s.game.run;
    const here = run ? currentLocation(run, cfg) : null;
    if (!run || !here) return '';
    const b = cfg.industry.buildings.find((x) => x.location === here);
    return b ? b.machines.map((m) => machineLevel(run, m, cfg)).join(',') : '';
  });
  const advisors = useGame(
    (s) => s.game.run?.advisors.map((a) => `${a.seed}:${a.faction}`).join(',') ?? '',
  );
  const character = useGame((s) => s.game.character);
  // Wisch-Versatz der Kamera. Er gilt nur, solange die Figur dort steht, wo gewischt wurde;
  // sobald sie sich bewegt, folgt die Kamera wieder der Figur.
  const [panState, setPanState] = useState({ value: 0, atX: 0 });
  const drag = useRef<{ startX: number; startPan: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  // Tagesrhythmus: ein Taktgeber setzt die Helligkeit aller Ebenen als CSS-Variablen
  const inside = view?.inside ?? false;
  useLayoutEffect(() => {
    const apply = () => {
      const el = ref.current;
      if (!el) return;
      const light = dayLight(dayPhase(Date.now(), cfg.world.dayCycleSeconds));
      el.style.setProperty('--day', light.day.toFixed(3));
      el.style.setProperty('--dusk', light.dusk.toFixed(3));
      el.style.setProperty('--night', light.night.toFixed(3));
      el.style.setProperty('--sun-angle', light.sun.toFixed(1));
      el.style.setProperty('--moon-angle', light.moon.toFixed(1));
    };
    apply();
    const timer = window.setInterval(apply, DAY_TICK_MS);
    return () => {
      window.clearInterval(timer);
    };
  }, [inside]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(Date.now());
    }, BUBBLE_MS);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  const labels = useMemo(() => {
    const office = view?.profession === 'office';
    return Object.fromEntries(LOCATION_IDS.map((id) => [id, locationName(id, office)])) as Record<
      LocationId,
      string
    >;
  }, [view?.profession]);

  if (!view || !character) return <div ref={ref} className={styles.view} />;

  const scale = size.h / WORLD_HEIGHT;
  const worldPx = WORLD_WIDTH * scale;
  // Man darf ein Stück in das nächste (gesperrte) Viertel hineinschauen
  const maxCam = Math.max(0, Math.min(worldPx, (view.limit + 260) * scale) - size.w);
  const follow = view.posX * scale - size.w / 2;
  const pan = Math.abs(panState.atX - view.posX) < 0.5 ? panState.value : 0;
  const setPan = (value: number) => {
    setPanState({ value, atX: view.posX });
  };
  const cam = Math.min(maxCam, Math.max(0, follow + pan));
  const targetX = view.target ? (findLocation(view.target, cfg)?.x ?? view.posX) : view.posX;
  const facing = targetX < view.posX ? 'left' : 'right';
  // Figur im Maßstab der Gebäude (Tür ≈ 34 Einheiten hoch)
  const figureH = size.h * 0.24;
  const figureW = (figureH * 120) / 230;
  const groundBottom = ((WORLD_HEIGHT - GROUND_Y) / WORLD_HEIGHT) * size.h;
  const outfit = outfitFor({ profession: view.profession, stage: view.stage, path: view.path });
  const palette = architecture[cfg.states[view.stateId].architecture];
  const partyColor = partyColors[character.party.color] ?? '#b3261e';
  const autocratic = view.path === 'autocratic';

  if (view.inside && view.here) {
    return (
      <div
        ref={ref}
        className={`${styles.view} ${styles.insideView}`}
        data-testid="world-view"
        data-mode="inside"
      >
        <InteriorScene
          location={view.here}
          level={view.levelHere}
          machines={machines}
          staff={view.staffHere}
          runSeed={view.seed}
          mood={view.mood}
          striking={view.striking}
          p={palette}
          partyColor={partyColor}
          office={view.profession === 'office'}
          character={character}
          outfit={outfit}
          advisors={advisors}
        />
        <p className={styles.placeTag}>
          {labels[view.here]} · {de.ui.inside}
        </p>
      </div>
    );
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    drag.current = { startX: e.clientX, startPan: pan, moved: false };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    if (!d.moved && Math.abs(dx) < DRAG_THRESHOLD) return;
    if (!d.moved) {
      d.moved = true;
      setDragging(true);
    }
    // Pan so begrenzen, dass die Kamera im erlaubten Bereich bleibt
    const next = d.startPan - dx;
    setPan(Math.min(maxCam - follow, Math.max(-follow, next)));
  };
  const onPointerUp = () => {
    setDragging(false);
    // Kurz verzögert zurücksetzen, damit der Klick nach dem Wischen ignoriert wird
    window.setTimeout(() => {
      drag.current = null;
    }, 0);
  };
  const go = (id: LocationId) => {
    if (drag.current?.moved) return;
    gameStore.getState().walkTo(id);
  };

  const stateIndex = Object.keys(cfg.states).indexOf(view.stateId);
  const weather = weatherAt(clock, stateIndex, cfg.world.weather.snowStates.includes(view.stateId));
  const mood: 'happy' | 'neutral' | 'angry' =
    view.unrest >= 60 || view.approval < 35 ? 'angry' : view.approval >= 58 ? 'happy' : 'neutral';
  const protesters = view.unrest >= 50 ? Math.min(8, 2 + Math.floor((view.unrest - 50) / 7)) : 0;
  const venue = findLocation(careerVenue(view.stage), cfg);

  // Lebendige Stadt: mehr Leute auf der Straße, je größer die Belegschaft und je höher die Stufe
  const walkers = Math.min(14, 4 + view.stage + Math.floor(view.population / 12));
  const tick = Math.floor(clock / BUBBLE_MS);
  const bubbleIndex = tick % walkers;
  const lawList = view.laws ? (view.laws.split(',') as PolicyId[]) : [];
  const bubbleText = (() => {
    const pick = hash32(tick, 3);
    // Manchmal eine Meinung zu einem geltenden Gesetz
    const law = lawList[pick % Math.max(1, lawList.length)];
    if (law && pick % 3 === 0) {
      return mood === 'angry' ? de.party.policies[law].contra : de.party.policies[law].pro;
    }
    const pool = de.party.citizens[mood];
    return pool[pick % pool.length] ?? '';
  })();
  const activeRoutes = routes ? routes.split(',').map(Number) : [];
  const rivalOnStage = view.rivalStrength >= 5;
  const rivalSkin = skinTones[hash32(view.rivalSeed, 1) % skinTones.length] ?? '#e0a883';
  const rivalHair = hairColors[hash32(view.rivalSeed, 2) % hairColors.length] ?? '#3b2a20';
  const rivalQuotes =
    de.party.rival.quotes[
      view.rivalStrength >= 6 ? 'strong' : view.rivalStrength >= 3 ? 'mid' : 'weak'
    ];

  return (
    <div
      ref={ref}
      className={styles.view}
      data-testid="world-view"
      data-mode="street"
      data-weather={weather}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      aria-label={fill(de.ui.sceneLabel, {
        name: character.name,
        place: view.here ? labels[view.here] : '',
      })}
      role="group"
    >
      <Sky grey={autocratic} weather={weather} />
      <div
        className={styles.skylineLayer}
        style={{ transform: `translate3d(${-cam * 0.25}px,0,0)` }}
      >
        <Skyline stateId={view.stateId} layer="far" />
      </div>
      <div
        className={styles.skylineLayer}
        style={{ transform: `translate3d(${-cam * 0.5}px,0,0)` }}
      >
        <Skyline stateId={view.stateId} layer="mid" />
      </div>
      <div
        className={`${styles.worldLayer} ${dragging ? styles.noTransition : ''}`}
        style={{ width: worldPx, transform: `translate3d(${-cam}px,0,0)` }}
      >
        <StreetArt
          stateId={view.stateId}
          stage={view.stage}
          autocratic={autocratic}
          office={view.profession === 'office'}
          partyColor={partyColor}
          character={character}
          labels={labels}
          lockedLabel={lockedLabel}
          levels={view.levels}
          rivalPoster={rivalOnStage ? `${rivalSkin}|${rivalHair}` : ''}
        />
        {cfg.world.locations.map((l) => (
          <button
            key={l.id}
            type="button"
            className={styles.hit}
            style={{
              left: (l.x - BUILDING_HALF_WIDTH[l.id]) * scale,
              width: BUILDING_HALF_WIDTH[l.id] * 2 * scale,
            }}
            onClick={() => {
              go(l.id);
            }}
            aria-label={fill(de.ui.goTo, {}) + ': ' + labels[l.id]}
            data-testid={`goto-${l.id}`}
          />
        ))}
        {Array.from({ length: walkers }, (_, i) => {
          const x = 120 + ((i * 263) % Math.max(200, view.limit - 160));
          return (
            <div
              key={`w-${i}`}
              className={`${styles.passerby} walkingNpc`}
              style={{
                left: x * scale,
                height: figureH * (0.84 + (i % 3) * 0.05),
                bottom: groundBottom - 2 - (i % 2) * 3,
                animationDuration: `${16 + (i % 5) * 5}s`,
                animationDelay: `${-i * 3.3}s`,
                ['--walk' as string]: `${(160 + (i % 4) * 50) * scale}px`,
              }}
            >
              <Npc seed={i + view.seed} />
              {i === bubbleIndex && bubbleText && (
                <span className={styles.bubble} data-mood={mood} key={clock}>
                  {bubbleText}
                </span>
              )}
            </div>
          );
        })}
        {activeRoutes.slice(0, 5).map((index, k) => {
          const r = ROUTES[index];
          if (!r) return null;
          const from = findLocation(r.from, cfg)?.x ?? 0;
          const to = findLocation(r.to, cfg)?.x ?? 0;
          const dist = (to - from) * scale;
          return (
            <div
              key={`t-${index}`}
              className={styles.truck}
              style={{
                left: from * scale - 30 * scale,
                top: (GROUND_Y + 16 + (k % 2) * 9) * scale,
                width: 60 * scale,
                height: 30 * scale,
                animationDuration: `${Math.max(6, Math.abs(to - from) / 55)}s`,
                animationDelay: `${-k * 2.7}s`,
                ['--dist' as string]: `${dist}px`,
                ['--dir' as string]: dist >= 0 ? '1' : '-1',
              }}
            >
              <Truck good={r.good} />
            </div>
          );
        })}
        {view.stage >= 3 && (
          <div
            className={styles.bus}
            style={{
              top: (GROUND_Y + 20) * scale,
              width: 90 * scale,
              height: 34 * scale,
              ['--dist' as string]: `${Math.max(400, view.limit) * scale}px`,
            }}
          >
            <Bus color={cfg.states[view.stateId].palette.primary} />
          </div>
        )}
        {rivalOnStage && (
          <div
            className={styles.rival}
            style={{ left: 560 * scale, height: figureH * 1.05, bottom: groundBottom - 2 }}
          >
            <span className={styles.soapbox} />
            <Npc seed={view.rivalSeed} kind="rival" />
            {bubbleIndex % 3 === 1 && (
              <span className={styles.bubble} data-mood="angry" key={`r-${clock}`}>
                {rivalQuotes[tick % rivalQuotes.length] ?? ''}
              </span>
            )}
          </div>
        )}
        {Array.from({ length: protesters }, (_, i) => (
          <div
            key={`p-${i}`}
            className={styles.protester}
            style={{
              left: (view.posX + 70 + i * 26) * scale,
              height: figureH * 0.95,
              bottom: groundBottom - 4,
            }}
          >
            <Npc seed={i + 7} kind="protester" sign={de.protestSigns[i % de.protestSigns.length]} />
          </div>
        ))}
        {autocratic &&
          venue &&
          venue.x <= view.limit &&
          [-70, 70].map((dx) => (
            <div
              key={dx}
              className={styles.soldier}
              style={{
                left: (venue.x + dx) * scale,
                height: figureH,
                bottom: groundBottom - 4,
              }}
            >
              <Npc seed={dx > 0 ? 1 : 2} kind="soldier" />
            </div>
          ))}
        <div
          className={`${styles.figure} ${dragging ? styles.noTransition : ''}`}
          style={{
            width: figureW,
            height: figureH,
            bottom: groundBottom - figureH * 0.04,
            transform: `translate3d(${view.posX * scale - figureW / 2}px,0,0)`,
          }}
          data-testid="player-figure"
        >
          <Figure
            character={character}
            outfit={outfit}
            walking={view.target !== null}
            facing={facing}
          />
        </div>
      </div>
      <Precipitation weather={weather} />
      {pan !== 0 && (
        <button
          type="button"
          className={styles.recenter}
          onClick={() => {
            setPan(0);
          }}
          aria-label={de.ui.here}
        >
          <Crosshair size={20} aria-hidden="true" />
        </button>
      )}
      {view.here && !view.target && (
        <p className={styles.placeTag}>
          {labels[view.here]} · {de.ui.outside}
        </p>
      )}
    </div>
  );
}
