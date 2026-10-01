import { useEffect } from 'react';
import {
  Coins,
  Globe,
  Handshake,
  MessageSquareQuote,
  Shield,
  ThumbsUp,
  TriangleAlert,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { defaultConfig } from '../../config';
import type { EventEffect } from '../../config/events';
import { findEvent } from '../../engine/events';
import { de, fill } from '../../i18n/de';
import { gameStore, useGame } from '../../store';
import { BottomSheet } from '../components/BottomSheet';
import { Button } from '../components/Button';
import { useSwipe } from '../components/useSwipe';
import styles from './EventsSheet.module.css';

const cfg = defaultConfig;

const EFFECT_ICONS: { key: keyof EventEffect; icon: LucideIcon; label: string }[] = [
  { key: 'money', icon: Coins, label: de.resources.money },
  { key: 'influence', icon: Handshake, label: de.resources.influence },
  { key: 'followers', icon: Users, label: de.resources.followers },
  { key: 'approval', icon: ThumbsUp, label: de.meters.approval },
  { key: 'unrest', icon: TriangleAlert, label: de.meters.unrest },
  { key: 'loyalty', icon: Shield, label: de.meters.loyalty },
  { key: 'groups', icon: UsersRound, label: de.network.title },
  { key: 'relation', icon: Globe, label: de.foreign.title },
  { key: 'relationsAll', icon: Globe, label: de.foreign.title },
  { key: 'diplomacy', icon: Globe, label: de.resources.diplomacy },
];

/** Welche Werte eine Antwort verändert – ohne genaue Zahlen (Spezifikation 4.9). */
function Affects({ effect }: { effect: EventEffect }) {
  const seen = new Set<string>();
  return (
    <span className={styles.affects}>
      {EFFECT_ICONS.filter(({ key, label }) => {
        if (effect[key] === undefined || seen.has(label)) return false;
        seen.add(label);
        return true;
      }).map(({ key, icon: Icon, label }) => (
        <Icon key={key} size={16} aria-label={label} />
      ))}
    </span>
  );
}

function SwipeCard({
  id,
  target,
  onDecide,
}: {
  id: string;
  target: string | null;
  onDecide: (c: 'yes' | 'no') => void;
}) {
  const swipe = useSwipe(onDecide);
  const def = findEvent(id, cfg);
  const text = (de.events as Record<string, (typeof de.events)[string] | undefined>)[id];
  if (!def || !text) return null;
  const country = target ? de.foreign.countries[target as keyof typeof de.foreign.countries] : '';
  const t = (s: string) => fill(s, { country });
  const decide = swipe.decide;

  return (
    <div className={styles.stage}>
      <div
        className={`${styles.card} ${swipe.dragging ? styles.dragging : ''}`}
        style={{ transform: `translateX(${swipe.dx}px) rotate(${(swipe.dx / 220) * 12}deg)` }}
        {...swipe.handlers}
        data-testid="event-card"
        data-event={id}
      >
        <span className={`${styles.stamp} ${styles.stampYes}`} style={{ opacity: swipe.yesAmount }}>
          {t(text.yes)}
          <Affects effect={def.yes} />
        </span>
        <span className={`${styles.stamp} ${styles.stampNo}`} style={{ opacity: swipe.noAmount }}>
          {t(text.no)}
          <Affects effect={def.no} />
        </span>
        <div className={styles.band}>
          <MessageSquareQuote size={44} strokeWidth={2.2} aria-hidden="true" />
          <p className={styles.speaker}>{t(text.speaker)}</p>
        </div>
        <div className={styles.body}>
          <h3 className={styles.title}>{t(text.title)}</h3>
          <p className={styles.text}>{t(text.text)}</p>
        </div>
      </div>
      <p className={styles.hint}>{de.eventUi.swipeHint}</p>
      <div className={styles.buttons}>
        <Button
          variant="danger"
          onClick={() => {
            decide('no');
          }}
          data-testid="event-no"
        >
          {t(text.no)}
          <Affects effect={def.no} />
        </Button>
        <Button
          onClick={() => {
            decide('yes');
          }}
          data-testid="event-yes"
        >
          {t(text.yes)}
          <Affects effect={def.yes} />
        </Button>
      </div>
    </div>
  );
}

/** Stapel offener Entscheidungen. Oberste Karte wischen oder Knöpfe nutzen. */
export function EventsSheet() {
  const top = useGame(
    useShallow((s) => {
      const card = s.game.run?.events.open[0];
      return {
        id: card?.id ?? null,
        target: card?.target ?? null,
        count: s.game.run?.events.open.length ?? 0,
      };
    }),
  );
  const store = gameStore.getState();
  const close = () => {
    store.closeSheet();
  };
  // Kein Karte mehr offen (z. B. alle beantwortet): Fenster schließen
  useEffect(() => {
    if (!top.id) gameStore.getState().closeSheet();
  }, [top.id]);
  if (!top.id) return null;
  return (
    <BottomSheet
      title={fill(de.eventUi.badge, { count: top.count })}
      onClose={close}
      testId="events-sheet"
    >
      <SwipeCard
        // Neuer Schlüssel je Karte: frischer Zustand, keine doppelte Entscheidung
        key={`${top.id}-${top.count}`}
        id={top.id}
        target={top.target}
        onDecide={(choice) => {
          store.resolveEvent(0, choice);
          if (top.count <= 1) close();
        }}
      />
    </BottomSheet>
  );
}
