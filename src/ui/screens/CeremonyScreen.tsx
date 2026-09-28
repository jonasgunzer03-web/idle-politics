import { useEffect, type CSSProperties } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Figure } from '../../art/figure/Figure';
import { outfitFor } from '../../art/figure/outfit';
import { Flag } from '../../art/flag/Flag';
import { Npc } from '../../art/world/People';
import { defaultConfig } from '../../config';
import { partyColors } from '../../config/appearance';
import { de } from '../../i18n/de';
import { gameStore, useGame } from '../../store';
import { careerTitle } from '../gameText';
import styles from './CeremonyScreen.module.css';

const cfg = defaultConfig;

/** Größenordnung der Zeremonie je Stufe (Spezifikation 5.6). */
export function ceremonyTier(stage: number): 0 | 1 | 2 | 3 | 4 {
  if (stage <= 3) return 0;
  if (stage <= 6) return 1;
  if (stage <= 9) return 2;
  if (stage <= 11) return 3;
  return 4;
}

/** Dauer in ms: 2 bis 6 Sekunden je nach Größe. */
export const CEREMONY_MS = [2500, 3300, 4200, 5100, 6000] as const;
const CROWD = [2, 6, 10, 16, 22] as const;
const FLAGS = [0, 2, 4, 6, 10] as const;

/** Vereidigung beim Aufstieg. Wächst mit dem Amt; ab dem zweiten Mal per Tipp überspringbar. */
export function CeremonyScreen() {
  const v = useGame(
    useShallow((s) => {
      const run = s.game.run;
      const stage = s.game.pending.ceremony?.stage ?? run?.stage ?? 1;
      if (!run) return null;
      return {
        stage,
        title: careerTitle({ ...run, stage }),
        stateId: run.stateId,
        profession: run.profession,
        path: run.path,
        skippable: s.game.meta.ceremoniesSeen.includes(stage),
      };
    }),
  );
  const character = useGame((s) => s.game.character);
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tier = ceremonyTier(v?.stage ?? 1);
  const duration = reduced ? 1500 : CEREMONY_MS[tier];

  useEffect(() => {
    // Nach Ablauf plus kurzer Titel-Einblendung automatisch weiter
    const id = window.setTimeout(() => {
      gameStore.getState().finishCeremony();
    }, duration + 1400);
    return () => {
      window.clearTimeout(id);
    };
  }, [duration]);

  if (!v || !character) return null;
  const autocratic = v.path === 'autocratic';
  const state = cfg.states[v.stateId];
  const party = partyColors[character.party.color] ?? '#b3261e';
  const skip = () => {
    if (v.skippable) gameStore.getState().finishCeremony();
  };

  return (
    <div
      className={styles.screen}
      data-tier={tier}
      data-autocratic={autocratic ? 'true' : 'false'}
      style={{ '--dur': `${duration}ms`, '--party': party, '--primary': state.palette.primary } as CSSProperties}
      onClick={skip}
      role="dialog"
      aria-label={`${de.ceremony.newTitle}: ${v.title}`}
      data-testid="ceremony"
    >
      <div className={styles.backdrop} />
      <p className={styles.caption}>{autocratic && tier >= 2 ? de.ceremony.autocratic : de.ceremony.tiers[tier]}</p>

      {FLAGS[tier] > 0 && (
        <div className={styles.flags}>
          {Array.from({ length: FLAGS[tier] }, (_, i) => (
            <div key={i} className={styles.flagPole} style={{ animationDelay: `${i * 0.15}s` }}>
              <Flag flag={state.flag} width={34} />
            </div>
          ))}
        </div>
      )}

      {tier === 4 && (
        <div className={styles.planes} aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <svg key={i} viewBox="0 0 60 20" className={styles.plane} style={{ animationDelay: `${i * 0.25}s`, top: `${6 + i * 5}%` }}>
              <path d="M0 10 L40 8 L52 2 L56 2 L50 9 L60 10 L50 11 L56 18 L52 18 L40 12 Z" fill="#dfe6ea" />
            </svg>
          ))}
        </div>
      )}

      <div className={styles.stageArea}>
        <div className={styles.crowd}>
          {Array.from({ length: CROWD[tier] }, (_, i) => (
            <div key={i} className={styles.guest} style={{ animationDelay: `${(i % 5) * 0.12}s` }}>
              <Npc seed={i + 2} kind={autocratic && tier >= 2 && i % 3 === 0 ? 'soldier' : 'civilian'} />
            </div>
          ))}
        </div>
        {tier >= 3 && (
          <div className={styles.guards}>
            {[0, 1].map((i) => (
              <div key={i} className={styles.guard}>
                <Npc seed={i} kind="soldier" />
              </div>
            ))}
          </div>
        )}
        <div className={styles.hero}>
          <Figure character={character} outfit={outfitFor({ profession: v.profession, stage: v.stage, path: v.path })} />
        </div>
        {tier === 0 && (
          <div className={styles.mentor}>
            <Npc seed={5} />
          </div>
        )}
      </div>

      {tier >= 2 && (
        <div className={styles.flashes} aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className={styles.flash} style={{ left: `${10 + i * 15}%`, animationDelay: `${0.3 + i * 0.37}s` }} />
          ))}
        </div>
      )}
      {tier >= 1 && (
        <div className={styles.confetti} aria-hidden="true">
          {Array.from({ length: 10 + tier * 6 }, (_, i) => (
            <span key={i} className={styles.piece} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 7) * 0.2}s` }} />
          ))}
        </div>
      )}

      <div className={styles.titleCard}>
        <p className={styles.newOffice}>{de.ceremony.newTitle}</p>
        <h1 className={styles.title} data-testid="ceremony-title">
          {v.title}
        </h1>
      </div>
      {v.skippable && <p className={styles.skip}>{de.ceremony.skip}</p>}
    </div>
  );
}
