import { useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { Crosshair } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { Figure } from '../../art/figure/Figure';
import { outfitFor } from '../../art/figure/outfit';
import { InteriorArt } from '../../art/world/Interior';
import { architecture, districtGrandeur } from '../../art/world/palette';
import { Npc } from '../../art/world/People';
import { Sky } from '../../art/world/Sky';
import { BUILDING_HALF_WIDTH, WORLD_HEIGHT, WORLD_WIDTH } from '../../art/world/geometry';
import { Skyline, StreetArt } from '../../art/world/Street';
import { defaultConfig } from '../../config';
import { partyColors } from '../../config/appearance';
import { careerVenue } from '../../config/careers';
import { actionProgress } from '../../engine/economy';
import { LOCATION_IDS, type LocationId } from '../../engine/ids';
import { worldLimitX } from '../../engine/rules';
import { findLocation } from '../../engine/unlocks';
import { currentLocation } from '../../engine/world';
import { de, fill } from '../../i18n/de';
import { gameStore, useGame } from '../../store';
import { locationName } from '../gameText';
import styles from './WorldView.module.css';

const cfg = defaultConfig;
/** Bodenlinie der Straße in Welt-Einheiten (siehe art/world/buildings.tsx). */
const GROUND_Y = 250;
/** Ab so vielen Pixeln Bewegung gilt eine Berührung als Wischen statt Tippen. */
const DRAG_THRESHOLD = 8;

function lockedLabel(stage: number): string {
  return fill(de.ui.locked, { stage });
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
        limit: worldLimitX(run, cfg),
        staffHere: here
          ? cfg.world.actions
              .filter((a) => a.location === here)
              .reduce((sum, a) => sum + actionProgress(run, a.id).staff, 0)
          : 0,
      };
    }),
  );
  const character = useGame((s) => s.game.character);
  // Wisch-Versatz der Kamera. Er gilt nur, solange die Figur dort steht, wo gewischt wurde;
  // sobald sie sich bewegt, folgt die Kamera wieder der Figur.
  const [panState, setPanState] = useState({ value: 0, atX: 0 });
  const drag = useRef<{ startX: number; startPan: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);

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

  const protesters = view.unrest >= 50 ? Math.min(8, 2 + Math.floor((view.unrest - 50) / 7)) : 0;
  const venue = findLocation(careerVenue(view.stage), cfg);

  if (view.inside && view.here) {
    const staff = Math.min(6, view.staffHere);
    return (
      <div ref={ref} className={styles.view} data-testid="world-view" data-mode="inside">
        <InteriorArt
          location={view.here}
          p={palette}
          partyColor={partyColor}
          office={view.profession === 'office'}
          grandeur={districtGrandeur[findLocation(view.here, cfg)?.district ?? 'quarter']}
        />
        <div className={styles.staff} style={{ height: size.h * 0.34, bottom: groundBottom * 0.6 }}>
          {Array.from({ length: staff }, (_, i) => (
            <Npc key={i} seed={i + 3} kind="worker" className="workingNpc" />
          ))}
        </div>
        <div
          className={styles.insideFigure}
          style={{ height: size.h * 0.5, bottom: groundBottom * 0.4 }}
        >
          <Figure character={character} outfit={outfit} facing="left" />
        </div>
        <p className={styles.placeTag}>
          {labels[view.here]} · {de.ui.inside}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={styles.view}
      data-testid="world-view"
      data-mode="street"
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
      <Sky grey={autocratic} />
      <div
        className={styles.skylineLayer}
        style={{ transform: `translate3d(${-cam * 0.45}px,0,0)` }}
      >
        <Skyline stateId={view.stateId} />
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
        {[180, 560, 1350, 2250, 3000].map((x, i) =>
          x < view.limit ? (
            <div
              key={x}
              className={`${styles.passerby} walkingNpc`}
              style={{
                left: x * scale,
                height: figureH * 0.9,
                bottom: groundBottom - 2,
                animationDuration: `${18 + i * 5}s`,
                animationDelay: `${-i * 4}s`,
                ['--walk' as string]: `${220 * scale}px`,
              }}
            >
              <Npc seed={i} />
            </div>
          ) : null,
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
