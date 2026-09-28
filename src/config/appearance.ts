// Farben und Varianten für den Charakter-Editor. Die Anzahl der Einträge bestimmt,
// wie viele Auswahlmöglichkeiten es gibt.

/** Hauttöne (8). */
export const skinTones = [
  '#f6d7c3',
  '#eec1a2',
  '#e0a883',
  '#c98c64',
  '#a8704b',
  '#8a5636',
  '#6b3f27',
  '#4a2a1a',
] as const;

/** Haarfarben (8). */
export const hairColors = [
  '#1d1a18',
  '#3b2a20',
  '#6a4a32',
  '#a07548',
  '#d9b572',
  '#b5502c',
  '#8e8e8e',
  '#e6e2da',
] as const;

/** Parteifarben (8). */
export const partyColors = [
  '#b3261e',
  '#1f4e8c',
  '#2e7d4f',
  '#d9a21b',
  '#6a3d9a',
  '#e0672b',
  '#12848a',
  '#3a3a3a',
] as const;

/** Anzahl der Varianten je Merkmal. */
export const appearanceCounts = {
  build: 3,
  skinTone: skinTones.length,
  faceShape: 3,
  hairStyle: 8,
  hairColor: hairColors.length,
  beard: 5,
  glasses: 4,
  partyColor: partyColors.length,
  partySymbol: 8,
} as const;

/** Längste erlaubte Namen (Zeichen). */
export const nameLimits = { character: 24, party: 32 } as const;
