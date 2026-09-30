import { Gavel, Scale, Swords, UserMinus, UserPlus, X } from 'lucide-react';
import { useState } from 'react';
import { Bust } from '../../art/people/Bust';
import { defaultConfig } from '../../config';
import { formatNumber } from '../../engine/format';
import { RIVAL_COUNTER_IDS, type PolicyId, type RivalCounterId } from '../../engine/ids';
import { findPolicy } from '../../engine/modifiers';
import {
  activeLaws,
  advisorHireCost,
  counterBlock,
  counterCost,
  findCounter,
  hireAdvisorBlock,
  isRivalActive,
  lawSlots,
  revokeCost,
  rivalElectionEffect,
  seats,
} from '../../engine/party';
import { canAfford } from '../../engine/economy';
import { de, fill } from '../../i18n/de';
import { gameStore, useGame } from '../../store';
import { formatCost } from '../gameText';
import { nameFromSeed, policyName, rivalParty, shortDuration } from '../peopleText';
import styles from './Party.module.css';

const cfg = defaultConfig;

/** Beratertisch mit Sitzen, Loyalität und Bewerbern. */
function AdvisorTable() {
  // Nur Zahlen und Texte abonnieren, die Liste liest der Render aus dem Store
  const key = useGame((s) => {
    const run = s.game.run;
    if (!run) return '';
    const advisors = run.advisors.map((a) => `${a.seed}:${Math.round(a.loyalty)}`).join(',');
    const pool = run.advisorPool.candidates.map((c) => c.seed).join(',');
    const blocks = run.advisorPool.candidates.map((_, i) => hireAdvisorBlock(run, i, cfg)).join(',');
    return `${advisors}|${pool}|${blocks}|${seats(run, cfg)}|${Math.round((run.advisorPool.refreshAt - run.playMs) / 10_000)}`;
  });
  const [selected, setSelected] = useState<number | null>(null);
  const run = gameStore.getState().game.run;
  if (!run || !key) return null;
  const max = seats(run, cfg);
  const cost = formatCost(advisorHireCost(run, cfg), run.stateId);
  return (
    <section className={styles.card} data-testid="advisor-table">
      <div className={styles.head}>
        <h3 className={styles.title}>{de.party.advisors.title}</h3>
        <span className={styles.small}>
          {fill(de.party.advisors.seats, { count: run.advisors.length, max })}
        </span>
      </div>
      <div className={styles.table}>
        <div className={styles.tableTop} aria-hidden="true" />
        <div className={styles.seats}>
          {Array.from({ length: max }, (_, i) => {
            const a = run.advisors[i];
            if (!a) {
              return (
                <div key={`empty-${i}`} className={`${styles.seat} ${styles.emptySeat}`}>
                  <span className={styles.small}>{de.party.advisors.empty}</span>
                </div>
              );
            }
            const disloyal = a.loyalty < cfg.party.advisor.defectBelow + 10;
            return (
              <button
                key={a.seed}
                type="button"
                className={styles.seat}
                onClick={() => {
                  setSelected(selected === i ? null : i);
                }}
                aria-pressed={selected === i}
                style={{ ['--faction' as string]: `var(--faction-${a.faction})` }}
              >
                <Bust
                  seed={a.seed}
                  outfit={a.skill === 'enforcer' ? 'uniform' : 'blazer'}
                  accent={`var(--faction-${a.faction})`}
                  mood={disloyal ? 'angry' : a.loyalty > 70 ? 'happy' : 'neutral'}
                  className={styles.seatBust}
                  background="var(--surface-2)"
                />
                <span className={styles.seatName}>{nameFromSeed(a.seed).split(' ')[0]}</span>
                <span className={styles.loyalty}>
                  <span
                    className={styles.loyaltyFill}
                    style={{ transform: `scaleX(${a.loyalty / 100})` }}
                  />
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {selected !== null && run.advisors[selected] && (
        <AdvisorDetail
          index={selected}
          onClose={() => {
            setSelected(null);
          }}
        />
      )}
      <h4 className={styles.subTitle}>{de.party.advisors.candidates}</h4>
      {run.advisorPool.candidates.length === 0 && (
        <p className={styles.small}>
          {de.party.advisors.noCandidates}{' '}
          {fill(de.party.advisors.candidatesNext, {
            time: shortDuration(run.advisorPool.refreshAt - run.playMs),
          })}
        </p>
      )}
      <div className={styles.candidates}>
        {run.advisorPool.candidates.map((c, i) => {
          const block = hireAdvisorBlock(run, i, cfg);
          return (
            <div key={c.seed} className={styles.candidate}>
              <Bust
                seed={c.seed}
                outfit={c.skill === 'enforcer' ? 'uniform' : 'blazer'}
                accent={`var(--faction-${c.faction})`}
                className={styles.candidateBust}
                background="var(--surface-2)"
              />
              <div className={styles.candidateText}>
                <span className={styles.name}>{nameFromSeed(c.seed)}</span>
                <span className={styles.faction} style={{ color: `var(--faction-${c.faction})` }}>
                  {de.party.factions[c.faction].name}
                </span>
                <span className={styles.small}>
                  {de.party.skills[c.skill].name}: {de.party.skills[c.skill].text}
                </span>
              </div>
              <button
                type="button"
                className={styles.smallButton}
                disabled={block !== null}
                onClick={() => {
                  gameStore.getState().hireAdvisor(i);
                }}
                aria-label={`${de.party.advisors.hire}: ${nameFromSeed(c.seed)}`}
                data-testid={`hire-advisor-${i}`}
              >
                <UserPlus size={16} aria-hidden="true" />
                <span className="num">{block === 'seats' ? de.party.advisors.blocks.seats : cost}</span>
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AdvisorDetail({ index, onClose }: { index: number; onClose: () => void }) {
  const run = gameStore.getState().game.run;
  const a = run?.advisors[index];
  if (!a) return null;
  const disloyal = a.loyalty < cfg.party.advisor.defectBelow + 10;
  return (
    <div className={styles.detail}>
      <div className={styles.head}>
        <span className={styles.name}>{nameFromSeed(a.seed)}</span>
        <button type="button" className={styles.iconButton} onClick={onClose} aria-label={de.common.close}>
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <span className={styles.faction} style={{ color: `var(--faction-${a.faction})` }}>
        {de.party.factions[a.faction].name}
      </span>
      <span className={styles.small}>
        {de.party.skills[a.skill].name}: {de.party.skills[a.skill].text}
      </span>
      <span className={styles.small}>
        {fill(de.party.advisors.loyalty, { value: Math.round(a.loyalty) })}
      </span>
      {disloyal && <span className={styles.warn}>{de.party.advisors.disloyal}</span>}
      <button
        type="button"
        className={styles.ghostButton}
        onClick={() => {
          gameStore.getState().dismissAdvisor(index);
          onClose();
        }}
      >
        <UserMinus size={16} aria-hidden="true" />
        {de.party.advisors.dismiss}
      </button>
    </div>
  );
}

/** Tagesordnung: drei Vorlagen, jede öffnet die Beratung. */
function Agenda() {
  const key = useGame((s) => {
    const run = s.game.run;
    if (!run) return '';
    return `${run.agenda.items.join(',')}|${Math.round((run.agenda.refreshAt - run.playMs) / 10_000)}`;
  });
  const run = gameStore.getState().game.run;
  if (!run || !key) return null;
  return (
    <section className={styles.card} data-testid="agenda">
      <div className={styles.head}>
        <h3 className={styles.title}>
          <Gavel size={18} aria-hidden="true" /> {de.party.session.agenda}
        </h3>
        <span className={styles.small}>
          {fill(de.party.session.agendaNext, { time: shortDuration(run.agenda.refreshAt - run.playMs) })}
        </span>
      </div>
      {run.agenda.items.length === 0 && (
        <p className={styles.small}>
          {fill(de.party.session.agendaEmpty, { time: shortDuration(run.agenda.refreshAt - run.playMs) })}
        </p>
      )}
      <div className={styles.proposals}>
        {run.agenda.items.map((id) => {
          const def = findPolicy(id, cfg);
          if (!def) return null;
          return (
            <button
              key={id}
              type="button"
              className={styles.proposal}
              onClick={() => {
                gameStore.getState().openSheet({ kind: 'policy', id });
              }}
              data-testid={`proposal-${id}`}
            >
              <span className={styles.area}>{de.party.areas[def.area]}</span>
              <span className={styles.name}>{policyName(id)}</span>
              <span className={styles.small}>{de.party.policies[id].text}</span>
              <span className={styles.discuss}>
                <Scale size={15} aria-hidden="true" /> {de.party.session.discuss}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** Geltende Beschlüsse mit Spätfolgen und „Aufheben“. */
function Laws() {
  const key = useGame((s) => {
    const run = s.game.run;
    if (!run) return '';
    const laws = activeLaws(run)
      .map((id) => `${id}:${run.laws[id]?.fired ?? 0}:${canAfford(run.resources, revokeCost(run, id, cfg)) ? 1 : 0}`)
      .join(',');
    return `${laws}|${lawSlots(run, cfg)}|${Math.floor(run.playMs / 30_000)}`;
  });
  const run = gameStore.getState().game.run;
  if (!run || !key) return null;
  const ids = activeLaws(run);
  return (
    <section className={styles.card} data-testid="laws">
      <div className={styles.head}>
        <h3 className={styles.title}>{de.party.session.laws}</h3>
        <span className={styles.small}>
          {fill(de.party.session.lawsCount, { count: ids.length, max: lawSlots(run, cfg) })}
        </span>
      </div>
      {ids.length === 0 && <p className={styles.small}>{de.party.session.lawsEmpty}</p>}
      {ids.map((id: PolicyId) => {
        const law = run.laws[id];
        const def = findPolicy(id, cfg);
        if (!law || !def) return null;
        const texts = de.party.policies[id].consequences;
        const fired = texts.slice(0, law.fired);
        const cost = revokeCost(run, id, cfg);
        return (
          <div key={id} className={styles.law}>
            <div className={styles.lawText}>
              <span className={styles.name}>{policyName(id)}</span>
              <span className={styles.small}>
                {fill(de.party.session.since, { time: shortDuration(run.playMs - law.since) })}
              </span>
              {fired.map((c) => (
                <span key={c.title} className={styles.warn}>
                  {fill(de.party.session.fired, { title: c.title })}
                </span>
              ))}
            </div>
            <button
              type="button"
              className={styles.smallButton}
              disabled={!canAfford(run.resources, cost)}
              onClick={() => {
                gameStore.getState().revokePolicy(id);
              }}
              aria-label={`${de.party.session.revoke}: ${policyName(id)}`}
            >
              <span>{de.party.session.revoke}</span>
              <span className="num">{formatCost(cost, run.stateId)}</span>
            </button>
          </div>
        );
      })}
    </section>
  );
}

/** Der Rivale: Stärke, Wirkung auf die Wahl und Gegenmaßnahmen. */
export function RivalCard() {
  const key = useGame((s) => {
    const run = s.game.run;
    if (!run) return '';
    const blocks = RIVAL_COUNTER_IDS.map((id) => counterBlock(run, id, cfg)).join(',');
    return `${run.rival.seed}|${Math.round(run.rival.strength)}|${run.rival.status}|${blocks}|${run.stage}`;
  });
  const [message, setMessage] = useState<string | null>(null);
  const run = gameStore.getState().game.run;
  if (!run || !key) return null;
  const name = nameFromSeed(run.rival.seed);
  if (run.stage < cfg.party.rival.fromStage) {
    return (
      <section className={styles.card}>
        <h3 className={styles.title}>{de.party.rival.title}</h3>
        <p className={styles.small}>{fill(de.party.rival.notYet, { stage: cfg.party.rival.fromStage })}</p>
      </section>
    );
  }
  const strength = Math.round(run.rival.strength);
  const jailed = run.rival.status === 'jailed';
  const quotes = de.party.rival.quotes[strength < 30 ? 'weak' : strength < 60 ? 'mid' : 'strong'];
  const quote = quotes[Math.floor(run.playMs / 60_000) % quotes.length] ?? '';
  const effect = rivalElectionEffect(run, cfg);
  return (
    <section className={styles.card} data-testid="rival-card">
      <div className={styles.rivalHead}>
        <Bust
          seed={run.rival.seed}
          outfit="suit"
          accent="#5b2a86"
          mood={jailed ? 'neutral' : strength > 50 ? 'happy' : 'angry'}
          className={styles.rivalBust}
          background={jailed ? '#8f8f8f' : '#e9e1f2'}
        />
        <div className={styles.candidateText}>
          <span className={styles.small}>{de.party.rival.title}</span>
          <span className={styles.name}>{name}</span>
          <span className={styles.small}>{rivalParty(run.rival.seed)}</span>
          {!jailed && <span className={styles.quote}>„{quote}“</span>}
        </div>
      </div>
      {jailed ? (
        <p className={styles.small}>{de.party.rival.jailed}</p>
      ) : (
        <>
          <div>
            <div className={styles.head}>
              <span className={styles.small}>{fill(de.party.rival.strength, { value: strength })}</span>
              <span className={`${styles.small} ${effect < 0 ? styles.bad : styles.good}`}>
                {fill(de.party.rival.election, {
                  value: `${effect >= 0 ? '+' : '−'}${formatNumber(Math.abs(effect), { rounding: 'round' })}`,
                })}
              </span>
            </div>
            <div className={styles.strength}>
              <span className={styles.strengthFill} style={{ transform: `scaleX(${strength / 100})` }} />
            </div>
          </div>
          {isRivalActive(run, cfg) &&
            RIVAL_COUNTER_IDS.map((id: RivalCounterId) => {
              const def = findCounter(id, cfg);
              const block = counterBlock(run, id, cfg);
              if (!def || block === 'path') return null;
              const t = de.party.rival.counters[id];
              const reason =
                block === 'cooldown'
                  ? fill(de.party.rival.blocks.cooldown, {
                      time: shortDuration((run.cooldowns[`rival:${id}`] ?? 0) - run.playMs),
                    })
                  : block
                    ? de.party.rival.blocks[block]
                    : fill(de.party.rival.chance, { chance: def.chance });
              return (
                <div key={id} className={styles.law}>
                  <div className={styles.lawText}>
                    <span className={styles.name}>
                      <Swords size={15} aria-hidden="true" /> {t.name}
                    </span>
                    <span className={styles.small}>{t.text}</span>
                    <span className={styles.small}>{reason}</span>
                  </div>
                  <button
                    type="button"
                    className={styles.smallButton}
                    disabled={block !== null}
                    onClick={() => {
                      const outcome = gameStore.getState().rivalCounter(id);
                      if (outcome) setMessage(outcome.success ? de.party.rival.success : de.party.rival.failure);
                    }}
                    data-testid={`counter-${id}`}
                  >
                    <span className="num">{formatCost(counterCost(run, def, cfg), run.stateId)}</span>
                  </button>
                </div>
              );
            })}
          {message && (
            <p className={styles.small} role="status">
              {message}
            </p>
          )}
        </>
      )}
    </section>
  );
}

/** Reiter „Politik“ im Parteibüro. */
export function PoliticsTab() {
  return (
    <div className={styles.stack}>
      <Agenda />
      <AdvisorTable />
      <Laws />
      <RivalCard />
    </div>
  );
}
