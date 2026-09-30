import { Megaphone } from 'lucide-react';
import { Bust, type BustMood } from '../../art/people/Bust';
import { moodOf, OUTFIT_BY_LOCATION } from './crew';
import { defaultConfig } from '../../config';
import type { LocationId } from '../../engine/ids';
import { hash32, workerProfile } from '../../engine/people';
import { staffInBuilding } from '../../engine/production';
import { de, fill } from '../../i18n/de';
import { useGame } from '../../store';
import { personName, roleName } from '../peopleText';
import styles from './Industry.module.css';

const cfg = defaultConfig;
/** So viele Mitarbeiter werden einzeln gezeigt. */
const SHOWN = 12;

/** Stimmungsbalken der ganzen Belegschaft (auch im Wirtschafts-Tab genutzt). */
export function MoraleBar() {
  const text = useGame((s) => {
    const run = s.game.run;
    return run ? `${Math.round(run.morale)}|${run.striking ? 1 : 0}` : '60|0';
  });
  const [morale = 60, striking = 0] = text.split('|').map(Number);
  const mood = moodOf(morale, striking === 1);
  const color = mood === 'happy' ? 'var(--good)' : mood === 'angry' ? 'var(--bad)' : 'var(--warn)';
  return (
    <div className={styles.stack}>
      <div className={styles.moraleRow}>
        <Bust
          seed={7}
          mood={mood}
          outfit="overall"
          className={styles.moraleFace}
          background="var(--surface-2)"
        />
        <div style={{ flex: 1 }}>
          <div className={styles.cardHead}>
            <span className={styles.muted} style={{ flex: 1 }}>
              {de.industry.ui.morale}
            </span>
            <span className={`${styles.small} num`}>{morale} %</span>
          </div>
          <div className={styles.bar}>
            <div
              className={styles.barFill}
              style={{ transform: `scaleX(${morale / 100})`, background: color }}
            />
          </div>
        </div>
      </div>
      {striking === 1 && (
        <p className={styles.strike} role="status">
          <Megaphone size={18} aria-hidden="true" />
          {de.industry.ui.strike}
        </p>
      )}
    </div>
  );
}

/** Reiter „Team“: die Belegschaft mit Namen, Gesichtern und Eigenschaften. */
export function TeamTab({ location }: { location: LocationId }) {
  const key = useGame((s) => {
    const run = s.game.run;
    if (!run) return '';
    const mood = moodOf(run.morale, run.striking);
    return `${run.seed}|${staffInBuilding(run, location, cfg)}|${mood}|${run.profession}`;
  });
  const [seedText = '0', countText = '0', mood = 'neutral', profession = 'skilled'] =
    key.split('|');
  const seed = Number(seedText);
  const count = Number(countText);
  const office = profession === 'office';
  const shown = Math.min(SHOWN, count);
  return (
    <div className={styles.stack}>
      <div className={styles.card}>
        <MoraleBar />
      </div>
      <h3 className={styles.sectionTitle}>{de.industry.ui.team}</h3>
      {count === 0 && <p className={styles.muted}>{de.industry.ui.teamEmpty}</p>}
      <div className={styles.people}>
        {Array.from({ length: shown }, (_, i) => {
          const profile = workerProfile(seed, location, i);
          const core = i < cfg.industry.coreCrew;
          const trait = de.industry.traits[profile.trait];
          // Nicht alle gleich gelaunt: ein Teil der Belegschaft weicht ab
          const personalMood = (hash32(profile.look, 9) % 4 === 0 ? 'neutral' : mood) as BustMood;
          return (
            <div key={i} className={styles.person} data-core={core ? 'true' : 'false'}>
              <Bust
                seed={profile.look}
                outfit={OUTFIT_BY_LOCATION[location]}
                mood={personalMood}
                className={styles.avatar}
                background="var(--surface-2)"
              />
              <div className={styles.personText}>
                <span className={styles.personName}>{personName(profile)}</span>
                <span className={styles.small}>{roleName(location, office)}</span>
                <span className={styles.small}>
                  {core ? `${trait.name}: ${trait.text}` : trait.name}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {count > shown && (
        <p className={styles.muted}>{fill(de.industry.ui.teamMore, { count: count - shown })}</p>
      )}
      {count > 0 && (
        <p className={styles.small}>
          {de.industry.ui.coreCrew}: {Math.min(count, cfg.industry.coreCrew)}
        </p>
      )}
    </div>
  );
}
