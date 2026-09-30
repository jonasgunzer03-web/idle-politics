import { z } from 'zod';
import { gameSchema, type GameState } from '../schema';
import { migrate } from './migrations';
import type { SafeStorage, StorageErrorKind } from './storage';

// Zwei rotierende Speicherplätze. Geschrieben wird immer in den Platz, der NICHT den
// neuesten gültigen Stand enthält. Geht ein Schreibvorgang schief (Absturz, voller
// Speicher), bleibt der letzte gültige Stand im anderen Platz erhalten.

export const SLOT_KEYS = ['idle-politics.save.a', 'idle-politics.save.b'] as const;
/** Eigene Speicherplätze der Entwickler-Version (berührt das normale Spiel nie). */
export const DEV_SLOT_KEYS = ['idle-politics.dev.save.a', 'idle-politics.dev.save.b'] as const;
type SlotIndex = 0 | 1;

const envelopeSchema = z.object({
  seq: z.number().int().min(0),
  savedAt: z.number(),
  game: z.unknown(),
});

/** Rohdaten (beliebiger Herkunft) → gültiger, aktueller Spielstand oder null. */
export function parseGame(raw: unknown): GameState | null {
  const migrated = migrate(raw);
  if (!migrated.ok) return null;
  const parsed = gameSchema.safeParse(migrated.value);
  return parsed.success ? parsed.data : null;
}

export function isValidGame(game: unknown): game is GameState {
  return gameSchema.safeParse(game).success;
}

interface SlotInspection {
  /** Enthielt der Platz überhaupt Daten? */
  hadData: boolean;
  /** Laufende Nummer, falls lesbar. */
  seq: number | null;
  /** Gültiger Spielstand oder null. */
  game: GameState | null;
}

function inspectSlot(raw: string | null): SlotInspection {
  if (raw === null) return { hadData: false, seq: null, game: null };
  try {
    const envelope = envelopeSchema.safeParse(JSON.parse(raw));
    if (!envelope.success) return { hadData: true, seq: null, game: null };
    return { hadData: true, seq: envelope.data.seq, game: parseGame(envelope.data.game) };
  } catch {
    return { hadData: true, seq: null, game: null };
  }
}

export type LoadResult =
  | { status: 'loaded'; game: GameState; recoveredFromBackup: boolean }
  | { status: 'empty' }
  | { status: 'error'; error: StorageErrorKind };

export type SaveResult = { ok: true } | { ok: false; error: StorageErrorKind | 'invalid' };

export class SaveManager {
  private readonly storage: SafeStorage;
  /** Platz mit dem neuesten gültigen Stand, oder null, wenn es keinen gibt. */
  private newest: SlotIndex | null = null;
  private seq = 0;

  private readonly keys: readonly [string, string];

  constructor(storage: SafeStorage, keys: readonly [string, string] = SLOT_KEYS) {
    this.storage = storage;
    this.keys = keys;
  }

  load(): LoadResult {
    const rawA = this.storage.read(this.keys[0]);
    const rawB = this.storage.read(this.keys[1]);
    if (!rawA.ok) return { status: 'error', error: rawA.error };
    if (!rawB.ok) return { status: 'error', error: rawB.error };
    const slots = [inspectSlot(rawA.value), inspectSlot(rawB.value)] as const;

    let pick: SlotIndex | null = null;
    for (const index of [0, 1] as const) {
      const slot = slots[index];
      if (!slot.game || slot.seq === null) continue;
      const current = pick === null ? null : slots[pick];
      if (current?.seq == null || slot.seq > current.seq) pick = index;
    }

    if (pick === null) {
      this.newest = null;
      this.seq = 0;
      return { status: 'empty' };
    }
    const chosen = slots[pick];
    if (!chosen.game || chosen.seq === null) return { status: 'empty' };
    this.newest = pick;
    this.seq = chosen.seq;
    // Rückfall: Der andere Platz hatte Daten, die neuer, aber beschädigt waren
    const other = slots[pick === 0 ? 1 : 0];
    const recoveredFromBackup =
      other.hadData && other.game === null && (other.seq === null || other.seq > chosen.seq);
    return { status: 'loaded', game: chosen.game, recoveredFromBackup };
  }

  save(game: GameState, now: number): SaveResult {
    // Nie einen ungültigen Stand schreiben
    if (!isValidGame(game)) return { ok: false, error: 'invalid' };
    const target: SlotIndex = this.newest === 0 ? 1 : 0;
    const nextSeq = this.seq + 1;
    let payload: string;
    try {
      payload = JSON.stringify({ seq: nextSeq, savedAt: now, game });
    } catch {
      return { ok: false, error: 'invalid' };
    }
    const result = this.storage.write(this.keys[target], payload);
    if (!result.ok) return { ok: false, error: result.error };
    this.newest = target;
    this.seq = nextSeq;
    return { ok: true };
  }

  clear(): SaveResult {
    const a = this.storage.remove(this.keys[0]);
    const b = this.storage.remove(this.keys[1]);
    this.newest = null;
    this.seq = 0;
    if (!a.ok) return { ok: false, error: a.error };
    if (!b.ok) return { ok: false, error: b.error };
    return { ok: true };
  }
}
