// Pure, serializable game model. No DOM, no React — portable to an on-chain/Dojo
// context later. All randomness flows through the seedable RNG state (see rng.ts).

/** Absolute heading. 0=North, 1=East, 2=South, 3=West (clockwise). */
export type Dir = 0 | 1 | 2 | 3;

/** A dealt arrow is a relative turn applied to the heading at the arrow cell. */
export type Turn = "L" | "S" | "R";

export type NumberValue = 1 | 2 | 3;

export interface NumberTile {
  id: number;
  x: number;
  y: number;
  value: NumberValue;
}

/** A candidate arrow-placement cell along the current heading line. */
export interface Cell {
  x: number;
  y: number;
  index: number;
  /** Cells ahead of the token (1 = the immediate next cell). */
  distance: number;
  /** True once this cell (or an earlier one in the run) is reached via an edge wrap. */
  wrapped: boolean;
}

export type Status = "playing" | "over";

export interface GameState {
  width: number;
  height: number;
  token: { x: number; y: number };
  /** Absolute heading the token is currently moving along. */
  heading: Dir;
  /** Flat width*height grid of trail cells. used[y*width + x] === true ⇒ blocked. */
  used: boolean[];
  numbers: NumberTile[];
  /** [current, next] dealt arrows shown to the player (the 2-move preview). */
  arrows: Turn[];
  /** Sum of collected number values (no step deduction). */
  score: number;
  /** Total cells traveled (tracked for info; does not affect the score). */
  steps: number;
  /** Running sum of collected number values (equals score). */
  collected: number;
  /** Seedable RNG state (mulberry32). */
  rng: number;
  nextNumberId: number;
  status: Status;
  seed: number;
}
