// Gemeinsame Bezeichner, die Engine, Config und Oberfläche teilen.

export const RESOURCE_IDS = ['money', 'influence', 'followers', 'loyalty', 'diplomacy'] as const;
export type ResourceId = (typeof RESOURCE_IDS)[number];

export const STATE_IDS = ['novaria', 'rhenania', 'borealis', 'zentralia'] as const;
export type StateId = (typeof STATE_IDS)[number];

export const PROFESSION_IDS = ['office', 'skilled'] as const;
export type ProfessionId = (typeof PROFESSION_IDS)[number];

export const PATH_IDS = ['democratic', 'autocratic'] as const;
export type PathId = (typeof PATH_IDS)[number];

export const TAP_ACTION_IDS = ['work', 'network'] as const;
export type TapActionId = (typeof TAP_ACTION_IDS)[number];

export const GENERATOR_IDS = [
  'overtime',
  'sideJob',
  'smallBusiness',
  'rentals',
  'company',
  'holding',
  'regularsTable',
  'clubWork',
  'localBranch',
  'pressContacts',
  'thinkTank',
  'flyers',
  'infoStand',
  'socialMediaTeam',
  'campaignOffice',
] as const;
export type GeneratorId = (typeof GENERATOR_IDS)[number];

export const MAX_STAGE = 12;

export type ResourceMap = Record<ResourceId, number>;
