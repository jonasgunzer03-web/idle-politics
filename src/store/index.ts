import { useStore } from 'zustand';
import { defaultConfig } from '../config';
import { DEV_SLOT_KEYS, SaveManager } from '../engine/save/saveSystem';
import { browserStorage } from '../engine/save/storage';
import { randomSeed } from '../engine/rng';
import { isDebugEnabled } from '../debug/debugFlag';
import { DEV_EDITION, DEV_RESOURCE_FLOOR } from '../debug/edition';
import { createGameStore, type GameStoreState } from './gameStore';

/** Die eine Store-Instanz der App. Tests erzeugen mit createGameStore eigene Instanzen. */
export const gameStore = createGameStore({
  saves: DEV_EDITION
    ? new SaveManager(browserStorage(), DEV_SLOT_KEYS)
    : new SaveManager(browserStorage()),
  config: defaultConfig,
  seed: randomSeed,
  debug: isDebugEnabled(),
  resourceFloor: DEV_EDITION ? DEV_RESOURCE_FLOOR : 0,
});

/**
 * Hook mit Selektor: Komponenten abonnieren nur die Werte, die sie brauchen.
 * Beispiel: `const money = useGame((s) => s.game.run?.resources.money ?? 0);`
 */
export function useGame<T>(selector: (state: GameStoreState) => T): T {
  return useStore(gameStore, selector);
}

// Im Debug-Modus ist der Store in der Browser-Konsole erreichbar (Fehlersuche auf dem iPhone).
if (isDebugEnabled() && typeof window !== 'undefined') {
  (window as unknown as { __idlePolitics?: typeof gameStore }).__idlePolitics = gameStore;
}
