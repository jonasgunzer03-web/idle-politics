import type { LocationId } from '../engine/ids';

// Texte der Minispiele „Selbst anpacken“.

export const minigameTexts = {
  play: 'Selbst anpacken',
  playSub: 'Minispiel · {title}',
  close: 'Fertig',
  loading: 'Wird aufgebaut …',
  noWebgl: 'Dein Gerät kann die 3D-Grafik gerade nicht anzeigen.',
  /** Name des Minispiels je Ort. */
  titles: {
    workplace: 'Kisten verladen',
    pub: 'Bier zapfen',
    market: 'Obst verkaufen',
    partyOffice: 'Flugblätter verteilen',
    townHall: 'Akten stempeln',
    newspaper: 'Zeitungen drucken',
    bank: 'Geldsäcke schleppen',
    parliament: 'Reden schreiben',
    ministry: 'Akten kopieren',
    embassy: 'Geschenke packen',
    palace: 'Orden verleihen',
  } satisfies Record<LocationId, string>,
  /** Was hergestellt wird (Mehrzahl). */
  items: {
    workplace: 'Kisten',
    pub: 'Biere',
    market: 'Obstkisten',
    partyOffice: 'Flugblätter',
    townHall: 'Akten',
    newspaper: 'Zeitungen',
    bank: 'Geldsäcke',
    parliament: 'Reden',
    ministry: 'Akten',
    embassy: 'Geschenke',
    palace: 'Orden',
  } satisfies Record<LocationId, string>,
  hints: {
    source: 'Hol dir {items} an der Maschine!',
    counter: 'Bring sie zur Theke rechts!',
    cash: 'Sammle das Geld ein!',
    wait: 'Warte kurz, die Maschine arbeitet …',
  },
  cash: 'KASSE',
  pads: {
    hire: 'Mitarbeiter einstellen',
    upgrade: 'Gebäude ausbauen',
    machine: 'Maschine bauen',
  },
  padState: {
    full: 'Kein Platz',
    maxed: 'Ganz ausgebaut',
    stage: 'Später',
    none: '–',
  },
  bought: {
    hire: 'Neuer Mitarbeiter!',
    upgrade: 'Ausgebaut auf Stufe {level}!',
    machine: 'Maschine gebaut!',
  },
  tooExpensive: 'Noch zu teuer',
  carry: '{n}/{max}',
  sales: 'Verkäufe',
  helpers: '{n} Helfer',
  joystick: 'Daumen auf den Bildschirm legen und ziehen zum Laufen',
};
