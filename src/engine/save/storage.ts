// Kapselung von localStorage. Jeder Zugriff ist abgesichert: In privaten Tabs, bei vollem
// Speicher oder gesperrten Website-Daten wirft Safari Ausnahmen – das Spiel läuft trotzdem weiter.

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type StorageErrorKind = 'unavailable' | 'quota' | 'unknown';

export type StorageResult<T> = { ok: true; value: T } | { ok: false; error: StorageErrorKind };

function classify(err: unknown): StorageErrorKind {
  if (err instanceof DOMException) {
    if (err.name === 'QuotaExceededError') return 'quota';
    if (err.name === 'SecurityError') return 'unavailable';
  }
  return 'unknown';
}

export class SafeStorage {
  private readonly getBackend: () => KeyValueStorage | null;

  constructor(getBackend: () => KeyValueStorage | null) {
    this.getBackend = getBackend;
  }

  private backend(): KeyValueStorage | null {
    try {
      return this.getBackend();
    } catch {
      return null;
    }
  }

  read(key: string): StorageResult<string | null> {
    const b = this.backend();
    if (!b) return { ok: false, error: 'unavailable' };
    try {
      return { ok: true, value: b.getItem(key) };
    } catch (err) {
      return { ok: false, error: classify(err) };
    }
  }

  write(key: string, value: string): StorageResult<null> {
    const b = this.backend();
    if (!b) return { ok: false, error: 'unavailable' };
    try {
      b.setItem(key, value);
      return { ok: true, value: null };
    } catch (err) {
      return { ok: false, error: classify(err) };
    }
  }

  remove(key: string): StorageResult<null> {
    const b = this.backend();
    if (!b) return { ok: false, error: 'unavailable' };
    try {
      b.removeItem(key);
      return { ok: true, value: null };
    } catch (err) {
      return { ok: false, error: classify(err) };
    }
  }
}

export function browserStorage(): SafeStorage {
  return new SafeStorage(() => (typeof window === 'undefined' ? null : window.localStorage));
}

/** Einfacher Speicher im Arbeitsspeicher, für Tests. */
export class MemoryStorage implements KeyValueStorage {
  readonly data = new Map<string, string>();
  failWrites: StorageErrorKind | null = null;

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failWrites === 'quota') throw new DOMException('full', 'QuotaExceededError');
    if (this.failWrites) throw new DOMException('blocked', 'SecurityError');
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }
}
