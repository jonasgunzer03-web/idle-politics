import { memo, type MouseEvent } from 'react';
import { defaultConfig } from '../../config';
import { tapYield } from '../../engine/economy';
import { useShallow } from 'zustand/react/shallow';
import type { ResourceId, StateId, TapActionId } from '../../engine/ids';
import { de } from '../../i18n/de';
import { gameStore, useGame } from '../../store';
import { spawnFloatingNumber } from '../effects/floatingBus';
import { formatResource } from '../gameText';
import { ResourceIcon } from './ResourceIcon';
import styles from './TapButton.module.css';

function yieldText(resource: ResourceId, amount: number, stateId: StateId | null): string {
  const value = formatResource(resource, amount, stateId, {
    signed: true,
    smallDecimals: 1,
    rounding: 'round',
  });
  return resource === 'money' ? value : `${value} ${de.resources[resource]}`;
}

/** Tipp-Button („Schicht arbeiten“, „Mit Kollegen reden“) mit hochfliegender Zahl. */
export const TapButton = memo(function TapButton({ action }: { action: TapActionId }) {
  const { resource, label } = useGame(
    useShallow((s): { resource: ResourceId; label: string } => {
      const run = s.game.run;
      if (!run) return { resource: 'money', label: '' };
      const y = tapYield(run, action, defaultConfig);
      return { resource: y.resource, label: yieldText(y.resource, y.amount, run.stateId) };
    }),
  );

  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    const result = gameStore.getState().tap(action);
    if (result.gained <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    // Tastatur-Klicks haben keine Koordinaten → Mitte des Buttons
    const x = e.clientX || rect.left + rect.width / 2;
    const y = e.clientY || rect.top + rect.height / 2;
    const run = gameStore.getState().game.run;
    spawnFloatingNumber({
      x,
      y,
      text: yieldText(result.resource, result.gained, run?.stateId ?? null),
      color: `var(--res-${result.resource})`,
    });
  };

  return (
    <button type="button" className={styles.tap} onClick={onClick} data-testid={`tap-${action}`}>
      <ResourceIcon resource={resource} size={26} />
      <span className={styles.label}>{de.tapActions[action]}</span>
      <span className={`${styles.yield} num`}>{label}</span>
    </button>
  );
});
