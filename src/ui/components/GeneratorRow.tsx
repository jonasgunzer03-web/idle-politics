import { memo } from 'react';
import { Lock } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { defaultConfig } from '../../config';
import type { BuyMode } from '../../engine/economy';
import type { GeneratorId } from '../../engine/ids';
import { de, fill } from '../../i18n/de';
import { gameStore, useGame } from '../../store';
import { generatorRowView } from '../generatorView';
import { GeneratorIcon } from './GeneratorIcon';
import styles from './GeneratorRow.module.css';

interface Props {
  id: GeneratorId;
  mode: BuyMode;
  /** Kompakte Darstellung im Karriere-Tab (ohne Beschreibung). */
  compact?: boolean;
}

export const GeneratorRow = memo(function GeneratorRow({ id, mode, compact = false }: Props) {
  const view = useGame(useShallow((s) => generatorRowView(s.game, id, mode, defaultConfig)));
  const text = de.generators[id];
  if (!view.exists) return null;

  if (!view.unlocked) {
    return (
      <div className={`${styles.row} ${styles.locked}`} data-testid={`generator-${id}`}>
        <div className={styles.icon}>
          <Lock size={20} aria-hidden="true" />
        </div>
        <div className={styles.info}>
          <span className={styles.name}>{text.name}</span>
          <span className={styles.meta}>
            {fill(de.invest.unlockAt, { stage: view.unlockStage })}
          </span>
        </div>
      </div>
    );
  }

  const buyLabel = view.count > 1 ? fill(de.invest.buyCount, { count: view.count }) : de.invest.buy;

  return (
    <div className={styles.row} data-testid={`generator-${id}`}>
      <div className={styles.icon} style={{ color: `var(--res-${view.produces})` }}>
        <GeneratorIcon id={id} />
        {view.owned > 0 && (
          <span className={`${styles.count} num`} data-testid={`generator-${id}-owned`}>
            {view.owned}
          </span>
        )}
      </div>
      <div className={styles.info}>
        <span className={styles.name}>{text.name}</span>
        {!compact && <span className={styles.desc}>{text.text}</span>}
        <span className={`${styles.meta} num`}>
          <span>{fill(de.invest.perUnit, { amount: view.unitRateText })}</span>
          {view.totalRateText && (
            <span>{fill(de.invest.total, { amount: view.totalRateText })}</span>
          )}
        </span>
      </div>
      <button
        type="button"
        className={styles.buy}
        disabled={!view.affordable}
        onClick={() => {
          gameStore.getState().buy(id, mode);
        }}
        aria-label={`${text.name}: ${buyLabel}, ${view.costText}`}
        data-testid={`buy-${id}`}
      >
        <span className={styles.buyLabel}>{buyLabel}</span>
        <span className={`${styles.cost} num`}>{view.costText}</span>
        {view.missingText && <span className={`${styles.missing} num`}>{view.missingText}</span>}
      </button>
    </div>
  );
});
