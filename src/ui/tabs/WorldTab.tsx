import { Factory, Landmark, Tractor, Wheat, type LucideIcon } from 'lucide-react';
import { Flag } from '../../art/flag/Flag';
import { flagFor } from '../../art/flag/flags';
import { COUNTRY_SHAPES } from '../../art/map/geography';
import { MAP_H, MAP_W, WorldMap, provinceCenters, type MapPartner } from '../../art/map/WorldMap';
import { defaultConfig } from '../../config';
import { REGION_IDS, type ForeignId, type RegionId } from '../../engine/ids';
import { foreignPartners, isWorldUnlocked, relation } from '../../engine/rules';
import { de } from '../../i18n/de';
import { gameStore, useGame } from '../../store';
import { LockedTab } from './LockedTab';
import styles from './WorldTab.module.css';

const cfg = defaultConfig;

const REGION_ICONS: Record<RegionId, LucideIcon> = {
  north: Landmark,
  east: Factory,
  south: Wheat,
  west: Tractor,
};

function tone(value: number): 'good' | 'bad' | 'neutral' {
  if (value >= 25) return 'good';
  if (value <= -25) return 'bad';
  return 'neutral';
}

/**
 * Weltkarte: ein erfundener Kontinent. Das eigene Land mit vier Provinzen (antippen =
 * Wirtschaftsprojekte), die Nachbarn mit Flagge (antippen = Außenpolitik).
 */
export function WorldTab() {
  const key = useGame((s) => {
    const run = s.game.run;
    if (!run || !isWorldUnlocked(run, cfg)) return '';
    const partners = foreignPartners(run)
      .map(
        (id) =>
          `${id}:${Math.round(relation(run, id, cfg))}:${run.treaties[id]?.trade ? 1 : 0}:${run.treaties[id]?.alliance ? 1 : 0}`,
      )
      .join('|');
    const projects = REGION_IDS.map((r) =>
      cfg.projects
        .filter((p) => p.region === r)
        .reduce((sum, p) => sum + (run.projects[p.id] ?? 0), 0),
    ).join(',');
    return `${run.stateId}#${partners}#${projects}`;
  });
  if (!key) return <LockedTab title={de.foreign.title} text={de.foreign.lockedText} />;

  const [stateId = 'rhenania', partnerStr = '', projectStr = ''] = key.split('#');
  const own = stateId as ForeignId & keyof typeof cfg.states;
  const partners: MapPartner[] = partnerStr.split('|').map((e) => {
    const [id = 'valmora', rel = '0', trade = '0', alliance = '0'] = e.split(':');
    return {
      id: id as ForeignId,
      relation: Number(rel),
      trade: trade === '1',
      alliance: alliance === '1',
    };
  });
  const sums = projectStr.split(',').map(Number);
  const levels = Object.fromEntries(
    REGION_IDS.map((r, i) => [r, Math.min(3, Math.ceil((sums[i] ?? 0) / 3))]),
  ) as Record<RegionId, number>;
  const centers = provinceCenters(own);
  const store = gameStore.getState();
  const pct = (x: number, y: number) => ({
    left: `${(x / MAP_W) * 100}%`,
    top: `${(y / MAP_H) * 100}%`,
  });
  const [ox, oy] = COUNTRY_SHAPES[own].center;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{de.foreign.title}</h1>
      <div className={styles.map}>
        <WorldMap own={own} partners={partners} levels={levels} />
        <div className={styles.capital} style={pct(ox, oy)}>
          <Flag flag={cfg.states[own].flag} width={26} />
        </div>
        {REGION_IDS.map((r) => {
          const Icon = REGION_ICONS[r];
          // Etwas nach außen gerückt, damit Hauptstadt und Knöpfe sich nicht verdecken
          const x = ox + (centers[r][0] - ox) * 1.4;
          const y = oy + (centers[r][1] - oy) * 1.4;
          return (
            <button
              key={r}
              type="button"
              className={styles.hitRegion}
              data-level={levels[r]}
              style={pct(x, y)}
              onClick={() => store.openSheet({ kind: 'region', id: r })}
              aria-label={de.foreign.regions[own][r]}
              data-testid={`region-${r}`}
            >
              <span className={styles.regionDot}>
                <Icon size={16} strokeWidth={2.6} aria-hidden="true" />
              </span>
            </button>
          );
        })}
        {partners.map((p) => {
          const [x, y] = COUNTRY_SHAPES[p.id].center;
          return (
            <button
              key={p.id}
              type="button"
              className={styles.hitCountry}
              style={pct(x, y)}
              onClick={() => store.openSheet({ kind: 'country', id: p.id })}
              aria-label={`${de.foreign.countries[p.id]}, ${p.relation}`}
              data-testid={`country-${p.id}`}
            >
              <span className={styles.pin}>
                <Flag flag={flagFor(p.id)} width={30} />
              </span>
              <span className={styles.countryName}>{de.foreign.countries[p.id]}</span>
              <span className={`${styles.rel} game-num`} data-tone={tone(p.relation)}>
                {p.relation > 0 ? `+${p.relation}` : p.relation}
              </span>
            </button>
          );
        })}
      </div>
      <ul className={styles.legend}>
        <li data-kind="good">{de.foreign.mapLegend.friend}</li>
        <li data-kind="bad">{de.foreign.mapLegend.enemy}</li>
        <li data-kind="trade">{de.foreign.mapLegend.trade}</li>
        <li data-kind="alliance">{de.foreign.mapLegend.alliance}</li>
      </ul>
    </div>
  );
}
