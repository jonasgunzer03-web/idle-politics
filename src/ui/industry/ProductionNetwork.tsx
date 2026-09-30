import {
  Banknote,
  Beer,
  Building2,
  Columns3,
  Crown,
  Factory,
  Flag,
  Globe,
  Landmark,
  Newspaper,
  Store,
  type LucideIcon,
} from 'lucide-react';
import { defaultConfig } from '../../config';
import { GOOD_IDS, type LocationId } from '../../engine/ids';
import {
  chainSnapshot,
  goodRoutes,
  isBuildingOpen,
  routeState,
  staffInBuilding,
  type RouteState,
} from '../../engine/production';
import { de } from '../../i18n/de';
import { gameStore, useGame } from '../../store';
import { locationName } from '../gameText';
import styles from './Network.module.css';

// Produktionsnetz: Gebäude als Knoten, Warenströme als Linien mit wandernden Punkten.
// Rot = die Verbraucher-Linie stockt, weil diese Ware fehlt.

const cfg = defaultConfig;
const W = 360;
const H = 340;

/** Feste Plätze im Netz: links Hersteller, Mitte Parteibüro, rechts Verbraucher. */
const POS: Record<LocationId, { x: number; y: number }> = {
  workplace: { x: 58, y: 48 },
  pub: { x: 58, y: 150 },
  townHall: { x: 58, y: 230 },
  ministry: { x: 58, y: 306 },
  partyOffice: { x: 180, y: 150 },
  market: { x: 302, y: 48 },
  embassy: { x: 302, y: 112 },
  newspaper: { x: 302, y: 176 },
  bank: { x: 302, y: 232 },
  parliament: { x: 226, y: 306 },
  palace: { x: 306, y: 300 },
};

const ICONS: Record<LocationId, LucideIcon> = {
  workplace: Factory,
  pub: Beer,
  market: Store,
  partyOffice: Flag,
  townHall: Landmark,
  newspaper: Newspaper,
  bank: Banknote,
  parliament: Columns3,
  ministry: Building2,
  embassy: Globe,
  palace: Crown,
};

const EDGES = goodRoutes(cfg);

export function ProductionNetwork() {
  // Zustand aller Kanten und Knoten als ein Text (nur neu zeichnen, wenn sich etwas ändert)
  const key = useGame((s) => {
    const run = s.game.run;
    if (!run) return '';
    const chain = chainSnapshot(s.game, cfg);
    const edges = EDGES.map((e) => routeState(run, e, chain.flows, cfg));
    const nodes = (Object.keys(POS) as LocationId[]).map((loc) => {
      if (!isBuildingOpen(run, loc, cfg)) return 'x';
      const blocked = chain.flows.some(
        (f) =>
          f.blockedBy !== null && cfg.world.actions.find((a) => a.id === f.id)?.location === loc,
      );
      return `${staffInBuilding(run, loc, cfg)}${blocked ? '!' : ''}`;
    });
    return `${edges.join(',')}|${nodes.join(',')}|${run.profession}`;
  });
  const [edgePart = '', nodePart = '', profession = 'skilled'] = key.split('|');
  const edgeStates = edgePart.split(',') as RouteState[];
  const nodeStates = nodePart.split(',');
  const office = profession === 'office';
  const locs = Object.keys(POS) as LocationId[];

  return (
    <div className={styles.outer} data-testid="production-network">
      <div className={styles.wrap}>
        <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} aria-hidden="true">
          {EDGES.map((e, i) => {
            const state = edgeStates[i] ?? 'off';
            if (state === 'off') return null;
            const a = POS[e.from];
            const b = POS[e.to];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const length = Math.hypot(dx, dy);
            const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
            const color = state === 'blocked' ? 'var(--bad)' : `var(--goods-${e.good})`;
            return (
              <g
                key={`${e.from}-${e.to}-${e.good}`}
                transform={`translate(${a.x} ${a.y}) rotate(${angle})`}
              >
                <line
                  x1={0}
                  y1={0}
                  x2={length}
                  y2={0}
                  style={{ stroke: color }}
                  strokeWidth={state === 'flow' ? 4 : 2.5}
                  strokeDasharray={state === 'idle' ? '4 6' : undefined}
                  opacity={state === 'idle' ? 0.45 : 0.85}
                  strokeLinecap="round"
                />
                {state === 'flow' &&
                  [0, 1, 2].map((k) => (
                    <circle
                      key={k}
                      r={3.2}
                      className={styles.dot}
                      style={{
                        fill: color,
                        ['--len' as string]: `${length}px`,
                        animationDelay: `${-k * 0.8}s`,
                      }}
                    />
                  ))}
              </g>
            );
          })}
        </svg>
        {locs.map((loc, i) => {
          const state = nodeStates[i] ?? 'x';
          const open = state !== 'x';
          const blocked = state.endsWith('!');
          const staff = open ? Number(state.replace('!', '')) : 0;
          const Icon = ICONS[loc];
          const p = POS[loc];
          return (
            <button
              key={loc}
              type="button"
              className={styles.node}
              data-open={open ? 'true' : 'false'}
              data-blocked={blocked ? 'true' : 'false'}
              style={{ left: `${(p.x / W) * 100}%`, top: `${(p.y / H) * 100}%` }}
              disabled={!open}
              onClick={() => {
                gameStore.getState().walkTo(loc);
              }}
              aria-label={`${locationName(loc, office)}: ${de.industry.economy.walk}`}
            >
              <span className={styles.nodeIcon}>
                <Icon size={20} aria-hidden="true" />
                {staff > 0 && <span className={`${styles.count} num`}>{staff}</span>}
              </span>
              <span className={styles.nodeLabel}>{locationName(loc, office)}</span>
            </button>
          );
        })}
      </div>
      <div className={styles.legend}>
        {GOOD_IDS.map((g) => (
          <span key={g} className={styles.legendItem}>
            <span className={styles.swatch} style={{ background: `var(--goods-${g})` }} />
            {office ? de.industry.goods[g].office : de.industry.goods[g].name}
          </span>
        ))}
        <span className={styles.legendItem}>
          <span className={styles.swatch} style={{ background: 'var(--bad)' }} />
          {de.industry.economy.bottleneckShort}
        </span>
      </div>
    </div>
  );
}
