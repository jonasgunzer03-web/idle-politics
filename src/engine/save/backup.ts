import { compressToBase64, decompressFromBase64 } from 'lz-string';
import type { GameState } from '../schema';
import { checksum } from './checksum';
import { isValidGame, parseGame } from './saveSystem';

// Backup-Code: „IP1.<komprimiertes JSON als Base64>.<Prüfsumme>“.
// IP1 kennzeichnet das Code-Format (nicht die saveVersion, die steht im JSON).

const PREFIX = 'IP1';

export function exportBackup(game: GameState): string | null {
  if (!isValidGame(game)) return null;
  const payload = compressToBase64(JSON.stringify(game));
  return `${PREFIX}.${payload}.${checksum(payload)}`;
}

export type ImportError = 'empty' | 'format' | 'checksum' | 'corrupt' | 'invalid';

export type ImportResult = { ok: true; game: GameState } | { ok: false; error: ImportError };

export function importBackup(code: string): ImportResult {
  // Leerzeichen und Zeilenumbrüche entfernen, die beim Kopieren entstehen können
  const cleaned = code.replace(/\s+/g, '');
  if (cleaned.length === 0) return { ok: false, error: 'empty' };
  const parts = cleaned.split('.');
  if (parts.length !== 3 || parts[0] !== PREFIX) return { ok: false, error: 'format' };
  const payload = parts[1] ?? '';
  const sum = parts[2] ?? '';
  if (payload.length === 0 || checksum(payload) !== sum.toLowerCase()) {
    return { ok: false, error: 'checksum' };
  }
  let raw: unknown;
  try {
    const json = decompressFromBase64(payload);
    if (!json) return { ok: false, error: 'corrupt' };
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: 'corrupt' };
  }
  const game = parseGame(raw);
  return game ? { ok: true, game } : { ok: false, error: 'invalid' };
}
