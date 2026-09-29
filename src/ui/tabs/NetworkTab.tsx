import { useShallow } from 'zustand/react/shallow';
import { Figure } from '../../art/figure/Figure';
import { outfitFor } from '../../art/figure/outfit';
import { defaultConfig } from '../../config';
import type { GroupId } from '../../engine/ids';
import { groupLoyalty, groupsFor, groupTier } from '../../engine/rules';
import { de } from '../../i18n/de';
import { gameStore, useGame } from '../../store';
import { LockedTab } from './LockedTab';
import styles from './NetworkTab.module.css';

const cfg = defaultConfig;
const SIZE = 340;
const C = SIZE / 2;
const RING = 118;

interface Node {
  id: GroupId;
  loyalty: number;
  power: number;
  tier: number;
  x: number;
  y: number;
  r: number;
}

/**
 * Beziehungsnetz (Democracy-4-Stil): du in der Mitte, Gruppen als Kreise.
 * Größe = Macht, Füllung = Loyalität, dicke Linie = starke Allianz, rot gestrichelt = Spannung.
 */
export function NetworkTab() {
  const key = useGame((s) => {
    const run = s.game.run;
    if (!run) return '';
    return groupsFor(run, cfg)
      .map(
        (g) =>
          `${g.id}:${Math.round(groupLoyalty(run, g.id, cfg))}:${g.power}:${groupTier(run, g, cfg)}`,
      )
      .join('|');
  });
  const figure = useGame(
    useShallow((s) => ({
      character: s.game.character,
      outfit: s.game.run ? outfitFor(s.game.run) : ('officeShirt' as const),
    })),
  );
  if (!key) return <LockedTab title={de.network.title} text={de.network.lockedText} />;

  const entries = key.split('|');
  const nodes: Node[] = entries.map((entry, i) => {
    const [id = 'unions', loyalty = '0', power = '1', tier = '0'] = entry.split(':');
    const angle = (i / entries.length) * Math.PI * 2 - Math.PI / 2;
    return {
      id: id as GroupId,
      loyalty: Number(loyalty),
      power: Number(power),
      tier: Number(tier),
      x: C + Math.cos(angle) * RING,
      y: C + Math.sin(angle) * RING,
      r: 20 + Number(power) * 6,
    };
  });
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const rules = cfg.allianceRules;
  const tensions: [Node, Node][] = [];
  for (const n of nodes) {
    const def = cfg.groups.find((g) => g.id === n.id);
    for (const rival of def?.rivals ?? []) {
      const other = byId.get(rival);
      // Spannung, wenn eine der beiden Seiten verärgert ist (jede Paarung nur einmal)
      if (
        other &&
        n.id < other.id &&
        (n.loyalty < rules.tension ||
          other.loyalty < rules.tension ||
          Math.abs(n.loyalty - other.loyalty) > 40)
      ) {
        tensions.push([n, other]);
      }
    }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{de.network.title}</h1>
      <div className={styles.graph}>
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className={styles.svg}
          role="img"
          aria-label={de.network.legend}
        >
          {tensions.map(([a, b]) => (
            <line
              key={`${a.id}-${b.id}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              className={styles.tension}
            />
          ))}
          {nodes.map((n) => (
            <line
              key={`l-${n.id}`}
              x1={C}
              y1={C}
              x2={n.x}
              y2={n.y}
              className={styles.link}
              strokeWidth={n.loyalty >= rules.strongLink ? 6 : n.loyalty >= rules.tier1 ? 3 : 1.5}
              opacity={0.35 + n.loyalty / 160}
            />
          ))}
          <circle cx={C} cy={C} r={34} className={styles.center} />
          {nodes.map((n) => (
            <g key={n.id}>
              <circle cx={n.x} cy={n.y} r={n.r} className={styles.ring} />
              {/* Füllgrad = Loyalität: Kreis wird von unten gefüllt */}
              <clipPath id={`clip-${n.id}`}>
                <rect
                  x={n.x - n.r}
                  y={n.y + n.r - (2 * n.r * n.loyalty) / 100}
                  width={n.r * 2}
                  height={(2 * n.r * n.loyalty) / 100}
                />
              </clipPath>
              <circle
                cx={n.x}
                cy={n.y}
                r={n.r - 2}
                className={styles.fill}
                data-tier={n.tier}
                clipPath={`url(#clip-${n.id})`}
              />
              <text x={n.x} y={n.y + 4} textAnchor="middle" className={styles.pct}>
                {n.loyalty}
              </text>
              <text x={n.x} y={n.y + n.r + 13} textAnchor="middle" className={styles.name}>
                {de.groups[n.id].name}
              </text>
            </g>
          ))}
        </svg>
        {figure.character && (
          <div className={styles.me}>
            <Figure character={figure.character} outfit={figure.outfit} animated={false} />
          </div>
        )}
        {nodes.map((n) => (
          <button
            key={n.id}
            type="button"
            className={styles.hit}
            style={{
              left: `${((n.x - n.r - 6) / SIZE) * 100}%`,
              top: `${((n.y - n.r - 6) / SIZE) * 100}%`,
              width: `${((2 * n.r + 12) / SIZE) * 100}%`,
              height: `${((2 * n.r + 12) / SIZE) * 100}%`,
            }}
            onClick={() => gameStore.getState().openSheet({ kind: 'group', id: n.id })}
            aria-label={`${de.groups[n.id].name}, ${n.loyalty} %`}
            data-testid={`group-${n.id}`}
          />
        ))}
      </div>
      <p className={styles.legend}>{de.network.legend}</p>
    </div>
  );
}
