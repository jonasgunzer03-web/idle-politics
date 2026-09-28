import { z } from 'zod';
import { appearanceCounts, nameLimits } from '../config/appearance';
import {
  GENERATOR_IDS,
  MAX_STAGE,
  PATH_IDS,
  PROFESSION_IDS,
  RESOURCE_IDS,
  STATE_IDS,
  type GeneratorId,
} from './ids';

// Das zod-Schema ist die einzige Quelle für die Form des Spielstands. Die TypeScript-Typen
// werden daraus abgeleitet. Jede Änderung hier erfordert eine neue saveVersion und eine
// Migration in save/migrations.ts.

export const SAVE_VERSION = 1;

// z.number() lehnt in zod 4 NaN und Infinity bereits ab.
const finiteNonNeg = z.number().min(0);
const index = (count: number) =>
  z
    .number()
    .int()
    .min(0)
    .max(count - 1);
const percent = z.number().min(0).max(100);

export const resourceMapSchema = z.object(
  Object.fromEntries(RESOURCE_IDS.map((id) => [id, finiteNonNeg])) as Record<
    (typeof RESOURCE_IDS)[number],
    typeof finiteNonNeg
  >,
);

export const characterSchema = z.object({
  name: z.string().trim().min(1).max(nameLimits.character),
  build: index(appearanceCounts.build),
  skinTone: index(appearanceCounts.skinTone),
  faceShape: index(appearanceCounts.faceShape),
  hairStyle: index(appearanceCounts.hairStyle),
  hairColor: index(appearanceCounts.hairColor),
  beard: index(appearanceCounts.beard),
  glasses: index(appearanceCounts.glasses),
  party: z.object({
    name: z.string().trim().min(1).max(nameLimits.party),
    color: index(appearanceCounts.partyColor),
    symbol: index(appearanceCounts.partySymbol),
  }),
});

const generatorCountsSchema = z.partialRecord(
  z.enum(GENERATOR_IDS),
  z.number().int().min(0).max(1_000_000),
);

export const runSchema = z.object({
  stateId: z.enum(STATE_IDS),
  profession: z.enum(PROFESSION_IDS),
  path: z.enum(PATH_IDS),
  stage: z.number().int().min(1).max(MAX_STAGE),
  resources: resourceMapSchema,
  /** Insgesamt in diesem Durchlauf verdient (für Statistik). */
  earned: resourceMapSchema,
  approval: percent,
  unrest: percent,
  generators: generatorCountsSchema,
  startedAt: finiteNonNeg,
  /** Aktive Spielzeit dieses Durchlaufs in ms. */
  playMs: finiteNonNeg,
});

export const HINT_IDS = ['followersUnlocked'] as const;

export const gameSchema = z.object({
  saveVersion: z.literal(SAVE_VERSION),
  /** Zustandsmaschine: 'setup' = Startablauf, 'playing' = normales Spiel. */
  phase: z.enum(['setup', 'playing']),
  createdAt: finiteNonNeg,
  /** Zeitpunkt, bis zu dem die Spielzeit verrechnet ist. Grundlage für Offline-Fortschritt. */
  lastActiveAt: finiteNonNeg,
  /** Zustand des seedbaren Zufallsgenerators. */
  rngState: z.number().int().min(0).max(0xffffffff),
  character: characterSchema.nullable(),
  run: runSchema.nullable(),
  flags: z.object({
    introSeen: z.boolean(),
    hintsSeen: z.array(z.enum(HINT_IDS)),
  }),
  stats: z.object({
    totalTaps: z.number().int().min(0),
    totalPlayMs: finiteNonNeg,
    runsStarted: z.number().int().min(0),
  }),
});

export type GameState = z.infer<typeof gameSchema>;
export type RunState = z.infer<typeof runSchema>;
export type Character = z.infer<typeof characterSchema>;
export type HintId = (typeof HINT_IDS)[number];
export type GeneratorCounts = Partial<Record<GeneratorId, number>>;
