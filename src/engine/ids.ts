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

export const ACTION_IDS = [
  'work',
  'network',
  'canvass',
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
] as const;
export type AchievementId = (typeof ACHIEVEMENT_IDS)[number];

export const ACCESSORY_IDS = ['partyPin', 'tie', 'sash', 'medal'] as const;
export type AccessoryId = (typeof ACCESSORY_IDS)[number];

export const MAX_STAGE = 12;

export type ResourceMap = Record<ResourceId, number>;
