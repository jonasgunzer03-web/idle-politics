import { defaultConfig } from '../config';
import { SaveManager } from '../engine/save/saveSystem';
import { MemoryStorage, SafeStorage } from '../engine/save/storage';
import { testCharacter } from '../test/fixtures';
import { createGameStore } from './gameStore';

const HOUR = 3_600_000;
const T0 = 1_000_000;

function makeStore(backend = new MemoryStorage()) {
  const saves = new SaveManager(new SafeStorage(() => backend));
  const store = createGameStore({ saves, config: defaultConfig, seed: () => 7, debug: false });
  return { store, backend };
}

const setup = {
  character: testCharacter,
  stateId: 'rhenania' as const,
  profession: 'office' as const,
};

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

  it('Einführung schließen merkt sich „gesehen“', () => {
    const { store } = makeStore();
    store.getState().hydrate(T0);
    store.getState().beginRun(setup, T0);
    store.getState().dismissOverlay();
    expect(store.getState().overlays).toEqual([]);
    expect(store.getState().game.flags.introSeen).toBe(true);
  });

  it('nicht spielbare Staaten starten keinen Durchlauf', () => {
    const { store } = makeStore();
    store.getState().hydrate(T0);
    store.getState().beginRun({ ...setup, stateId: 'borealis' }, T0);
    expect(store.getState().game.run).toBeNull();
  });

  it('Laden nach Abwesenheit schreibt Offline-Erträge gut und zeigt den Dialog', () => {
    const backend = new MemoryStorage();
    const first = makeStore(backend).store;
    first.getState().hydrate(T0);
    first.getState().beginRun(setup, T0);
    first.getState().dismissOverlay();
    first.getState().debugAddResources(1000);
    first.getState().buy('overtime', 10);
    first.getState().save(T0);

    const second = makeStore(backend).store;
    second.getState().hydrate(T0 + 2 * HOUR);
    const overlay = second.getState().overlays[0];
    expect(overlay?.kind).toBe('offline');
    // 10 Überstunden × 0,3 × Büro 1,5 × Rhenanien 0,9 = 4,05 €/s
    if (overlay?.kind === 'offline') expect(overlay.report.gained.money).toBeCloseTo(4.05 * 7200);
  });

  it('kurze Abwesenheit ohne Erträge zeigt keinen Dialog', () => {
    const backend = new MemoryStorage();
    const first = makeStore(backend).store;
    first.getState().hydrate(T0);
    first.getState().beginRun(setup, T0);
    first.getState().dismissOverlay();
    first.getState().save(T0);
    const second = makeStore(backend).store;
    second.getState().hydrate(T0 + HOUR);
    expect(second.getState().overlays).toEqual([]);
  });

  it('zweimal hydrate lädt nicht doppelt', () => {
    const { store } = makeStore();
    store.getState().hydrate(T0);
    store.getState().beginRun(setup, T0);
    const game = store.getState().game;
    store.getState().hydrate(T0 + HOUR);
    expect(store.getState().game).toBe(game);
  });

  it('advanceTo mit gleicher Zeit schreibt nichts doppelt gut', () => {
    const { store } = makeStore();
    store.getState().hydrate(T0);
    store.getState().beginRun(setup, T0);
    store.getState().debugAddResources(1000);
    store.getState().buy('overtime', 1);
    store.getState().advanceTo(T0 + 1000);
    const money = store.getState().game.run?.resources.money;
    store.getState().advanceTo(T0 + 1000);
    expect(store.getState().game.run?.resources.money).toBe(money);
  });

  it('es wird immer nur ein Dialog gleichzeitig angezeigt (Warteschlange)', () => {
    const { store } = makeStore();
    store.getState().hydrate(T0);
    store.getState().beginRun(setup, T0);
    store.getState().debugSetStage(2);
    const kinds = store.getState().overlays.map((o) => o.kind);
    expect(kinds).toEqual(['intro', 'hint']);
    store.getState().dismissOverlay();
    expect(store.getState().overlays.map((o) => o.kind)).toEqual(['hint']);
  });

  it('Hinweise erscheinen nur einmal', () => {
    const { store } = makeStore();
    store.getState().hydrate(T0);
    store.getState().beginRun(setup, T0);
    store.getState().dismissOverlay();
    store.getState().debugSetStage(2);
    store.getState().dismissOverlay();
    store.getState().debugSetStage(3);
    store.getState().advanceTo(T0 + 500);
    expect(store.getState().overlays).toEqual([]);
  });

  it('voller Speicher setzt den Status, Spiel läuft weiter', () => {
    const { store, backend } = makeStore();
    store.getState().hydrate(T0);
    store.getState().beginRun(setup, T0);
    backend.failWrites = 'quota';
    store.getState().save(T0 + 1);
    expect(store.getState().storageStatus).toBe('quota');
    store.getState().tap('work');
    expect(store.getState().game.run?.resources.money).toBeGreaterThan(0);
    backend.failWrites = null;
    store.getState().save(T0 + 2);
    expect(store.getState().storageStatus).toBe('ok');
  });

  it('Backup: Export, Zurücksetzen, Import stellt den Stand wieder her', () => {
    const { store } = makeStore();
    store.getState().hydrate(T0);
    store.getState().beginRun(setup, T0);
    store.getState().dismissOverlay();
    for (let i = 0; i < 5; i++) store.getState().tap('work');
    const code = store.getState().exportCode() ?? '';
    const before = store.getState().game.run?.resources.money;
    store.getState().resetGame(T0 + 10);
    expect(store.getState().game.run).toBeNull();
    const result = store.getState().importCode(code, T0 + 20);
    expect(result.ok).toBe(true);
    expect(store.getState().game.run?.resources.money).toBe(before);
    expect(store.getState().game.lastActiveAt).toBe(T0 + 20);
  });

  it('ungültiger Import ändert nichts', () => {
    const { store } = makeStore();
    store.getState().hydrate(T0);
    store.getState().beginRun(setup, T0);
    const game = store.getState().game;
    expect(store.getState().importCode('IP1.kaputt.00000000', T0).ok).toBe(false);
    expect(store.getState().game).toBe(game);
  });

  it('Kauf ohne Mittel liefert 0 und lässt den Stand unverändert', () => {
    const { store } = makeStore();
    store.getState().hydrate(T0);
    store.getState().beginRun(setup, T0);
    const game = store.getState().game;
    expect(store.getState().buy('overtime', 1)).toBe(0);
    expect(store.getState().game).toBe(game);
  });
});
