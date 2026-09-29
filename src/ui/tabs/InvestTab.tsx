import { useState } from 'react';
import { Bike, Car, Footprints, Lock, UserPlus } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { defaultConfig } from '../../config';
import {
  actionProgress,
  canAfford,
  vehicleCost,
  vehicleIndex,
  type BuyMode,
} from '../../engine/economy';
import { VEHICLE_IDS, type GeneratorId, type ResourceId } from '../../engine/ids';
import { isResourceUnlocked, travelSpeed } from '../../engine/rules';
import { isGeneratorAvailable } from '../../engine/unlocks';
import { de, fill } from '../../i18n/de';
import { gameStore, useGame } from '../../store';
import { GeneratorRow } from '../components/GeneratorRow';
import { ResourceIcon } from '../components/ResourceIcon';
import { actionName, formatCost } from '../gameText';
import styles from './InvestTab.module.css';

const cfg = defaultConfig;
const MODES: { mode: BuyMode; label: string }[] = [
  { mode: 1, label: de.invest.modes.one },
  { mode: 10, label: de.invest.modes.ten },
  { mode: 'max', label: de.invest.modes.max },
];
const GROUPS: ResourceId[] = ['money', 'influence', 'followers', 'diplomacy'];

function Group({ resource, mode }: { resource: ResourceId; mode: BuyMode }) {
  // Liste als Text: ein neues Array bei jedem Aufruf würde endlos neu zeichnen
  const view = useGame(
    useShallow((s) => {
      const run = s.game.run;
      if (!run) return { unlocked: false, unlockStage: 1, idList: '' };
      const defs = cfg.balancing.generators.filter(
        (g) => g.produces === resource && isGeneratorAvailable(run, g),
      );
      const open = defs.filter((g) => run.stage >= g.unlockStage).map((g) => g.id);
      const next = defs.find((g) => run.stage < g.unlockStage);
      return {
        unlocked: isResourceUnlocked(run, resource, cfg),
        unlockStage: cfg.balancing.resourceUnlockStage[resource],
        idList: (next ? [...open, next.id] : open).join(','),
      };
    }),
  );
  const ids = view.idList ? (view.idList.split(',') as GeneratorId[]) : [];
  return (
    <section className={styles.group} data-testid={`invest-group-${resource}`}>
      <h2 className={styles.groupTitle}>
        <ResourceIcon resource={resource} size={18} />
        {de.invest.groups[resource]}
      </h2>
      {view.unlocked ? (
        <div className={styles.list}>
          {ids.map((id) => (
            <GeneratorRow key={id} id={id} mode={mode} />
          ))}
        </div>
      ) : (
        <p className={styles.lockedGroup}>
          <Lock size={16} aria-hidden="true" />
          {fill(de.invest.groupLocked, { stage: view.unlockStage })}
        </p>
      )}
    </section>
  );
}

function Vehicles() {
  const v = useGame(
    useShallow((s) => {
      const run = s.game.run;
      if (!run) return null;
      const next = VEHICLE_IDS[vehicleIndex(run.vehicle) + 1];
      const def = next ? cfg.world.vehicles.find((x) => x.id === next) : undefined;
      const cost = next ? vehicleCost(next, cfg) : {};
      const feet = cfg.world.vehicles[0]?.speed ?? 150;
      return {
        current: run.vehicle,
        speed: Math.round((travelSpeed(s.game, cfg) / feet) * 10) / 10,
        next: next ?? null,
        nextStage: def?.unlockStage ?? 0,
        nextLocked: def ? run.stage < def.unlockStage : true,
        nextSpeed: def ? Math.round((def.speed / feet) * 10) / 10 : 0,
        cost: formatCost(cost, run.stateId),
        affordable: canAfford(run.resources, cost),
      };
    }),
  );
  if (!v) return null;
  const Icon =
    v.current === 'feet'
      ? Footprints
      : v.current === 'bicycle' || v.current === 'moped'
        ? Bike
        : Car;
  return (
    <section className={styles.group}>
      <h2 className={styles.groupTitle}>
        <Icon size={18} aria-hidden="true" />
        {de.invest.vehiclesTitle}
      </h2>
      <div className={styles.vehicle}>
        <div>
          <p className={styles.vehicleName}>
            {de.invest.vehicleOwned}: {de.vehicles[v.current]}
          </p>
          <p className={`${styles.muted} num`}>
            {fill(de.invest.vehicleSpeed, { speed: v.speed.toLocaleString('de-DE') })}
          </p>
        </div>
      </div>
      {v.next && (
        <div className={styles.vehicle}>
          <div>
            <p className={styles.vehicleName}>{de.vehicles[v.next]}</p>
            <p className={`${styles.muted} num`}>
              {v.nextLocked
                ? fill(de.invest.unlockAt, { stage: v.nextStage })
                : fill(de.invest.vehicleSpeed, { speed: v.nextSpeed.toLocaleString('de-DE') })}
            </p>
          </div>
          <button
            type="button"
            className={styles.buy}
            disabled={v.nextLocked || !v.affordable}
            onClick={() => {
              if (v.next) gameStore.getState().buyVehicle(v.next);
            }}
            data-testid={`vehicle-${v.next}`}
          >
            <span>{de.invest.vehicleBuy}</span>
            <span className="num">{v.cost}</span>
          </button>
        </div>
      )}
    </section>
  );
}

function StaffOverview() {
  const list = useGame((s) => {
    const run = s.game.run;
    if (!run) return '';
    return cfg.world.actions
      .map((a) => ({ id: a.id, staff: actionProgress(run, a.id).staff }))
      .filter((a) => a.staff > 0)
      .map((a) => `${a.id}:${a.staff}`)
      .join('|');
  });
  const office = useGame((s) => s.game.run?.profession === 'office');
  return (
    <section className={styles.group}>
      <h2 className={styles.groupTitle}>
        <UserPlus size={18} aria-hidden="true" />
        {de.invest.staffTitle}
      </h2>
      <p className={styles.muted}>{de.invest.staffText}</p>
      {list && (
        <ul className={styles.staffList}>
          {list.split('|').map((entry) => {
            const [id = 'work', count = '0'] = entry.split(':');
            return (
              <li key={id} className="num">
                {fill(de.invest.staffEntry, {
                  action: actionName(id as Parameters<typeof actionName>[0], office),
                  count,
                })}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function InvestTab() {
  const [mode, setMode] = useState<BuyMode>(1);
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{de.invest.title}</h1>
        <div className={styles.modes} role="radiogroup" aria-label={de.invest.buyMode}>
          {MODES.map(({ mode: m, label }) => (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={mode === m}
              className={styles.mode}
              onClick={() => {
                setMode(m);
              }}
              data-testid={`buy-mode-${String(m)}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <Vehicles />
      {GROUPS.map((resource) => (
        <Group key={resource} resource={resource} mode={mode} />
      ))}
      <StaffOverview />
    </div>
  );
}
