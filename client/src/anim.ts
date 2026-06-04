// View-layer animation model for a single move. The pure reducer computes the final
// state up front (`toState`); this describes how to play the slide toward the placed
// arrow before committing it, so the logic stays untouched and testable.

import type { Cell, Dir, GameState } from "./game";

export interface MoveAnim {
  /** Cells the token visits, in order. Length === the chosen placement distance. */
  path: Cell[];
  startCell: { x: number; y: number };
  arrowCell: { x: number; y: number };
  /** Absolute glyph of the heading the token turns to at the arrow. */
  arrowGlyph: string;
  headingBefore: Dir;
  headingAfter: Dir;
  /** Path cell index → collected value, for the little "+n" pops. */
  collected: Map<number, number>;
  /** Committed state, applied once the slide finishes. */
  toState: GameState;
  /** Per-cell slide duration (ms), matched to the CSS transition. */
  stepDur: number;
  /** 0 = at start; k = arrived at path[k-1]. Reaches path.length at the arrow. */
  stepIndex: number;
  phase: "sliding" | "consume";
}

/** The cell the token occupies at a given step. */
export function cellAtStep(a: MoveAnim, k: number): { x: number; y: number } {
  return k <= 0 ? a.startCell : a.path[k - 1];
}

/** True if two cells are non-adjacent — i.e. the hop crosses a torus edge (wrap). */
export function isWrapHop(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  return Math.abs(a.x - b.x) > 1 || Math.abs(a.y - b.y) > 1;
}
