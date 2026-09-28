import { cfg, playingGame } from '../../test/fixtures';
import { zeroResources } from '../economy';
import { createNewGame } from '../game';
import { createRng, nextRandom } from '../rng';
import { applyTap } from '../economy';
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
    for (let i = 0; i < 10; i++) game = applyTap(game, 'work', cfg).game;
    manager.save(game, 9);
    const loaded = new SaveManager(storage).load();
    expect(loaded.status === 'loaded' && loaded.game).toEqual(game);
  });
});
