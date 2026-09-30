// Gemeinsame Bezeichner, die Engine, Config und Oberfläche teilen.

/** Währungen. Loyalität des Apparats ist ein Prozent-Balken (run.loyalty), keine Währung. */
export const RESOURCE_IDS = ['money', 'influence', 'followers', 'diplomacy'] as const;
export type ResourceId = (typeof RESOURCE_IDS)[number];

export const STATE_IDS = ['novaria', 'rhenania', 'borealis', 'zentralia'] as const;
export type StateId = (typeof STATE_IDS)[number];

export const PROFESSION_IDS = ['office', 'skilled'] as const;
export type ProfessionId = (typeof PROFESSION_IDS)[number];

export const PATH_IDS = ['democratic', 'autocratic'] as const;
export type PathId = (typeof PATH_IDS)[number];

export const GENERATOR_IDS = [
  'overtime',
  'sideJob',
  'smallBusiness',
  'rentals',
  'company',
  'holding',
  'conglomerate',
  'donorCircle',
  'lobbyFirm',
  'rawMaterials',
  'stateEnterprise',
  'regularsTable',
  'clubWork',
  'localBranch',
  'pressContacts',
  'thinkTank',
  'foundation',
  'flyers',
  'infoStand',
  'socialMediaTeam',
  'campaignOffice',
  'mediaGroup',
  'tvNetwork',
  'embassyStaff',
  'summitOffice',
] as const;
export type GeneratorId = (typeof GENERATOR_IDS)[number];

export const DISTRICT_IDS = ['quarter', 'oldTown', 'government', 'capital'] as const;
export type DistrictId = (typeof DISTRICT_IDS)[number];

export const LOCATION_IDS = [
  'workplace',
  'pub',
  'market',
  'partyOffice',
  'townHall',
  'newspaper',
  'bank',
  'parliament',
  'ministry',
  'embassy',
  'palace',
] as const;
export type LocationId = (typeof LOCATION_IDS)[number];

/**
 * Produktionslinien (früher „Tätigkeiten“). Die Reihenfolge ist auch die Rechenreihenfolge:
 * Linien ohne Waren-Zutaten laufen zuerst, damit frische Ware im selben Takt weiterwandert.
 */
export const ACTION_IDS = [
  'work',
  'network',
  'sell',
  'canvass',
  'print',
  'partyWork',
  'consultation',
  'interview',
  'fundraise',
  'debate',
  'administer',
  'reception',
  'speech',
] as const;
export type ActionId = (typeof ACTION_IDS)[number];

/** Waren: Zwischenprodukte, die zwischen Gebäuden wandern (keine Währung). */
export const GOOD_IDS = ['wares', 'contacts', 'flyers', 'files'] as const;
export type GoodId = (typeof GOOD_IDS)[number];
export type GoodMap = Record<GoodId, number>;

/** Wofür eine Linie steht (Gesetze wirken auf solche Gruppen). */
export const LINE_TAGS = ['industry', 'trade', 'party', 'media', 'finance', 'state', 'diplomacy'] as const;
export type LineTag = (typeof LINE_TAGS)[number];

/** Maschinen, zwei je Gebäude. */
export const MACHINE_IDS = [
  'conveyor',
  'warehouse',
  'beerTap',
  'jukebox',
  'stalls',
  'register',
  'printer',
  'phoneBank',
  'counter',
  'archive',
  'rotary',
  'photoLab',
  'vault',
  'tickerBoard',
  'mics',
  'votingBoard',
  'mainframe',
  'fileLift',
  'banquet',
  'interpreters',
  'tvStudio',
  'balcony',
] as const;
export type MachineId = (typeof MACHINE_IDS)[number];

/** Eigenschaften benannter Mitarbeiter. */
export const TRAIT_IDS = ['diligent', 'social', 'inventive', 'meticulous', 'dreamy'] as const;
export type TraitId = (typeof TRAIT_IDS)[number];

/** Parteiflügel der Berater. */
export const FACTION_IDS = ['economic', 'social', 'security', 'liberty', 'populist'] as const;
export type FactionId = (typeof FACTION_IDS)[number];

/** Fähigkeiten der Berater (passiver Bonus, solange sie am Tisch sitzen). */
export const SKILL_IDS = [
  'campaigner',
  'financier',
  'strategist',
  'mediaSavvy',
  'organizer',
  'diplomat',
  'enforcer',
] as const;
export type SkillId = (typeof SKILL_IDS)[number];

/** Beschlüsse und Gesetze. */
export const POLICY_IDS = [
  'workersFirst',
  'businessFriendly',
  'volunteerNetwork',
  'partyDiscipline',
  'openMeetings',
  'publicTransit',
  'tradeFair',
  'cityPolice',
  'pressFreedom',
  'lowTaxes',
  'wealthTax',
  'housing',
  'industrialPolicy',
  'digitalState',
  'pensionReform',
  'familyBonus',
  'surveillance',
  'mediaLaw',
  'openBorders',
  'protectionism',
  'education',
  'army',
  'greatProject',
  'constitutionReform',
  'stateOfEmergency',
  'personalityCult',
] as const;
export type PolicyId = (typeof POLICY_IDS)[number];

/** Was der Rivale von sich aus tut. */
export const RIVAL_MOVE_IDS = ['smear', 'poach', 'rally'] as const;
export type RivalMoveId = (typeof RIVAL_MOVE_IDS)[number];

/** Gegenmaßnahmen gegen den Rivalen. */
export const RIVAL_COUNTER_IDS = ['counterCampaign', 'exposeScandal', 'arrest'] as const;
export type RivalCounterId = (typeof RIVAL_COUNTER_IDS)[number];

/** Arten von Einträgen in der Stadtchronik. */
export const CHRONICLE_KEYS = [
  'runStart',
  'promoted',
  'electionWon',
  'electionLost',
  'resigned',
  'autocraticTurn',
  'lawEnacted',
  'lawRevoked',
  'consequence',
  'buildingUpgraded',
  'machineBuilt',
  'firstWorker',
  'workforce',
  'advisorJoined',
  'advisorLeft',
  'advisorDefected',
  'rivalSmear',
  'rivalPoach',
  'rivalRally',
  'rivalCountered',
  'rivalScandal',
  'rivalScandalFailed',
  'rivalJailed',
  'strikeStarted',
  'strikeEnded',
] as const;
export type ChronicleKey = (typeof CHRONICLE_KEYS)[number];

export const VEHICLE_IDS = ['feet', 'bicycle', 'moped', 'car', 'chauffeur', 'helicopter'] as const;
export type VehicleId = (typeof VEHICLE_IDS)[number];

export const GROUP_IDS = [
  'unions',
  'business',
  'media',
  'administration',
  'civilSociety',
  'military',
  'security',
  'oligarchs',
  'partyApparatus',
] as const;
export type GroupId = (typeof GROUP_IDS)[number];

export const FOREIGN_IDS = [
  'novaria',
  'rhenania',
  'borealis',
  'zentralia',
  'valmora',
  'lysania',
] as const;
export type ForeignId = (typeof FOREIGN_IDS)[number];

export const REGION_IDS = ['north', 'east', 'south', 'west'] as const;
export type RegionId = (typeof REGION_IDS)[number];

export const PROJECT_IDS = [
  'port',
  'fishery',
  'mine',
  'steelworks',
  'farming',
  'tourism',
  'techPark',
  'university',
] as const;
export type ProjectId = (typeof PROJECT_IDS)[number];

export const AUTOCRACY_ACTION_IDS = [
  'pressControl',
  'harassOpposition',
  'fixElection',
  'emergency',
  'buyLoyalty',
  'repression',
] as const;
export type AutocracyActionId = (typeof AUTOCRACY_ACTION_IDS)[number];

export const FOREIGN_ACTION_IDS = [
  'stateVisit',
  'tradeAgreement',
  'alliance',
  'sanctions',
  'maneuver',
] as const;
export type ForeignActionId = (typeof FOREIGN_ACTION_IDS)[number];

export const LEGACY_IDS = [
  'moneyBoost',
  'influenceBoost',
  'followersBoost',
  'calmNation',
  'popularity',
  'headStart',
  'startCapital',
  'campaignVeteran',
  'swiftFeet',
  'longRest',
] as const;
export type LegacyId = (typeof LEGACY_IDS)[number];

export const ACHIEVEMENT_IDS = [
  'firstShift',
  'firstInvestment',
  'firstElection',
  'firstStaff',
  'newVehicle',
  'mayor',
  'minister',
  'blueCollarPresident',
  'dictator',
  'allStates',
  'survivedUnrest',
  'overthrown',
  'emigrant',
  'coalitionBuilder',
  'diplomat',
  'regionalDeveloper',
  'millionaire',
  'veteran',
  'retiree',
  'eventVeteran',
  'industrialist',
  'lawmaker',
  'fullCabinet',
  'rivalDefeated',
  'bigEmployer',
] as const;
export type AchievementId = (typeof ACHIEVEMENT_IDS)[number];

export const ACCESSORY_IDS = ['partyPin', 'tie', 'sash', 'medal'] as const;
export type AccessoryId = (typeof ACCESSORY_IDS)[number];

export const MAX_STAGE = 12;

export type ResourceMap = Record<ResourceId, number>;
