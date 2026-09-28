import { useEffect, useRef } from 'react';
import { POOL_SIZE, registerFloatingHandler } from './floatingBus';
import styles from './FloatingNumbers.module.css';

const RISE_PX = 70;
const DURATION_MS = 900;

/** Objekt-Pool mit POOL_SIZE Elementen. Animiert nur über transform und opacity. */
export function FloatingNumbers() {
  const refs = useRef<(HTMLSpanElement | null)[]>([]);
  const animations = useRef<(Animation | null)[]>([]);
  const next = useRef(0);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    registerFloatingHandler(({ x, y, text, color }) => {
      const index = next.current;
      next.current = (index + 1) % POOL_SIZE;
      const el = refs.current[index];
      if (!el || typeof el.animate !== 'function') return;
      animations.current[index]?.cancel();
      el.textContent = text;
      el.style.color = color;
      // Leichter seitlicher Versatz, damit schnelle Tipps nicht übereinander liegen
      const dx = ((index % 5) - 2) * 6;
      const start = `translate(${x + dx}px, ${y}px) translate(-50%, -50%)`;
      const end = reduced.matches
        ? start
        : `translate(${x + dx}px, ${y - RISE_PX}px) translate(-50%, -50%)`;
      animations.current[index] = el.animate(
        [
          { transform: start, opacity: 1 },
          { transform: end, opacity: 0 },
        ],
        { duration: reduced.matches ? 500 : DURATION_MS, easing: 'ease-out', fill: 'forwards' },
      );
    });
    const pool = animations.current;
    return () => {
      registerFloatingHandler(null);
      for (const a of pool) a?.cancel();
    };
  }, []);

  return (
    <div className={styles.layer} aria-hidden="true">
      {Array.from({ length: POOL_SIZE }, (_, i) => (
        <span
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className={`${styles.number} num`}
        />
      ))}
    </div>
  );
}
