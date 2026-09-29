import { appearanceCounts } from '../config/appearance';
import { createRng } from '../engine/rng';
import type { Character } from '../engine/schema';
import { de } from '../i18n/de';

function pick<T>(list: readonly T[], index: number, fallback: T): T {
  return list[index] ?? fallback;
}

/** Zufälliger Charakter über den seedbaren Generator (Zufalls-Button, Debug-Schnellstart). */
export function randomCharacter(seed: number): Character {
  const rng = createRng(seed);
  const first = pick(de.names.first, rng.int(de.names.first.length), 'Mara');
  const last = pick(de.names.last, rng.int(de.names.last.length), 'Sander');
  return {
    name: `${first} ${last}`,
    build: rng.int(appearanceCounts.build),
    skinTone: rng.int(appearanceCounts.skinTone),
    faceShape: rng.int(appearanceCounts.faceShape),
    hairStyle: rng.int(appearanceCounts.hairStyle),
    hairColor: rng.int(appearanceCounts.hairColor),
    beard: 0,
    glasses: 0,
    party: {
      name: pick(de.names.parties, rng.int(de.names.parties.length), 'Bürgerliste'),
      color: rng.int(appearanceCounts.partyColor),
      symbol: rng.int(appearanceCounts.partySymbol),
    },
    accessories: [],
  };
}
