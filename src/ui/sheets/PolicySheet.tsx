import { AlertTriangle, Check, Eye, HelpCircle, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Bust } from '../../art/people/Bust';
import { defaultConfig } from '../../config';
import { hash32 } from '../../engine/people';
import type { PolicyId } from '../../engine/ids';
import { consequenceDelayMs, findPolicy } from '../../engine/modifiers';
import {
  advisorStance,
  conflictingLaws,
  enactBlock,
  isConsequenceForeseen,
  policyCost,
  sessionVote,
} from '../../engine/party';
import { de, fill } from '../../i18n/de';
import { gameStore, useGame } from '../../store';
import { BottomSheet } from '../components/BottomSheet';
import { Button } from '../components/Button';
import { formatCost } from '../gameText';
import { effectLines, nameFromSeed, policyName, shockLines, shortDuration } from '../peopleText';
import styles from '../party/Party.module.css';

const cfg = defaultConfig;
/** Abstand zwischen zwei Wortbeiträgen in der Sitzung (ms). */
const SPEECH_DELAY = 550;

/** Beratung einer Vorlage: Berater sprechen nacheinander, dann entscheidet der Spieler. */
export function PolicySheet({ id }: { id: PolicyId }) {
  const key = useGame((s) => {
    const run = s.game.run;
    return run
      ? `${enactBlock(run, id, cfg) ?? 'ok'}|${run.agenda.items.includes(id) ? 1 : 0}|${run.advisors.length}`
      : '';
  });
  const [spoken, setSpoken] = useState(0);
  const run = gameStore.getState().game.run;
  const def = findPolicy(id, cfg);
  const count = run?.advisors.length ?? 0;

  useEffect(() => {
    if (spoken >= count) return;
    const timer = window.setTimeout(() => {
      setSpoken((n) => n + 1);
    }, SPEECH_DELAY);
    return () => {
      window.clearTimeout(timer);
    };
  }, [spoken, count]);

  const close = () => {
    gameStore.getState().closeSheet();
  };
  if (!run || !def || !key) return null;
  const texts = de.party.policies[id];
  const [block] = key.split('|');
  const vote = sessionVote(run, def);
  const total = Math.max(1, vote.for + vote.against + vote.neutral);
  const autocratic = run.path === 'autocratic';
  const conflicts = conflictingLaws(run, def);
  const blockText =
    block === 'conflict'
      ? fill(de.party.session.blocks.conflict, { law: conflicts.map(policyName).join(', ') })
      : block && block !== 'ok'
        ? de.party.session.blocks[block as keyof typeof de.party.session.blocks]
        : '';
  const lines = [...effectLines(def.effects)];
  const shock = shockLines(def.shock);
  const consequences = def.consequences ?? [];
  const foreseen = consequences
    .map((c, i) => ({ c, i, by: isConsequenceForeseen(run, def, i) }))
    .filter((x) => x.by !== null);

  return (
    <BottomSheet title={policyName(id)} onClose={close} testId="policy-sheet">
      <div className={styles.stack}>
        <p className={styles.small}>
          <span className={styles.area}>{de.party.areas[def.area]}</span> · {texts.text}
        </p>
        <div className={styles.sessionRoom}>
          {count === 0 ? (
            <p className={styles.small}>{de.party.session.voteEmpty}</p>
          ) : (
            <div className={styles.speeches}>
              {run.advisors.slice(0, spoken).map((a, i) => {
                const stance = advisorStance(a, def);
                const line = de.party.stanceLines[a.faction][stance + 2] ?? '';
                const side = i % 2 === 0 ? 'left' : 'right';
                return (
                  <div key={a.seed} className={styles.speech} data-side={side}>
                    <Bust
                      seed={a.seed}
                      outfit={a.skill === 'enforcer' ? 'uniform' : 'blazer'}
                      accent={`var(--faction-${a.faction})`}
                      mood={stance > 0 ? 'happy' : stance < 0 ? 'angry' : 'neutral'}
                      className={styles.speaker}
                      background="var(--surface)"
                    />
                    <div
                      className={styles.bubble}
                      data-stance={stance > 0 ? 'for' : stance < 0 ? 'against' : 'neutral'}
                    >
                      <span
                        className={styles.faction}
                        style={{ color: `var(--faction-${a.faction})` }}
                      >
                        {nameFromSeed(a.seed)} · {de.party.factions[a.faction].short}
                      </span>
                      <span>{line}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {count > 0 && (
          <div>
            <div className={styles.voteBar} aria-hidden="true">
              <span className={styles.voteFor} style={{ width: `${(vote.for / total) * 100}%` }} />
              <span
                className={styles.voteNeutral}
                style={{ width: `${(vote.neutral / total) * 100}%` }}
              />
              <span
                className={styles.voteAgainst}
                style={{ width: `${(vote.against / total) * 100}%` }}
              />
            </div>
            <p className={styles.small}>
              {fill(de.party.session.vote, {
                for: vote.for,
                against: vote.against,
                neutral: vote.neutral,
              })}{' '}
              · {de.party.session.loyaltyUp}
            </p>
          </div>
        )}

        <div className={styles.card}>
          <h3 className={styles.subTitle}>{de.party.session.effects}</h3>
          <ul className={styles.effects}>
            {lines.map((l) => (
              <li key={l.text} className={styles.effect} data-good={l.good ? 'true' : 'false'}>
                {l.text}
              </li>
            ))}
          </ul>
          {shock.length > 0 && (
            <>
              <h3 className={styles.subTitle}>{de.party.session.shock}</h3>
              <ul className={styles.effects}>
                {shock.map((l) => (
                  <li key={l.text} className={styles.effect} data-good={l.good ? 'true' : 'false'}>
                    {l.text}
                  </li>
                ))}
              </ul>
            </>
          )}
          <h3 className={styles.subTitle}>{de.party.session.later}</h3>
          {foreseen.map(({ c, i, by }) => (
            <p key={i} className={styles.warning}>
              <Eye size={16} aria-hidden="true" />
              <span>
                {fill(de.party.session.warning, {
                  name: nameFromSeed(run.advisors.find((a) => a.faction === by)?.seed ?? 0),
                  title: texts.consequences[i]?.title ?? '',
                  time: shortDuration(consequenceDelayMs(c.afterSeconds, cfg)),
                })}
              </span>
            </p>
          ))}
          {foreseen.length === 0 && (
            <p className={styles.small}>
              <HelpCircle size={14} aria-hidden="true" /> {de.party.session.unknownLater}
            </p>
          )}
        </div>

        <div className={styles.card}>
          <h3 className={styles.subTitle}>{de.party.session.citizens}</h3>
          <div className={styles.citizens}>
            <p className={styles.citizen}>
              <Bust
                seed={hash32(run.seed, 1)}
                mood="happy"
                className={styles.speaker}
                background="var(--surface-2)"
              />
              „{texts.pro}“
            </p>
            <p className={styles.citizen}>
              <Bust
                seed={hash32(run.seed, 2)}
                mood="angry"
                className={styles.speaker}
                background="var(--surface-2)"
              />
              „{texts.contra}“
            </p>
          </div>
        </div>

        <p className={styles.small}>
          {de.party.session.cost}:{' '}
          <span className="num">{formatCost(policyCost(run, def, cfg), run.stateId)}</span>
        </p>
        {blockText && (
          <p className={styles.warn}>
            <AlertTriangle size={14} aria-hidden="true" /> {blockText}
          </p>
        )}
        <div className={styles.decide}>
          <Button
            variant="secondary"
            disabled={block === 'away' || key.split('|')[1] !== '1'}
            onClick={() => {
              gameStore.getState().rejectPolicy(id);
              close();
            }}
          >
            <ThumbsDown size={16} aria-hidden="true" />
            {de.party.session.reject}
          </Button>
          <Button
            disabled={block !== 'ok'}
            onClick={() => {
              gameStore.getState().enactPolicy(id);
              close();
            }}
            data-testid="enact"
          >
            {autocratic ? (
              <Check size={16} aria-hidden="true" />
            ) : (
              <ThumbsUp size={16} aria-hidden="true" />
            )}
            {autocratic ? de.party.session.decree : de.party.session.enact}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
