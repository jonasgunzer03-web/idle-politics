import { defaultConfig } from '../config';
import { nextRandom } from '../engine/rng';
import { DEV_SLOT_KEYS, SaveManager } from '../engine/save/saveSystem';
import { MemoryStorage, SafeStorage } from '../engine/save/storage';
import { findLocation } from '../engine/unlocks';
import { testCharacter } from '../test/fixtures';
import { createGameStore } from './gameStore';

const HOUR = 3_600_000;
const T0 = 1_000_000;
const cfg = defaultConfig;

function makeStore(backend = new MemoryStorage()) {
  const saves = new SaveManager(new SafeStorage(() => backend));
  const store = createGameStore({ saves, config: cfg, seed: () => 7, debug: false });
  return { store, backend };
}

const setup = {
  character: testCharacter,
  stateId: 'rhenania' as const,
  profession: 'office' as const,
};

function started() {
  const { store, backend } = makeStore();
  store.getState().hydrate(T0);
  store.getState().beginRun(setup, T0);
  store.getState().dismissOverlay(); // Einführung
  return { store, backend };
}

describe('gameStore', () => {
  it('startet ohne Spielstand im Startablauf', () => {
    const { store } = makeStore();
    store.getState().hydrate(T0);
    expect(store.getState().hydrated).toBe(true);
    expect(store.getState().game.phase).toBe('setup');
  });

  it('neuer Durchlauf reiht die Einführung ein und speichert sofort', () => {
    const { store, backend } = makeStore();
    store.getState().hydrate(T0);
    store.getState().beginRun(setup, T0);
    expect(store.getState().overlays).toEqual([{ kind: 'intro' }]);
    expect(backend.data.size).toBe(1);
  });

  it('Tätigkeit im Werk bringt Geld und schaltet einen Erfolg frei (Einblendung)', () => {
    const { store } = started();
    const result = store.getState().perform('work');
    expect(result.gained.money).toBeGreaterThan(0);
    expect(store.getState().toasts).toContain('firstShift');
    store.getState().dismissToast();
    expect(store.getState().toasts).toEqual([]);
  });

  it('Fenster öffnen sich nicht, solange ein Dialog wartet', () => {
    const { store } = makeStore();
    store.getState().hydrate(T0);
    store.getState().beginRun(setup, T0);
    expect(store.getState().openSheet({ kind: 'career' })).toBe(false);
    store.getState().dismissOverlay();
    expect(store.getState().openSheet({ kind: 'career' })).toBe(true);
    expect(store.getState().sheet).toEqual({ kind: 'career' });
  });

  it('Laufen, Betreten und Verlassen', () => {
    const { store } = started();
    store.getState().leave();
    store.getState().walkTo('pub');
    expect(store.getState().game.run?.world.target).toBe('pub');
    store.getState().advanceTo(T0 + 3000);
    store.getState().advanceTo(T0 + 5000);
    expect(store.getState().game.run?.world.target).toBeNull();
    store.getState().enter();
    expect(store.getState().game.run?.world.inside).toBe(true);
  });

  it('verlorene Wahl zeigt einen Dialog, das Spiel läuft weiter', () => {
    const { store } = started();
    let seed = 1;
    while (nextRandom(seed).value < 0.5) seed++;
    const game = store.getState().game;
    const run = game.run;
    if (!run) throw new Error('run');
    store.setState({
      game: {
        ...game,
        rngState: seed,
        run: {
          ...run,
          stage: 3,
          approval: 0,
          resources: { money: 1e9, influence: 1e9, followers: 1, diplomacy: 0 },
          world: { posX: findLocation('partyOffice', cfg)?.x ?? 0, target: null, inside: true },
        },
      },
    });
    const outcome = store.getState().runElection(0);
    expect(outcome?.won).toBe(false);
    expect(store.getState().overlays[0]?.kind).toBe('election');
    expect(store.getState().game.phase).toBe('playing');
  });

  it('gewonnene Wahl führt in die Zeremonie, danach weiter', () => {
    const { store } = started();
    const game = store.getState().game;
    const run = game.run;
    if (!run) throw new Error('run');
    store.setState({
      game: {
        ...game,
        run: {
          ...run,
          approval: 100,
          resources: { money: 1e9, influence: 1e9, followers: 1e9, diplomacy: 0 },
          world: { posX: findLocation('partyOffice', cfg)?.x ?? 0, target: null, inside: true },
        },
      },
      sheet: { kind: 'career' },
    });
    expect(store.getState().runElection(3)?.won).toBe(true);
    expect(store.getState().game.phase).toBe('ceremony');
    expect(store.getState().sheet).toBeNull();
    store.getState().finishCeremony();
    expect(store.getState().game.phase).toBe('playing');
    expect(store.getState().game.run?.stage).toBe(2);
  });

  it('Laden nach Abwesenheit zeigt den Rückkehr-Dialog', () => {
    const { store, backend } = started();
    store.getState().debugAddResources(1000);
    store.getState().buy('overtime', 10);
    store.getState().save(T0);
    const second = makeStore(backend).store;
    second.getState().hydrate(T0 + 2 * HOUR);
    expect(second.getState().overlays[0]?.kind).toBe('offline');
  });

  it('keine doppelte Gutschrift bei gleicher Zeit', () => {
    const { store } = started();
    store.getState().debugAddResources(1000);
    store.getState().buy('overtime', 1);
    store.getState().advanceTo(T0 + 1000);
    const money = store.getState().game.run?.resources.money;
    store.getState().advanceTo(T0 + 1000);
    expect(store.getState().game.run?.resources.money).toBe(money);
  });

  it('Hinweise erscheinen einmal und nacheinander', () => {
    const { store } = started();
    store.getState().debugSetStage(2);
    expect(store.getState().overlays.map((o) => o.kind)).toEqual(['hint', 'hint']);
    store.getState().dismissOverlay();
    store.getState().dismissOverlay();
    store.getState().advanceTo(T0 + 500);
    expect(store.getState().overlays).toEqual([]);
  });

  it('Rücktritt bei 100 % Unruhe zeigt einen Dialog', () => {
    const { store } = started();
    const game = store.getState().game;
    const run = game.run;
    if (!run) throw new Error('run');
    store.setState({
      game: { ...game, run: { ...run, stage: 4, unrest: 100, criticalSince: 0, playMs: 100_000 } },
    });
    store.getState().advanceTo(T0 + 200);
    expect(store.getState().overlays[0]?.kind).toBe('resigned');
    expect(store.getState().game.run?.stage).toBe(2);
  });

  it('voller Speicher setzt den Status, Spiel läuft weiter', () => {
    const { store, backend } = started();
    backend.failWrites = 'quota';
    store.getState().save(T0 + 1);
    expect(store.getState().storageStatus).toBe('quota');
    backend.failWrites = null;
    store.getState().save(T0 + 2);
    expect(store.getState().storageStatus).toBe('ok');
  });

  it('Backup: Export, Zurücksetzen, Import stellt den Stand wieder her', () => {
    const { store } = started();
    for (let i = 0; i < 5; i++) store.getState().perform('work');
    const code = store.getState().exportCode() ?? '';
    const before = store.getState().game.run?.resources.money;
    store.getState().resetGame(T0 + 10);
    expect(store.getState().game.run).toBeNull();
    expect(store.getState().importCode(code, T0 + 20).ok).toBe(true);
    expect(store.getState().game.run?.resources.money).toBe(before);
  });

  it('Sturz über das Debug-Menü führt zum Abschluss und in einen neuen Durchlauf', () => {
    const { store } = started();
    store.getState().debugOverthrow();
    expect(store.getState().game.phase).toBe('runEnded');
    store.getState().newRunSetup();
    expect(store.getState().game.phase).toBe('setup');
    store.getState().beginRun({ stateId: 'novaria', profession: 'skilled' }, T0 + 100);
    expect(store.getState().game.run?.stateId).toBe('novaria');
    expect(store.getState().game.character?.name).toBe(testCharacter.name);
  });
});

describe('Entwickler-Version', () => {
  it('füllt Ressourcen bei jedem Takt wieder auf und nutzt eigene Speicherplätze', () => {
    const backend = new MemoryStorage();
    const saves = new SaveManager(new SafeStorage(() => backend), DEV_SLOT_KEYS);
    const store = createGameStore({
      saves,
      config: cfg,
      seed: () => 7,
      debug: true,
      resourceFloor: 1e15,
    });
    store.getState().hydrate(T0);
    store.getState().beginRun(setup, T0);
    store.getState().advanceTo(T0 + 100);
    expect(store.getState().game.run?.resources.money).toBe(1e15);
    store.getState().buy('overtime', 10);
    store.getState().advanceTo(T0 + 200);
    expect(store.getState().game.run?.resources.money).toBe(1e15);
    expect(backend.data.has(DEV_SLOT_KEYS[0])).toBe(true);
    expect(backend.data.has('idle-politics.save.a')).toBe(false);
  });
});
