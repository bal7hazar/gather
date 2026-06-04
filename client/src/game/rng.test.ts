import { describe, expect, it } from "vitest";
import { rngFloat, rngInt, seedRng } from "./rng";

describe("rng", () => {
  it("is deterministic for a given seed", () => {
    const a = seedRng(42);
    const b = seedRng(42);
    expect(rngFloat(a).value).toBe(rngFloat(b).value);
  });

  it("diverges for adjacent seeds", () => {
    const first = (seed: number) => rngFloat(seedRng(seed)).value;
    expect(first(1)).not.toBe(first(2));
    expect(first(2)).not.toBe(first(3));
  });

  it("produces floats in [0, 1)", () => {
    let s = seedRng(7);
    for (let i = 0; i < 1000; i++) {
      const r = rngFloat(s);
      expect(r.value).toBeGreaterThanOrEqual(0);
      expect(r.value).toBeLessThan(1);
      s = r.state;
    }
  });

  it("rngInt stays within [0, n)", () => {
    let s = seedRng(99);
    for (let i = 0; i < 1000; i++) {
      const r = rngInt(s, 3);
      expect(r.value).toBeGreaterThanOrEqual(0);
      expect(r.value).toBeLessThan(3);
      s = r.state;
    }
  });
});
