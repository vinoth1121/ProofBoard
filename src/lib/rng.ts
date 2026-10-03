/**
 * Deterministic pseudo-random number generation.
 *
 * The mock API must return identical data on every reload and across every
 * visitor, so all randomness in ProofBoard flows from a single integer seed
 * (mulberry32). No `Math.random()` anywhere in the data layer.
 */

export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  /** Float in [min, max). */
  float(min: number, max: number): number;
  /** Uniformly pick one element. */
  pick<T>(items: readonly T[]): T;
  /** True with the given probability. */
  chance(probability: number): boolean;
  /** Fisher-Yates shuffle, returns a new array. */
  shuffle<T>(items: readonly T[]): T[];
}

/** mulberry32 — small, fast, and stable across engines. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (min: number, max: number): number => {
    if (max < min) return min;
    return min + Math.floor(next() * (max - min + 1));
  };

  const float = (min: number, max: number): number => min + next() * (max - min);

  const pick = <T>(items: readonly T[]): T => {
    if (items.length === 0) throw new Error('createRng().pick: empty list');
    const item = items[int(0, items.length - 1)];
    // `noUncheckedIndexedAccess` widens this to T | undefined.
    if (item === undefined) throw new Error('createRng().pick: out of bounds');
    return item;
  };

  const chance = (probability: number): boolean => next() < probability;

  const shuffle = <T>(items: readonly T[]): T[] => {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = int(0, i);
      const a = out[i];
      const b = out[j];
      if (a === undefined || b === undefined) continue;
      out[i] = b;
      out[j] = a;
    }
    return out;
  };

  return { next, int, float, pick, chance, shuffle };
}
