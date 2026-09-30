import { memo, useMemo } from 'react';
import { Newspaper } from 'lucide-react';
import { gameStore, useGame } from '../../store';
import { de } from '../../i18n/de';
import { chronicleHeadline } from '../peopleText';
import styles from './Ticker.module.css';

/** So viele der neuesten Chronik-Schlagzeilen laufen im Ticker mit. */
const CHRONICLE_ITEMS = 3;

/**
 * Nachrichtenticker. Oben die neuesten Schlagzeilen der Stadtchronik, dazu allgemeine
 * Meldungen; mit steigender Unruhe mehr über Proteste. Tippen öffnet die Chronik.
 * Die Unruhe wird in Zehnerschritten abonniert, damit das Band nicht ständig neu startet.
 */
export const Ticker = memo(function Ticker() {
  const tier = useGame((s) => Math.floor((s.game.run?.unrest ?? 0) / 10));
  const autocratic = useGame((s) => s.game.run?.path === 'autocratic');
  const stage = useGame((s) => s.game.run?.stage ?? 1);
  const chronicleCount = useGame((s) => s.game.run?.chronicle.length ?? 0);
  const items = useMemo(() => {
    const t = de.ticker;
    const unrest = tier * 10;
    // Anteil der Unruhe-Meldungen wächst mit der Unruhe
    const protestShare = unrest < 40 ? 0 : unrest < 60 ? 0.3 : unrest < 80 ? 0.55 : 0.8;
    const count = 6;
    const list: string[] = [];
    const { run, character } = gameStore.getState().game;
    if (run && character && chronicleCount > 0) {
      for (const entry of run.chronicle.slice(-CHRONICLE_ITEMS).reverse()) {
        list.push(chronicleHeadline(entry, run, character.name));
      }
    }
    for (let i = 0; i < count; i++) {
      const pick = (arr: string[], k: number) => arr[(k + stage) % arr.length] ?? '';
      if (i / count < protestShare) list.push(pick(unrest >= 60 ? t.unrest : t.tense, i));
      else if (autocratic && i % 3 === 0) list.push(pick(t.autocratic, i));
      else list.push(pick(t.normal, i * 2));
    }
    return list;
  }, [tier, autocratic, stage, chronicleCount]);
  const text = items.join('   ·   ');
  return (
    <button
      type="button"
      className={styles.ticker}
      data-tense={tier >= 6 ? 'true' : 'false'}
      aria-label={`${de.ticker.label} – ${de.party.chronicle.open}`}
      onClick={() => {
        gameStore.getState().openSheet({ kind: 'chronicle' });
      }}
      data-testid="ticker"
    >
      <Newspaper size={14} aria-hidden="true" className={styles.icon} />
      <div className={styles.window}>
        <div className={styles.track} key={text}>
          <span>{text}</span>
          <span aria-hidden="true">{text}</span>
        </div>
      </div>
    </button>
  );
});
