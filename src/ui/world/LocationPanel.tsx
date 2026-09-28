import { memo, type MouseEvent } from 'react';
import { DoorClosed, DoorOpen, GraduationCap, Hand, Lock, Square, UserPlus } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { defaultConfig } from '../../config';
import { actionProgress, actionYield, canAfford, upgradeCost } from '../../engine/economy';
import type { ActionId, ResourceMap } from '../../engine/ids';
import { RESOURCE_IDS } from '../../engine/ids';
import { actionsAt, findLocation, isActionUnlocked, isLocationOpen } from '../../engine/unlocks';
import { currentLocation, travelSeconds } from '../../engine/world';
import { de, fill } from '../../i18n/de';
import { gameStore, useGame } from '../../store';
import { Button } from '../components/Button';
import { spawnFloatingNumber } from '../effects/floatingBus';
import { actionName, formatCost, formatGain, locationName } from '../gameText';
import styles from './LocationPanel.module.css';

const cfg = defaultConfig;

interface ActionRowView {
  unlocked: boolean;
  unlockStage: number;
  name: string;
  yieldText: string;
  staff: number;
  staffRate: string;
  staffCost: string;
  staffAffordable: boolean;
  training: number;
  trainingMax: number;
  trainingCost: string;
  trainingAffordable: boolean;
}

const ActionRow = memo(function ActionRow({ id }: { id: ActionId }) {
  const view = useGame(
    useShallow((s): ActionRowView | null => {
      const run = s.game.run;
      const action = cfg.world.actions.find((a) => a.id === id);
      if (!run || !action) return null;
      const progress = actionProgress(run, id);
      const perRun = actionYield(s.game, action, cfg);
      const perSecond: Partial<ResourceMap> = {};
      for (const r of RESOURCE_IDS) {
        const v = perRun[r];
        if (v) perSecond[r] = v * progress.staff * action.staff.ratePerStaff;
      }
      const staffCost = upgradeCost(run, action, 'staff', cfg);
      const trainingCost = upgradeCost(run, action, 'training', cfg);
      return {
        unlocked: isActionUnlocked(run, action, cfg),
        unlockStage: action.unlockStage,
        name: actionName(id, run.profession === 'office'),
        yieldText: formatGain(perRun, run.stateId),
        staff: progress.staff,
        staffRate: progress.staff > 0 ? formatGain(perSecond, run.stateId, de.common.perSecond) : '',
        staffCost: formatCost(staffCost, run.stateId),
        staffAffordable: canAfford(run.resources, staffCost),
        training: progress.training,
        trainingMax: action.training.maxLevel,
        trainingCost: formatCost(trainingCost, run.stateId),
        trainingAffordable: canAfford(run.resources, trainingCost),
      };
    }),
  );
  if (!view) return null;
  if (!view.unlocked) {
    return (
      <div className={`${styles.action} ${styles.lockedAction}`}>
        <Lock size={18} aria-hidden="true" />
        <span>{view.name}</span>
        <span className={styles.muted}>{fill(de.ui.locked, { stage: view.unlockStage })}</span>
      </div>
    );
  }

  const onTap = (e: MouseEvent<HTMLButtonElement>) => {
    const gained = gameStore.getState().perform(id);
    const run = gameStore.getState().game.run;
    const text = formatGain(gained, run?.stateId ?? null);
    if (!text) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const first = RESOURCE_IDS.find((r) => (gained[r] ?? 0) > 0) ?? 'money';
    spawnFloatingNumber({
      x: e.clientX || rect.left + rect.width / 2,
      y: e.clientY || rect.top + rect.height / 2,
      text,
      color: `var(--res-${first})`,
    });
  };

  return (
    <div className={styles.action} data-testid={`action-${id}`}>
      <button type="button" className={styles.tap} onClick={onTap} data-testid={`tap-${id}`}>
        <Hand size={22} aria-hidden="true" />
        <span className={styles.tapName}>{view.name}</span>
        <span className={`${styles.tapYield} num`}>{view.yieldText}</span>
      </button>
      <div className={styles.upgrades}>
        <div className={styles.upgrade}>
          <div className={styles.upgradeInfo}>
            <span className={styles.upgradeTitle}>
              <UserPlus size={14} aria-hidden="true" />
              {fill(de.ui.staffCount, { count: view.staff })}
            </span>
            {view.staffRate && <span className={`${styles.muted} num`}>{fill(de.ui.staffRate, { rate: view.staffRate })}</span>}
          </div>
          <button
            type="button"
            className={styles.buy}
            disabled={!view.staffAffordable}
            onClick={() => {
              gameStore.getState().buyUpgrade(id, 'staff');
            }}
            aria-label={`${de.ui.hire}: ${view.staffCost}`}
            data-testid={`hire-${id}`}
          >
            <span>{de.ui.hire}</span>
            <span className="num">{view.staffCost}</span>
          </button>
        </div>
        <div className={styles.upgrade}>
          <div className={styles.upgradeInfo}>
            <span className={styles.upgradeTitle}>
              <GraduationCap size={14} aria-hidden="true" />
              {de.ui.training}
            </span>
            <span className={`${styles.muted} num`}>{fill(de.ui.trainingLevel, { level: view.training, max: view.trainingMax })}</span>
          </div>
          {view.training >= view.trainingMax ? (
            <span className={styles.maxed}>{de.ui.maxed}</span>
          ) : (
            <button
              type="button"
              className={styles.buy}
              disabled={!view.trainingAffordable}
              onClick={() => {
                gameStore.getState().buyUpgrade(id, 'training');
              }}
              aria-label={`${de.ui.train}: ${view.trainingCost}`}
              data-testid={`train-${id}`}
            >
              <span>{de.ui.train}</span>
              <span className="num">{view.trainingCost}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

/** Was man am aktuellen Ort tun kann: unterwegs, davor oder drinnen. */
export function LocationPanel() {
  const view = useGame(
    useShallow((s) => {
      const run = s.game.run;
      if (!run) return null;
      const here = currentLocation(run, cfg);
      const loc = here ? findLocation(here, cfg) : undefined;
      const target = run.world.target;
      return {
        here,
        target,
        seconds: target ? Math.ceil(travelSeconds(s.game, target, cfg)) : 0,
        inside: run.world.inside && here !== null,
        open: loc ? isLocationOpen(run, loc, cfg) : false,
        unlockStage: loc?.unlockStage ?? 1,
        office: run.profession === 'office',
      };
    }),
  );
  if (!view) return null;
  const store = gameStore.getState();

  if (view.target) {
    return (
      <section className={styles.panel}>
        <p className={styles.walking}>
          {fill(de.ui.walkingTo, { place: locationName(view.target, view.office) })}
          <span className="num"> · {fill(de.ui.seconds, { n: view.seconds })}</span>
        </p>
        <Button
          variant="secondary"
          onClick={() => {
            store.stopWalking();
          }}
        >
          <Square size={16} aria-hidden="true" />
          {de.ui.stop}
        </Button>
      </section>
    );
  }

  if (!view.here) {
    return (
      <section className={styles.panel}>
        <p className={styles.muted}>{de.ui.tapHint}</p>
      </section>
    );
  }

  const name = locationName(view.here, view.office);

  if (!view.inside) {
    return (
      <section className={styles.panel} data-testid="location-outside">
        <div className={styles.placeHead}>
          <div>
            <h2 className={styles.placeName}>{name}</h2>
            <p className={styles.muted}>{de.locations[view.here].text}</p>
          </div>
        </div>
        {view.open ? (
          <Button
            block
            onClick={() => {
              store.enter();
            }}
            data-testid="enter"
          >
            <DoorOpen size={18} aria-hidden="true" />
            {de.ui.enter}
          </Button>
        ) : (
          <p className={styles.muted}>
            <Lock size={14} aria-hidden="true" /> {fill(de.ui.locked, { stage: view.unlockStage })}
          </p>
        )}
      </section>
    );
  }

  const list = actionsAt(view.here, cfg);
  return (
    <section className={styles.panel} data-testid="location-inside">
      <div className={styles.placeHead}>
        <h2 className={styles.placeName}>{name}</h2>
        <Button
          variant="secondary"
          onClick={() => {
            store.leave();
          }}
          data-testid="leave"
        >
          <DoorClosed size={16} aria-hidden="true" />
          {de.ui.leave}
        </Button>
      </div>
      {list.length === 0 && <p className={styles.muted}>{de.ui.noActions}</p>}
      {list.map((a) => (
        <ActionRow key={a.id} id={a.id} />
      ))}
    </section>
  );
}
