// Seeded random utilities built on the mulberry32 PRNG.
//
// mulberry32 is tiny, fast, and has decent statistical quality for game
// purposes. Call mulberry32(seed) to get a generator function, or wrap it
// in the RNG class for convenience helpers.

/**
 * Create a seeded PRNG. Returns a function that yields floats in [0, 1).
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Thin wrapper over a mulberry32 stream with a few convenience methods.
 */
export class RNG {
  constructor(seed = 0xc0ffee) {
    this.next = mulberry32(seed);
  }

  /** Raw float in [0, 1). */
  float() {
    return this.next();
  }

  /** Integer in [0, max). */
  int(max) {
    return Math.floor(this.next() * max);
  }
}

// Shared default stream so the helpers below can be used without
// constructing an RNG instance. Import RNG directly when you need
// independent, reproducible streams (per-mission, per-district, etc.).
const defaultRng = new RNG();

/**
 * Pick a random element from an array (or undefined if empty).
 */
export function pick(arr, rng = defaultRng) {
  if (!arr || arr.length === 0) return undefined;
  return arr[Math.floor(rng.next() * arr.length)];
}

/**
 * Random float in [min, max).
 */
export function randRange(min, max, rng = defaultRng) {
  return min + rng.next() * (max - min);
}

/**
 * True with probability p (0..1), false otherwise.
 */
export function chance(p, rng = defaultRng) {
  return rng.next() < p;
}
