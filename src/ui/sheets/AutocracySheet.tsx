import { useShallow } from 'zustand/react/shallow';
import { defaultConfig } from '../../config';
import { autocracyCooldownKey, autocracyCost } from '../../engine/autocracy';
import { canAfford } from '../../engine/economy';
import { AUTOCRACY_ACTION_IDS } from '../../engine/ids';
import { de, fill } from '../../i18n/de';
import { gameStore, useGame } from '../../store';
import { BottomSheet } from '../components/BottomSheet';
import { formatCost } from '../gameText';
import styles from './Sheets.module.css';

const cfg = defaultConfig;

function sign(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

/** Autokratische Aktionen mit Vorschau der Folgen. */
export function AutocracySheet() {
  const rows = useGame(
    useShallow((s) => {
      const run = s.game.run;
      if (!run) return '';
      return cfg.balancing.autocracy.actions
        .map((a) => {
          const cost = autocracyCost(run, a, cfg);
          const until = run.cooldowns[autocracyCooldownKey(a.id)] ?? 0;
          const wait = Math.max(0, Math.ceil((until - run.playMs) / 1000));
          return [
            a.id,
            formatCost(cost, run.stateId),
            canAfford(run.resources, cost) ? 1 : 0,
            wait,
          ].join('~');
        })
        .join('\n');
    }),
  );
  const store = gameStore.getState();
  const byId = new Map(
    rows.split('\n').map((r) => {
      const [id = '', cost = '', ok = '0', wait = '0'] = r.split('~');
      return [id, { cost, ok: ok === '1', wait: Number(wait) }] as const;
    }),
  );
  return (
    <BottomSheet
      title={de.autocracy.title}
      onClose={() => {
        store.closeSheet();
      }}
      testId="autocracy-sheet"
    >
      {AUTOCRACY_ACTION_IDS.map((id) => {
        const def = cfg.balancing.autocracy.actions.find((a) => a.id === id);
        const row = byId.get(id);
        if (!def || !row) return null;
        const effects = [
          def.approval !== 0 && `${de.autocracy.effect.approval} ${sign(def.approval)}`,
          def.unrest !== 0 && `${de.autocracy.effect.unrest} ${sign(def.unrest)}`,
          def.loyalty !== 0 && `${de.autocracy.effect.loyalty} ${sign(def.loyalty)}`,
          def.relations !== 0 && `${de.autocracy.effect.relations} ${sign(def.relations)}`,
        ].filter(Boolean);
        return (
          <div key={id} className={styles.item}>
            <div className={styles.itemInfo}>
              <span className={styles.optionTitle}>{de.autocracy.actions[id].name}</span>
              <span className={styles.muted}>{de.autocracy.actions[id].text}</span>
              <span className={`${styles.effects} num`}>
                {de.autocracy.preview}: {effects.join(' · ')}
              </span>
            </div>
            <button
              type="button"
              className={styles.buy}
              disabled={!row.ok || row.wait > 0}
              onClick={() => {
                store.autocracy(id);
              }}
              data-testid={`autocracy-${id}`}
            >
              {row.wait > 0 ? fill(de.autocracy.cooldown, { seconds: row.wait }) : row.cost}
            </button>
          </div>
        );
      })}
    </BottomSheet>
  );
}
