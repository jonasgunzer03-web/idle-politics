import type {
  GeneratorId,
  ProfessionId,
  ResourceId,
  ResourceMap,
  TapActionId,
} from '../engine/ids';

/**
 * Tempo-Faktor des ganzen Spiels.
 * 1 = ein Durchlauf bis Stufe 12 dauert etwa 60 Minuten aktives Spielen.
 * 0,5 = doppelt so lang, 0,05 = zwanzigmal so lang. Technisch werden alle Kosten und
 * Anforderungen durch diesen Wert geteilt, die Erträge bleiben gleich.
 */
export const GAME_SPEED = 1;

export interface GeneratorDef {
  id: GeneratorId;
  /** Welche Ressource der Generator automatisch erzeugt. */
  produces: ResourceId;
  /** Preis des ersten Exemplars (bei GAME_SPEED 1). Mehrere Ressourcen möglich. */
  baseCost: Partial<ResourceMap>;
  /** Ertrag pro Exemplar und Sekunde. */
  baseOutput: number;
  /** Ab welcher Karrierestufe der Generator gekauft werden kann. */
  unlockStage: number;
}

export interface TapActionDef {
  id: TapActionId;
  produces: ResourceId;
  /** Grundertrag pro Tipp, vor Beruf- und Staats-Multiplikatoren. */
  baseYield: number;
}

export interface Balancing {
  gameSpeed: number;
  time: {
    offlineCapHours: number;
    onlineMaxDeltaMs: number;
    offlineReportMinSeconds: number;
    offlineCapNoticeMinSeconds: number;
    autosaveIntervalMs: number;
    uiCommitIntervalMs: number;
  };
  costGrowth: number;
  tapActions: TapActionDef[];
  professions: Record<ProfessionId, ResourceMap>;
  resourceUnlockStage: ResourceMap;
  startApproval: number;
  unrestThresholds: { warn: number; danger: number };
  generators: GeneratorDef[];
}

export const balancing: Balancing = {
  gameSpeed: GAME_SPEED,

  time: {
    /** Offline-Deckel: So viele Stunden Abwesenheit werden höchstens gutgeschrieben. */
    offlineCapHours: 8,
    /** Lücken zwischen zwei Takten, die größer sind (in ms), gelten als Abwesenheit. */
    onlineMaxDeltaMs: 5_000,
    /** Erst ab so vielen Sekunden Abwesenheit erscheint der Rückkehr-Dialog. */
    offlineReportMinSeconds: 60,
    /** Hinweis „Höchstwert erreicht“ erst, wenn so viele Sekunden abgeschnitten wurden. */
    offlineCapNoticeMinSeconds: 60,
    /** Automatisch speichern alle … Millisekunden. */
    autosaveIntervalMs: 10_000,
    /** Wie oft pro Sekunde die Anzeige aktualisiert wird (ms zwischen zwei Updates). */
    uiCommitIntervalMs: 100,
  },

  /** Preissteigerung pro gekauftem Exemplar eines Generators (1,15 = +15 %). */
  costGrowth: 1.15,

  /** Tipp-Aktionen auf dem Hauptbildschirm. */
  tapActions: [
    // „Schicht arbeiten“: Geld pro Tipp
    { id: 'work', produces: 'money', baseYield: 1 },
    // „Mit Kollegen reden“: Einfluss pro Tipp
    { id: 'network', produces: 'influence', baseYield: 0.5 },
  ],

  /** Multiplikatoren je Beruf auf alle Erträge der jeweiligen Ressource. */
  professions: {
    // Büroangestellter: mehr Geld, weniger Einfluss
    office: { money: 1.5, influence: 0.7, followers: 1, loyalty: 1, diplomacy: 1 },
    // Facharbeiter: weniger Geld, mehr Einfluss und Anhänger
    skilled: { money: 0.7, influence: 1.5, followers: 1.2, loyalty: 1, diplomacy: 1 },
  },

  /** Ab welcher Stufe eine Ressource sichtbar wird (Staaten können das in states.ts ändern). */
  resourceUnlockStage: {
    money: 1,
    influence: 1,
    followers: 2,
    loyalty: 5,
    diplomacy: 8,
  },

  /** Startwert der Zustimmung in Prozent. */
  startApproval: 50,

  /** Unruhe-Balken: unter warn grün, bis danger gelb, darüber rot (Prozent). */
  unrestThresholds: { warn: 40, danger: 70 },

  /**
   * Generatoren. Reihenfolge = Anzeige-Reihenfolge im Investieren-Tab.
   * Kosten steigen pro Kauf um costGrowth.
   */
  generators: [
    // --- Geld ---
    // Überstunden
    { id: 'overtime', produces: 'money', baseCost: { money: 10 }, baseOutput: 0.3, unlockStage: 1 },
    // Nebenjob
    { id: 'sideJob', produces: 'money', baseCost: { money: 110 }, baseOutput: 2, unlockStage: 1 },
    // Kleinunternehmen
    {
      id: 'smallBusiness',
      produces: 'money',
      baseCost: { money: 1_400 },
      baseOutput: 14,
      unlockStage: 3,
    },
    // Vermietung
    {
      id: 'rentals',
      produces: 'money',
      baseCost: { money: 18_000 },
      baseOutput: 90,
      unlockStage: 5,
    },
    // Mittelständische Firma
    {
      id: 'company',
      produces: 'money',
      baseCost: { money: 250_000 },
      baseOutput: 600,
      unlockStage: 7,
    },
    // Holding
    {
      id: 'holding',
      produces: 'money',
      baseCost: { money: 4_000_000 },
      baseOutput: 4_500,
      unlockStage: 9,
    },

    // --- Einfluss ---
    // Stammtisch
    {
      id: 'regularsTable',
      produces: 'influence',
      baseCost: { money: 25 },
      baseOutput: 0.1,
      unlockStage: 1,
    },
    // Vereinsarbeit
    {
      id: 'clubWork',
      produces: 'influence',
      baseCost: { money: 300, influence: 10 },
      baseOutput: 0.6,
      unlockStage: 2,
    },
    // Ortsverband
    {
      id: 'localBranch',
      produces: 'influence',
      baseCost: { money: 4_000, influence: 120 },
      baseOutput: 4,
      unlockStage: 4,
    },
    // Pressekontakte
    {
      id: 'pressContacts',
      produces: 'influence',
      baseCost: { money: 50_000, influence: 1_500 },
      baseOutput: 25,
      unlockStage: 6,
    },
    // Denkfabrik
    {
      id: 'thinkTank',
      produces: 'influence',
      baseCost: { money: 700_000, influence: 20_000 },
      baseOutput: 160,
      unlockStage: 9,
    },

    // --- Anhänger ---
    // Flyer verteilen
    {
      id: 'flyers',
      produces: 'followers',
      baseCost: { money: 60, influence: 5 },
      baseOutput: 0.2,
      unlockStage: 2,
    },
    // Infostand
    {
      id: 'infoStand',
      produces: 'followers',
      baseCost: { money: 800, influence: 60 },
      baseOutput: 1.5,
      unlockStage: 3,
    },
    // Social-Media-Team
    {
      id: 'socialMediaTeam',
      produces: 'followers',
      baseCost: { money: 12_000, influence: 800 },
      baseOutput: 10,
      unlockStage: 5,
    },
    // Kampagnenbüro
    {
      id: 'campaignOffice',
      produces: 'followers',
      baseCost: { money: 180_000, influence: 10_000 },
      baseOutput: 70,
      unlockStage: 7,
    },
  ],
};
