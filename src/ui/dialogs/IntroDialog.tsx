import { useState } from 'react';
import { de, fill } from '../../i18n/de';
import { BottomSheet } from '../components/BottomSheet';
import { Button } from '../components/Button';
import styles from './Dialogs.module.css';

/** Kurze Einführung in drei Karten nach dem ersten Start. */
export function IntroDialog({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const cards = de.intro.cards;
  const card = cards[index] ?? cards[0];
  const isLast = index >= cards.length - 1;
  if (!card) return null;
  return (
    <BottomSheet title={card.title} onClose={onDone} dismissible={false} testId="intro-dialog">
      <p className={styles.muted}>
        {fill(de.intro.step, { current: index + 1, total: cards.length })}
      </p>
      <p>{card.text}</p>
      <div className={styles.dots} aria-hidden="true">
        {cards.map((c, i) => (
          <span key={c.title} className={i === index ? styles.dotActive : styles.dot} />
        ))}
      </div>
      <Button
        block
        onClick={() => {
          if (isLast) onDone();
          else setIndex(index + 1);
        }}
      >
        {isLast ? de.intro.start : de.intro.next}
      </Button>
    </BottomSheet>
  );
}
