import { createStore, type StoreApi } from 'zustand/vanilla';
import type { GameConfig } from '../config';
import { applyTap, buyGenerator, type BuyMode } from '../engine/economy';
import { debugAddResources, debugSetStage, debugShiftTime } from '../engine/debug';
import {
  createNewGame,
  markHintSeen,
  markIntroSeen,
  pendingHints,
  startRun,
  type RunSetup,
} from '../engine/game';
import type { GeneratorId, ResourceId, TapActionId } from '../engine/ids';
import { exportBackup, importBackup, type ImportResult } from '../engine/save/backup';
import type { SaveManager } from '../engine/save/saveSystem';
import type { StorageErrorKind } from '../engine/save/storage';
import type { GameState, HintId } from '../engine/schema';
import { advance, type OfflineReport } from '../engine/tick';

// Der Store ist eine dünne Hülle um die Engine: Jede Aktion ruft genau eine reine
// Engine-Funktion auf und schreibt das Ergebnis in einem einzigen `set` zurück.
// Dadurch sind Käufe atomar – zwei schnelle Tipps sehen nie denselben alten Stand.

export type Overlay =
  | { kind: 'offline'; report: OfflineReport }
  | { kind: 'recovered' }
  | { kind: 'intro' }
  | { kind: 'hint'; hint: HintId };

export type StorageStatus = 'ok' | StorageErrorKind | 'invalid';

export interface GameStoreState {
  game: GameState;
  /** Warteschlange für Dialoge. Angezeigt wird immer nur der erste Eintrag. */
  overlays: Overlay[];
  storageStatus: StorageStatus;
  hydrated: boolean;
  debug: boolean;

  hydrate: (now: number) => void;
  advanceTo: (now: number) => void;
  save: (now: number) => void;
  dismissOverlay: () => void;

  beginRun: (setup: RunSetup, now: number) => void;
  tap: (action: TapActionId) => { resource: ResourceId; gained: number };
  buy: (id: GeneratorId, mode: BuyMode) => number;

  exportCode: () => string | null;
  importCode: (code: string, now: number) => ImportResult;
  resetGame: (now: number) => void;

  debugAddResources: (amount: number) => void;
  debugTimeJump: (ms: number, now: number) => void;
  debugSetStage: (stage: number) => void;
}

export interface GameStoreDeps {
  saves: SaveManager;
  config: GameConfig;
  seed: () => number;
  debug: boolean;
}

function overlayKey(o: Overlay): string {
  return o.kind === 'hint' ? `hint:${o.hint}` : o.kind;
}

/** Hängt Dialoge an, ohne Duplikate derselben Art zu erzeugen. */
function enqueue(queue: Overlay[], items: Overlay[]): Overlay[] {
  if (items.length === 0) return queue;
  const keys = new Set(queue.map(overlayKey));
  const additions = items.filter((o) => !keys.has(overlayKey(o)));
  return additions.length === 0 ? queue : [...queue, ...additions];
}

function hintOverlays(game: GameState, cfg: GameConfig): Overlay[] {
  return pendingHints(game, cfg).map((hint) => ({ kind: 'hint', hint }));
}

export function createGameStore(deps: GameStoreDeps): StoreApi<GameStoreState> {
  const { saves, config: cfg } = deps;

  const logIssues = (issues: string[]) => {
    if (deps.debug && issues.length > 0) {
      console.warn('[Idle Politics] Werte korrigiert:', issues);
    }
  };

  return createStore<GameStoreState>()((set, get) => {
    /** Zeit verrechnen und ggf. Offline-Dialog einreihen. */
    const advanceState = (state: GameStoreState, now: number): Partial<GameStoreState> => {
      const result = advance(state.game, now, cfg);
      logIssues(result.issues);
      let overlays = state.overlays;
      const report = result.offline;
      if (
        report &&
        report.creditedMs >= cfg.balancing.time.offlineReportMinSeconds * 1000 &&
        Object.values(report.gained).some((v) => v > 0)
      ) {
        // Mehrere Abwesenheiten hintereinander: der neueste Bericht ersetzt den alten
        overlays = [...overlays.filter((o) => o.kind !== 'offline'), { kind: 'offline', report }];
      }
      overlays = enqueue(overlays, hintOverlays(result.game, cfg));
      return { game: result.game, overlays };
    };

    return {
      game: createNewGame(Date.now(), deps.seed()),
      overlays: [],
      storageStatus: 'ok',
      hydrated: false,
      debug: deps.debug,

      hydrate: (now) => {
        if (get().hydrated) return;
        const loaded = saves.load();
        if (loaded.status === 'loaded') {
          const base: GameStoreState = { ...get(), game: loaded.game };
          const advanced = advanceState(base, now);
          set({
            ...advanced,
            overlays: loaded.recoveredFromBackup
              ? [{ kind: 'recovered' }, ...(advanced.overlays ?? [])]
              : (advanced.overlays ?? []),
            hydrated: true,
            storageStatus: 'ok',
          });
          return;
        }
        set({
          game: createNewGame(now, deps.seed()),
          hydrated: true,
          storageStatus: loaded.status === 'error' ? loaded.error : 'ok',
        });
      },

      advanceTo: (now) => {
        if (!get().hydrated) return;
        set((state) => advanceState(state, now));
      },

      save: (now) => {
        const state = get();
        if (!state.hydrated) return;
        const result = saves.save(state.game, now);
        const status: StorageStatus = result.ok ? 'ok' : result.error;
        if (status !== state.storageStatus) set({ storageStatus: status });
      },

      dismissOverlay: () => {
        set((state) => {
          const [first, ...rest] = state.overlays;
          if (!first) return state;
          let game = state.game;
          if (first.kind === 'intro') game = markIntroSeen(game);
          if (first.kind === 'hint') game = markHintSeen(game, first.hint);
          return { game, overlays: rest };
        });
      },

      beginRun: (setup, now) => {
        set((state) => {
          const game = startRun(state.game, setup, now, cfg);
          if (game === state.game) return state;
          const intro: Overlay[] = game.flags.introSeen ? [] : [{ kind: 'intro' }];
          return {
            game,
            overlays: enqueue(state.overlays, [...intro, ...hintOverlays(game, cfg)]),
          };
        });
        get().save(now);
      },

      tap: (action) => {
        // Rückgabe über eine lokale Variable, weil `set` selbst nichts zurückgibt
        let outcome: { resource: ResourceId; gained: number } = { resource: 'money', gained: 0 };
        set((state) => {
          const result = applyTap(state.game, action, cfg);
          outcome = { resource: result.resource, gained: result.gained };
          return result.game === state.game ? state : { game: result.game };
        });
        return outcome;
      },

      buy: (id, mode) => {
        let bought = 0;
        set((state) => {
          const result = buyGenerator(state.game, id, mode, cfg);
          bought = result.bought;
          return result.game === state.game ? state : { game: result.game };
        });
        return bought;
      },

      exportCode: () => exportBackup(get().game),

      importCode: (code, now) => {
        const result = importBackup(code);
        if (!result.ok) return result;
        // Importierter Stand gilt ab jetzt; keine Offline-Gutschrift für die Zeit im Code
        const game: GameState = { ...result.game, lastActiveAt: now };
        set((state) => ({
          game,
          overlays: enqueue(
            state.overlays.filter((o) => o.kind !== 'offline'),
            hintOverlays(game, cfg),
          ),
        }));
        get().save(now);
        return result;
      },

      resetGame: (now) => {
        const cleared = saves.clear();
        set({
          game: createNewGame(now, deps.seed()),
          overlays: [],
          storageStatus: cleared.ok ? 'ok' : cleared.error,
        });
      },

      debugAddResources: (amount) => {
        set((state) => ({ game: debugAddResources(state.game, amount) }));
      },

      debugTimeJump: (ms, now) => {
        set((state) => advanceState({ ...state, game: debugShiftTime(state.game, ms) }, now));
      },

      debugSetStage: (stage) => {
        set((state) => {
          const game = debugSetStage(state.game, stage);
          return { game, overlays: enqueue(state.overlays, hintOverlays(game, cfg)) };
        });
      },
    };
  });
}
