import { useState } from 'react';
import { Lock } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { defaultConfig } from '../../config';
import type { BuyMode } from '../../engine/economy';
import type { GeneratorId, ResourceId } from '../../engine/ids';
import { isResourceUnlocked, resourceUnlockStage } from '../../engine/unlocks';
import { de, fill } from '../../i18n/de';
import { useGame } from '../../store';
import { GeneratorRow } from '../components/GeneratorRow';
import { ResourceIcon } from '../components/ResourceIcon';
import styles from './InvestTab.module.css';

const cfg = defaultConfig;
const MODES: { mode: BuyMode; label: string }[] = [
  { mode: 1, label: de.invest.modes.one },
  { mode: 10, label: de.invest.modes.ten },
  { mode: 'max', label: de.invest.modes.max },
];
// Reihenfolge der Gruppen im Tab (Loyalität und Diplomatie folgen in späteren Phasen)
const GROUPS: ResourceId[] = ['money', 'influence', 'followers'];

interface GroupView {
  unlocked: boolean;
  unlockStage: number;
  /**
   * Freigeschaltete Generatoren plus der nächste gesperrte als Ausblick, als Text mit
   * Kommas. Ein Text statt eines Arrays, damit der flache Vergleich greift (ein neues
   * Array bei jedem Aufruf führte zu einer Endlosschleife).
   */
  idList: string;
}

function Group({ resource, mode }: { resource: ResourceId; mode: BuyMode }) {
  const view = useGame(
    useShallow((s): GroupView => {
      const run = s.game.run;
      const defs = cfg.balancing.generators.filter((g) => g.produces === resource);
      if (!run) return { unlocked: false, unlockStage: 1, idList: '' };
      const open = defs.filter((g) => run.stage >= g.unlockStage).map((g) => g.id);
      const next = defs.find((g) => run.stage < g.unlockStage);
      return {
        unlocked: isResourceUnlocked(run, resource, cfg),
        unlockStage: resourceUnlockStage(run.stateId, resource, cfg),
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
      {GROUPS.map((resource) => (
        <Group key={resource} resource={resource} mode={mode} />
      ))}
    </div>
  );
}
