import { de, fill } from '../../i18n/de';
import { gameStore, useGame } from '../../store';
import { BottomSheet } from '../components/BottomSheet';
import { chronicleHeadline, yearOf } from '../peopleText';
import styles from './Chronicle.module.css';

/** Die Stadtchronik als Zeitungsseite: neueste Schlagzeile groß, darunter die Geschichte. */
export function ChronicleSheet() {
  const length = useGame((s) => s.game.run?.chronicle.length ?? 0);
  const close = () => {
    gameStore.getState().closeSheet();
  };
  const { run, character } = gameStore.getState().game;
  if (!run || !character) return null;
  const entries = [...run.chronicle].reverse();
  const [lead, ...rest] = entries;
  const state = de.states[run.stateId];
  return (
    <BottomSheet title={de.party.chronicle.title} onClose={close} testId="chronicle-sheet">
      <article className={styles.paper} data-count={length}>
        <header className={styles.masthead}>
          <span className={styles.paperName}>{de.party.chronicle.paper}</span>
          <span className={styles.edition}>
            {state.name} · {fill(de.party.chronicle.year, { year: yearOf(run.playMs) })}
          </span>
        </header>
        {!lead && <p className={styles.empty}>{de.party.chronicle.empty}</p>}
        {lead && (
          <section className={styles.lead}>
            <h3 className={styles.leadHeadline}>{chronicleHeadline(lead, run, character.name)}</h3>
            <p className={styles.dateline}>
              {fill(de.party.chronicle.year, { year: yearOf(lead.t) })}
            </p>
          </section>
        )}
        <div className={styles.columns}>
          {rest.map((entry, i) => (
            <p key={`${entry.t}-${i}`} className={styles.item}>
              <span className={styles.itemYear}>{yearOf(entry.t)}</span>
              {chronicleHeadline(entry, run, character.name)}
            </p>
          ))}
        </div>
        <p className={styles.footer}>{de.party.chronicle.subtitle}</p>
      </article>
    </BottomSheet>
  );
}
