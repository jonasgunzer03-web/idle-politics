import type { LocationId } from '../engine/ids';
import type { ItemKind } from './three/items';

// Aussehen der Minispiele je Ort: Boden, Wände, was hergestellt und verkauft wird, wie Quelle
// und Theke aussehen und welche Deko herumsteht. Reine Darstellung, keine Spielwerte.

export type SourceKind =
  | 'conveyor'
  | 'beerTap'
  | 'pallet'
  | 'printer'
  | 'stampDesk'
  | 'press'
  | 'vault'
  | 'writingDesk'
  | 'copier'
  | 'giftTable'
  | 'treasury';

export type PropKind =
  | 'pallets'
  | 'barrels'
  | 'tables'
  | 'plants'
  | 'shelves'
  | 'flags'
  | 'columns'
  | 'carpet'
  | 'sofa'
  | 'paperPiles'
  | 'lamps'
  | 'fountain'
  | 'trees'
  | 'benches';

export interface CounterStyle {
  body: string;
  top: string;
  /** Markise in zwei Farben (Marktstand, Kiosk). */
  awning?: [string, string];
  /** Glasscheibe (Bank, Amt). */
  glass?: boolean;
  /** Warnstreifen (Laderampe). */
  stripes?: boolean;
}

export interface Theme {
  /** Draußen (Gras, Zaun) statt Raum mit Wänden. */
  outdoor: boolean;
  floor: [string, string];
  wall: string;
  wallTrim: string;
  item: ItemKind;
  source: SourceKind;
  counter: CounterStyle;
  /** Kleidung des Personals (Hemd, Hose, Weste/Schürze, Kappe). */
  staff: { shirt: string; pants: string; vest?: string; hat?: string };
  /** Hemdfarben der Kunden. */
  customers: string[];
  props: PropKind[];
}

export const themes: Record<LocationId, Theme> = {
  workplace: {
    outdoor: false,
    floor: ['#c9d3dc', '#bcc7d1'],
    wall: '#e8a85c',
    wallTrim: '#b9733a',
    item: 'crate',
    source: 'conveyor',
    counter: { body: '#ffc533', top: '#4a5568', stripes: true },
    staff: { shirt: '#3f7fd6', pants: '#2c4a6b', hat: '#ffc533' },
    customers: ['#e05a47', '#5aa65a', '#8a6ad6', '#e0a13a'],
    props: ['pallets', 'barrels', 'shelves'],
  },
  pub: {
    outdoor: false,
    floor: ['#b07a4f', '#9e6b43'],
    wall: '#8a3f3a',
    wallTrim: '#5e2622',
    item: 'beer',
    source: 'beerTap',
    counter: { body: '#7a4a2a', top: '#a86b3c' },
    staff: { shirt: '#ffffff', pants: '#2b2f36', vest: '#2b2f36' },
    customers: ['#3f7fd6', '#d65a8a', '#5aa65a', '#e0a13a', '#8a6ad6'],
    props: ['tables', 'barrels', 'lamps'],
  },
  market: {
    outdoor: true,
    floor: ['#7cc96a', '#70bd5e'],
    wall: '#d9b98a',
    wallTrim: '#a8875a',
    item: 'fruit',
    source: 'pallet',
    counter: { body: '#c8894c', top: '#e8c08a', awning: ['#ef3e3a', '#ffffff'] },
    staff: { shirt: '#5aa65a', pants: '#4a4038', vest: '#efe9dc' },
    customers: ['#e05a47', '#3f7fd6', '#d65a8a', '#e0a13a', '#8a6ad6'],
    props: ['trees', 'benches', 'barrels'],
  },
  partyOffice: {
    outdoor: false,
    floor: ['#e7dccb', '#ddd0bc'],
    wall: '#f2f0ea',
    wallTrim: '#c9c2b3',
    item: 'flyer',
    source: 'printer',
    counter: { body: '#ea4c89', top: '#ffffff' },
    staff: { shirt: '#ea4c89', pants: '#2f333b' },
    customers: ['#3f7fd6', '#5aa65a', '#e0a13a', '#8a6ad6'],
    props: ['flags', 'plants', 'paperPiles'],
  },
  townHall: {
    outdoor: false,
    floor: ['#d8c9a8', '#cbbb98'],
    wall: '#f0e6cf',
    wallTrim: '#b59b6a',
    item: 'file',
    source: 'stampDesk',
    counter: { body: '#8a5a32', top: '#c49460', glass: true },
    staff: { shirt: '#f2efe8', pants: '#3b3f47', vest: '#4f7fe0' },
    customers: ['#e05a47', '#5aa65a', '#d65a8a', '#e0a13a', '#3f7fd6'],
    props: ['columns', 'plants', 'benches'],
  },
  newspaper: {
    outdoor: false,
    floor: ['#c4c9d1', '#b6bcc6'],
    wall: '#5a6f92',
    wallTrim: '#3b4b66',
    item: 'newspaper',
    source: 'press',
    counter: { body: '#2f8cff', top: '#ffffff', awning: ['#2f8cff', '#ffffff'] },
    staff: { shirt: '#f2efe8', pants: '#3b3f47', hat: '#2b2f36' },
    customers: ['#e05a47', '#5aa65a', '#d65a8a', '#e0a13a', '#8a6ad6'],
    props: ['paperPiles', 'shelves', 'lamps'],
  },
  bank: {
    outdoor: false,
    floor: ['#eae6dc', '#d9d3c4'],
    wall: '#2f6b5a',
    wallTrim: '#c9a227',
    item: 'moneybag',
    source: 'vault',
    counter: { body: '#3d3a36', top: '#c9a227', glass: true },
    staff: { shirt: '#ffffff', pants: '#23262d', vest: '#2b2f36' },
    customers: ['#2b2f36', '#5a6f92', '#8a6ad6', '#c9a227'],
    props: ['columns', 'plants', 'sofa'],
  },
  parliament: {
    outdoor: false,
    floor: ['#3f6fb0', '#36619c'],
    wall: '#e9e2d0',
    wallTrim: '#b59b6a',
    item: 'speech',
    source: 'writingDesk',
    counter: { body: '#7a5634', top: '#a8794a' },
    staff: { shirt: '#2b2f36', pants: '#23262d' },
    customers: ['#2b2f36', '#5a6f92', '#8a3f3a', '#3e4a33'],
    props: ['flags', 'columns', 'carpet'],
  },
  ministry: {
    outdoor: false,
    floor: ['#d3d8de', '#c4cad2'],
    wall: '#8fa3bf',
    wallTrim: '#5a6f92',
    item: 'file',
    source: 'copier',
    counter: { body: '#5a6f92', top: '#e8ecf2', glass: true },
    staff: { shirt: '#ffffff', pants: '#2b2f36', vest: '#5a6f92' },
    customers: ['#2b2f36', '#5a6f92', '#3e4a33', '#8a6ad6'],
    props: ['shelves', 'plants', 'paperPiles'],
  },
  embassy: {
    outdoor: false,
    floor: ['#e8d9b8', '#dccaa4'],
    wall: '#f4efe4',
    wallTrim: '#c9a227',
    item: 'gift',
    source: 'giftTable',
    counter: { body: '#ffffff', top: '#c9a227' },
    staff: { shirt: '#2b2f36', pants: '#23262d' },
    customers: ['#e05a47', '#3fb8f0', '#5aa65a', '#c9a227', '#8a6ad6'],
    props: ['flags', 'carpet', 'plants'],
  },
  palace: {
    outdoor: true,
    floor: ['#e8dcc2', '#ddd0b2'],
    wall: '#f4efe4',
    wallTrim: '#c9a227',
    item: 'medal',
    source: 'treasury',
    counter: { body: '#b4232f', top: '#ffcf3d' },
    staff: { shirt: '#3e4a33', pants: '#2b3324', hat: '#b4232f' },
    customers: ['#e05a47', '#3f7fd6', '#5aa65a', '#e0a13a', '#d65a8a'],
    props: ['fountain', 'trees', 'flags'],
  },
};
