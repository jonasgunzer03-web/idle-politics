import { useRef, useState, type PointerEvent } from 'react';

// Wischgeste für Entscheidungskarten (Finger und Maus gleich, über Pointer-Events).
// Rechts = Ja, links = Nein. Die Karte fliegt nach der Entscheidung aus dem Bild,
// erst dann wird die Entscheidung gemeldet. Nicht erlaubtes „Ja“ lässt die Karte wackeln.

/** Ab so vielen Pixeln seitlicher Bewegung gilt die Karte als entschieden. */
export const SWIPE_THRESHOLD = 100;
const FLY_MS = 230;

export type Choice = 'yes' | 'no';

export function useSwipe(onDecide: (c: Choice) => void, canYes = true) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState<Choice | null>(null);
  const [shake, setShake] = useState(0);
  const start = useRef<{ x: number; y: number; axis: 'x' | 'y' | null } | null>(null);
  const decided = useRef(false);

  const decide = (choice: Choice) => {
    // Eine Entscheidung darf nicht doppelt ausgelöst werden
    if (decided.current) return;
    if (choice === 'yes' && !canYes) {
      setDx(0);
      setShake((n) => n + 1);
      return;
    }
    decided.current = true;
    setLeaving(choice);
    window.setTimeout(() => {
      onDecide(choice);
    }, FLY_MS);
  };

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (decided.current) return;
    start.current = { x: e.clientX, y: e.clientY, axis: null };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ohne Capture klappt das Wischen trotzdem, solange der Finger auf der Karte bleibt
    }
  };
  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
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

  const shown = leaving === 'yes' ? 600 : leaving === 'no' ? -600 : dx;
  return {
    /** Aktuelle Verschiebung (inklusive Rausfliegen). */
    dx: shown,
    dragging,
    leaving,
    /** Zähler, der bei abgelehntem Wischen hochzählt (als key für die Wackel-Animation). */
    shake,
    yesAmount: Math.min(1, Math.max(0, (shown - 20) / (SWIPE_THRESHOLD - 20))),
    noAmount: Math.min(1, Math.max(0, (-shown - 20) / (SWIPE_THRESHOLD - 20))),
    decide,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
  };
}
