import { memo } from 'react';
import { ArrowBigUpDash, Wrench } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { BuildingThumb } from '../../art/world/BuildingThumb';
import { defaultConfig } from '../../config';
import { partyColors } from '../../config/appearance';
import {
  buildingUpgradeBlock,
  buildingUpgradeCost,
  canAfford,
  machineCost,
} from '../../engine/economy';
import { formatNumber } from '../../engine/format';
import { GOOD_IDS, type GoodId, type LocationId, type MachineId } from '../../engine/ids';
import {
  buildingCapacity,
  buildingLevel,
  findBuilding,
  findMachine,
  levelStageRequirement,
  machineLevel,
  storageCapacity,
} from '../../engine/production';
import { de, fill } from '../../i18n/de';
import { gameStore, useGame } from '../../store';
import { formatCost, locationName } from '../gameText';
import { goodName, levelName, machineName } from '../peopleText';
import { GoodIcon, MachineIcon } from './icons';
import styles from './Industry.module.css';

const cfg = defaultConfig;

function Pips({ value, max }: { value: number; max: number }) {
  return (
    <span className={styles.pips} aria-hidden="true">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={styles.pip} data-on={i < value ? 'true' : 'false'} />
      ))}
    </span>
  );
}

const MachineCard = memo(function MachineCard({ id }: { id: MachineId }) {
  const view = useGame(
    useShallow((s) => {
      const run = s.game.run;
      const def = findMachine(id, cfg);
      if (!run || !def) return null;
      const cost = machineCost(run, id, cfg);
      return {
        level: machineLevel(run, id, cfg),
        cap: buildingLevel(run, def.location),
        cost: cost ? formatCost(cost, run.stateId) : '',
        affordable: cost ? canAfford(run.resources, cost) : false,
        office: run.profession === 'office',
      };
    }),
  );
  const def = findMachine(id, cfg);
  if (!view || !def) return null;
  const effect = fill(de.industry.ui.kind[def.kind], {
    value: formatNumber(def.perLevel * 100, { rounding: 'round' }),
  });
  return (
    <div className={styles.machine} data-level={view.level} data-testid={`machine-${id}`}>
      <div className={styles.cardHead}>
        <span className={styles.machineIcon}>
          <MachineIcon machine={id} />
        </span>
        <Pips value={view.level} max={cfg.industry.maxLevel} />
      </div>
      <span className={styles.machineName}>{machineName(id, view.office)}</span>
      <span className={styles.small}>
        {de.industry.machines[id].text} {effect}
      </span>
      <span className={styles.small}>
        {fill(de.industry.ui.machineLevel, { level: view.level, max: view.cap })}
      </span>
      {view.cost ? (
        <button
          type="button"
          className={styles.buy}
          disabled={!view.affordable}
          onClick={() => {
            gameStore.getState().buyMachine(id);
          }}
          data-testid={`buy-machine-${id}`}
        >
          <span>{view.level === 0 ? de.industry.ui.machineBuild : de.industry.ui.machineImprove}</span>
          <span className="num">{view.cost}</span>
        </button>
      ) : (
        <span className={styles.small}>
          {view.level >= cfg.industry.maxLevel ? de.ui.maxed : de.industry.ui.machineCapped}
        </span>
      )}
    </div>
  );
});

function StorageRow({ good }: { good: GoodId }) {
  const text = useGame((s) => {
    const run = s.game.run;
    if (!run) return '0|1|0';
    const office = run.profession === 'office' ? 1 : 0;
    return `${run.goods[good]}|${storageCapacity(run, good, cfg)}|${office}`;
  });
  const [amount = 0, max = 1, office = 0] = text.split('|').map(Number);
  const share = Math.min(1, amount / Math.max(1, max));
  return (
    <div className={styles.storage}>
      <div className={styles.cardHead}>
        <GoodIcon good={good} />
        <span className={styles.muted} style={{ flex: 1 }}>
          {goodName(good, office === 1)}
        </span>
        <span className={`${styles.small} num`}>
          {fill(de.industry.ui.storageOf, {
            amount: formatNumber(amount),
            max: formatNumber(max),
          })}
        </span>
      </div>
      <div className={styles.bar}>
        <div
          className={styles.barFill}
          style={{ transform: `scaleX(${share})`, background: `var(--goods-${good})` }}
        />
      </div>
    </div>
  );
}

/** Reiter „Ausbau“: Ausbaustufe, Maschinen und Lager. */
export function BuildTab({ location }: { location: LocationId }) {
  const view = useGame(
    useShallow((s) => {
      const run = s.game.run;
      const character = s.game.character;
      if (!run || !character) return null;
      const level = buildingLevel(run, location);
      const cost = buildingUpgradeCost(run, location, cfg);
      const nextCap = cfg.industry.capacity[level + 1] ?? 0;
      return {
        level,
        stateId: run.stateId,
        office: run.profession === 'office',
        autocratic: run.path === 'autocratic',
        partyColor: partyColors[character.party.color] ?? '#b3261e',
        capacity: buildingCapacity(run, location, cfg),
        nextCap,
        cost: cost ? formatCost(cost, run.stateId) : '',
        block: buildingUpgradeBlock(run, location, cfg),
        needStage: levelStageRequirement(location, level + 1, cfg),
      };
    }),
  );
  const building = findBuilding(location, cfg);
  if (!view || !building) return null;
  const max = cfg.industry.maxLevel;
  const produced = GOOD_IDS.filter((g) =>
    cfg.world.actions.some((a) => a.location === location && (a.outputs[g] ?? 0) > 0),
  );
  const used = GOOD_IDS.filter((g) =>
    cfg.world.actions.some((a) => a.location === location && (a.inputs[g] ?? 0) > 0),
  );
  const goods = [...new Set([...produced, ...used])];

  return (
    <div className={styles.stack}>
      <div className={styles.card} data-testid="building-card">
        <div className={styles.levelHero}>
          <div className={styles.levelArt}>
            <BuildingThumb
              location={location}
              level={view.level}
              stateId={view.stateId}
              label={locationName(location, view.office)}
              partyColor={view.partyColor}
              autocratic={view.autocratic}
              office={view.office}
            />
          </div>
          <div className={styles.personText}>
            <span className={styles.levelName}>{levelName(location, view.level, view.office)}</span>
            <span className={styles.small}>
              {fill(de.industry.ui.level, { level: view.level, max })}
            </span>
            <Pips value={view.level} max={max} />
            <span className={styles.small}>
              {fill(de.industry.ui.seats, { max: view.capacity })}
            </span>
          </div>
        </div>
        {view.block === 'maxed' ? (
          <p className={styles.good}>{de.industry.ui.maxLevel}</p>
        ) : (
          <>
            <p className={styles.muted}>
              <ArrowBigUpDash size={15} aria-hidden="true" />{' '}
              {fill(de.industry.ui.upgradeTo, {
                name: levelName(location, view.level + 1, view.office),
              })}{' '}
              ·{' '}
              {fill(de.industry.ui.upgradeGain, { seats: view.nextCap, level: view.level + 1 })}
            </p>
            {view.block === 'stage' ? (
              <p className={styles.bad}>
                {fill(de.industry.ui.upgradeNeedsStage, { stage: view.needStage })}
              </p>
            ) : (
              <button
                type="button"
                className={styles.buy}
                disabled={view.block !== null}
                onClick={() => {
                  gameStore.getState().upgradeBuilding(location);
                }}
                data-testid="upgrade-building"
              >
                <span>
                  <Wrench size={14} aria-hidden="true" /> {de.industry.ui.upgrade}
                </span>
                <span className="num">{view.cost}</span>
              </button>
            )}
          </>
        )}
      </div>
      <h3 className={styles.sectionTitle}>{de.industry.ui.machines}</h3>
      <div className={styles.machineGrid}>
        {building.machines.map((id) => (
          <MachineCard key={id} id={id} />
        ))}
      </div>
      {goods.length > 0 && (
        <>
          <h3 className={styles.sectionTitle}>{de.industry.ui.storage}</h3>
          <div className={styles.card}>
            {goods.map((g) => (
              <StorageRow key={g} good={g} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
