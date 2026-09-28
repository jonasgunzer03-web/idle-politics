import { useEffect } from 'react';
import { defaultConfig } from '../config';
import { gameStore } from './index';

/**
 * Spielschleife. Läuft über requestAnimationFrame, schreibt aber nur etwa zehnmal pro
 * Sekunde in den Store, damit React nicht 60-mal pro Sekunde neu zeichnet.
 *
 * - Gerechnet wird immer mit echten Zeitstempeln (Date.now), nie mit „ein Takt = x ms“.
 * - App im Hintergrund: Schleife stoppt, Stand wird gespeichert.
 * - Rückkehr: Die Lücke wird über dieselbe Funktion `advanceTo` verrechnet, die dann
 *   automatisch in die Offline-Berechnung wechselt. Keine doppelte Gutschrift möglich.
 */
export function useGameLoop(): void {
  useEffect(() => {
    const { time } = defaultConfig.balancing;
    const store = gameStore.getState;
    let rafId = 0;
    let running = false;
    let lastCommit = 0;

    const markVisibility = (hidden: boolean) => {
      // Pausiert alle CSS-Animationen, solange die App nicht sichtbar ist (siehe global.css)
      document.documentElement.dataset.appHidden = hidden ? 'true' : 'false';
    };

    const frame = (t: number) => {
      if (t - lastCommit >= time.uiCommitIntervalMs) {
        lastCommit = t;
        store().advanceTo(Date.now());
      }
      rafId = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running) return;
      running = true;
      markVisibility(false);
      store().advanceTo(Date.now());
      rafId = requestAnimationFrame(frame);
    };

    const stop = () => {
      if (!running) return;
      running = false;
      markVisibility(true);
      cancelAnimationFrame(rafId);
      const now = Date.now();
      store().advanceTo(now);
      store().save(now);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') stop();
      else start();
    };
    const onPageHide = () => {
      stop();
    };
    const onPageShow = () => {
      if (document.visibilityState === 'visible') start();
    };

    store().hydrate(Date.now());
    if (document.visibilityState === 'visible') start();
    else markVisibility(true);

    const autosave = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      store().advanceTo(now);
      store().save(now);
    }, time.autosaveIntervalMs);

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);

    return () => {
      window.clearInterval(autosave);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
      stop();
    };
  }, []);
}
