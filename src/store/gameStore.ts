import { createStore, type StoreApi } from 'zustand/vanilla';
import type { GameConfig } from '../config';
import { investInGroup } from '../engine/alliances';
import { autocracyAction } from '../engine/autocracy';
import {
  finishCeremony,
  promote,
  runForElection,
  turnAutocratic,
  type ElectionOutcome,
} from '../engine/career';
import {
  debugAddResources,
  debugBoostBuildings,
  debugFillResources,
  debugOverthrow,
  debugSetMeters,
  debugSetStage,
  debugShiftTime,
  debugSwitchState,
  debugTriggerEvent,
} from '../engine/debug';
import {
  buildProject,
  buyGenerator,
  buyMachine,
  buyVehicle,
  hireStaff,
  performAction,
  upgradeBuilding,
  type BuyMode,
  type PerformResult,
} from '../engine/economy';
import {
  dismissAdvisor,
  enactPolicy,
  hireAdvisor,
  rejectPolicy,
  revokePolicy,
  rivalCounter,
  type CounterOutcome,
} from '../engine/party';
import { resolveEvent } from '../engine/events';
import { foreignAction } from '../engine/foreign';
import {
  beginNewRunSetup,
  buyLegacy,
  checkAchievements,
  completeEmigration,
  continueRuling,
  createNewGame,
  markHintSeen,
  markIntroSeen,
  pendingHints,
  retire,
  startEmigration,
  startRun,
  updateCharacter,
  type RunSetup,
} from '../engine/game';
import type {
  AchievementId,
  ActionId,
  AutocracyActionId,
  ForeignActionId,
  ForeignId,
  GeneratorId,
  GroupId,
  LegacyId,
  LocationId,
  MachineId,
  PolicyId,
  ProfessionId,
  ProjectId,
  RegionId,
  RivalCounterId,
  StateId,
  VehicleId,
} from '../engine/ids';
import { exportBackup, importBackup, type ImportResult } from '../engine/save/backup';
import type { SaveManager } from '../engine/save/saveSystem';
import type { StorageErrorKind } from '../engine/save/storage';
import type { Character, GameState, HintId } from '../engine/schema';
import { advance, type OfflineReport } from '../engine/tick';
import { enterBuilding, leaveBuilding, stopWalking, walkTo } from '../engine/world';

// Der Store ist eine dünne Hülle um die Engine: Jede Aktion ruft genau eine reine
// Engine-Funktion auf und schreibt das Ergebnis in einem einzigen `set` zurück.
// Dadurch sind Käufe atomar – zwei schnelle Tipps sehen nie denselben alten Stand.

export type Overlay =
  | { kind: 'offline'; report: OfflineReport }
  | { kind: 'recovered' }
  | { kind: 'intro' }
  | { kind: 'hint'; hint: HintId }
  | { kind: 'election'; outcome: ElectionOutcome }
  | { kind: 'resigned'; stage: number };

export type StorageStatus = 'ok' | StorageErrorKind | 'invalid';

/** Bottom Sheets, die der Spieler selbst öffnet. Immer nur eines, nie gleichzeitig mit einem Dialog. */
export type Sheet =
  | { kind: 'events' }
  | { kind: 'career' }
  | { kind: 'autocracy' }
  | { kind: 'group'; id: GroupId }
  | { kind: 'country'; id: ForeignId }
  | { kind: 'region'; id: RegionId }
  | { kind: 'emigration' }
  | { kind: 'editor' }
  | { kind: 'chronicle' }
  | { kind: 'policy'; id: PolicyId };

export interface GameStoreState {
  game: GameState;
  /** Warteschlange für Dialoge. Angezeigt wird immer nur der erste Eintrag. */
  overlays: Overlay[];
  /** Vom Spieler geöffnetes Fenster (null = keines). */
  sheet: Sheet | null;
  /** Kurze Einblendungen für neue Erfolge (blockieren nichts). */
  toasts: AchievementId[];
  storageStatus: StorageStatus;
  hydrated: boolean;
  debug: boolean;

  hydrate: (now: number) => void;
  advanceTo: (now: number) => void;
  save: (now: number) => void;
  dismissOverlay: () => void;
  dismissToast: () => void;
  openSheet: (sheet: Sheet) => boolean;
  closeSheet: () => void;

  beginRun: (setup: RunSetup, now: number) => void;
  perform: (action: ActionId) => Omit<PerformResult, 'game'>;
  buy: (id: GeneratorId, mode: BuyMode) => number;
  hire: (action: ActionId) => void;
  upgradeBuilding: (location: LocationId) => void;
  buyMachine: (id: MachineId) => void;
  hireAdvisor: (index: number) => void;
  dismissAdvisor: (index: number) => void;
  enactPolicy: (id: PolicyId) => void;
  rejectPolicy: (id: PolicyId) => void;
  revokePolicy: (id: PolicyId) => void;
  rivalCounter: (id: RivalCounterId) => CounterOutcome | null;
  buyVehicle: (id: VehicleId) => void;
  walkTo: (id: LocationId) => void;
  stopWalking: () => void;
  enter: () => void;
  leave: () => void;

  runElection: (campaign: number) => ElectionOutcome | null;
  promote: () => void;
  finishCeremony: () => void;
  turnAutocratic: () => void;
  autocracy: (id: AutocracyActionId) => void;
  resolveEvent: (index: number, choice: 'yes' | 'no') => void;
  investGroup: (id: GroupId) => void;
  foreign: (target: ForeignId, action: ForeignActionId) => void;
  buildProject: (id: ProjectId) => void;

  buyLegacy: (id: LegacyId) => void;
  updateCharacter: (character: Character) => void;
  retire: () => void;
  continueRuling: () => void;
  newRunSetup: () => void;
  startEmigration: (to: StateId) => void;
  completeEmigration: (profession: ProfessionId, now: number) => void;

  exportCode: () => string | null;
  importCode: (code: string, now: number) => ImportResult;
  resetGame: (now: number) => void;

  debugAddResources: (amount: number) => void;
  debugBoostBuildings: () => void;
  debugTimeJump: (ms: number, now: number) => void;
  debugSetStage: (stage: number) => void;
  debugSetMeters: (values: { approval?: number; unrest?: number; loyalty?: number }) => void;
  debugTriggerEvent: () => void;
  debugOverthrow: () => void;
  debugSwitchState: (id: StateId) => void;
}

export interface GameStoreDeps {
  saves: SaveManager;
  config: GameConfig;
  seed: () => number;
  debug: boolean;
  /** Entwickler-Version: Währungen werden bei jedem Takt auf diesen Wert aufgefüllt (0 = aus). */
  resourceFloor?: number;
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

export function createGameStore(deps: GameStoreDeps): StoreApi<GameStoreState> {
  const { saves, config: cfg } = deps;

  const logIssues = (issues: string[]) => {
    if (deps.debug && issues.length > 0) {
      console.warn('[Idle Politics] Werte korrigiert:', issues);
    }
  };

  return createStore<GameStoreState>()((set, get) => {
    /**
     * Neuen Spielstand übernehmen: Erfolge prüfen, fällige Hinweise einreihen.
     * Liefert nur die geänderten Felder für `set`.
     */
    const commit = (
      state: GameStoreState,
      game: GameState,
      extra: Overlay[] = [],
    ): Partial<GameStoreState> => {
      if (game === state.game && extra.length === 0) return {};
      const checked = checkAchievements(game, cfg);
      const hints: Overlay[] = pendingHints(checked.game, cfg).map((hint) => ({
        kind: 'hint',
        hint,
      }));
      // Ein Sheet schließt sich, wenn das Spiel die Phase wechselt (z. B. Zeremonie)
      const sheet = checked.game.phase === 'playing' ? state.sheet : null;
      return {
        game: checked.game,
        overlays: enqueue(state.overlays, [...extra, ...hints]),
        toasts: checked.unlocked.length > 0 ? [...state.toasts, ...checked.unlocked] : state.toasts,
        sheet,
      };
    };

    /** Reine Engine-Funktion anwenden (für alle einfachen Aktionen). */
    const apply = (fn: (game: GameState) => GameState) => {
      set((state) => {
        const next = fn(state.game);
        return next === state.game ? state : commit(state, next);
      });
    };

    /** Zeit verrechnen; bei Abwesenheit Rückkehr-Dialog, bei Rücktritt Hinweis. */
    const advanceState = (state: GameStoreState, now: number): Partial<GameStoreState> => {
      const advanced = advance(state.game, now, cfg);
      const floor = deps.resourceFloor ?? 0;
      const result =
        floor > 0 ? { ...advanced, game: debugFillResources(advanced.game, floor) } : advanced;
      logIssues(result.issues);
      const extra: Overlay[] = [];
      let overlays = state.overlays;
      const report = result.offline;
      if (
        report &&
        report.creditedMs >= cfg.balancing.time.offlineReportMinSeconds * 1000 &&
        Object.values(report.gained).some((v) => v > 0)
      ) {
        // Mehrere Abwesenheiten hintereinander: der neueste Bericht ersetzt den alten
        overlays = overlays.filter((o) => o.kind !== 'offline');
        extra.push({ kind: 'offline', report });
      }
      if (result.signal === 'resigned' && result.game.run) {
        extra.push({ kind: 'resigned', stage: result.game.run.stage });
      }
      if (result.game === state.game && extra.length === 0) return {};
      return commit({ ...state, overlays }, result.game, extra);
    };

    return {
      game: createNewGame(Date.now(), deps.seed()),
      overlays: [],
      sheet: null,
      toasts: [],
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
            game: advanced.game ?? loaded.game,
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

      dismissToast: () => {
        set((state) => (state.toasts.length === 0 ? state : { toasts: state.toasts.slice(1) }));
      },

      openSheet: (sheet) => {
        const state = get();
        // Nie zwei Fenster gleichzeitig: nur öffnen, wenn kein Dialog wartet
        if (state.overlays.length > 0 || state.game.phase !== 'playing') return false;
        set({ sheet });
        return true;
      },

      closeSheet: () => {
        if (get().sheet !== null) set({ sheet: null });
      },

      beginRun: (setup, now) => {
        set((state) => {
          const game = startRun(state.game, setup, now, cfg);
          if (game === state.game) return state;
          const intro: Overlay[] = game.flags.introSeen ? [] : [{ kind: 'intro' }];
          return commit({ ...state, overlays: [] }, game, intro);
        });
        get().save(now);
      },

      perform: (action) => {
        // Rückgabe über eine lokale Variable, weil `set` selbst nichts zurückgibt
        let outcome: Omit<PerformResult, 'game'> = { gained: {}, goods: {}, blockedBy: null };
        set((state) => {
          const { game, ...rest } = performAction(state.game, action, cfg);
          outcome = rest;
          return game === state.game ? state : commit(state, game);
        });
        return outcome;
      },

      buy: (id, mode) => {
        let bought = 0;
        set((state) => {
          const result = buyGenerator(state.game, id, mode, cfg);
          bought = result.bought;
          return result.game === state.game ? state : commit(state, result.game);
        });
        return bought;
      },

      hire: (action) => {
        apply((g) => hireStaff(g, action, cfg));
      },
      upgradeBuilding: (location) => {
        apply((g) => upgradeBuilding(g, location, cfg));
      },
      buyMachine: (id) => {
        apply((g) => buyMachine(g, id, cfg));
      },
      hireAdvisor: (index) => {
        apply((g) => hireAdvisor(g, index, cfg));
      },
      dismissAdvisor: (index) => {
        apply((g) => dismissAdvisor(g, index, cfg));
      },
      enactPolicy: (id) => {
        apply((g) => enactPolicy(g, id, cfg));
      },
      rejectPolicy: (id) => {
        apply((g) => rejectPolicy(g, id, cfg));
      },
      revokePolicy: (id) => {
        apply((g) => revokePolicy(g, id, cfg));
      },
      rivalCounter: (id) => {
        let outcome: CounterOutcome | null = null;
        set((state) => {
          const result = rivalCounter(state.game, id, cfg);
          outcome = result.outcome;
          return result.game === state.game ? state : commit(state, result.game);
        });
        return outcome;
      },
      buyVehicle: (id) => {
        apply((g) => buyVehicle(g, id, cfg));
      },
      walkTo: (id) => {
        apply((g) => walkTo(g, id, cfg));
      },
      stopWalking: () => {
        apply((g) => stopWalking(g));
      },
      enter: () => {
        apply((g) => enterBuilding(g, cfg));
      },
      leave: () => {
        apply((g) => leaveBuilding(g));
      },

      runElection: (campaign) => {
        let outcome: ElectionOutcome | null = null;
        set((state) => {
          const result = runForElection(state.game, campaign, cfg);
          outcome = result.outcome;
          if (!result.outcome) return state;
          // Sieg führt in die Zeremonie; Niederlage zeigt einen Dialog
          const extra: Overlay[] = result.outcome.won
            ? []
            : [{ kind: 'election', outcome: result.outcome }];
          return commit({ ...state, sheet: null }, result.game, extra);
        });
        return outcome;
      },

      promote: () => {
        set((state) => {
          const next = promote(state.game, cfg);
          return next === state.game ? state : commit({ ...state, sheet: null }, next);
        });
      },
      finishCeremony: () => {
        apply((g) => finishCeremony(g));
      },
      turnAutocratic: () => {
        apply((g) => turnAutocratic(g, cfg));
      },
      autocracy: (id) => {
        apply((g) => autocracyAction(g, id, cfg));
      },
      resolveEvent: (index, choice) => {
        apply((g) => resolveEvent(g, index, choice, cfg));
      },
      investGroup: (id) => {
        apply((g) => investInGroup(g, id, cfg));
      },
      foreign: (target, action) => {
        apply((g) => foreignAction(g, target, action, cfg));
      },
      buildProject: (id) => {
        apply((g) => buildProject(g, id, cfg));
      },

      buyLegacy: (id) => {
        apply((g) => buyLegacy(g, id, cfg));
      },
      updateCharacter: (character) => {
        apply((g) => updateCharacter(g, character, cfg));
      },
      retire: () => {
        apply((g) => retire(g, cfg));
      },
      continueRuling: () => {
        apply((g) => continueRuling(g));
      },
      newRunSetup: () => {
        apply((g) => beginNewRunSetup(g));
      },
      startEmigration: (to) => {
        set((state) => {
          const next = startEmigration(state.game, to, cfg);
          return next === state.game ? state : commit({ ...state, sheet: null }, next);
        });
      },
      completeEmigration: (profession, now) => {
        apply((g) => completeEmigration(g, profession, now, cfg));
        get().save(now);
      },

      exportCode: () => exportBackup(get().game),

      importCode: (code, now) => {
        const result = importBackup(code);
        if (!result.ok) return result;
        // Importierter Stand gilt ab jetzt; keine Offline-Gutschrift für die Zeit im Code
        const game: GameState = { ...result.game, lastActiveAt: now };
        set((state) => commit({ ...state, overlays: [], sheet: null }, game));
        get().save(now);
        return result;
      },

      resetGame: (now) => {
        const cleared = saves.clear();
        set({
          game: createNewGame(now, deps.seed()),
          overlays: [],
          sheet: null,
          toasts: [],
          storageStatus: cleared.ok ? 'ok' : cleared.error,
        });
      },

      debugAddResources: (amount) => {
        apply((g) => debugAddResources(g, amount));
      },
      debugBoostBuildings: () => {
        apply((g) => debugBoostBuildings(g, cfg));
      },
      debugTimeJump: (ms, now) => {
        set((state) => advanceState({ ...state, game: debugShiftTime(state.game, ms) }, now));
      },
      debugSetStage: (stage) => {
        apply((g) => debugSetStage(g, stage, cfg));
      },
      debugSetMeters: (values) => {
        apply((g) => debugSetMeters(g, values));
      },
      debugTriggerEvent: () => {
        apply((g) => debugTriggerEvent(g, cfg));
      },
      debugOverthrow: () => {
        apply((g) => debugOverthrow(g, cfg));
      },
      debugSwitchState: (id) => {
        apply((g) => debugSwitchState(g, id, cfg));
      },
    };
  });
}
