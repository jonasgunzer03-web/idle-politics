// Größe und Dauer der Vereidigung je Stufe (Spezifikation 5.6).

/** Größenordnung der Zeremonie je Stufe (Spezifikation 5.6). */
export function ceremonyTier(stage: number): 0 | 1 | 2 | 3 | 4 {
  if (stage <= 3) return 0;
  if (stage <= 6) return 1;
  if (stage <= 9) return 2;
  if (stage <= 11) return 3;
  return 4;
}

/** Dauer in ms: 2 bis 6 Sekunden je nach Größe. */
export const CEREMONY_MS = [2500, 3300, 4200, 5100, 6000] as const;
