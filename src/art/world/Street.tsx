import { memo, type ReactNode } from 'react';
import { defaultConfig } from '../../config';
import { skinTones, hairColors } from '../../config/appearance';
import type { LocationDef } from '../../config/world';
import type { LocationId, StateId } from '../../engine/ids';
import type { Character } from '../../engine/schema';
import { FlagGraphic } from '../flag/Flag';
import { FillerHouse, GROUND, LocationBuilding } from './buildings';
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
}

function Poster({
  x,
  y,
  character,
}: {
  x: number;
  y: number;
  character: StreetArtProps['character'];
}) {
  const skin = skinTones[character.skinTone] ?? '#e0a883';
  const hair = hairColors[character.hairColor] ?? '#3b2a20';
  return (
    <g>
      <rect x={x - 14} y={y} width={28} height={38} fill="#8b1e1e" />
      <rect x={x - 11} y={y + 3} width={22} height={24} fill="#f4efe2" />
      <circle cx={x} cy={y + 15} r={7} fill={skin} />
      <path d={`M${x - 7} ${y + 13} Q${x} ${y + 4} ${x + 7} ${y + 13}`} fill={hair} />
      <rect x={x - 11} y={y + 30} width={22} height={4} fill="#c9a227" />
    </g>
  );
}

/** Die ganze Straße als ein SVG. Wird nur neu gezeichnet, wenn sich Stufe, Staat oder Pfad ändern. */
export const StreetArt = memo(function StreetArt({
  stateId,
  stage,
  autocratic,
  office,
  partyColor,
  character,
  labels,
  lockedLabel,
}: StreetArtProps) {
  const state = cfg.states[stateId];
  const p = architecture[state.architecture];
  const buildings: ReactNode[] = [];
  const fillers: ReactNode[] = [];
  const decor: ReactNode[] = [];
  const sidewalks: ReactNode[] = [];
  const overlays: ReactNode[] = [];
  // Als Gruppe statt eigenem <svg>: WebKit ignoriert sonst die Verschiebung am Fahnenmast
  const flag = (
    <g transform="scale(0.37)">
      <FlagGraphic flag={state.flag} />
    </g>
  );
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
    );
    if (grandeur >= 1) {
      // Pflaster: feines Muster im Gehweg
      sidewalks.push(
        <rect
          key={`cb-${district.id}`}
          x={start}
          y={GROUND}
          width={district.width}
          height={14}
          fill="url(#cobble)"
          opacity={0.5}
        />,
      );
    }

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
        fillers.push(
          <FillerHouse
            key={`f-${Math.round(x)}`}
            x={x}
            width={width - 6}
            p={p}
            seed={Math.round(seed)}
            grandeur={grandeur}
            poster={
              autocratic && seed % 2 < 1 ? (
                <Poster x={x} y={GROUND - 70} character={character} />
              ) : null
            }
          />,
        );
        cursor += width;
        gap = edge.left - cursor;
        seed += 1.7;
      }
      cursor = edge.right;
    }

    for (const l of locs) {
      buildings.push(
        <g key={l.id}>
          <LocationBuilding
            id={l.id}
            x={l.x}
            p={p}
            grandeur={grandeur}
            label={labels[l.id]}
            partyColor={partyColor}
            autocratic={autocratic}
            office={office}
          />
        </g>,
      );
    }

    // Ausstattung: je prächtiger das Viertel, desto dichter und edler
    const spacing = [190, 150, 130, 110][grandeur] ?? 150;
    for (let x = start + 60; x < end - 30; x += spacing) {
      const i = Math.round((x - start) / spacing);
      decor.push(<Lamp key={`l-${x}`} x={x} grandeur={grandeur} />);
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
    }
    if (grandeur === 3) {
      const palace = locs.find((l) => l.id === 'palace');
      if (palace) decor.push(<Carpet key="carpet" x={palace.x} width={70} />);
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
        <pattern id="cobble" width="8" height="7" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="3.5" r="2.4" fill="rgb(0 0 0 / 18%)" />
        </pattern>
      </defs>
      <g className={styles.built}>
        {fillers}
        {buildings}
        {decor}
        {/* Straße und Gehweg */}
        <rect
          x={0}
          y={GROUND + 14}
          width={WORLD_WIDTH}
          height={WORLD_HEIGHT - GROUND - 14}
          className={styles.road}
        />
        {sidewalks}
        <rect x={0} y={GROUND + 13} width={WORLD_WIDTH} height={2} className={styles.curb} />
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
      </g>
      {overlays}
    </svg>
  );
});

/** Ferne Silhouette (Parallaxe). Stil passend zum Staat. */
export const Skyline = memo(function Skyline({ stateId }: { stateId: StateId }) {
  const style = cfg.states[stateId].architecture;
  const shapes: ReactNode[] = [];
  const width = WORLD_WIDTH * 0.5 + 400;
  for (let x = 0; x < width; x += 90) {
    const h = 60 + ((x * 7) % 70);
    const top = 230 - h;
    if (style === 'gabled' && (x / 90) % 3 === 0) {
      shapes.push(
        <path key={x} d={`M${x} 230 V${top} L${x + 30} ${top - 26} L${x + 60} ${top} V230 Z`} />,
      );
    } else if (style === 'soviet' && (x / 90) % 4 === 1) {
      shapes.push(
        <g key={x}>
          <rect x={x} y={top} width={60} height={h} />
          <path d={`M${x + 20} ${top} Q${x + 30} ${top - 30} ${x + 40} ${top} Z`} />
        </g>,
      );
    } else if (style === 'imperial' && (x / 90) % 3 === 1) {
      shapes.push(
        <g key={x}>
          <rect x={x + 10} y={top} width={40} height={h} />
          <path
            d={`M${x} ${top} Q${x + 30} ${top - 12} ${x + 60} ${top} Z M${x + 4} ${top + 24} Q${x + 30} ${top + 12} ${x + 56} ${top + 24} Z`}
          />
        </g>,
      );
    } else if (style === 'federal' && (x / 90) % 5 === 2) {
      shapes.push(<rect key={x} x={x + 15} y={top - 60} width={30} height={h + 60} />);
    } else {
      shapes.push(<rect key={x} x={x} y={top} width={70} height={h} />);
    }
  }
  return (
    <svg
      className={styles.skyline}
      viewBox={`0 0 ${width} 300`}
      preserveAspectRatio="xMinYMax meet"
      aria-hidden="true"
    >
      <g className={styles.far}>{shapes}</g>
    </svg>
  );
});
