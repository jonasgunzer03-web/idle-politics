// Seedbarer Zufallsgenerator (mulberry32). Der innere Zustand ist eine 32-Bit-Zahl und liegt
// im Spielstand, dadurch sind Abläufe reproduzierbar und Tests deterministisch.

export interface RandomStep {
  /** Zufallszahl im Bereich [0, 1). */
  value: number;
  /** Neuer Zustand des Generators. */
  state: number;
}

export function nextRandom(state: number): RandomStep {
  const next = (state + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, state: next };
}

/** Veränderlicher Generator für Stellen außerhalb der Engine (z. B. Zufalls-Button im Editor). */
export interface Rng {
  next(): number;
  /** Ganze Zahl in [0, maxExclusive). */
  int(maxExclusive: number): number;
  readonly state: number;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return {
    next() {
      const step = nextRandom(state);
      state = step.state;
      return step.value;
    },
    int(maxExclusive: number) {
      return Math.floor(this.next() * maxExclusive);
    },
    get state() {
      return state;
    },
  };
}

/** Startwert aus der Kryptografie-API des Browsers, mit Rückfall auf die Uhrzeit. */
export function randomSeed(): number {
  try {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] ?? Date.now() >>> 0;
  } catch {
    return Date.now() >>> 0;
  }
}
