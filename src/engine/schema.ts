import { z } from 'zod';
import { appearanceCounts, nameLimits } from '../config/appearance';
import {
  ACCESSORY_IDS,
  ACHIEVEMENT_IDS,
  ACTION_IDS,
  FOREIGN_IDS,
  GENERATOR_IDS,
  GROUP_IDS,
  LEGACY_IDS,
  LOCATION_IDS,
  MAX_STAGE,
  PATH_IDS,
  PROFESSION_IDS,
  PROJECT_IDS,
  RESOURCE_IDS,
  STATE_IDS,
  VEHICLE_IDS,
  type GeneratorId,
} from './ids';

// Das zod-Schema ist die einzige Quelle für die Form des Spielstands. Die TypeScript-Typen
// werden daraus abgeleitet. Jede Änderung hier erfordert eine neue saveVersion und eine
// Migration in save/migrations.ts.

export const SAVE_VERSION = 2;

// z.number() lehnt in zod 4 NaN und Infinity bereits ab.
const finiteNonNeg = z.number().min(0);
const count = z.number().int().min(0).max(1_000_000);
const index = (n: number) =>
  z
    .number()
    .int()
    .min(0)
    .max(n - 1);
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
  /** Angelegte Accessoires (freigeschaltet über Erfolge). */
  accessories: z.array(z.enum(ACCESSORY_IDS)),
});

const openEventSchema = z.object({
  id: z.string().min(1).max(64),
  /** Staat, um den es in einer außenpolitischen Karte geht. */
  target: z.enum(FOREIGN_IDS).nullable(),
});

export const runSchema = z.object({
  stateId: z.enum(STATE_IDS),
  profession: z.enum(PROFESSION_IDS),
  path: z.enum(PATH_IDS),
  stage: z.number().int().min(1).max(MAX_STAGE),
  highestStage: z.number().int().min(1).max(MAX_STAGE),
  resources: resourceMapSchema,
  /** Insgesamt in diesem Durchlauf verdient (für Statistik und Vermächtnis). */
  earned: resourceMapSchema,
  approval: percent,
  unrest: percent,
  /** Loyalität des Apparats in Prozent. */
  loyalty: percent,
  /** Aktive Spielzeit (playMs), seit der die Unruhe über der kritischen Schwelle liegt. */
  criticalSince: finiteNonNeg.nullable(),
  generators: z.partialRecord(z.enum(GENERATOR_IDS), count),
  world: z.object({
    /** Position der Figur in Welt-Einheiten. */
    posX: z.number().min(0).max(100_000),
    /** Ziel, zu dem die Figur gerade läuft. */
    target: z.enum(LOCATION_IDS).nullable(),
    /** Ist die Figur gerade in einem Gebäude? */
    inside: z.boolean(),
  }),
  /** Mitarbeiter und Schulungen je Tätigkeit. */
  actions: z.partialRecord(z.enum(ACTION_IDS), z.object({ staff: count, training: count })),
  vehicle: z.enum(VEHICLE_IDS),
  events: z.object({
    open: z.array(openEventSchema).max(10),
    /** playMs, ab dem die nächste Karte kommt. */
    nextAt: finiteNonNeg,
    /** playMs, ab dem eine außenpolitische Krise erzwungen wird (nach Manövern). */
    crisisAt: finiteNonNeg.nullable(),
  }),
  groups: z.partialRecord(z.enum(GROUP_IDS), percent),
  relations: z.partialRecord(z.enum(FOREIGN_IDS), z.number().min(-100).max(100)),
  treaties: z.partialRecord(
    z.enum(FOREIGN_IDS),
    z.object({ trade: z.boolean(), alliance: z.boolean() }),
  ),
  projects: z.partialRecord(z.enum(PROJECT_IDS), count),
  /** Wartezeiten: Schlüssel → playMs, ab dem die Aktion wieder möglich ist. */
  cooldowns: z.record(z.string().max(64), finiteNonNeg),
  /** „Wahlergebnis korrigieren“ wirkt auf das nächste „Macht ausbauen“. */
  fixElectionBonus: z.boolean(),
  /** Weiterregieren nach dem Sieg: playMs des Beginns, sonst null. */
  rulingSince: finiteNonNeg.nullable(),
  startedAt: finiteNonNeg,
  /** Aktive Spielzeit dieses Durchlaufs in ms. */
  playMs: finiteNonNeg,
  stats: z.object({
    electionsWon: count,
    electionsLost: count,
    eventsResolved: count,
    taps: count,
    /** Unruhe von 99 % oder mehr erreicht und wieder unter 70 % gebracht. */
    survivedUnrest: z.boolean(),
    /** Gerade über 99 % Unruhe (für survivedUnrest). */
    atBrink: z.boolean(),
  }),
});

export const HINT_IDS = [
  'followersUnlocked',
  'networkUnlocked',
  'loyaltyUnlocked',
  'oldTownUnlocked',
  'governmentUnlocked',
  'capitalUnlocked',
  'worldUnlocked',
  'firstEvent',
  'autocraticTurn',
] as const;

export const RUN_END_REASONS = ['revolution', 'coup', 'purge', 'retired'] as const;

export const gameSchema = z.object({
  saveVersion: z.literal(SAVE_VERSION),
  /** Zustandsmaschine. */
  phase: z.enum(['setup', 'playing', 'ceremony', 'victory', 'runEnded', 'emigrating']),
  createdAt: finiteNonNeg,
  /** Zeitpunkt, bis zu dem die Spielzeit verrechnet ist. Grundlage für Offline-Fortschritt. */
  lastActiveAt: finiteNonNeg,
  /** Zustand des seedbaren Zufallsgenerators. */
  rngState: z.number().int().min(0).max(0xffffffff),
  character: characterSchema.nullable(),
  run: runSchema.nullable(),
  /** Über alle Durchläufe hinweg: Vermächtnis, Erfolge, Statistik. */
  meta: z.object({
    legacyPoints: count,
    legacy: z.partialRecord(z.enum(LEGACY_IDS), count),
    achievements: z.array(z.enum(ACHIEVEMENT_IDS)),
    statesRuled: z.array(z.enum(STATE_IDS)),
    highestStageEver: z.number().int().min(0).max(MAX_STAGE),
    runsStarted: count,
    emigrations: count,
    overthrows: count,
    retirements: count,
    totalTaps: count,
    totalPlayMs: finiteNonNeg,
    eventsResolved: count,
    /** Stufen, deren Vereidigung schon einmal gezeigt wurde (danach überspringbar). */
    ceremoniesSeen: z.array(z.number().int().min(1).max(MAX_STAGE)),
  }),
  /** Daten für die Bildschirme der Zustandsmaschine. */
  pending: z.object({
    ceremony: z.object({ stage: z.number().int().min(1).max(MAX_STAGE) }).nullable(),
    runEnd: z
      .object({
        reason: z.enum(RUN_END_REASONS),
        stateId: z.enum(STATE_IDS),
        path: z.enum(PATH_IDS),
        stage: z.number().int().min(1).max(MAX_STAGE),
        highestStage: z.number().int().min(1).max(MAX_STAGE),
        playMs: finiteNonNeg,
        points: count,
        earnedMoney: finiteNonNeg,
      })
      .nullable(),
    emigration: z
      .object({ from: z.enum(STATE_IDS), to: z.enum(STATE_IDS), money: finiteNonNeg })
      .nullable(),
  }),
  flags: z.object({
    introSeen: z.boolean(),
    hintsSeen: z.array(z.enum(HINT_IDS)),
  }),
});

export type GameState = z.infer<typeof gameSchema>;
export type RunState = z.infer<typeof runSchema>;
export type Character = z.infer<typeof characterSchema>;
export type HintId = (typeof HINT_IDS)[number];
export type RunEndReason = (typeof RUN_END_REASONS)[number];
export type GamePhase = GameState['phase'];
export type OpenEvent = z.infer<typeof openEventSchema>;
export type GeneratorCounts = Partial<Record<GeneratorId, number>>;
