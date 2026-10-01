import {
  Check,
  Factory,
  Flag,
  Globe,
  HeartHandshake,
  MessageCircle,
  Newspaper,
  Shield,
  ThumbsDown,
  ThumbsUp,
  TriangleAlert,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Bust } from '../../art/people/Bust';
import { defaultConfig } from '../../config';
import type { PolicyArea } from '../../config/party';
import type { PolicyId } from '../../engine/ids';
import { findPolicy } from '../../engine/modifiers';
import {
  advisorStance,
  conflictingLaws,
  enactBlock,
  isConsequenceForeseen,
  policyCost,
} from '../../engine/party';
import { de, fill } from '../../i18n/de';
import { gameStore, useGame } from '../../store';
import { useSwipe } from '../components/useSwipe';
import { formatCost } from '../gameText';
import { effectLines, nameFromSeed, policyName, shockLines, shortDuration } from '../peopleText';
import styles from './LawDeck.module.css';

const cfg = defaultConfig;

/** Farbe und Bild je Politikfeld. */
const AREA_LOOK: Record<PolicyArea, { color: string; icon: LucideIcon }> = {
  economy: { color: '#2f8cff', icon: Factory },
  social: { color: '#f0475a', icon: HeartHandshake },
  security: { color: '#4f8a3a', icon: Shield },
  media: { color: '#9b4fe0', icon: Newspaper },
  foreign: { color: '#11b3c0', icon: Globe },
  party: { color: '#ff8a2a', icon: Flag },
};

function LawCard({ id }: { id: PolicyId }) {
  // Zustand, der die Karte verändert: Sperrgrund, Berater, Mittel
  const key = useGame((s) => {
    const run = s.game.run;
    return run
      ? `${enactBlock(run, id, cfg) ?? 'ok'}|${run.advisors.map((a) => a.seed).join(',')}`
      : '';
  });
  const run = gameStore.getState().game.run;
  const def = findPolicy(id, cfg);
  const block = key.split('|')[0] ?? 'ok';
  const swipe = useSwipe((choice) => {
    const store = gameStore.getState();
    if (choice === 'yes') store.enactPolicy(id);
    else store.rejectPolicy(id);
  }, block === 'ok');
  if (!run || !def || !key) return null;

  const look = AREA_LOOK[def.area];
  const Icon = look.icon;
  const autocratic = run.path === 'autocratic';
  const lines = [
    ...shockLines(def.shock).map((l) => ({ ...l, now: true })),
    ...effectLines(def.effects).map((l) => ({ ...l, now: false })),
  ].slice(0, 5);
  const foreseen = (def.consequences ?? [])
    .map((_, i) => ({ i, by: isConsequenceForeseen(run, def, i) }))
    .filter((x) => x.by !== null);
  const conflicts = conflictingLaws(run, def);
  const blockText =
    block === 'conflict'
      ? fill(de.party.session.blocks.conflict, { law: conflicts.map(policyName).join(', ') })
      : block !== 'ok'
        ? de.party.session.blocks[block as keyof typeof de.party.session.blocks]
        : '';

  return (
    <div className={styles.cardWrap}>
      <div
        key={swipe.shake}
        className={`${styles.card} ${swipe.dragging ? styles.dragging : ''} ${swipe.shake ? styles.shake : ''}`}
        style={{
          transform: `translateX(${swipe.dx}px) rotate(${(swipe.dx / 220) * 12}deg)`,
          ['--area' as string]: look.color,
        }}
        {...swipe.handlers}
        data-testid="law-card"
        data-policy={id}
      >
        <div className={styles.band}>
          <span className={styles.areaChip}>{de.party.areas[def.area]}</span>
          <Icon className={styles.bandIcon} size={58} strokeWidth={2.2} aria-hidden="true" />
        </div>
        <div className={styles.body}>
          <h3 className={styles.title}>{policyName(id)}</h3>
          <p className={styles.text}>{de.party.policies[id].text}</p>
          {lines.length > 0 && (
            <ul className={styles.effects}>
              {lines.map((l) => (
                <li key={l.text} className={styles.effect} data-good={l.good ? 'true' : 'false'}>
                  {l.now && <span className={styles.now}>{de.party.session.shock}</span>}
                  {l.text}
                </li>
              ))}
            </ul>
          )}
          {run.advisors.length > 0 && (
            <div className={styles.advisors}>
              {run.advisors.map((a) => {
                const stance = advisorStance(a, def);
                return (
                  <span
                    key={a.seed}
                    className={styles.advisor}
                    title={`${nameFromSeed(a.seed)} · ${de.party.factions[a.faction].short}`}
                  >
                    <Bust
                      seed={a.seed}
                      outfit={a.skill === 'enforcer' ? 'uniform' : 'blazer'}
                      accent={`var(--faction-${a.faction})`}
                      mood={stance > 0 ? 'happy' : stance < 0 ? 'angry' : 'neutral'}
                      className={styles.advisorBust}
                      background="var(--surface-2)"
                    />
                    <span
                      className={styles.thumb}
                      data-stance={stance > 0 ? 'for' : stance < 0 ? 'against' : 'neutral'}
                    >
                      {stance > 0 ? (
                        <ThumbsUp size={11} strokeWidth={3} aria-label={de.party.lawDeck.for} />
                      ) : stance < 0 ? (
                        <ThumbsDown
                          size={11}
                          strokeWidth={3}
                          aria-label={de.party.lawDeck.against}
                        />
                      ) : (
                        '–'
                      )}
                    </span>
                  </span>
                );
              })}
            </div>
          )}
          {foreseen.map(({ i, by }) => {
            const c = de.party.policies[id].consequences[i];
            if (!c || !by) return null;
            return (
              <p key={c.title} className={styles.warning}>
                <TriangleAlert size={14} aria-hidden="true" />
                {fill(de.party.lawDeck.warning, {
                  faction: de.party.factions[by].short,
                  title: c.title,
                })}
              </p>
            );
          })}
          <div className={styles.footer}>
            {blockText ? (
              <span className={styles.block}>{blockText}</span>
            ) : (
              <span className={`${styles.cost} game-num`}>
                {formatCost(policyCost(run, def, cfg), run.stateId)}
              </span>
            )}
          </div>
        </div>
        <span className={`${styles.stamp} ${styles.stampYes}`} style={{ opacity: swipe.yesAmount }}>
          {autocratic ? de.party.session.decree : de.party.lawDeck.yes}
        </span>
        <span className={`${styles.stamp} ${styles.stampNo}`} style={{ opacity: swipe.noAmount }}>
          {de.party.lawDeck.no}
        </span>
      </div>
      <div className={styles.buttons}>
        <button
          type="button"
          className={`${styles.round} ${styles.roundNo}`}
          onClick={() => {
            swipe.decide('no');
          }}
          aria-label={de.party.session.reject}
          data-testid="law-no"
        >
          <X size={30} strokeWidth={3.4} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={styles.details}
          onClick={() => {
            gameStore.getState().openSheet({ kind: 'policy', id });
          }}
          data-testid={`proposal-${id}`}
        >
          <MessageCircle size={16} aria-hidden="true" />
          {de.party.lawDeck.debate}
        </button>
        <button
          type="button"
          className={`${styles.round} ${styles.roundYes}`}
          onClick={() => {
            swipe.decide('yes');
          }}
          disabled={block !== 'ok'}
          aria-label={autocratic ? de.party.session.decree : de.party.session.enact}
          data-testid="law-yes"
        >
          <Check size={32} strokeWidth={3.4} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/** Abstimmung per Wisch-Karte: rechts = zustimmen, links = ablehnen. */
export function LawDeck() {
  const key = useGame((s) => {
    const run = s.game.run;
    if (!run) return '';
    return `${run.agenda.items.join(',')}|${Math.round((run.agenda.refreshAt - run.playMs) / 10_000)}`;
  });
  const run = gameStore.getState().game.run;
  if (!run || !key) return null;
  const [top, next] = run.agenda.items;
  const wait = shortDuration(run.agenda.refreshAt - run.playMs);
  return (
    <section className={styles.deck} data-testid="agenda">
      <div className={styles.head}>
        <h3 className={styles.headTitle}>{de.party.lawDeck.title}</h3>
        <span className={styles.count}>
          {run.agenda.items.length > 0
            ? fill(de.party.lawDeck.left, { count: run.agenda.items.length })
            : ''}
        </span>
      </div>
      {top ? (
        <>
          <p className={styles.hint}>{de.party.lawDeck.hint}</p>
          <div className={styles.stage} data-more={next ? 'true' : 'false'}>
            <LawCard key={top} id={top} />
          </div>
        </>
      ) : (
        <p className={styles.empty}>{fill(de.party.lawDeck.empty, { time: wait })}</p>
      )}
    </section>
  );
}
