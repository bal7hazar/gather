// mulberry32: a tiny, fast, seedable PRNG. The whole generator state is a single
// uint32, so we thread it through the pure reducer (no hidden globals) which keeps
// runs fully reproducible from their seed — handy for tests and future replays.

export type RngState = number;

export function seedRng(seed: number): RngState {
  // Mix the seed so that small, adjacent seeds (1, 2, 3…) diverge immediately.
  let a = seed >>> 0;
  a = Math.imul(a ^ (a >>> 16), 0x45d9f3b) >>> 0;
  a = Math.imul(a ^ (a >>> 16), 0x45d9f3b) >>> 0;
  return (a ^ (a >>> 16)) >>> 0;
}

/** Advance the generator. Returns the next state and a float in [0, 1). */
export function rngFloat(state: RngState): { state: RngState; value: number } {
  const a = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { state: a >>> 0, value };
}

/** Uniform integer in [0, n). */
export function rngInt(state: RngState, n: number): { state: RngState; value: number } {
  const r = rngFloat(state);
  return { state: r.state, value: Math.floor(r.value * n) };
}
