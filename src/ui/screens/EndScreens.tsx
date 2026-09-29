import { useEffect, useState } from 'react';
import { Crown, Luggage, Plane, ScrollText } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { Figure } from '../../art/figure/Figure';
import { outfitFor } from '../../art/figure/outfit';
import { Flag } from '../../art/flag/Flag';
import { defaultConfig } from '../../config';
import { formatDuration, formatNumber } from '../../engine/format';
import { PROFESSION_IDS } from '../../engine/ids';
import { de, fill } from '../../i18n/de';
import { gameStore, useGame } from '../../store';
import { Button } from '../components/Button';
import { careerTitle } from '../gameText';
import styles from './EndScreens.module.css';

const cfg = defaultConfig;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <span className={`${styles.statValue} num`}>{value}</span>
    </div>
  );
}

/** Nüchterner Abschlussbildschirm nach Sturz oder Ruhestand. */
export function RunEndScreen() {
  const end = useGame((s) => s.game.pending.runEnd);
  const character = useGame((s) => s.game.character);
  if (!end) return null;
  const reason = de.runEnd.reasons[end.reason];
  return (
    <div className={styles.screen} data-testid="run-end">
      <div className={styles.inner}>
        <p className={styles.kicker}>{de.states[end.stateId].name}</p>
        <h1 className={styles.title}>{reason.title}</h1>
        <p className={styles.text}>{reason.text}</p>
        {character && (
          <div className={styles.figure} data-mood={end.reason === 'retired' ? 'calm' : 'fallen'}>
            <Figure character={character} outfit="suit" animated={false} />
          </div>
        )}
        <h2 className={styles.sub}>{de.runEnd.stats}</h2>
        <div className={styles.stats}>
          <Stat
            label={de.runEnd.highest}
            value={careerTitle({ stateId: end.stateId, stage: end.highestStage, path: end.path })}
          />
          <Stat label={de.runEnd.path} value={de.runEnd.paths[end.path]} />
          <Stat label={de.runEnd.time} value={formatDuration(end.playMs)} />
          <Stat
            label={de.runEnd.earned}
            value={`${formatNumber(end.earnedMoney)} ${cfg.states[end.stateId].currency}`}
          />
          <Stat label={de.runEnd.points} value={`+${end.points}`} />
        </div>
        <p className={styles.hint}>{de.runEnd.hint}</p>
        <Button
          block
          onClick={() => {
            gameStore.getState().newRunSetup();
          }}
          data-testid="run-end-continue"
        >
          {de.runEnd.continue}
        </Button>
      </div>
    </div>
  );
}

/** Siegesbildschirm an der Spitze: Ruhestand oder Weiterregieren. */
export function VictoryScreen() {
  const v = useGame(
    useShallow((s) => {
      const run = s.game.run;
      return run
        ? {
            stateId: run.stateId,
            path: run.path,
            stage: run.stage,
            playMs: run.playMs,
            profession: run.profession,
          }
        : null;
    }),
  );
  const character = useGame((s) => s.game.character);
  if (!v || !character) return null;
  const store = gameStore.getState();
  return (
    <div className={`${styles.screen} ${styles.victory}`} data-testid="victory">
      <div className={styles.inner}>
        <Crown size={40} aria-hidden="true" className={styles.crown} />
        <h1 className={styles.title}>{de.victory.title}</h1>
        <p className={styles.text}>{de.victory.text}</p>
        <div className={styles.figure}>
          <Figure
            character={character}
            outfit={outfitFor({ profession: v.profession, stage: 12, path: v.path })}
          />
        </div>
        <div className={styles.stats}>
          <Stat label={de.runEnd.state} value={de.states[v.stateId].name} />
          <Stat
            label={de.runEnd.highest}
            value={careerTitle({ stateId: v.stateId, stage: 12, path: v.path })}
          />
          <Stat label={de.runEnd.path} value={de.runEnd.paths[v.path]} />
          <Stat label={de.runEnd.time} value={formatDuration(v.playMs)} />
        </div>
        <button
          type="button"
          className={styles.choice}
          onClick={() => {
            store.retire();
          }}
          data-testid="retire"
        >
          <ScrollText size={22} aria-hidden="true" />
          <span className={styles.choiceTitle}>{de.victory.retire}</span>
          <span className={styles.choiceText}>{de.victory.retireText}</span>
        </button>
        <button
          type="button"
          className={styles.choice}
          onClick={() => {
            store.continueRuling();
          }}
          data-testid="continue-ruling"
        >
          <Crown size={22} aria-hidden="true" />
          <span className={styles.choiceTitle}>{de.victory.continue}</span>
          <span className={styles.choiceText}>{de.victory.continueText}</span>
        </button>
      </div>
    </div>
  );
}

/** Auswandern: Flug über eine stilisierte Karte (überspringbar), dann Berufswahl. */
export function EmigrationScreen() {
  const pending = useGame((s) => s.game.pending.emigration);
  const [landed, setLanded] = useState(false);
  const reduced =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  useEffect(() => {
    const id = window.setTimeout(
      () => {
        setLanded(true);
      },
      reduced ? 600 : 3000,
    );
    return () => {
      window.clearTimeout(id);
    };
  }, [reduced]);
  if (!pending) return null;
  const to = de.states[pending.to].name;
  if (!landed) {
    return (
      <div
        className={`${styles.screen} ${styles.flight}`}
        data-testid="emigration-flight"
        onClick={() => {
          setLanded(true);
        }}
      >
        <p className={styles.kicker}>{fill(de.emigration.flying, { country: to })}</p>
        <div className={styles.map}>
          <div className={styles.from}>
            <Flag flag={cfg.states[pending.from].flag} width={64} />
            <Luggage size={26} className={styles.suitcase} aria-hidden="true" />
          </div>
          <svg viewBox="0 0 300 120" className={styles.route} aria-hidden="true">
            <path
              d="M20 100 Q150 -20 280 100"
              fill="none"
              stroke="rgb(255 255 255 / 45%)"
              strokeWidth="2"
              strokeDasharray="6 6"
            />
          </svg>
          <Plane size={30} className={styles.planeIcon} aria-hidden="true" />
          <div className={styles.to}>
            <Flag flag={cfg.states[pending.to].flag} width={64} />
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            setLanded(true);
          }}
        >
          {de.emigration.skip}
        </Button>
      </div>
    );
  }
  return (
    <div className={styles.screen} data-testid="emigration-profession">
      <div className={styles.inner}>
        <h1 className={styles.title}>{fill(de.emigration.professionTitle, { country: to })}</h1>
        {PROFESSION_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className={styles.choice}
            onClick={() => {
              gameStore.getState().completeEmigration(id, Date.now());
            }}
            data-testid={`emigration-profession-${id}`}
          >
            <span className={styles.choiceTitle}>{de.professions[id].name}</span>
            <span className={styles.choiceText}>
              {[...de.professions[id].pros, ...de.professions[id].cons].join(' · ')}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
