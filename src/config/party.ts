import type {
  FactionId,
  GroupId,
  LineTag,
  PathId,
  PolicyId,
  ResourceId,
  RivalCounterId,
  RivalMoveId,
  SkillId,
} from '../engine/ids';

// Politik im Parteibüro: Berater, Beschlüsse/Gesetze mit Spätfolgen und der Rivale.
// Texte (Namen, Reden, Schlagzeilen) stehen in src/i18n/de-party.ts.

/** Dauerhafte Wirkungen eines Gesetzes (oder einer eingetretenen Spätfolge). */
export interface PolicyEffects {
  /** Ertrag einer Währung (0,1 = +10 %, −0,05 = −5 %). */
  resource?: Partial<Record<ResourceId, number>>;
  /** Tempo der Produktionslinien einer Gruppe; „all“ = alle Linien. */
  lineSpeed?: Partial<Record<LineTag | 'all', number>>;
  /** Grundwert der Zustimmung (Prozentpunkte). */
  approvalBase?: number;
  /** Zielwert der Unruhe (Prozentpunkte). */
  unrestTarget?: number;
  /** Zielwert der Arbeiterstimmung (Prozentpunkte). */
  moraleTarget?: number;
  /** Wahlchance (Prozentpunkte). */
  electionBonus?: number;
  /** Loyalität des Apparats pro Minute (Prozentpunkte). */
  loyaltyDrift?: number;
  /** Zielwert der Stärke des Rivalen (Prozentpunkte). */
  rivalTarget?: number;
  /** Putschrisiko × (1 + Wert), −0,4 = 40 % weniger. */
  coupRisk?: number;
  /** Beziehungen zu anderen Staaten pro Minute (Punkte). */
  relationsDrift?: number;
}

/** Einmalige Wirkung beim Beschluss oder beim Eintreten einer Spätfolge. */
export interface PolicyShock {
  approval?: number;
  unrest?: number;
  loyalty?: number;
  morale?: number;
  rival?: number;
  groups?: Partial<Record<GroupId, number>>;
  relationsAll?: number;
}

export interface ConsequenceDef {
  /** So viele Sekunden (bei GAME_SPEED 1) nach dem Beschluss tritt die Folge ein. */
  afterSeconds: number;
  /** Ab dann gelten zusätzlich diese dauerhaften Wirkungen (solange das Gesetz gilt). */
  effects?: PolicyEffects;
  shock?: PolicyShock;
  /** Berater dieses Flügels sehen die Folge voraus und warnen in der Sitzung. */
  foreseenBy: FactionId;
}

export type PolicyArea = 'economy' | 'social' | 'security' | 'media' | 'foreign' | 'party';

export interface PolicyDef {
  id: PolicyId;
  area: PolicyArea;
  minStage: number;
  /** Nur auf diesem Pfad (sonst auf beiden). */
  path?: PathId;
  /** Kosten als Anteil der Einfluss- bzw. Geld-Anforderung der aktuellen Stufe. */
  cost: { influence: number; money?: number };
  /** Schließt sich mit diesen Gesetzen aus. */
  exclusive?: PolicyId[];
  /** Haltung der Flügel: +2 = begeistert … −2 = strikt dagegen (fehlt = neutral). */
  stances: Partial<Record<FactionId, number>>;
  effects: PolicyEffects;
  shock?: PolicyShock;
  consequences?: ConsequenceDef[];
}

export interface AdvisorSkillDef {
  id: SkillId;
  /** Wirkung, solange der Berater am Tisch sitzt (gleiche Bedeutung wie bei Gesetzen). */
  effects: PolicyEffects;
}

export interface RivalMoveDef {
  id: RivalMoveId;
  /** Relative Häufigkeit. */
  weight: number;
  /** Erst ab dieser Stärke des Rivalen. */
  minStrength: number;
  shock: PolicyShock;
  /** Nur „poach“: Loyalitätsverlust des am wenigsten treuen Beraters. */
  poachLoyalty?: number;
}

export interface RivalCounterDef {
  id: RivalCounterId;
  /** Kosten als Anteil der Geld- bzw. Einfluss-Anforderung der aktuellen Stufe. */
  cost: { money?: number; influence?: number };
  /** Senkt die Stärke des Rivalen um so viele Punkte (bei Erfolg). */
  strength: number;
  /** Erfolgschance in Prozent (100 = sicher). */
  chance: number;
  /** Folgen bei Misserfolg. */
  failShock?: PolicyShock;
  /** Folgen bei Erfolg (zusätzlich). */
  shock?: PolicyShock;
  /** Wartezeit in Sekunden. */
  cooldownSeconds: number;
  /** Nur auf diesem Pfad. */
  path?: PathId;
  /** Nur, wenn der Rivale höchstens so stark ist. */
  maxStrength?: number;
}

export interface PartyConfig {
  /** Sitze am Beratertisch je Karrierestufe (Index 0 = Stufe 1). */
  seatsByStage: number[];
  /** Plätze für gleichzeitig geltende Gesetze je Karrierestufe (Index 0 = Stufe 1). */
  lawSlotsByStage: number[];
  /** Berater anwerben: Kosten als Anteil der Einfluss-Anforderung der aktuellen Stufe. */
  hireCostFraction: number;
  /** Neue Bewerber nach so vielen Sekunden. */
  poolRefreshSeconds: number;
  /** Neue Tagesordnung nach so vielen Sekunden. */
  agendaRefreshSeconds: number;
  /** Vorlagen auf der Tagesordnung. */
  agendaSize: number;
  advisor: {
    startLoyalty: number;
    /** Grundwert, zu dem die Loyalität wandert, und Tempo (Punkte pro Minute). */
    loyaltyBase: number;
    loyaltyDriftPerMinute: number;
    /** Loyalitätsänderung je Haltungspunkt, wenn ein Gesetz beschlossen wird. */
    loyaltyPerStance: number;
    /** Unter diesem Wert kann ein Berater abspringen … */
    defectBelow: number;
    /** … mit höchstens dieser Wahrscheinlichkeit pro Minute (bei 0 % Loyalität). */
    defectPerMinute: number;
    /** Rivale gewinnt so viel Stärke, wenn ein Berater überläuft. */
    defectRivalGain: number;
  };
  /** Ein Gesetz aufheben: Anteil der ursprünglichen Kosten. */
  revokeCostFraction: number;
  /** Wartezeit nach dem Aufheben, bevor dasselbe Gesetz wieder beschlossen werden kann (s). */
  revokeCooldownSeconds: number;
  policies: PolicyDef[];
  skills: AdvisorSkillDef[];
  rival: {
    startStrength: number;
    /** Zielwert der Stärke ohne sonstige Einflüsse. */
    baseTarget: number;
    /** + so viele Punkte je Prozentpunkt Zustimmung unter 50 (− darüber). */
    approvalWeight: number;
    driftPerMinute: number;
    /** Wahlchance: − so viele Punkte je Punkt Stärke über „neutral“ … */
    electionWeight: number;
    /** … + so viele je Punkt darunter. */
    electionBonusWeight: number;
    neutral: number;
    /** Nach einem Wahlsieg verliert der Rivale so viele Punkte. */
    electionLoss: number;
    /** Abstand zwischen zwei Aktionen des Rivalen in Sekunden (von–bis). */
    moveIntervalSeconds: [number, number];
    /** Ab dieser Karrierestufe tritt der Rivale auf. */
    fromStage: number;
    moves: RivalMoveDef[];
    counters: RivalCounterDef[];
  };
  /** Einträge in der Chronik (ältere fallen heraus). */
  chronicleSize: number;
}

export const party: PartyConfig = {
  // Stufe 1: 2 Sitze, ab 3: 3, ab 5: 4, ab 8: 5
  seatsByStage: [2, 2, 3, 3, 4, 4, 4, 5, 5, 5, 5, 5],
  // Stufe 1–2: 2 Gesetze, 3–4: 3, 5–6: 4, 7–8: 5, 9–10: 6, 11–12: 7
  lawSlotsByStage: [2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7],
  hireCostFraction: 0.12,
  poolRefreshSeconds: 150,
  agendaRefreshSeconds: 120,
  agendaSize: 3,
  advisor: {
    startLoyalty: 60,
    loyaltyBase: 55,
    loyaltyDriftPerMinute: 1.5,
    loyaltyPerStance: 9,
    defectBelow: 20,
    defectPerMinute: 0.5,
    defectRivalGain: 12,
  },
  revokeCostFraction: 0.5,
  revokeCooldownSeconds: 180,
  policies: [
    // ------------------------------------------------ Parteiprogramm (ab Stufe 1)
    {
      // Arbeiter zuerst: bessere Stimmung, etwas weniger Geld
      id: 'workersFirst',
      area: 'social',
      minStage: 1,
      cost: { influence: 0.25 },
      exclusive: ['businessFriendly'],
      stances: { social: 2, populist: 1, economic: -2 },
      effects: { moraleTarget: 15, resource: { money: -0.05 }, approvalBase: 2 },
      shock: { groups: { unions: 10, business: -8 } },
    },
    {
      // Wirtschaftsfreundlich: mehr Geld, schlechtere Stimmung
      id: 'businessFriendly',
      area: 'economy',
      minStage: 1,
      cost: { influence: 0.25 },
      exclusive: ['workersFirst'],
      stances: { economic: 2, liberty: 1, social: -2 },
      effects: { resource: { money: 0.12 }, moraleTarget: -10 },
      shock: { groups: { business: 10, unions: -8 } },
    },
    {
      // Ehrenamtsnetz: mehr Anhänger, weniger Einfluss
      id: 'volunteerNetwork',
      area: 'party',
      minStage: 1,
      cost: { influence: 0.2 },
      stances: { populist: 2, liberty: 1, security: -1 },
      effects: { resource: { followers: 0.12, influence: -0.04 } },
    },
    {
      // Fraktionsdisziplin: mehr Einfluss, Spätfolge: Frust an der Basis
      id: 'partyDiscipline',
      area: 'party',
      minStage: 1,
      cost: { influence: 0.25 },
      exclusive: ['openMeetings'],
      stances: { security: 2, economic: 1, liberty: -2 },
      effects: { resource: { influence: 0.12 }, loyaltyDrift: 0.5 },
      shock: { approval: -2 },
      consequences: [
        {
          afterSeconds: 360,
          effects: { resource: { followers: -0.06 } },
          shock: { approval: -3 },
          foreseenBy: 'liberty',
        },
      ],
    },
    {
      // Offene Parteitage: beliebt, Spätfolge: Flügelkämpfe
      id: 'openMeetings',
      area: 'party',
      minStage: 2,
      cost: { influence: 0.25 },
      exclusive: ['partyDiscipline'],
      stances: { liberty: 2, populist: 1, security: -1 },
      effects: { resource: { followers: 0.08 }, approvalBase: 3 },
      consequences: [
        {
          afterSeconds: 360,
          effects: { resource: { influence: -0.06 } },
          shock: { rival: 5 },
          foreseenBy: 'security',
        },
      ],
    },
    // ------------------------------------------------ Stadtpolitik (ab Stufe 4)
    {
      // Nahverkehr ausbauen: beliebt und gut für die Stimmung, kostet Geld
      id: 'publicTransit',
      area: 'social',
      minStage: 4,
      cost: { influence: 0.25, money: 0.15 },
      stances: { social: 1, liberty: 1, economic: -1 },
      effects: { approvalBase: 4, moraleTarget: 5, lineSpeed: { all: 0.05 } },
    },
    {
      // Messe & Gewerbe: Handel und Banken schneller
      id: 'tradeFair',
      area: 'economy',
      minStage: 4,
      cost: { influence: 0.25 },
      stances: { economic: 2, social: -1 },
      effects: { lineSpeed: { trade: 0.25, finance: 0.2 } },
      shock: { groups: { business: 6 } },
    },
    {
      // Mehr Stadtpolizei: weniger Unruhe, Spätfolge: Bürgerrechtsdebatte
      id: 'cityPolice',
      area: 'security',
      minStage: 4,
      cost: { influence: 0.25, money: 0.1 },
      stances: { security: 2, populist: 1, liberty: -2 },
      effects: { unrestTarget: -6 },
      consequences: [
        {
          afterSeconds: 480,
          effects: { approvalBase: -3 },
          shock: { groups: { civilSociety: -10 } },
          foreseenBy: 'liberty',
        },
      ],
    },
    {
      // Pressefreiheit stärken: Medien schneller, der Rivale wird lauter
      id: 'pressFreedom',
      area: 'media',
      minStage: 4,
      cost: { influence: 0.25 },
      exclusive: ['mediaLaw'],
      stances: { liberty: 2, social: 1, security: -2 },
      effects: { lineSpeed: { media: 0.25 }, rivalTarget: 5, approvalBase: 1 },
      shock: { groups: { media: 12 } },
    },
    {
      // Steuern senken: sofort beliebt, Spätfolge: Haushaltsloch
      id: 'lowTaxes',
      area: 'economy',
      minStage: 4,
      cost: { influence: 0.3 },
      exclusive: ['wealthTax'],
      stances: { economic: 2, populist: 1, social: -2 },
      effects: { resource: { money: 0.15 } },
      shock: { approval: 5, groups: { business: 8 } },
      consequences: [
        {
          afterSeconds: 300,
          effects: { resource: { money: -0.12 }, unrestTarget: 4 },
          shock: { approval: -4 },
          foreseenBy: 'social',
        },
      ],
    },
    {
      // Reichensteuer: Stimmung und Zustimmung, Wirtschaft verärgert
      id: 'wealthTax',
      area: 'economy',
      minStage: 4,
      cost: { influence: 0.3 },
      exclusive: ['lowTaxes'],
      stances: { social: 2, populist: 1, economic: -2 },
      effects: { resource: { money: -0.04 }, approvalBase: 3, moraleTarget: 8 },
      shock: { groups: { business: -12, unions: 8 } },
    },
    {
      // Sozialer Wohnungsbau: weniger Unruhe, gute Stimmung, kostet Geld
      id: 'housing',
      area: 'social',
      minStage: 5,
      cost: { influence: 0.25, money: 0.2 },
      stances: { social: 2, populist: 1, economic: -1 },
      effects: { moraleTarget: 10, unrestTarget: -4, resource: { money: -0.06 } },
    },
    // ------------------------------------------------ Landespolitik (ab Stufe 7)
    {
      // Industrieoffensive: Industrie viel schneller, Spätfolge: Umweltskandal
      id: 'industrialPolicy',
      area: 'economy',
      minStage: 7,
      cost: { influence: 0.3, money: 0.15 },
      stances: { economic: 2, populist: 1, liberty: -1 },
      effects: { lineSpeed: { industry: 0.35 }, moraleTarget: -5 },
      consequences: [
        {
          afterSeconds: 540,
          effects: { approvalBase: -3 },
          shock: { approval: -6, groups: { civilSociety: -8 } },
          foreseenBy: 'liberty',
        },
      ],
    },
    {
      // Digitaler Staat: Verwaltung schneller
      id: 'digitalState',
      area: 'economy',
      minStage: 7,
      cost: { influence: 0.3 },
      stances: { liberty: 1, economic: 1, populist: -1 },
      effects: { lineSpeed: { state: 0.3 } },
      shock: { groups: { administration: 8 } },
    },
    {
      // Rentenreform: mehr Geld, unbeliebt
      id: 'pensionReform',
      area: 'economy',
      minStage: 7,
      cost: { influence: 0.3 },
      stances: { economic: 2, social: -2, populist: -1 },
      effects: { resource: { money: 0.15 }, approvalBase: -4 },
      shock: { unrest: 5 },
    },
    {
      // Familiengeld: mehr Anhänger, kostet Geld
      id: 'familyBonus',
      area: 'social',
      minStage: 7,
      cost: { influence: 0.3 },
      stances: { populist: 2, social: 1, economic: -1 },
      effects: { resource: { followers: 0.14, money: -0.06 } },
      shock: { approval: 3 },
    },
    {
      // Überwachungsgesetz: weniger Unruhe, unbeliebt, Apparat treuer
      id: 'surveillance',
      area: 'security',
      minStage: 7,
      cost: { influence: 0.3 },
      stances: { security: 2, liberty: -2, social: -1 },
      effects: { unrestTarget: -8, approvalBase: -4, loyaltyDrift: 1 },
      shock: { groups: { security: 10, civilSociety: -12 } },
    },
    {
      // Mediengesetz: Medien auf Linie, der Rivale leiser, Spätfolge: Protest im Ausland
      id: 'mediaLaw',
      area: 'media',
      minStage: 7,
      cost: { influence: 0.3 },
      exclusive: ['pressFreedom'],
      stances: { security: 1, populist: 1, liberty: -2 },
      effects: { lineSpeed: { media: 0.3 }, rivalTarget: -10, approvalBase: -2 },
      shock: { groups: { media: -10 } },
      consequences: [
        {
          afterSeconds: 420,
          shock: { relationsAll: -8, approval: -2 },
          foreseenBy: 'liberty',
        },
      ],
    },
    {
      // Weltoffenheit: mehr Diplomatie, Beziehungen verbessern sich
      id: 'openBorders',
      area: 'foreign',
      minStage: 8,
      cost: { influence: 0.3 },
      exclusive: ['protectionism'],
      stances: { liberty: 2, economic: 1, populist: -2 },
      effects: { resource: { diplomacy: 0.3, followers: -0.04 }, relationsDrift: 0.5 },
    },
    {
      // Schutzzölle: Industrie schneller, Nachbarn verärgert
      id: 'protectionism',
      area: 'foreign',
      minStage: 8,
      cost: { influence: 0.3 },
      exclusive: ['openBorders'],
      stances: { populist: 2, security: 1, liberty: -1, economic: -1 },
      effects: { lineSpeed: { industry: 0.2 }, resource: { money: 0.05 } },
      shock: { relationsAll: -10 },
    },
    {
      // Bildungsoffensive: kostet erst, Spätfolge: alles läuft besser
      id: 'education',
      area: 'social',
      minStage: 7,
      cost: { influence: 0.3, money: 0.2 },
      stances: { social: 1, liberty: 1 },
      effects: { resource: { money: -0.06 } },
      consequences: [
        {
          afterSeconds: 480,
          effects: { lineSpeed: { all: 0.15 }, approvalBase: 2 },
          foreseenBy: 'social',
        },
      ],
    },
    {
      // Armee stärken: sicher vor Putsch, kostet Geld
      id: 'army',
      area: 'security',
      minStage: 7,
      cost: { influence: 0.3, money: 0.15 },
      stances: { security: 2, social: -1, liberty: -1 },
      effects: { coupRisk: -0.4, loyaltyDrift: 0.8, resource: { money: -0.05 } },
      shock: { groups: { military: 12 } },
    },
    // ------------------------------------------------ Spitze (ab Stufe 10)
    {
      // Jahrhundertbauwerk: sehr beliebt, Spätfolge: Kostenexplosion
      id: 'greatProject',
      area: 'economy',
      minStage: 10,
      cost: { influence: 0.3, money: 0.25 },
      stances: { populist: 2, economic: -1 },
      effects: { approvalBase: 6 },
      shock: { approval: 4 },
      consequences: [
        {
          afterSeconds: 420,
          effects: { resource: { money: -0.1 } },
          shock: { unrest: 5 },
          foreseenBy: 'economic',
        },
      ],
    },
    {
      // Verfassungsreform (nur Demokratie): bessere Wahlchancen
      id: 'constitutionReform',
      area: 'party',
      minStage: 10,
      path: 'democratic',
      cost: { influence: 0.35 },
      stances: { liberty: 2, social: 1, security: -1 },
      effects: { electionBonus: 8, approvalBase: 2 },
    },
    {
      // Notstandsgesetze (nur Autokratie): kaum Unruhe, sehr unbeliebt
      id: 'stateOfEmergency',
      area: 'security',
      minStage: 8,
      path: 'autocratic',
      cost: { influence: 0.3 },
      stances: { security: 2, liberty: -2, social: -1 },
      effects: { unrestTarget: -12, approvalBase: -6, loyaltyDrift: 1 },
      shock: { relationsAll: -8 },
    },
    {
      // Personenkult (nur Autokratie): mehr Anhänger und Zustimmung, Ausland irritiert
      id: 'personalityCult',
      area: 'media',
      minStage: 6,
      path: 'autocratic',
      cost: { influence: 0.3 },
      stances: { populist: 2, security: 1, liberty: -2 },
      effects: { resource: { followers: 0.2 }, approvalBase: 4, rivalTarget: -8 },
      shock: { relationsAll: -5 },
    },
  ],
  skills: [
    // Wahlkämpfer: +5 Punkte Wahlchance
    { id: 'campaigner', effects: { electionBonus: 5 } },
    // Finanzexperte: +10 % Geld
    { id: 'financier', effects: { resource: { money: 0.1 } } },
    // Stratege: +10 % Einfluss
    { id: 'strategist', effects: { resource: { influence: 0.1 } } },
    // Medienprofi: +10 % Anhänger
    { id: 'mediaSavvy', effects: { resource: { followers: 0.1 } } },
    // Organisator: +8 % Tempo aller Linien
    { id: 'organizer', effects: { lineSpeed: { all: 0.08 } } },
    // Diplomat: +20 % Diplomatie, Beziehungen verbessern sich langsam
    { id: 'diplomat', effects: { resource: { diplomacy: 0.2 }, relationsDrift: 0.3 } },
    // Hardliner: Apparat treuer, Rivale schwächer
    { id: 'enforcer', effects: { loyaltyDrift: 0.6, rivalTarget: -4 } },
  ],
  rival: {
    startStrength: 30,
    baseTarget: 35,
    approvalWeight: 0.6,
    driftPerMinute: 2.5,
    electionWeight: 0.4,
    electionBonusWeight: 0.15,
    neutral: 40,
    electionLoss: 15,
    moveIntervalSeconds: [150, 300],
    fromStage: 3,
    moves: [
      // Schmutzkampagne: Zustimmung sinkt
      { id: 'smear', weight: 3, minStrength: 0, shock: { approval: -4 } },
      // Berater abwerben: Loyalität des untreuesten Beraters sinkt
      { id: 'poach', weight: 2, minStrength: 30, shock: {}, poachLoyalty: 15 },
      // Kundgebung: Unruhe steigt, Rivale gewinnt an Stärke
      { id: 'rally', weight: 2, minStrength: 45, shock: { unrest: 6, rival: 4 } },
    ],
    counters: [
      {
        // Gegenkampagne: sicher, kostet Geld
        id: 'counterCampaign',
        cost: { money: 0.15 },
        strength: 12,
        chance: 100,
        cooldownSeconds: 120,
      },
      {
        // Skandal aufdecken: riskant, kostet Einfluss
        id: 'exposeScandal',
        cost: { influence: 0.12 },
        strength: 28,
        chance: 55,
        failShock: { approval: -5 },
        shock: { approval: 2 },
        cooldownSeconds: 240,
      },
      {
        // Verhaften lassen (nur Autokratie, schwacher Rivale): Rivale ist ausgeschaltet
        id: 'arrest',
        cost: { influence: 0.2 },
        strength: 100,
        chance: 100,
        shock: { approval: -6, unrest: 8, relationsAll: -10 },
        cooldownSeconds: 60,
        path: 'autocratic',
        maxStrength: 25,
      },
    ],
  },
  chronicleSize: 80,
};
