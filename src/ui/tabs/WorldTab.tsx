import { Factory, Landmark, Tractor, Wheat, type LucideIcon } from 'lucide-react';
import { Flag } from '../../art/flag/Flag';
import { defaultConfig } from '../../config';
import { REGION_IDS, type ForeignId, type RegionId } from '../../engine/ids';
import { foreignPartners, isWorldUnlocked, relation } from '../../engine/rules';
import { de } from '../../i18n/de';
import { gameStore, useGame } from '../../store';
import { flagFor } from '../sheets/RelationSheets';
import { LockedTab } from './LockedTab';
import styles from './WorldTab.module.css';

const cfg = defaultConfig;
const W = 360;
const H = 380;
const HOME = { x: W / 2, y: H / 2 + 10 };

const REGION_POS: Record<RegionId, { dx: number; dy: number; icon: LucideIcon }> = {
  north: { dx: 0, dy: -58, icon: Landmark },
  east: { dx: 58, dy: 0, icon: Factory },
  south: { dx: 0, dy: 58, icon: Wheat },
  west: { dx: -58, dy: 0, icon: Tractor },
};

/** Farbe einer Beziehung: rot (−100) über grau zu grün (+100). */
function relationColor(value: number): string {
  if (value >= 25) return 'var(--good)';
  if (value <= -25) return 'var(--bad)';
  return 'var(--text-muted)';
}

/**
 * Welt-Karte (Infografik, keine echte Geografie): das eigene Land mit vier Regionen in der
 * Mitte, die anderen Staaten als Kreise darum. Linienfarbe = Beziehung.
 */
export function WorldTab() {
  const key = useGame((s) => {
    const run = s.game.run;
    if (!run || !isWorldUnlocked(run, cfg)) return '';
    const partners = foreignPartners(run)
      .map((id) => `${id}:${Math.round(relation(run, id, cfg))}:${run.treaties[id]?.trade ? 1 : 0}:${run.treaties[id]?.alliance ? 1 : 0}`)
      .join('|');
    const projects = REGION_IDS.map((r) => cfg.projects.filter((p) => p.region === r).reduce((sum, p) => sum + (run.projects[p.id] ?? 0), 0)).join(',');
    return `${run.stateId}#${partners}#${projects}`;
  });
  if (!key) return <LockedTab title={de.foreign.title} text={de.foreign.lockedText} />;

  const [stateId = 'rhenania', partnerStr = '', projectStr = ''] = key.split('#');
  const own = stateId as keyof typeof cfg.states;
  const partners = partnerStr.split('|').map((e, i, arr) => {
    const [id = 'valmora', rel = '0', trade = '0', alliance = '0'] = e.split(':');
    const angle = (i / arr.length) * Math.PI * 2 - Math.PI / 2 + 0.3;
    return {
      id: id as ForeignId,
      relation: Number(rel),
      trade: trade === '1',
      alliance: alliance === '1',
      x: HOME.x + Math.cos(angle) * 140,
      y: HOME.y + Math.sin(angle) * 140,
    };
  });
  const levels = projectStr.split(',').map(Number);
  const store = gameStore.getState();

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{de.foreign.title}</h1>
      <div className={styles.map}>
        <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} role="img" aria-label={de.foreign.title}>
          {partners.map((p) => (
            <line
              key={p.id}
              x1={HOME.x}
              y1={HOME.y}
              x2={p.x}
              y2={p.y}
              stroke={relationColor(p.relation)}
              strokeWidth={p.alliance ? 6 : p.trade ? 4 : 2}
              strokeDasharray={p.relation <= -25 ? '6 5' : undefined}
              opacity={0.8}
            />
          ))}
          <circle cx={HOME.x} cy={HOME.y} r={92} className={styles.home} />
          {REGION_IDS.map((r, i) => {
            const pos = REGION_POS[r];
            return (
              <g key={r}>
                <circle cx={HOME.x + pos.dx} cy={HOME.y + pos.dy} r={28} className={styles.region} data-level={Math.min(3, Math.ceil((levels[i] ?? 0) / 3))} />
                <text x={HOME.x + pos.dx} y={HOME.y + pos.dy + 40} textAnchor="middle" className={styles.label}>
                  {de.foreign.regions[own][r]}
                </text>
              </g>
            );
          })}
          {partners.map((p) => (
            <g key={`n-${p.id}`}>
              <circle cx={p.x} cy={p.y} r={30} className={styles.country} />
              <text x={p.x} y={p.y + 44} textAnchor="middle" className={styles.label}>
                {de.foreign.countries[p.id]}
              </text>
              <text x={p.x} y={p.y + 56} textAnchor="middle" className={styles.rel} fill={relationColor(p.relation)}>
                {p.relation > 0 ? `+${p.relation}` : p.relation}
              </text>
            </g>
          ))}
        </svg>
        <div className={styles.homeFlag} style={{ left: `${(HOME.x / W) * 100}%`, top: `${(HOME.y / H) * 100}%` }}>
          <Flag flag={cfg.states[own].flag} width={40} />
        </div>
        {REGION_IDS.map((r) => {
          const pos = REGION_POS[r];
          const Icon = pos.icon;
          return (
            <button
              key={r}
              type="button"
              className={styles.hitRegion}
              style={{ left: `${((HOME.x + pos.dx) / W) * 100}%`, top: `${((HOME.y + pos.dy) / H) * 100}%` }}
              onClick={() => store.openSheet({ kind: 'region', id: r })}
              aria-label={de.foreign.regions[own][r]}
              data-testid={`region-${r}`}
            >
              <Icon size={20} aria-hidden="true" />
            </button>
          );
        })}
        {partners.map((p) => (
          <button
            key={p.id}
            type="button"
            className={styles.hitCountry}
            style={{ left: `${(p.x / W) * 100}%`, top: `${(p.y / H) * 100}%` }}
            onClick={() => store.openSheet({ kind: 'country', id: p.id })}
            aria-label={`${de.foreign.countries[p.id]}, ${p.relation}`}
            data-testid={`country-${p.id}`}
          >
            <Flag flag={flagFor(p.id)} width={36} />
          </button>
        ))}
      </div>
    </div>
  );
}
