import { useShallow } from 'zustand/react/shallow';
import { Flag } from '../../art/flag/Flag';
import { flagFor } from '../../art/flag/flags';
import { defaultConfig } from '../../config';
import { investCost } from '../../engine/alliances';
import { canAfford, projectCost } from '../../engine/economy';
import { foreignActionBlock, foreignActionCost } from '../../engine/foreign';
import {
  FOREIGN_ACTION_IDS,
  RESOURCE_IDS,
  type ForeignId,
  type GroupId,
  type RegionId,
} from '../../engine/ids';
import { groupLoyalty, groupTier, relation, resourceMultiplier } from '../../engine/rules';
import { de, fill } from '../../i18n/de';
import { gameStore, useGame } from '../../store';
import { BottomSheet } from '../components/BottomSheet';
import { formatCost, formatGain } from '../gameText';
import styles from './Sheets.module.css';

const cfg = defaultConfig;

/** Detailfenster einer gesellschaftlichen Gruppe. */
export function GroupSheet({ id }: { id: GroupId }) {
  const v = useGame(
    useShallow((s) => {
      const run = s.game.run;
      const def = cfg.groups.find((g) => g.id === id);
      if (!run || !def) return null;
      const cost = investCost(run, id, cfg);
      return {
        loyalty: Math.round(groupLoyalty(run, id, cfg)),
        tier: groupTier(run, def, cfg),
        cost: formatCost(cost, run.stateId),
        affordable: canAfford(run.resources, cost),
        power: def.power,
        rivals: def.rivals.map((r) => de.groups[r].name).join(', '),
      };
    }),
  );
  const store = gameStore.getState();
  if (!v) return null;
  const r = cfg.allianceRules;
  const text = de.groups[id];
  return (
    <BottomSheet
      title={text.name}
      onClose={() => {
        store.closeSheet();
      }}
      testId="group-sheet"
    >
      <div className={styles.bars}>
        <div className={styles.barRow}>
          <span>{fill(de.network.loyalty, { value: v.loyalty })}</span>
          <span>
            {de.network.power} {'●'.repeat(v.power)}
          </span>
        </div>
        <div className={styles.track}>
          <div
            className={`${styles.fill} ${v.tier > 0 ? styles.full : ''}`}
            style={{ transform: `scaleX(${v.loyalty / 100})` }}
          />
        </div>
      </div>
      <p>{text.bonus}</p>
      <p className={styles.muted}>
        {fill(de.network.bonusTier, { t1: r.tier1, t2: r.tier2 })} ·{' '}
        {v.tier === 2
          ? de.network.bonusStrong
          : v.tier === 1
            ? de.network.bonusActive
            : de.network.bonusNone}
      </p>
      <p className={styles.muted}>
        {de.network.rivals}: {v.rivals || de.network.noRivals}
      </p>
      <button
        type="button"
        className={styles.primaryBuy}
        disabled={!v.affordable || v.loyalty >= 100}
        onClick={() => {
          store.investGroup(id);
        }}
        data-testid={`invest-${id}`}
      >
        <span>{de.network.invest}</span>
        <span className="num">{v.cost}</span>
        <span className={styles.small}>
          {fill(de.network.investHint, { gain: r.investGain, penalty: r.rivalPenalty })}
        </span>
      </button>
    </BottomSheet>
  );
}

/** Detailfenster eines anderen Staates mit Außenpolitik. */
export function CountrySheet({ id }: { id: ForeignId }) {
  const v = useGame(
    useShallow((s) => {
      const run = s.game.run;
      if (!run) return null;
      const treaty = run.treaties[id];
      return {
        relation: Math.round(relation(run, id, cfg)),
        trade: treaty?.trade ?? false,
        alliance: treaty?.alliance ?? false,
        blocks: FOREIGN_ACTION_IDS.map((a) => foreignActionBlock(s.game, id, a, cfg) ?? 'ok').join(
          ',',
        ),
      };
    }),
  );
  const store = gameStore.getState();
  if (!v) return null;
  const blocks = v.blocks.split(',');
  const treaties = [v.trade && de.foreign.trade, v.alliance && de.foreign.alliance]
    .filter(Boolean)
    .join(', ');
  return (
    <BottomSheet
      title={de.foreign.countries[id]}
      onClose={() => {
        store.closeSheet();
      }}
      testId="country-sheet"
    >
      <div className={styles.headRow}>
        <Flag flag={flagFor(id)} width={54} />
        <div>
          <p className={styles.muted}>{de.foreign.countryInfo[id]}</p>
          <p className="num">
            {fill(de.foreign.relation, { value: v.relation > 0 ? `+${v.relation}` : v.relation })}
          </p>
          <p className={styles.muted}>
            {de.foreign.treaties}: {treaties || de.foreign.none}
          </p>
        </div>
      </div>
      {FOREIGN_ACTION_IDS.map((action, i) => {
        const def = cfg.foreignActions.find((a) => a.id === action);
        const block = blocks[i] ?? 'locked';
        if (!def || (def.autocraticOnly && block === 'autocraticOnly')) return null;
        const text = de.foreign.actions[action];
        return (
          <div key={action} className={styles.item}>
            <div className={styles.itemInfo}>
              <span className={styles.optionTitle}>{text.name}</span>
              <span className={styles.muted}>{text.text}</span>
            </div>
            <button
              type="button"
              className={styles.buy}
              disabled={block !== 'ok'}
              onClick={() => {
                store.foreign(id, action);
              }}
              data-testid={`foreign-${action}`}
            >
              {block === 'ok' || block === 'cost'
                ? fill(de.foreign.diplomacyCost, { cost: foreignActionCost(def, cfg) })
                : de.foreign.blocks[block as keyof typeof de.foreign.blocks]}
            </button>
          </div>
        );
      })}
    </BottomSheet>
  );
}

/** Detailfenster einer Region mit ihren Wirtschaftsprojekten. */
export function RegionSheet({ id }: { id: RegionId }) {
  const rows = useGame(
    useShallow((s) => {
      const run = s.game.run;
      if (!run) return '';
      return cfg.projects
        .filter((p) => p.region === id)
        .map((p) => {
          const level = run.projects[p.id] ?? 0;
          const cost = projectCost(run, p.id, cfg);
          const out: Partial<Record<(typeof RESOURCE_IDS)[number], number>> = {};
          for (const r of RESOURCE_IDS) {
            const base = p.output[r];
            if (base) out[r] = base * resourceMultiplier(s.game, r, cfg);
          }
          return [
            p.id,
            level,
            p.maxLevel,
            formatCost(cost, run.stateId),
            canAfford(run.resources, cost) ? 1 : 0,
            formatGain(out, run.stateId, de.common.perSecond),
          ].join('~');
        })
        .join('\n');
    }),
  );
  const stateId = useGame((s) => s.game.run?.stateId ?? 'rhenania');
  const store = gameStore.getState();
  return (
    <BottomSheet
      title={de.foreign.regions[stateId][id]}
      onClose={() => {
        store.closeSheet();
      }}
      testId="region-sheet"
    >
      {rows
        .split('\n')
        .filter(Boolean)
        .map((row) => {
          const [pid = 'port', level = '0', max = '5', cost = '', ok = '0', out = ''] =
            row.split('~');
          const projectId = pid as keyof typeof de.foreign.projects;
          const maxed = Number(level) >= Number(max);
          return (
            <div key={pid} className={styles.item}>
              <div className={styles.itemInfo}>
                <span className={styles.optionTitle}>{de.foreign.projects[projectId].name}</span>
                <span className={styles.muted}>{de.foreign.projects[projectId].text}</span>
                <span className={`${styles.effects} num`}>
                  {fill(de.foreign.projectLevel, { level, max })} ·{' '}
                  {fill(de.foreign.output, { amount: out })}
                </span>
              </div>
              <button
                type="button"
                className={styles.buy}
                disabled={maxed || ok !== '1'}
                onClick={() => {
                  store.buildProject(projectId);
                }}
                data-testid={`build-${pid}`}
              >
                {maxed ? de.foreign.maxed : cost}
              </button>
            </div>
          );
        })}
    </BottomSheet>
  );
}
