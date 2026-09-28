import { memo, useMemo } from 'react';
import { Newspaper } from 'lucide-react';
import { useGame } from '../../store';
import { de } from '../../i18n/de';
import styles from './Ticker.module.css';

/**
 * Nachrichtenticker. Mit steigender Unruhe mehr Meldungen über Proteste und Gerüchte.
 * Die Stufe der Unruhe wird in Zehnerschritten abonniert, damit das Band nicht ständig neu startet.
 */
export const Ticker = memo(function Ticker() {
  const tier = useGame((s) => Math.floor((s.game.run?.unrest ?? 0) / 10));
  const autocratic = useGame((s) => s.game.run?.path === 'autocratic');
  const stage = useGame((s) => s.game.run?.stage ?? 1);
  const items = useMemo(() => {
    const t = de.ticker;
    const unrest = tier * 10;
    // Anteil der Unruhe-Meldungen wächst mit der Unruhe
    const protestShare = unrest < 40 ? 0 : unrest < 60 ? 0.3 : unrest < 80 ? 0.55 : 0.8;
    const count = 7;
    const list: string[] = [];
    for (let i = 0; i < count; i++) {
      const pick = (arr: string[], k: number) => arr[(k + stage) % arr.length] ?? '';
      if (i / count < protestShare) list.push(pick(unrest >= 60 ? t.unrest : t.tense, i));
      else if (autocratic && i % 3 === 0) list.push(pick(t.autocratic, i));
      else list.push(pick(t.normal, i * 2));
    }
    return list;
  }, [tier, autocratic, stage]);
  const text = items.join('   ·   ');
  return (
    <div className={styles.ticker} data-tense={tier >= 6 ? 'true' : 'false'} aria-label={de.ticker.label} role="marquee">
      <Newspaper size={14} aria-hidden="true" className={styles.icon} />
      <div className={styles.window}>
        <div className={styles.track} key={text}>
          <span>{text}</span>
          <span aria-hidden="true">{text}</span>
        </div>
      </div>
    </div>
  );
});
