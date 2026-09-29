import type {
  AutocracyActionId,
  GeneratorId,
  ProfessionId,
  ResourceId,
  ResourceMap,
  StateId,
} from '../engine/ids';

/**
 * Tempo-Faktor des ganzen Spiels.
 * 1 = ein Durchlauf bis Stufe 12 dauert etwa 60 Minuten aktives Spielen.
 * 0,5 = doppelt so lang, 0,05 = zwanzigmal so lang. Technisch werden alle Kosten und
 * Anforderungen durch diesen Wert geteilt und Ereignisse kommen entsprechend seltener.
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
  /** Nur in diesen Staaten verfügbar (leer = überall). */
  states?: StateId[];
}

export interface AutocracyActionDef {
  id: AutocracyActionId;
  /** Kosten als Anteil der Geld-/Einfluss-Anforderung der aktuellen Stufe. */
  costFraction: { money?: number; influence?: number };
  /** Änderungen in Prozentpunkten. */
  approval: number;
  unrest: number;
  loyalty: number;
  /** Beziehungsänderung zu allen Staaten (nur, wenn Außenpolitik freigeschaltet ist). */
  relations: number;
  /** Wartezeit bis zur nächsten Nutzung in Sekunden. */
  cooldownSeconds: number;
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
  /** Tipp-Erträge wachsen pro Stufe um diesen Faktor. */
  tapStageGrowth: number;
  professions: Record<ProfessionId, ResourceMap>;
  resourceUnlockStage: ResourceMap;
  /** Ab welcher Stufe der Balken „Loyalität des Apparats“ sichtbar ist. */
  loyaltyUnlockStage: number;
  startApproval: number;
  startLoyalty: number;
  unrestThresholds: { warn: number; danger: number; critical: number };
  politics: {
    approvalBase: number;
    approvalDriftPerMinute: number;
    unrestDriftPerMinute: number;
    autocraticUnrestPressure: number;
    loyaltyBase: number;
    loyaltyDriftPerMinute: number;
    unrestGraceSeconds: number;
    resignationUnrest: number;
    coup: { loyaltyBelow: number; unrestAbove: number; maxPerMinute: number };
    purge: { loyaltyBelow: number; maxPerMinute: number };
  };
  elections: {
    base: number;
    approvalWeight: number;
    followersWeight: number;
    minChance: number;
    maxChance: number;
    /** Wahlkampfbudgets: Anteil der Geld-Anforderung → Bonus in Prozentpunkten. */
    campaigns: { costFraction: number; bonus: number }[];
    lossStages: number;
    lossApproval: number;
  };
  autocracy: {
    requirementFactor: number;
    powerLoyaltyCost: number;
    powerUnrest: number;
    turnUnrest: number;
    turnCivilSociety: number;
    turnRelations: number;
    fixElectionDiscount: number;
    actions: AutocracyActionDef[];
  };
  events: {
    minIntervalSeconds: number;
    maxIntervalSeconds: number;
    maxOpen: number;
    rulingIntervalFactor: number;
  };
  emigration: { minStage: number; baseCost: number; costGrowthPerEmigration: number };
  ruling: { secondsPerYear: number };
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

  /** Tätigkeiten an Orten bringen pro Stufe so viel mehr (2,1 = ×2,1 je Stufe). */
  tapStageGrowth: 2.1,

  /** Multiplikatoren je Beruf auf alle Erträge der jeweiligen Ressource. */
  professions: {
    // Büroangestellter: mehr Geld, weniger Einfluss
    office: { money: 1.5, influence: 0.7, followers: 1, diplomacy: 1 },
    // Facharbeiter: weniger Geld, mehr Einfluss und Anhänger
    skilled: { money: 0.7, influence: 1.5, followers: 1.2, diplomacy: 1 },
  },

  /** Ab welcher Stufe eine Währung sichtbar wird. */
  resourceUnlockStage: { money: 1, influence: 1, followers: 2, diplomacy: 8 },

  /** Loyalität des Apparats ab Stufe 5 (Borealis und Zentralia: siehe states.ts). */
  loyaltyUnlockStage: 5,

  /** Startwerte in Prozent. */
  startApproval: 50,
  startLoyalty: 50,

  /** Unruhe-Balken: unter warn grün, bis danger gelb, darüber rot. Ab critical läuft die Frist. */
  unrestThresholds: { warn: 40, danger: 70, critical: 90 },

  politics: {
    /** Grundwert, zu dem die Zustimmung langsam zurückkehrt (Prozent). */
    approvalBase: 50,
    /** So viele Prozentpunkte pro Minute bewegt sich die Zustimmung zum Grundwert. */
    approvalDriftPerMinute: 3,
    /** So viele Prozentpunkte pro Minute bewegt sich die Unruhe zu ihrem Zielwert. */
    unrestDriftPerMinute: 4,
    /** Autokraten: Zielwert der Unruhe steigt um diesen Wert × (1 − Zustimmung). */
    autocraticUnrestPressure: 30,
    /** Grundwert der Loyalität des Apparats (Prozent). */
    loyaltyBase: 35,
    /** So viele Prozentpunkte pro Minute bewegt sich die Loyalität zum Grundwert. */
    loyaltyDriftPerMinute: 1.5,
    /** Mindestens so viele Sekunden zwischen 90 % Unruhe und einem Sturz. */
    unrestGraceSeconds: 60,
    /** Nach einem Rücktritt (Demokratie) fällt die Unruhe auf diesen Wert. */
    resignationUnrest: 55,
    /** Putsch: möglich unter loyaltyBelow % Loyalität UND über unrestAbove % Unruhe. */
    coup: { loyaltyBelow: 25, unrestAbove: 60, maxPerMinute: 0.35 },
    /** Säuberung (Zentralia): möglich unter loyaltyBelow % Loyalität, auch ohne Unruhe. */
    purge: { loyaltyBelow: 20, maxPerMinute: 0.25 },
  },

  elections: {
    /** Siegchance in Prozent bei 50 % Zustimmung und genau genug Anhängern. */
    base: 50,
    /** Prozentpunkte Chance pro Prozentpunkt Zustimmung über/unter 50. */
    approvalWeight: 0.8,
    /** Prozentpunkte Chance pro Verdopplung der Anhänger gegenüber dem Bedarf. */
    followersWeight: 25,
    /** Die Chance liegt immer zwischen diesen Werten. */
    minChance: 5,
    maxChance: 95,
    /** Wahlkampfbudget: kein, klein, mittel, groß. */
    campaigns: [
      { costFraction: 0, bonus: 0 },
      { costFraction: 0.25, bonus: 8 },
      { costFraction: 0.5, bonus: 15 },
      { costFraction: 1, bonus: 25 },
    ],
    /** Niederlage: so viele Stufen zurück (mindestens Stufe 1). */
    lossStages: 2,
    /** Niederlage: Zustimmung sinkt um diesen Wert. */
    lossApproval: 5,
  },

  autocracy: {
    /** Autokratischer Pfad: Anforderungen × 0,7. */
    requirementFactor: 0.7,
    /** „Macht ausbauen“ kostet so viele Prozentpunkte Loyalität … */
    powerLoyaltyCost: 10,
    /** … und erhöht die Unruhe um so viele Punkte. */
    powerUnrest: 10,
    /** „Autoritären Kurs einschlagen“: Unruhe steigt einmalig um diesen Wert. */
    turnUnrest: 15,
    /** … die Zivilgesellschaft verliert so viel Loyalität … */
    turnCivilSociety: 40,
    /** … und die Beziehungen zum Ausland sinken um diesen Wert. */
    turnRelations: 15,
    /** „Wahlergebnis korrigieren“: nächstes „Macht ausbauen“ kostet so viel weniger (Anteil). */
    fixElectionDiscount: 0.4,
    actions: [
      // Presse kontrollieren
      {
        id: 'pressControl',
        costFraction: { money: 0.08, influence: 0.1 },
        approval: 8,
        unrest: 6,
        loyalty: 0,
        relations: -3,
        cooldownSeconds: 60,
      },
      // Opposition schikanieren
      {
        id: 'harassOpposition',
        costFraction: { influence: 0.12 },
        approval: 3,
        unrest: 8,
        loyalty: 6,
        relations: -5,
        cooldownSeconds: 60,
      },
      // Wahlergebnis korrigieren
      {
        id: 'fixElection',
        costFraction: { money: 0.05, influence: 0.05 },
        approval: 0,
        unrest: 12,
        loyalty: 0,
        relations: -8,
        cooldownSeconds: 120,
      },
      // Notstand ausrufen
      {
        id: 'emergency',
        costFraction: { influence: 0.08 },
        approval: -4,
        unrest: 10,
        loyalty: 15,
        relations: -6,
        cooldownSeconds: 120,
      },
      // Loyalität kaufen
      {
        id: 'buyLoyalty',
        costFraction: { money: 0.15 },
        approval: 0,
        unrest: 2,
        loyalty: 12,
        relations: 0,
        cooldownSeconds: 30,
      },
      // Repression: senkt Unruhe sofort, kostet Zustimmung und Auslandsbeziehungen
      {
        id: 'repression',
        costFraction: { money: 0.05 },
        approval: -8,
        unrest: -20,
        loyalty: 3,
        relations: -10,
        cooldownSeconds: 90,
      },
    ],
  },

  events: {
    /** Abstand zwischen Ereigniskarten in Sekunden (bei GAME_SPEED 1). */
    minIntervalSeconds: 120,
    maxIntervalSeconds: 240,
    /** Höchstens so viele offene Karten im Stapel. */
    maxOpen: 3,
    /** Beim Weiterregieren kommen Krisen häufiger (Abstand × diesem Faktor). */
    rulingIntervalFactor: 0.6,
  },

  emigration: {
    /** Auswandern ab dieser Stufe möglich. */
    minStage: 5,
    /** Preis der Staatsbürgerschaft in Geld (bei GAME_SPEED 1). */
    baseCost: 150_000,
    /** Jede weitere Auswanderung kostet so viel mal mehr. */
    costGrowthPerEmigration: 2,
  },

  ruling: {
    /** Beim Weiterregieren zählt pro so vielen Sekunden ein Amtsjahr hoch. */
    secondsPerYear: 120,
  },

  /**
   * Generatoren (Investitionen). Reihenfolge = Anzeige-Reihenfolge im Investieren-Tab.
   * Kosten steigen pro Kauf um costGrowth.
   */
  generators: [
    // --- Geld ---
    // Überstunden
    { id: 'overtime', produces: 'money', baseCost: { money: 10 }, baseOutput: 0.4, unlockStage: 1 },
    // Nebenjob
    { id: 'sideJob', produces: 'money', baseCost: { money: 120 }, baseOutput: 3, unlockStage: 1 },
    // Kleinunternehmen
    {
      id: 'smallBusiness',
      produces: 'money',
      baseCost: { money: 1_600 },
      baseOutput: 24,
      unlockStage: 3,
    },
    // Vermietung
    {
      id: 'rentals',
      produces: 'money',
      baseCost: { money: 22_000 },
      baseOutput: 190,
      unlockStage: 5,
    },
    // Mittelständische Firma
    {
      id: 'company',
      produces: 'money',
      baseCost: { money: 320_000 },
      baseOutput: 1_500,
      unlockStage: 7,
    },
    // Holding
    {
      id: 'holding',
      produces: 'money',
      baseCost: { money: 5_000_000 },
      baseOutput: 12_000,
      unlockStage: 9,
    },
    // Konzern
    {
      id: 'conglomerate',
      produces: 'money',
      baseCost: { money: 90_000_000 },
      baseOutput: 110_000,
      unlockStage: 11,
    },
    // Spenderkreis (nur Novaria)
    {
      id: 'donorCircle',
      produces: 'money',
      baseCost: { money: 3_000, influence: 100 },
      baseOutput: 45,
      unlockStage: 3,
      states: ['novaria'],
    },
    // Lobby-Agentur (nur Novaria)
    {
      id: 'lobbyFirm',
      produces: 'money',
      baseCost: { money: 90_000, influence: 3_000 },
      baseOutput: 900,
      unlockStage: 6,
      states: ['novaria'],
    },
    // Rohstoffeinnahmen (nur Borealis)
    {
      id: 'rawMaterials',
      produces: 'money',
      baseCost: { money: 8_000 },
      baseOutput: 110,
      unlockStage: 4,
      states: ['borealis'],
    },
    // Staatsbetrieb (nur Zentralia)
    {
      id: 'stateEnterprise',
      produces: 'money',
      baseCost: { money: 6_000, influence: 150 },
      baseOutput: 90,
      unlockStage: 3,
      states: ['zentralia'],
    },

    // --- Einfluss ---
    // Stammtisch
    {
      id: 'regularsTable',
      produces: 'influence',
      baseCost: { money: 25 },
      baseOutput: 0.15,
      unlockStage: 1,
    },
    // Vereinsarbeit
    {
      id: 'clubWork',
      produces: 'influence',
      baseCost: { money: 300, influence: 10 },
      baseOutput: 1,
      unlockStage: 2,
    },
    // Ortsverband
    {
      id: 'localBranch',
      produces: 'influence',
      baseCost: { money: 4_500, influence: 120 },
      baseOutput: 7,
      unlockStage: 4,
    },
    // Pressekontakte
    {
      id: 'pressContacts',
      produces: 'influence',
      baseCost: { money: 60_000, influence: 1_500 },
      baseOutput: 50,
      unlockStage: 6,
    },
    // Denkfabrik
    {
      id: 'thinkTank',
      produces: 'influence',
      baseCost: { money: 900_000, influence: 20_000 },
      baseOutput: 380,
      unlockStage: 9,
    },

    // Stiftung
    {
      id: 'foundation',
      produces: 'influence',
      baseCost: { money: 20_000_000, influence: 400_000 },
      baseOutput: 3_000,
      unlockStage: 11,
    },

    // --- Anhänger ---
    // Flyer
    {
      id: 'flyers',
      produces: 'followers',
      baseCost: { money: 60, influence: 5 },
      baseOutput: 0.4,
      unlockStage: 2,
    },
    // Infostand
    {
      id: 'infoStand',
      produces: 'followers',
      baseCost: { money: 900, influence: 60 },
      baseOutput: 3,
      unlockStage: 3,
    },
    // Social-Media-Team
    {
      id: 'socialMediaTeam',
      produces: 'followers',
      baseCost: { money: 14_000, influence: 800 },
      baseOutput: 24,
      unlockStage: 5,
    },
    // Kampagnenbüro
    {
      id: 'campaignOffice',
      produces: 'followers',
      baseCost: { money: 220_000, influence: 10_000 },
      baseOutput: 190,
      unlockStage: 7,
    },

    // Mediengruppe
    {
      id: 'mediaGroup',
      produces: 'followers',
      baseCost: { money: 4_000_000, influence: 150_000 },
      baseOutput: 1_600,
      unlockStage: 9,
    },
    // Fernsehsender
    {
      id: 'tvNetwork',
      produces: 'followers',
      baseCost: { money: 60_000_000, influence: 2_000_000 },
      baseOutput: 14_000,
      unlockStage: 11,
    },

    // --- Diplomatie ---
    // Botschaftsstab
    {
      id: 'embassyStaff',
      produces: 'diplomacy',
      baseCost: { money: 1_500_000, influence: 40_000 },
      baseOutput: 0.5,
      unlockStage: 8,
    },
    // Gipfelbüro
    {
      id: 'summitOffice',
      produces: 'diplomacy',
      baseCost: { money: 12_000_000, influence: 300_000 },
      baseOutput: 3,
      unlockStage: 10,
    },
  ],
};
