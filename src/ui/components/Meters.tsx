import { Layers } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { defaultConfig } from '../../config';
import { coupRiskPerMinute, unrestGraceLeft } from '../../engine/politics';
import { isLoyaltyUnlocked } from '../../engine/rules';
import { de, fill } from '../../i18n/de';
import { gameStore, useGame } from '../../store';
import styles from './Meters.module.css';

const cfg = defaultConfig;

function Bar({ label, value, tone, testId }: {
  label: string;
  value: number;
  tone: 'good' | 'warn' | 'bad' | 'neutral' | 'loyal';
  testId: string;
}) {
  const pct = Math.round(Math.min(100, Math.max(0, value)));
  return (
    <div className={styles.bar} data-testid={testId}>
      <div className={styles.row}>
        <span>{label}</span>
        <span className="num">{pct} %</span>
      </div>
      <div className={styles.track} role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={`${styles.fill} ${styles[tone]}`} style={{ transform: `scaleX(${pct / 100})` }} />
      </div>
    </div>
  );
}

/** Zustimmung, Unruhe (grün/gelb/rot), Loyalität und der Knopf für offene Entscheidungen. */
export function Meters() {
  const v = useGame(
    useShallow((s) => {
      const run = s.game.run;
      if (!run) return null;
      const risk = coupRiskPerMinute(s.game, cfg);
      const grace = unrestGraceLeft(run, cfg);
      return {
        approval: Math.round(run.approval),
        unrest: Math.round(run.unrest),
        loyalty: isLoyaltyUnlocked(run, cfg) ? Math.round(run.loyalty) : null,
        events: run.events.open.length,
        risk: Math.round(risk.risk * 1000) / 10,
        riskKind: risk.kind,
        grace: grace === null ? null : Math.ceil(grace),
      };
    }),
  );
  if (!v) return null;
  const { warn, danger } = cfg.balancing.unrestThresholds;
  const unrestTone = v.unrest > danger ? 'bad' : v.unrest >= warn ? 'warn' : 'good';
  return (
    <div className={styles.wrap}>
      <div className={styles.meters} data-count={v.loyalty === null ? 2 : 3}>
        <Bar label={de.meters.approval} value={v.approval} tone="neutral" testId="bar-approval" />
        <Bar label={de.meters.unrest} value={v.unrest} tone={unrestTone} testId="bar-unrest" />
        {v.loyalty !== null && <Bar label={de.meters.loyalty} value={v.loyalty} tone="loyal" testId="bar-loyalty" />}
      </div>
      <button
        type="button"
        className={styles.events}
        disabled={v.events === 0}
        onClick={() => gameStore.getState().openSheet({ kind: 'events' })}
        aria-label={fill(de.eventUi.badge, { count: v.events })}
        data-testid="events-badge"
      >
        <Layers size={20} aria-hidden="true" />
        {v.events > 0 && <span className={styles.badge}>{v.events}</span>}
      </button>
      {(v.unrest > danger || v.risk > 0) && (
        <p className={styles.warning} role="status" data-testid="unrest-warning">
          {v.grace !== null
            ? fill(de.meters.unrestCritical, { seconds: v.grace })
            : v.unrest > danger
              ? de.meters.unrestWarning
              : ''}
          {v.risk > 0 &&
            ` ${fill(v.riskKind === 'purge' ? de.meters.purgeRisk : de.meters.coupRisk, {
              value: v.risk.toLocaleString('de-DE'),
            })}`}
        </p>
      )}
    </div>
  );
}

/** Roter, pulsierender Bildschirmrand ab 70 % Unruhe. */
export function UnrestBorder() {
  const show = useGame((s) => (s.game.run?.unrest ?? 0) > cfg.balancing.unrestThresholds.danger);
  return show ? <div className={styles.border} aria-hidden="true" data-testid="unrest-border" /> : null;
}
