// Minispiele „Selbst anpacken“: In jedem Gebäude läuft man als eigene Figur herum, holt
// Stück für Stück an der Quelle ab (Band, Zapfhahn, Druckerpresse …), bringt es zur Theke,
// Kunden kaufen, das Geld bleibt liegen und wird eingesammelt. Ausbau-Felder kaufen echte
// Verbesserungen (Mitarbeiter, Ausbaustufe, Maschine) – dieselben Käufe wie im Menü.
// Texte stehen in src/i18n/de-minigames.ts.

export interface MinigameConfig {
  /** Wert eines Verkaufs: so viele Durchgänge aller Linien des Gebäudes (Währungsanteil). */
  saleCycles: number;
  /** Zusätzlich je Verkauf: so viele Sekunden des laufenden Ertrags dieser Währungen. */
  rateSeconds: number;
  /** Sekunden, bis die Quelle ein neues Stück liefert (Ausbaustufe 1). */
  produceSeconds: number;
  /** Schnellere Quelle je weiterer Ausbaustufe (0,2 = +20 % Tempo). */
  produceBoostPerLevel: number;
  /** Höchstens so viele Stücke liegen an der Quelle (Stufe 1) … */
  sourceMax: number;
  /** … und so viele mehr je weiterer Ausbaustufe. */
  sourceMaxPerLevel: number;
  /** Tragkraft der eigenen Figur (Stufe 1) und Zuwachs je Ausbaustufe. */
  carryBase: number;
  carryPerLevel: number;
  /** Höchstens so viele Stücke passen auf die Theke. */
  counterMax: number;
  /** Takt beim Aufnehmen und Ablegen (Sekunden je Stück). */
  handSeconds: number;
  /** Laufgeschwindigkeit der eigenen Figur (Meter pro Sekunde). */
  playerSpeed: number;
  /** Ein neuer Kunde kommt alle so viele Sekunden … */
  customerSeconds: number;
  /** … höchstens so viele warten gleichzeitig. */
  maxQueue: number;
  /** Ein Kunde möchte zwischen 1 und so vielen Stücken. */
  maxWant: number;
  /** Sekunden, die ein Kunde für ein Stück an der Theke braucht. */
  buySeconds: number;
  /** Laufgeschwindigkeit der Kunden (Meter pro Sekunde). */
  customerSpeed: number;
  /** Höchstens so viele Mitarbeiter laufen als Helfer mit. */
  maxHelpers: number;
  /** Tragkraft und Tempo der Helfer. */
  helperCarry: number;
  helperSpeed: number;
  /** So lange muss man auf einem Ausbau-Feld stehen, bis gekauft wird (Sekunden). */
  padSeconds: number;
  /** Höchstens so viele Geldbündel liegen sichtbar auf dem Haufen. */
  cashPileMax: number;
}

export const minigames: MinigameConfig = {
  saleCycles: 10,
  rateSeconds: 2,
  produceSeconds: 1.1,
  produceBoostPerLevel: 0.2,
  sourceMax: 10,
  sourceMaxPerLevel: 4,
  carryBase: 4,
  carryPerLevel: 2,
  counterMax: 40,
  handSeconds: 0.1,
  playerSpeed: 4.4,
  customerSeconds: 2.2,
  maxQueue: 4,
  maxWant: 3,
  buySeconds: 0.35,
  customerSpeed: 2.2,
  maxHelpers: 4,
  helperCarry: 3,
  helperSpeed: 2.6,
  padSeconds: 0.9,
  cashPileMax: 30,
};
