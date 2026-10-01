import { memo, useEffect, useRef, useState, type MouseEvent } from 'react';
import { ArrowRight, Flame, Hand, Lock, UserPlus } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { defaultConfig } from '../../config';
import type { ActionDef } from '../../config/world';
import { comboAfterTap, comboValue, NO_COMBO, type Combo } from '../../engine/combo';
import { canAfford, hasRoom, hireCost } from '../../engine/economy';
import { formatNumber } from '../../engine/format';
import type { GoodId, LocationId, ResourceId } from '../../engine/ids';
import {
  buildingCapacity,
  chainSnapshot,
  cycleInputs,
  cycleOutputs,
  isResourceKey,
  staffInBuilding,
  staffOf,
} from '../../engine/production';
import { actionsAt, isActionUnlocked } from '../../engine/unlocks';
import { de, fill } from '../../i18n/de';
import { gameStore, useGame } from '../../store';
import { ResourceIcon } from '../components/ResourceIcon';
import { spawnFloatingNumber } from '../effects/floatingBus';
import { actionName, formatCost, formatResource } from '../gameText';
import { goodName } from '../peopleText';
import { GoodIcon } from './icons';
import styles from './Industry.module.css';

const cfg = defaultConfig;
type FlowKey = GoodId | ResourceId;

function keysOf(map: ActionDef['inputs']): FlowKey[] {
  return (Object.keys(map) as FlowKey[]).filter((k) => (map[k] ?? 0) > 0);
}

function FlowChip({ k, amount, office }: { k: FlowKey; amount: string; office: boolean }) {
  return (
    <span className={styles.chip}>
      {isResourceKey(k) ? <ResourceIcon resource={k} size={14} /> : <GoodIcon good={k} size={14} />}
      <span className="num">{amount}</span>
      {!isResourceKey(k) && <span>{goodName(k, office)}</span>}
    </span>
  );
}

interface LineView {
  unlocked: boolean;
  name: string;
  office: boolean;
  /** Mengen je Durchgang, in der Reihenfolge der Config, mit „|“ getrennt. */
  inAmounts: string;
  outAmounts: string;
  staff: number;
  state: 'running' | 'blocked' | 'idle';
  blockedBy: FlowKey | null;
  rate: string;
  hireCost: string;
  canHire: boolean;
  room: boolean;
}

function amountText(k: FlowKey, v: number, stateId: Parameters<typeof formatResource>[2]): string {
  return isResourceKey(k)
    ? formatResource(k, v, stateId, { smallDecimals: 1, rounding: 'round' })
    : formatNumber(v, { smallDecimals: 1, rounding: 'round' });
}

const LineCard = memo(function LineCard({
  action,
  onFull,
  onTapCombo,
}: {
  action: ActionDef;
  onFull: () => void;
  /** Meldet einen Tipp an die Kombo und liefert den Faktor für diesen Tipp. */
  onTapCombo: () => number;
}) {
  const inKeys = keysOf(action.inputs);
  const outKeys = keysOf(action.outputs);
  const view = useGame(
    useShallow((s): LineView | null => {
      const run = s.game.run;
      if (!run) return null;
      const office = run.profession === 'office';
      const inputs = cycleInputs(run, action, cfg);
      const outputs = cycleOutputs(s.game, action, cfg);
      const flow = chainSnapshot(s.game, cfg).flows.find((f) => f.id === action.id);
      const staff = staffOf(run, action.id);
      const cost = hireCost(run, action, cfg);
      const actual = flow?.actual ?? 0;
      const state = staff === 0 ? 'idle' : flow?.blockedBy ? 'blocked' : 'running';
      return {
        unlocked: isActionUnlocked(run, action, cfg),
        name: actionName(action.id, office),
        office,
        inAmounts: inKeys.map((k) => amountText(k, inputs[k] ?? 0, run.stateId)).join('|'),
        outAmounts: outKeys.map((k) => amountText(k, outputs[k] ?? 0, run.stateId)).join('|'),
        staff,
        state,
        blockedBy: flow?.blockedBy ?? null,
        rate: formatNumber(actual, { smallDecimals: 1, rounding: 'round' }),
        hireCost: formatCost(cost, run.stateId),
        canHire: canAfford(run.resources, cost) && hasRoom(run, action.location, cfg),
        room: hasRoom(run, action.location, cfg),
      };
    }),
  );
  if (!view) return null;
  if (!view.unlocked) {
    return (
      <div className={`${styles.card} ${styles.locked}`}>
        <Lock size={18} aria-hidden="true" />
        <span>{view.name}</span>
        <span className={styles.muted}>{fill(de.ui.locked, { stage: action.unlockStage })}</span>
      </div>
    );
  }
  const inAmounts = view.inAmounts.split('|');
  const outAmounts = view.outAmounts.split('|');

  const onTap = (e: MouseEvent<HTMLButtonElement>) => {
    const combo = onTapCombo();
    const result = gameStore.getState().perform(action.id, combo);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX || rect.left + rect.width / 2;
    const y = e.clientY || rect.top + rect.height / 2;
    if (result.blockedBy) {
      const k = result.blockedBy;
      spawnFloatingNumber({
        x,
        y,
        text: isResourceKey(k)
          ? de.industry.ui.tapMissingMoney
          : fill(de.industry.ui.tapMissing, { good: goodName(k, view.office) }),
        color: 'var(--bad)',
      });
      return;
    }
    const parts: string[] = [];
    const first = outKeys[0];
    for (const k of outKeys) {
      const v = isResourceKey(k) ? result.gained[k] : result.goods[k];
      if (v) parts.push(`+${amountText(k, v, gameStore.getState().game.run?.stateId ?? null)}`);
    }
    if (parts.length === 0) return;
    const comboText =
      combo >= 1.5 ? ` ×${combo.toLocaleString('de-DE', { maximumFractionDigits: 1 })}` : '';
    spawnFloatingNumber({
      x,
      y,
      text: parts.join(' · ') + comboText,
      color: first ? (isResourceKey(first) ? `var(--res-${first})` : `var(--goods-${first})`) : '',
    });
  };

  const statusText =
    view.state === 'idle'
      ? de.industry.ui.idle
      : view.state === 'blocked' && view.blockedBy
        ? isResourceKey(view.blockedBy)
          ? de.industry.ui.blockedMoney
          : fill(de.industry.ui.blocked, { good: goodName(view.blockedBy, view.office) })
        : fill(de.industry.ui.running, { rate: `${view.rate}/s` });

  return (
    <div className={styles.card} data-testid={`action-${action.id}`}>
      <div className={styles.cardHead}>
        <span className={styles.cardTitle}>{view.name}</span>
        <span className={styles.small}>{fill(de.ui.staffCount, { count: view.staff })}</span>
      </div>
      <div className={styles.flow}>
        {inKeys.map((k, i) => (
          <FlowChip key={k} k={k} amount={inAmounts[i] ?? ''} office={view.office} />
        ))}
        {inKeys.length > 0 && <ArrowRight size={16} className={styles.arrow} aria-hidden="true" />}
        {outKeys.map((k, i) => (
          <FlowChip key={k} k={k} amount={outAmounts[i] ?? ''} office={view.office} />
        ))}
        <span className={styles.small}>{de.industry.ui.perCycle}</span>
      </div>
      <div className={styles.status} data-state={view.state}>
        <span className={styles.statusDot} aria-hidden="true" />
        <span>{statusText}</span>
      </div>
      <div className={styles.tapRow}>
        <button
          type="button"
          className={styles.tap}
          onClick={onTap}
          data-testid={`tap-${action.id}`}
        >
          <Hand size={22} aria-hidden="true" />
          <span className={styles.tapName}>{view.name}</span>
        </button>
        <button
          type="button"
          className={styles.hire}
          disabled={view.room && !view.canHire}
          onClick={() => {
            if (!view.room) onFull();
            else gameStore.getState().hire(action.id);
          }}
          aria-label={`${de.ui.hire}: ${view.hireCost}`}
          data-testid={`hire-${action.id}`}
        >
          <span className={styles.hireTitle}>
            <UserPlus size={15} aria-hidden="true" />
            {de.ui.hire}
          </span>
          {view.room ? (
            <span className="num">{view.hireCost}</span>
          ) : (
            <span className={styles.bad}>{de.industry.ui.full}</span>
          )}
        </button>
      </div>
    </div>
  );
});

const COMBO_MAX = cfg.balancing.tapCombo.max;

/** Flammen-Anzeige der Tipp-Kombo; klingt sichtbar ab. */
function ComboMeter({ combo }: { combo: { current: Combo } }) {
  const [value, setValue] = useState(1);
  useEffect(() => {
    const timer = window.setInterval(() => {
      const v = Math.round(comboValue(combo.current, Date.now(), cfg) * 10) / 10;
      setValue((old) => (old === v ? old : v));
    }, 120);
    return () => {
      window.clearInterval(timer);
    };
  }, [combo]);
  const ratio = (value - 1) / (COMBO_MAX - 1);
  return (
    <div className={styles.combo} data-hot={value >= 2 ? 'true' : 'false'} data-testid="combo">
      <Flame
        size={20}
        strokeWidth={2.6}
        aria-hidden="true"
        className={styles.comboFlame}
        style={{ transform: `scale(${1 + ratio * 0.5})` }}
      />
      <div className={styles.comboTrack}>
        <div className={styles.comboFill} style={{ transform: `scaleX(${ratio})` }} />
      </div>
      <span className={`${styles.comboValue} game-num`}>
        ×{value.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
      </span>
    </div>
  );
}

/** Reiter „Produktion“: alle Linien im Gebäude. */
export function ProductionTab({ location, onFull }: { location: LocationId; onFull: () => void }) {
  // Tipp-Kombo für alle Linien dieses Gebäudes (nur in der Oberfläche, nicht gespeichert)
  const combo = useRef<Combo>(NO_COMBO);
  const onTapCombo = () => {
    const now = Date.now();
    combo.current = comboAfterTap(combo.current, now, cfg);
    return comboValue(combo.current, now, cfg);
  };
  const capacity = useGame((s) => {
    const run = s.game.run;
    return run
      ? `${staffInBuilding(run, location, cfg)}/${buildingCapacity(run, location, cfg)}`
      : '';
  });
  const [used, max] = capacity.split('/');
  const list = actionsAt(location, cfg);
  return (
    <div className={styles.stack}>
      {list.length === 0 && <p className={styles.muted}>{de.ui.noActions}</p>}
      {list.length > 0 && (
        <p className={styles.small}>
          {fill(de.industry.ui.capacity, { used: used ?? 0, max: max ?? 0 })}
        </p>
      )}
      {list.length > 0 && <ComboMeter combo={combo} />}
      {list.map((a) => (
        <LineCard key={a.id} action={a} onFull={onFull} onTapCombo={onTapCombo} />
      ))}
    </div>
  );
}
