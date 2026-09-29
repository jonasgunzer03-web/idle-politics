import { useEffect, useRef, useState, type PointerEvent } from 'react';
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

function SwipeCard({
  id,
  target,
  onDecide,
}: {
  id: string;
  target: string | null;
  onDecide: (c: 'yes' | 'no') => void;
}) {
  // Eigene Wischgeste mit Pointer-Events (funktioniert mit Finger und Maus gleich)
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; axis: 'x' | 'y' | null } | null>(null);
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

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    start.current = { x: e.clientX, y: e.clientY, axis: null };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const s0 = start.current;
    if (!s0) return;
    const mx = e.clientX - s0.x;
    const my = e.clientY - s0.y;
    // Erst nach klarer Bewegung entscheiden, ob gewischt (x) oder gescrollt (y) wird
    if (s0.axis === null) {
      if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
      s0.axis = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
      if (s0.axis === 'x') setDragging(true);
    }
    if (s0.axis === 'x') setDx(mx);
  };
  const onPointerUp = () => {
    const s0 = start.current;
    start.current = null;
    setDragging(false);
    if (s0?.axis === 'x') {
      if (dx > SWIPE_THRESHOLD) {
        decide('yes');
        return;
      }
      if (dx < -SWIPE_THRESHOLD) {
        decide('no');
        return;
      }
    }
    setDx(0);
  };

  const yesOpacity = Math.min(1, Math.max(0, (dx - 20) / (SWIPE_THRESHOLD - 20)));
  const noOpacity = Math.min(1, Math.max(0, (-dx - 20) / (SWIPE_THRESHOLD - 20)));

  return (
    <div className={styles.stage}>
      <div
        className={`${styles.card} ${dragging ? styles.dragging : ''}`}
        style={{ transform: `translateX(${dx}px) rotate(${(dx / 200) * 12}deg)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        data-testid="event-card"
        data-event={id}
      >
        <span className={`${styles.stamp} ${styles.stampYes}`} style={{ opacity: yesOpacity }}>
          {t(text.yes)}
          <Affects effect={def.yes} />
        </span>
        <span className={`${styles.stamp} ${styles.stampNo}`} style={{ opacity: noOpacity }}>
          {t(text.no)}
          <Affects effect={def.no} />
        </span>
        <p className={styles.speaker}>{t(text.speaker)}</p>
        <h3 className={styles.title}>{t(text.title)}</h3>
        <p className={styles.text}>{t(text.text)}</p>
      </div>
      <p className={styles.hint}>{de.eventUi.swipeHint}</p>
      <div className={styles.buttons}>
        <Button
          variant="secondary"
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
