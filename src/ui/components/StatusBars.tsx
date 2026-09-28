import { defaultConfig } from '../../config';
import { de } from '../../i18n/de';
import { useGame } from '../../store';
import styles from './StatusBars.module.css';

const cfg = defaultConfig;

function Bar({
  label,
  value,
  tone,
  testId,
}: {
  label: string;
  value: number;
  tone: 'good' | 'warn' | 'bad' | 'neutral';
  testId: string;
}) {
  const pct = Math.round(Math.min(100, Math.max(0, value)));
  return (
    <div className={styles.bar} data-testid={testId}>
      <div className={styles.row}>
        <span>{label}</span>
        <span className="num">{pct} %</span>
      </div>
      <div
        className={styles.track}
        role="progressbar"
        aria-label={label}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`${styles.fill} ${styles[tone]}`}
          style={{ transform: `scaleX(${pct / 100})` }}
        />
      </div>
    </div>
  );
}

/** Balken für Zustimmung und Unruhe. */
export function StatusBars() {
  const approval = useGame((s) => s.game.run?.approval ?? null);
  const unrest = useGame((s) => s.game.run?.unrest ?? null);
  if (approval === null || unrest === null) return null;
  const { warn, danger } = cfg.balancing.unrestThresholds;
  const unrestTone = unrest > danger ? 'bad' : unrest >= warn ? 'warn' : 'good';
  return (
    <div className={styles.wrap}>
      <Bar label={de.bars.approval} value={approval} tone="neutral" testId="bar-approval" />
      <Bar label={de.bars.unrest} value={unrest} tone={unrestTone} testId="bar-unrest" />
    </div>
  );
}
