import { memo } from 'react';
import { defaultConfig } from '../../config';
import type { LocationId, StateId } from '../../engine/ids';
import { GROUND, LocationBuilding } from './buildings';
import { BUILDING_HALF_WIDTH } from './geometry';
import { architecture, districtGrandeur } from './palette';

const cfg = defaultConfig;

interface Props {
  location: LocationId;
  level: number;
  stateId: StateId;
  label: string;
  partyColor: string;
  autocratic: boolean;
  office: boolean;
}

/** Kleines Bild eines Gebäudes in einer bestimmten Ausbaustufe (für den Reiter „Ausbau“). */
export const BuildingThumb = memo(function BuildingThumb({ location, stateId, ...props }: Props) {
  const loc = cfg.world.locations.find((l) => l.id === location);
  const x = loc?.x ?? 0;
  const hw = BUILDING_HALF_WIDTH[location] + 18;
  const p = architecture[cfg.states[stateId].architecture];
  return (
    <svg
      viewBox={`${x - hw} ${GROUND - 215} ${hw * 2} 230`}
      preserveAspectRatio="xMidYMax meet"
      width="100%"
      height="100%"
      aria-hidden="true"
    >
      <rect x={x - hw} y={GROUND} width={hw * 2} height={20} fill="#a9a49a" />
      <LocationBuilding
        id={location}
        x={x}
        p={p}
        grandeur={districtGrandeur[loc?.district ?? 'quarter']}
        {...props}
      />
    </svg>
  );
});
