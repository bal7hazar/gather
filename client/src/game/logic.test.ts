import { describe, expect, it } from "vitest";
import {
  HEIGHT,
  VISIBLE_NUMBERS,
  WIDTH,
  clearRun,
  createGame,
  idx,
  placeArrow,
  setHeading,
  step,
  turnDir,
} from "./logic";
import type { GameState } from "./types";

describe("geometry", () => {
  it("wraps around the torus edges", () => {
    expect(step(0, 5, 3)).toEqual({ x: WIDTH - 1, y: 5 }); // West off the left edge
    expect(step(WIDTH - 1, 5, 1)).toEqual({ x: 0, y: 5 }); // East off the right edge
    expect(step(5, 0, 0)).toEqual({ x: 5, y: HEIGHT - 1 }); // North off the top edge
    expect(step(5, HEIGHT - 1, 2)).toEqual({ x: 5, y: 0 }); // South off the bottom
  });

  it("turns relative to the heading and never reverses", () => {
    expect(turnDir(0, "S")).toBe(0);
    expect(turnDir(0, "R")).toBe(1);
    expect(turnDir(0, "L")).toBe(3);
    expect(turnDir(3, "R")).toBe(0); // wraps the direction ring
    expect(turnDir(1, "L")).toBe(0);
  });
});

describe("createGame", () => {
  it("starts at center, choosing, with 5 numbers and 2 arrows", () => {
    const g = createGame(123);
    expect(g.status).toBe("choosing");
    expect(g.token).toEqual({ x: Math.floor(WIDTH / 2), y: Math.floor(HEIGHT / 2) });
    expect(g.heading).toBeNull();
    expect(g.numbers).toHaveLength(VISIBLE_NUMBERS);
    expect(g.arrows).toHaveLength(2);
    expect(g.used[idx(g.token.x, g.token.y)]).toBe(true);
  });

  it("is fully reproducible from its seed", () => {
    expect(createGame(777)).toEqual(createGame(777));
  });

  it("seeds numbers only on free, distinct cells", () => {
    const g = createGame(5);
    const seen = new Set<number>();
    for (const n of g.numbers) {
      const i = idx(n.x, n.y);
      expect(g.used[i]).toBe(false);
      expect(seen.has(i)).toBe(false);
      seen.add(i);
      expect([1, 2, 3]).toContain(n.value);
    }
  });
});

describe("setHeading", () => {
  it("begins play and only works while choosing", () => {
    const g = setHeading(createGame(1), 1);
    expect(g.status).toBe("playing");
    expect(g.heading).toBe(1);
    expect(setHeading(g, 2).heading).toBe(1); // ignored once playing
  });
});

describe("clearRun", () => {
  it("highlights the contiguous unused cells ahead and flags wrap", () => {
    const g = setHeading(createGame(1), 1); // heading East from center
    const run = clearRun(g);
    expect(run.length).toBeGreaterThan(0);
    expect(run[0].distance).toBe(1);
    // The first cells ahead before the right edge are not wrapped.
    expect(run[0].wrapped).toBe(false);
    // Somewhere along a full sweep East it must cross the edge and wrap.
    expect(run.some((c) => c.wrapped)).toBe(true);
  });

  it("stops before a trail cell", () => {
    const g = setHeading(createGame(1), 1);
    const blocked: GameState = { ...g, used: g.used.slice() };
    const cx = g.token.x;
    const cy = g.token.y;
    blocked.used[idx(cx + 2, cy)] = true; // wall two cells East
    const run = clearRun(blocked);
    expect(run).toHaveLength(1); // only the immediate next cell is reachable
    expect(run[0]).toMatchObject({ x: cx + 1, y: cy, distance: 1 });
  });
});

describe("placeArrow", () => {
  it("slides the token, lays trail, costs one per cell, and turns", () => {
    const g = setHeading(createGame(1), 1);
    const before = g.token.x;
    const moved = placeArrow(g, 3);
    expect(moved.token).toEqual({ x: before + 3, y: g.token.y });
    expect(moved.steps).toBe(3);
    // Every traversed cell is now trail.
    for (let d = 1; d <= 3; d++) expect(moved.used[idx(before + d, g.token.y)]).toBe(true);
    // Heading turned per the dealt arrow; preview shifted and refilled.
    expect(moved.heading).toBe(turnDir(1, g.arrows[0]));
    expect(moved.arrows).toHaveLength(2);
    expect(moved.arrows[0]).toBe(g.arrows[1]);
    expect(moved.score).toBe(moved.collected - moved.steps);
  });

  it("ignores illegal distances", () => {
    const g = setHeading(createGame(1), 1);
    expect(placeArrow(g, 0)).toBe(g);
    expect(placeArrow(g, clearRun(g).length + 1)).toBe(g);
  });

  it("keeps exactly 5 numbers visible across collections", () => {
    let g = setHeading(createGame(13), 1);
    for (let t = 0; t < 30 && g.status === "playing"; t++) {
      const run = clearRun(g);
      g = placeArrow(g, run[Math.min(2, run.length - 1)].distance);
      expect(g.numbers.length).toBe(VISIBLE_NUMBERS);
    }
  });

  it("collects a number on the path: +value, respawn, score nets correctly", () => {
    // Heading East from center; drop a single known number two cells ahead.
    const base = setHeading(createGame(2), 1);
    const cx = base.token.x;
    const cy = base.token.y;
    const g: GameState = {
      ...base,
      numbers: [{ id: 999, x: cx + 2, y: cy, value: 3 }],
    };
    const moved = placeArrow(g, 2);
    expect(moved.collected).toBe(3);
    expect(moved.steps).toBe(2);
    expect(moved.score).toBe(1); // +3 value − 2 steps
    expect(moved.numbers.length).toBe(1); // collected one, respawned one
    expect(moved.numbers.some((n) => n.id === 999)).toBe(false);
  });

  it("ends the game when the token boxes itself in", () => {
    // Build a tight pocket: token at (1,1) heading East with trail walls so that
    // after one step East it has nowhere legal to go.
    const used = new Array<boolean>(WIDTH * HEIGHT).fill(false);
    const block = (x: number, y: number) => (used[idx(x, y)] = true);
    block(1, 1); // token's own cell
    block(3, 1); // wall ahead (East), 2 cells out
    block(2, 0); // North of the cell the token will turn into
    block(2, 2); // South of it
    const g: GameState = {
      width: WIDTH,
      height: HEIGHT,
      token: { x: 1, y: 1 },
      heading: 1,
      used,
      numbers: [],
      arrows: ["S", "S"], // straight: after moving to (2,1) it stays heading East into the wall
      score: 0,
      steps: 0,
      collected: 0,
      rng: 1,
      nextNumberId: 0,
      status: "playing",
      seed: 0,
    };
    const moved = placeArrow(g, 1); // slide to (2,1), turn straight → faces wall at (3,1)
    expect(moved.token).toEqual({ x: 2, y: 1 });
    expect(clearRun(moved)).toHaveLength(0);
    expect(moved.status).toBe("over");
  });

  it("approximates the 4:2:1 value distribution over many spawns", () => {
    const counts = { 1: 0, 2: 0, 3: 0 };
    let g = setHeading(createGame(31), 1);
    let spawns = 0;
    for (let t = 0; t < 400 && g.status === "playing"; t++) {
      const before = g.collected;
      const run = clearRun(g);
      if (run.length === 0) break;
      g = placeArrow(g, run[run.length - 1].distance); // long sweeps collect more
      if (g.collected > before) spawns++;
      for (const n of g.numbers) counts[n.value]++;
    }
    // Loose sanity bounds (not a statistical test): 1s should dominate 3s.
    expect(spawns).toBeGreaterThan(0);
    expect(counts[1]).toBeGreaterThan(counts[3]);
  });
});
