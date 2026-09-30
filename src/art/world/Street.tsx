import { memo, type ReactNode } from 'react';
import { defaultConfig } from '../../config';
import { skinTones, hairColors } from '../../config/appearance';
import type { LocationDef } from '../../config/world';
import { LOCATION_IDS, type LocationId, type StateId } from '../../engine/ids';
import type { Character } from '../../engine/schema';
import { FlagGraphic } from '../flag/Flag';
import { paintFiller, paintLocation } from './buildings';
import {
  Barrier,
  Bench,
  Bin,
  Camera,
  Carpet,
  FlagPole,
  FlowerPot,
  Fountain,
  Hedge,
  Lamp,
  Statue,
  Tree,
} from './decor';
import { GROUND, Painter } from './paint';
import { PaintDefs } from './PaintDefs';
import { architecture, districtGrandeur, sidewalkColors } from './palette';
import { BUILDING_HALF_WIDTH, WORLD_HEIGHT, WORLD_WIDTH } from './geometry';
import styles from './Street.module.css';

const cfg = defaultConfig;

export interface StreetArtProps {
  stateId: StateId;
  stage: number;
  autocratic: boolean;
  office: boolean;
  partyColor: string;
  character: Pick<Character, 'skinTone' | 'hairColor'>;
  labels: Record<LocationId, string>;
  /** Texte „Ab Stufe X“ für gesperrte Viertel. */
  lockedLabel: (stage: number) => string;
  /** Ausbaustufen aller Orte als Text („1,2,1,…“ in der Reihenfolge von LOCATION_IDS). */
  levels: string;
  /** Plakate des Rivalen als „Hautfarbe|Haarfarbe“, leer = keine. */
  rivalPoster: string;
}

function Poster({
  x,
  y,
  skin,
  hair,
  frame,
}: {
  x: number;
  y: number;
  skin: string;
  hair: string;
  frame: string;
}) {
  return (
    <g>
      <rect x={x - 14} y={y} width={28} height={38} fill={frame} />
      <rect x={x - 11} y={y + 3} width={22} height={24} fill="#f4efe2" />
      <circle cx={x} cy={y + 15} r={7} fill={skin} />
      <path d={`M${x - 7} ${y + 13} Q${x} ${y + 4} ${x + 7} ${y + 13}`} fill={hair} />
      <rect x={x - 11} y={y + 30} width={22} height={4} fill="#c9a227" />
    </g>
  );
}

/** Geparktes Auto; auf der Prachtmeile Limousinen. */
function ParkedCar({ x, color, grand }: { x: number; color: string; grand: boolean }) {
  const y = GROUND + 12;
  const len = grand ? 46 : 36;
  return (
    <g>
      <ellipse cx={x} cy={y + 12} rx={len / 2 + 2} ry={2.5} fill="rgb(0 0 0 / 30%)" />
      <path
        d={`M${x - len / 2} ${y + 9} V${y + 3} Q${x - len / 2 + 2} ${y} ${x - len / 4} ${y - 1} L${x - len / 6} ${y - 7} H${x + len / 6} L${x + len / 4} ${y - 1} Q${x + len / 2} ${y} ${x + len / 2} ${y + 4} V${y + 9} Z`}
        fill={color}
      />
      <path
        d={`M${x - len / 6 + 2} ${y - 5} H${x - 1} V${y - 1} H${x - len / 4 + 3} Z`}
        fill="url(#glass)"
      />
      <path
        d={`M${x + 1} ${y - 5} H${x + len / 6 - 2} L${x + len / 4 - 3} ${y - 1} H${x + 1} Z`}
        fill="url(#glass)"
      />
      <circle cx={x - len / 3} cy={y + 9} r={3.6} fill="#1c1f24" />
      <circle cx={x + len / 3} cy={y + 9} r={3.6} fill="#1c1f24" />
      <circle cx={x - len / 3} cy={y + 9} r={1.4} fill="#9aa0a6" />
      <circle cx={x + len / 3} cy={y + 9} r={1.4} fill="#9aa0a6" />
    </g>
  );
}

const CAR_COLORS = ['#b3261e', '#1f5fa8', '#e8e2d6', '#2e7d4f', '#c9a227', '#2b2f36'];

/** Die ganze Straße als ein SVG. Wird nur neu gezeichnet, wenn sich Stufe, Staat, Pfad oder Ausbau ändern. */
export const StreetArt = memo(function StreetArt({
  stateId,
  stage,
  autocratic,
  office,
  partyColor,
  character,
  labels,
  lockedLabel,
  levels,
  rivalPoster,
}: StreetArtProps) {
  const state = cfg.states[stateId];
  const p = architecture[state.architecture];
  const levelList = levels.split(',').map(Number);
  const levelOf = (id: LocationId) => levelList[LOCATION_IDS.indexOf(id)] ?? 1;
  const paint = new Painter('street', stage * 31 + levelList.reduce((a, b) => a + b, 0));
  const decor: ReactNode[] = [];
  const lamps: ReactNode[] = [];
  const sidewalks: ReactNode[] = [];
  const overlays: ReactNode[] = [];
  const cars: ReactNode[] = [];
  // Als Gruppe statt eigenem <svg>: WebKit ignoriert sonst die Verschiebung am Fahnenmast
  const flag = (
    <g transform="scale(0.37)">
      <FlagGraphic flag={state.flag} />
    </g>
  );
  const skin = skinTones[character.skinTone] ?? '#e0a883';
  const hair = hairColors[character.hairColor] ?? '#3b2a20';
  const [rivalSkin, rivalHair] = rivalPoster ? rivalPoster.split('|') : [];
  // Das Arbeiterviertel wird ab Stufe 6 renoviert: Blumen statt Mülltonnen
  const renovated = stage >= 6;

  for (const district of cfg.world.districts) {
    const grandeur = districtGrandeur[district.id];
    const start = district.startX;
    const end = district.startX + district.width;
    sidewalks.push(
      <rect
        key={`sw-${district.id}`}
        x={start}
        y={GROUND}
        width={district.width}
        height={14}
        fill={sidewalkColors[district.id]}
      />,
      <rect
        key={`pt-${district.id}`}
        x={start}
        y={GROUND}
        width={district.width}
        height={14}
        fill={grandeur >= 1 ? 'url(#cobble)' : 'url(#tiles)'}
        opacity={0.6}
      />,
    );

    // Füllhäuser in den Lücken zwischen den Orten
    const locs: LocationDef[] = cfg.world.locations
      .filter((l) => l.district === district.id)
      .sort((a, b) => a.x - b.x);
    let cursor = start + 10;
    let seed = district.startX / 100;
    const edges = [
      ...locs.map((l) => ({
        left: l.x - BUILDING_HALF_WIDTH[l.id] - 8,
        right: l.x + BUILDING_HALF_WIDTH[l.id] + 8,
      })),
      { left: end - 10, right: end },
    ];
    for (const edge of edges) {
      let gap = edge.left - cursor;
      while (gap > 60) {
        const width = Math.min(gap, 70 + ((seed * 29) % 40));
        const x = cursor + width / 2;
        const rivalHere =
          rivalSkin !== undefined && rivalHair !== undefined && Math.round(seed * 10) % 3 === 1;
        paintFiller(paint, {
          x,
          width: width - 6,
          p,
          seed,
          grandeur,
          stage,
          poster:
            autocratic && seed % 2 < 1 ? (
              <Poster x={x} y={GROUND - 70} skin={skin} hair={hair} frame="#8b1e1e" />
            ) : rivalHere ? (
              <Poster x={x} y={GROUND - 70} skin={rivalSkin} hair={rivalHair} frame="#5b2a86" />
            ) : null,
        });
        cursor += width;
        gap = edge.left - cursor;
        seed += 1.7;
      }
      cursor = edge.right;
    }

    for (const l of locs) {
      paintLocation(paint, l.id, {
        x: l.x,
        p,
        grandeur,
        label: labels[l.id],
        partyColor,
        autocratic,
        office,
        level: stage >= l.unlockStage ? levelOf(l.id) : 1,
      });
    }

    // Ausstattung: je prächtiger das Viertel, desto dichter und edler
    const spacing = [190, 150, 130, 110][grandeur] ?? 150;
    for (let x = start + 60; x < end - 30; x += spacing) {
      const i = Math.round((x - start) / spacing);
      decor.push(<Lamp key={`l-${x}`} x={x} grandeur={grandeur} />);
      const heads = grandeur >= 1 ? [x - 8, x + 8] : [x + 10];
      for (const hx of heads) {
        lamps.push(
          <g key={`h-${hx}`}>
            <circle cx={hx} cy={GROUND - 67} r={24} fill="url(#lampHalo)" />
            <path
              d={`M${hx - 4} ${GROUND - 64} L${hx - 26} ${GROUND + 12} H${hx + 26} L${hx + 4} ${GROUND - 64} Z`}
              fill="url(#lightCone)"
              opacity={0.6}
            />
          </g>,
        );
      }
      if (grandeur === 0) {
        if (renovated) decor.push(<FlowerPot key={`fp-${x}`} x={x + 30} />);
        else if (i % 2 === 0) decor.push(<Bin key={`b-${x}`} x={x + 24} />);
        if (i % 3 === 1) decor.push(<Bench key={`be-${x}`} x={x + 60} />);
      } else if (grandeur === 1) {
        decor.push(<Tree key={`t-${x}`} x={x + 55} grandeur={grandeur} />);
        if (i % 2 === 0) decor.push(<FlowerPot key={`fp-${x}`} x={x + 25} />);
      } else if (grandeur === 2) {
        decor.push(<Hedge key={`h-${x}`} x={x + 45} />);
        if (i % 2 === 0) decor.push(<FlagPole key={`fl-${x}`} x={x + 80} flag={flag} />);
        if (i === 3) decor.push(<Statue key={`s-${x}`} x={x + 80} />);
      } else {
        decor.push(<FlagPole key={`fl-${x}`} x={x + 40} flag={flag} />);
        decor.push(<Tree key={`t-${x}`} x={x + 75} grandeur={grandeur} />);
        if (i === 2) decor.push(<Fountain key={`fo-${x}`} x={x + 30} />);
      }
      if (autocratic && i % 2 === 1)
        decor.push(<Camera key={`c-${x}`} x={x + 2} y={GROUND - 64} />);
      // Geparkte Autos am Straßenrand (nur in offenen Vierteln)
      if (stage >= district.unlockStage && i % 2 === 0) {
        cars.push(
          <ParkedCar
            key={`car-${x}`}
            x={x + spacing / 2}
            color={CAR_COLORS[(i + grandeur) % CAR_COLORS.length] ?? '#1f5fa8'}
            grand={grandeur >= 3}
          />,
        );
      }
    }
    if (grandeur === 3) {
      const palaceLoc = locs.find((l) => l.id === 'palace');
      if (palaceLoc) decor.push(<Carpet key="carpet" x={palaceLoc.x} width={70} />);
    }

    // Gesperrtes Viertel: Nebel und Absperrung
    if (stage < district.unlockStage) {
      overlays.push(
        <g key={`lock-${district.id}`}>
          <rect
            x={start}
            y={0}
            width={district.width}
            height={WORLD_HEIGHT}
            className={styles.fog}
          />
          <Barrier x={start + 50} label={lockedLabel(district.unlockStage)} />
        </g>,
      );
    }
  }

  return (
    <svg
      className={styles.street}
      viewBox={`0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`}
      preserveAspectRatio="xMinYMax meet"
      aria-hidden="true"
    >
      <defs>
        <PaintDefs />
      </defs>
      <g>
        {paint.body}
        {decor}
        {/* Straße: Bordstein, Fahrbahn, Markierungen */}
        <rect
          x={0}
          y={GROUND + 14}
          width={WORLD_WIDTH}
          height={WORLD_HEIGHT - GROUND - 14}
          fill="url(#asphalt)"
        />
        {sidewalks}
        <rect x={0} y={GROUND + 12} width={WORLD_WIDTH} height={3} className={styles.curb} />
        <rect x={0} y={GROUND + 15} width={WORLD_WIDTH} height={2} fill="rgb(0 0 0 / 25%)" />
        {Array.from({ length: Math.floor(WORLD_WIDTH / 80) }, (_, i) => (
          <rect
            key={i}
            x={i * 80 + 20}
            y={GROUND + 32}
            width={40}
            height={3}
            className={styles.lane}
          />
        ))}
        {cars}
      </g>
      <g>{paint.fx}</g>
      {/* Nacht: Färbung über allem, darüber die Lichter */}
      <g className="night">
        <rect x={0} y={0} width={WORLD_WIDTH} height={WORLD_HEIGHT} fill="#0b1633" opacity={0.58} />
      </g>
      <g className="dusk">
        <rect x={0} y={0} width={WORLD_WIDTH} height={WORLD_HEIGHT} fill="#ff8a3d" opacity={0.14} />
      </g>
      <g className="night">
        {paint.lights}
        {lamps}
      </g>
      {overlays}
    </svg>
  );
});

/** Ferne Silhouetten in zwei Ebenen (Parallaxe). Stil passend zum Staat. */
export const Skyline = memo(function Skyline({
  stateId,
  layer,
}: {
  stateId: StateId;
  layer: 'far' | 'mid';
}) {
  const style = cfg.states[stateId].architecture;
  const shapes: ReactNode[] = [];
  const lit: ReactNode[] = [];
  const width = WORLD_WIDTH * (layer === 'far' ? 0.35 : 0.6) + 500;
  const step = layer === 'far' ? 70 : 90;
  const base = layer === 'far' ? 200 : 232;
  for (let x = 0; x < width; x += step) {
    const n = Math.round(x / step);
    const h = (layer === 'far' ? 50 : 60) + ((x * 7) % (layer === 'far' ? 60 : 80));
    const top = base - h;
    const w = step - 14;
    if (style === 'gabled' && n % 3 === 0) {
      shapes.push(
        <path
          key={x}
          d={`M${x} ${base} V${top} L${x + w / 2} ${top - 26} L${x + w} ${top} V${base} Z`}
        />,
      );
    } else if (style === 'soviet' && n % 4 === 1) {
      shapes.push(
        <g key={x}>
          <rect x={x} y={top} width={w} height={h} />
          <path d={`M${x + w / 3} ${top} Q${x + w / 2} ${top - 30} ${x + (2 * w) / 3} ${top} Z`} />
        </g>,
      );
    } else if (style === 'imperial' && n % 3 === 1) {
      shapes.push(
        <g key={x}>
          <rect x={x + 10} y={top} width={w - 20} height={h} />
          <path
            d={`M${x} ${top} Q${x + w / 2} ${top - 12} ${x + w} ${top} Z M${x + 4} ${top + 24} Q${x + w / 2} ${top + 12} ${x + w - 4} ${top + 24} Z`}
          />
        </g>,
      );
    } else if (style === 'federal' && n % 5 === 2) {
      shapes.push(<rect key={x} x={x + 15} y={top - 60} width={w - 30} height={h + 60} />);
    } else {
      shapes.push(<rect key={x} x={x} y={top} width={w} height={h} />);
    }
    // Ein paar Lichter in der Ferne
    if (layer === 'mid') {
      for (let k = 0; k < 3; k++) {
        const lx = x + 6 + ((n * 13 + k * 17) % Math.max(8, w - 12));
        const ly = top + 10 + ((n * 7 + k * 11) % Math.max(10, h - 20));
        lit.push(<rect key={`${x}-${k}`} x={lx} y={ly} width={3} height={4} fill="#ffd97a" />);
      }
    }
  }
  return (
    <svg
      className={styles.skyline}
      viewBox={`0 0 ${width} 300`}
      preserveAspectRatio="xMinYMax meet"
      aria-hidden="true"
    >
      <g className={layer === 'far' ? styles.far : styles.mid}>{shapes}</g>
      {lit.length > 0 && <g className="night">{lit}</g>}
    </svg>
  );
});
