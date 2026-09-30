import { cfg, playingGame } from '../../test/fixtures';
import { zeroResources } from '../economy';
import { createNewGame } from '../game';
import { createRng, nextRandom } from '../rng';
import { performAction } from '../economy';
import { exportBackup, importBackup } from './backup';
import { checksum } from './checksum';
import { migrate, type Migration } from './migrations';
import { SaveManager, SLOT_KEYS, parseGame } from './saveSystem';
import { MemoryStorage, SafeStorage } from './storage';

function setup() {
  const backend = new MemoryStorage();
  const storage = new SafeStorage(() => backend);
  return { backend, storage, manager: new SaveManager(storage) };
}

describe('SaveManager', () => {
  it('leerer Speicher ergibt „empty“', () => {
    expect(setup().manager.load()).toEqual({ status: 'empty' });
  });

  it('speichert und lädt einen Spielstand verlustfrei', () => {
    const { storage, manager } = setup();
    const game = playingGame({ generators: { overtime: 3 } });
    expect(manager.save(game, 5)).toEqual({ ok: true });
    const loaded = new SaveManager(storage).load();
    expect(loaded).toEqual({ status: 'loaded', game, recoveredFromBackup: false });
  });

  it('wechselt zwischen zwei Speicherplätzen', () => {
    const { backend, manager } = setup();
    manager.save(playingGame(), 1);
    expect(backend.data.has(SLOT_KEYS[0])).toBe(true);
    expect(backend.data.has(SLOT_KEYS[1])).toBe(false);
    manager.save(playingGame(), 2);
    expect(backend.data.has(SLOT_KEYS[1])).toBe(true);
  });

  it('lädt den neuesten Stand', () => {
    const { storage, manager } = setup();
    manager.save(playingGame({ stage: 1 }), 1);
    manager.save(playingGame({ stage: 2 }), 2);
    manager.save(playingGame({ stage: 3 }), 3);
    const loaded = new SaveManager(storage).load();
    expect(loaded.status === 'loaded' && loaded.game.run?.stage).toBe(3);
  });

  it('fällt auf den anderen Platz zurück, wenn der neueste beschädigt ist', () => {
    const { backend, storage, manager } = setup();
    manager.save(playingGame({ stage: 1 }), 1); // Platz A, seq 1
    manager.save(playingGame({ stage: 2 }), 2); // Platz B, seq 2
    backend.data.set(SLOT_KEYS[1], '{"seq":2,"savedAt":2,"game":{"kaputt":tr');
    const loaded = new SaveManager(storage).load();
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') return;
    expect(loaded.game.run?.stage).toBe(1);
    expect(loaded.recoveredFromBackup).toBe(true);
  });

  it('nach dem Rückfall wird der beschädigte Platz überschrieben, nicht der gute', () => {
    const { backend, storage } = setup();
    const first = new SaveManager(storage);
    first.save(playingGame({ stage: 1 }), 1);
    first.save(playingGame({ stage: 2 }), 2);
    backend.data.set(SLOT_KEYS[1], 'Müll');
    const second = new SaveManager(storage);
    second.load();
    second.save(playingGame({ stage: 5 }), 3);
    expect(backend.data.get(SLOT_KEYS[1])).toContain('"stage":5');
    expect(backend.data.get(SLOT_KEYS[0])).toContain('"stage":1');
  });

  it('schreibt nie einen ungültigen Stand', () => {
    const { backend, manager } = setup();
    manager.save(playingGame(), 1);
    const before = new Map(backend.data);
    const broken = playingGame({ resources: { ...zeroResources(), money: Number.NaN } });
    expect(manager.save(broken, 2)).toEqual({ ok: false, error: 'invalid' });
    expect(backend.data).toEqual(before);
  });

  it('voller Speicher: Fehler melden, alter Stand bleibt', () => {
    const { backend, storage, manager } = setup();
    manager.save(playingGame({ stage: 4 }), 1);
    backend.failWrites = 'quota';
    expect(manager.save(playingGame({ stage: 6 }), 2)).toEqual({ ok: false, error: 'quota' });
    backend.failWrites = null;
    const loaded = new SaveManager(storage).load();
    expect(loaded.status === 'loaded' && loaded.game.run?.stage).toBe(4);
  });

  it('gesperrter Speicher wirft nie eine Ausnahme', () => {
    const storage = new SafeStorage(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    const manager = new SaveManager(storage);
    expect(manager.load()).toEqual({ status: 'error', error: 'unavailable' });
    expect(manager.save(playingGame(), 1)).toEqual({ ok: false, error: 'unavailable' });
  });

  it('clear entfernt beide Plätze', () => {
    const { backend, manager } = setup();
    manager.save(playingGame(), 1);
    manager.save(playingGame(), 2);
    manager.clear();
    expect(backend.data.size).toBe(0);
    expect(manager.load()).toEqual({ status: 'empty' });
  });
});

describe('parseGame', () => {
  it('lehnt Stände mit NaN (als null gespeichert) ab', () => {
    const raw = JSON.parse(
      JSON.stringify(playingGame({ resources: { ...zeroResources(), money: Number.NaN } })),
    ) as unknown;
    expect(parseGame(raw)).toBeNull();
  });

  it('lehnt unbekannte Staaten und Stufen außerhalb 1–12 ab', () => {
    const game = playingGame();
    expect(parseGame({ ...game, run: { ...game.run, stateId: 'atlantis' } })).toBeNull();
    expect(parseGame({ ...game, run: { ...game.run, stage: 13 } })).toBeNull();
  });

  it('akzeptiert einen frischen Stand im Startablauf', () => {
    const game = createNewGame(0, 7);
    expect(parseGame(JSON.parse(JSON.stringify(game)))).toEqual(game);
  });
});

describe('Migration', () => {
  const table: Record<number, Migration> = {
    1: (old) => ({ ...old, saveVersion: 2, added: 'x' }),
    2: (old) => ({ ...old, saveVersion: 3, renamed: old.added }),
  };

  it('hebt Stände Schritt für Schritt auf die Zielversion', () => {
    const result = migrate({ saveVersion: 1 }, table, 3);
    expect(result).toEqual({ ok: true, value: { saveVersion: 3, added: 'x', renamed: 'x' } });
  });

  it('lässt aktuelle Stände unverändert', () => {
    expect(migrate({ saveVersion: 3, a: 1 }, table, 3)).toEqual({
      ok: true,
      value: { saveVersion: 3, a: 1 },
    });
  });

  it('lehnt zu neue, versionslose und unbekannte Stände ab', () => {
    expect(migrate({ saveVersion: 4 }, table, 3)).toEqual({ ok: false, reason: 'too-new' });
    expect(migrate({}, table, 3)).toEqual({ ok: false, reason: 'no-version' });
    expect(migrate('text', table, 3)).toEqual({ ok: false, reason: 'not-object' });
    expect(migrate({ saveVersion: 0 }, table, 3)).toEqual({
      ok: false,
      reason: 'missing-migration',
    });
  });

  it('fängt Fehler in einer Migration ab', () => {
    const failing: Record<number, Migration> = {
      1: () => {
        throw new Error('boom');
      },
    };
    expect(migrate({ saveVersion: 1 }, failing, 2)).toEqual({ ok: false, reason: 'failed' });
  });
});

describe('Backup-Code', () => {
  it('Export und Import ergeben denselben Stand', () => {
    const game = playingGame({ generators: { overtime: 12, sideJob: 3 }, stage: 2 });
    const code = exportBackup(game);
    expect(code).toMatch(/^IP1\.[A-Za-z0-9+/=]+\.[0-9a-f]{8}$/);
    expect(importBackup(code ?? '')).toEqual({ ok: true, game });
  });

  it('verträgt Leerzeichen und Zeilenumbrüche', () => {
    const code = exportBackup(playingGame()) ?? '';
    const messy = `  ${code.slice(0, 20)}\n${code.slice(20)}  `;
    expect(importBackup(messy).ok).toBe(true);
  });

  it('erkennt Tippfehler über die Prüfsumme', () => {
    const code = exportBackup(playingGame()) ?? '';
    const [p, payload = '', sum] = code.split('.');
    const flipped = payload[5] === 'A' ? 'B' : 'A';
    const tampered = `${p}.${payload.slice(0, 5)}${flipped}${payload.slice(6)}.${sum}`;
    expect(importBackup(tampered)).toEqual({ ok: false, error: 'checksum' });
  });

  it('meldet falsches Format und leere Eingabe', () => {
    expect(importBackup('')).toEqual({ ok: false, error: 'empty' });
    expect(importBackup('hallo')).toEqual({ ok: false, error: 'format' });
    expect(importBackup('XX1.abc.12345678')).toEqual({ ok: false, error: 'format' });
  });

  it('lehnt einen Code mit gültiger Prüfsumme, aber ungültigem Inhalt ab', () => {
    const payload = 'Tm9jaCBrZWluIFNwaWVsc3RhbmQ=';
    expect(importBackup(`IP1.${payload}.${checksum(payload)}`).ok).toBe(false);
  });
});

describe('Zufallsgenerator', () => {
  it('ist mit gleichem Seed reproduzierbar', () => {
    const a = createRng(123);
    const b = createRng(123);
    const seqA = Array.from({ length: 5 }, () => a.next());
    const seqB = Array.from({ length: 5 }, () => b.next());
    expect(seqA).toEqual(seqB);
    expect(new Set(seqA).size).toBe(5);
  });

  it('liefert Werte in [0, 1) und ganze Zahlen im Bereich', () => {
    const rng = createRng(9);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      const n = rng.int(8);
      expect(Number.isInteger(n) && n >= 0 && n < 8).toBe(true);
    }
  });

  it('nextRandom ist rein (gleicher Zustand → gleiches Ergebnis)', () => {
    expect(nextRandom(55)).toEqual(nextRandom(55));
  });
});

describe('Ganzer Kreislauf', () => {
  it('tippen, speichern, laden ergibt denselben Stand', () => {
    const { storage, manager } = setup();
    let game = playingGame();
    for (let i = 0; i < 10; i++) game = performAction(game, 'work', cfg).game;
    manager.save(game, 9);
    const loaded = new SaveManager(storage).load();
    expect(loaded.status === 'loaded' && loaded.game).toEqual(game);
  });
});

describe('Migration v1 → v2 (Spielstand aus Phase 1)', () => {
  const v1 = {
    saveVersion: 1,
    phase: 'playing',
    createdAt: 1000,
    lastActiveAt: 5000,
    rngState: 99,
    character: {
      name: 'Ida Brandt',
      build: 1,
      skinTone: 3,
      faceShape: 2,
      hairStyle: 4,
      hairColor: 5,
      beard: 0,
      glasses: 0,
      party: { name: 'Bürgerliste', color: 2, symbol: 1 },
    },
    run: {
      stateId: 'rhenania',
      profession: 'skilled',
      path: 'democratic',
      stage: 2,
      resources: { money: 123.4, influence: 56, followers: 7, loyalty: 0, diplomacy: 0 },
      earned: { money: 500, influence: 80, followers: 9, loyalty: 0, diplomacy: 0 },
      approval: 50,
      unrest: 5,
      generators: { overtime: 3, regularsTable: 1 },
      startedAt: 1000,
      playMs: 42_000,
    },
    flags: { introSeen: true, hintsSeen: ['followersUnlocked'] },
    stats: { totalTaps: 77, totalPlayMs: 42_000, runsStarted: 1 },
  };

  it('ein alter Spielstand wird gültig übernommen', () => {
    const game = parseGame(v1);
    expect(game).not.toBeNull();
    if (!game?.run) return;
    expect(game.saveVersion).toBe(3);
    expect(game.character?.accessories).toEqual([]);
    expect(game.run.resources).toEqual({ money: 123.4, influence: 56, followers: 7, diplomacy: 0 });
    expect(game.run.generators).toEqual({ overtime: 3, regularsTable: 1 });
    expect(game.run.world.inside).toBe(true);
    expect(game.meta.totalTaps).toBe(77);
    expect(game.flags.introSeen).toBe(true);
  });

  it('auch über den Backup-Code und den Speicher', () => {
    const { storage } = setup();
    storage.write(SLOT_KEYS[0], JSON.stringify({ seq: 1, savedAt: 1, game: v1 }));
    const loaded = new SaveManager(storage).load();
    expect(loaded.status).toBe('loaded');
  });

  it('ein alter Stand im Startablauf bleibt im Startablauf', () => {
    const game = parseGame({ ...v1, phase: 'setup', run: null, character: null });
    expect(game?.phase).toBe('setup');
  });
});

describe('Migration v2 → v3 (Produktionsketten, Parteibüro)', () => {
  function v2Save(): Record<string, unknown> {
    const game = JSON.parse(JSON.stringify(playingGame({ stage: 5 }))) as Record<string, unknown>;
    const run = game.run as Record<string, unknown>;
    for (const key of [
      'seed',
      'goods',
      'buildings',
      'morale',
      'striking',
      'advisors',
      'advisorPool',
      'agenda',
      'laws',
      'rival',
      'chronicle',
    ]) {
      Reflect.deleteProperty(run, key);
    }
    const stats = run.stats as Record<string, unknown>;
    delete stats.lawsPassed;
    delete stats.upgrades;
    delete stats.defections;
    run.actions = { work: { staff: 12, training: 6 }, network: { staff: 0, training: 3 } };
    return { ...game, saveVersion: 2, run };
  }

  it('Mitarbeiter bleiben, das Gebäude wächst mit, Schulungen werden Maschinen', () => {
    const game = parseGame(v2Save());
    expect(game?.saveVersion).toBe(3);
    const run = game?.run;
    if (!run) throw new Error('run');
    expect(run.actions.work?.staff).toBe(12);
    expect(run.actions.network).toBeUndefined();
    // 12 Mitarbeiter brauchen Ausbaustufe 3 (18 Plätze)
    expect(run.buildings.workplace?.level).toBe(3);
    expect(run.buildings.workplace?.machines.conveyor).toBe(3);
    // Kneipe: keine Mitarbeiter, Schulung 3 → Maschine Stufe 1 bei Ausbaustufe 1
    expect(run.buildings.pub?.machines.beerTap).toBe(1);
    expect(run.goods).toEqual({ wares: 0, contacts: 0, flyers: 0, files: 0 });
    expect(run.rival.status).toBe('active');
    expect(run.laws).toEqual({});
    expect(run.stats.lawsPassed).toBe(0);
  });
});
