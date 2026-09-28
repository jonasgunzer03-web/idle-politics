import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, type PanInfo } from 'motion/react';
import {
  Coins,
  Globe,
  Handshake,
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
import styles from './EventsSheet.module.css';

const cfg = defaultConfig;
/** Ab so vielen Pixeln seitlicher Bewegung gilt die Karte als entschieden. */
const SWIPE_THRESHOLD = 110;

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

function SwipeCard({ id, target, onDecide }: { id: string; target: string | null; onDecide: (c: 'yes' | 'no') => void }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const yesOpacity = useTransform(x, [20, SWIPE_THRESHOLD], [0, 1]);
  const noOpacity = useTransform(x, [-SWIPE_THRESHOLD, -20], [1, 0]);
  const decided = useRef(false);
  const def = findEvent(id, cfg);
  const text = (de.events as Record<string, (typeof de.events)[string] | undefined>)[id];
  if (!def || !text) return null;
  const country = target ? de.foreign.countries[target as keyof typeof de.foreign.countries] : '';
  const t = (s: string) => fill(s, { country });

  const decide = (choice: 'yes' | 'no') => {
    // Eine Entscheidung darf nicht doppelt ausgelöst werden
    if (decided.current) return;
    decided.current = true;
    onDecide(choice);
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > SWIPE_THRESHOLD) decide('yes');
    else if (info.offset.x < -SWIPE_THRESHOLD) decide('no');
  };

  return (
    <div className={styles.stage}>
      <motion.div
        className={styles.card}
        style={{ x, rotate }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.9}
        onDragEnd={onDragEnd}
        data-testid="event-card"
        data-event={id}
      >
        <motion.span className={`${styles.stamp} ${styles.stampYes}`} style={{ opacity: yesOpacity }}>
          {t(text.yes)}
          <Affects effect={def.yes} />
        </motion.span>
        <motion.span className={`${styles.stamp} ${styles.stampNo}`} style={{ opacity: noOpacity }}>
          {t(text.no)}
          <Affects effect={def.no} />
        </motion.span>
        <p className={styles.speaker}>{t(text.speaker)}</p>
        <h3 className={styles.title}>{t(text.title)}</h3>
        <p className={styles.text}>{t(text.text)}</p>
      </motion.div>
      <p className={styles.hint}>{de.eventUi.swipeHint}</p>
      <div className={styles.buttons}>
        <Button variant="secondary" onClick={() => { decide('no'); }} data-testid="event-no">
          {t(text.no)}
          <Affects effect={def.no} />
        </Button>
        <Button onClick={() => { decide('yes'); }} data-testid="event-yes">
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
      return { id: card?.id ?? null, target: card?.target ?? null, count: s.game.run?.events.open.length ?? 0 };
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
    <BottomSheet title={fill(de.eventUi.badge, { count: top.count })} onClose={close} testId="events-sheet">
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
