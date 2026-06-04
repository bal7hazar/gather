// Pure game reducer for Gather. See ../../../CONTEXT.md for the full rules.
//
// Turn loop: the token slides along its current heading until it reaches the arrow
// the player placed, then turns to the arrow's dealt direction. Every cell entered
// becomes trail (used) forever; entering a number collects it (and respawns one).
// The torus removes wall deaths, so the only loss is self-collision — surfaced here
// as "no free cell ahead to place the next arrow" (boxed in).

import {
  type Cell,
  type Dir,
  type GameState,
  type NumberTile,
  type NumberValue,
  type Turn,
} from "./types";
import { rngFloat, rngInt, seedRng, type RngState } from "./rng";

export const WIDTH = 15;
export const HEIGHT = 15;
export const VISIBLE_NUMBERS = 5;

const DIR_VECTORS: Record<Dir, { x: number; y: number }> = {
  0: { x: 0, y: -1 },
  1: { x: 1, y: 0 },
  2: { x: 0, y: 1 },
  3: { x: -1, y: 0 },
};

export const idx = (x: number, y: number): number => y * WIDTH + x;

const wrap = (v: number, m: number): number => ((v % m) + m) % m;

/** One step along `dir` from (x, y), wrapping around the torus edges. */
export function step(x: number, y: number, dir: Dir): { x: number; y: number } {
  const v = DIR_VECTORS[dir];
  return { x: wrap(x + v.x, WIDTH), y: wrap(y + v.y, HEIGHT) };
}

/** Apply a relative turn to an absolute heading. The 180° reversal is never dealt. */
export function turnDir(heading: Dir, turn: Turn): Dir {
  if (turn === "S") return heading;
  if (turn === "R") return ((heading + 1) % 4) as Dir;
  return ((heading + 3) % 4) as Dir; // "L"
}

/** Weighted number value: P(1)=4/7, P(2)=2/7, P(3)=1/7. */
function dealValue(state: RngState): { state: RngState; value: NumberValue } {
  const r = rngFloat(state);
  const f = r.value * 7;
  const value: NumberValue = f < 4 ? 1 : f < 6 ? 2 : 3;
  return { state: r.state, value };
}

const TURNS: Turn[] = ["S", "L", "R"];

/** Deal a relative arrow direction, uniform over {straight, left, right}. */
function dealTurn(state: RngState): { state: RngState; turn: Turn } {
  const r = rngInt(state, TURNS.length);
  return { state: r.state, turn: TURNS[r.value] };
}

/** Cells that are neither trail, nor the token, nor already holding a number. */
function freeCellIndices(state: GameState): number[] {
  const occupied = new Array<boolean>(WIDTH * HEIGHT).fill(false);
  for (let i = 0; i < state.used.length; i++) if (state.used[i]) occupied[i] = true;
  occupied[idx(state.token.x, state.token.y)] = true;
  for (const n of state.numbers) occupied[idx(n.x, n.y)] = true;
  const free: number[] = [];
  for (let i = 0; i < occupied.length; i++) if (!occupied[i]) free.push(i);
  return free;
}

/** Spawn one number on a uniformly chosen free cell (no-op if the board is full). */
function spawnNumber(state: GameState): GameState {
  const free = freeCellIndices(state);
  if (free.length === 0) return state;
  const pick = rngInt(state.rng, free.length);
  const valued = dealValue(pick.state);
  const cell = free[pick.value];
  const tile: NumberTile = {
    id: state.nextNumberId,
    x: cell % WIDTH,
    y: Math.floor(cell / WIDTH),
    value: valued.value,
  };
  return {
    ...state,
    rng: valued.state,
    nextNumberId: state.nextNumberId + 1,
    numbers: [...state.numbers, tile],
  };
}

/**
 * The contiguous run of unused cells directly ahead of the token along its heading,
 * before it would hit its own trail. These are exactly the legal arrow placements;
 * `distance` is how far the token would slide to turn there.
 */
export function clearRun(state: GameState): Cell[] {
  if (state.heading == null) return [];
  const cells: Cell[] = [];
  let { x, y } = state.token;
  let wrapped = false;
  for (let n = 0; n < WIDTH * HEIGHT; n++) {
    const next = step(x, y, state.heading);
    if (state.used[idx(next.x, next.y)]) break;
    if (Math.abs(next.x - x) > 1 || Math.abs(next.y - y) > 1) wrapped = true;
    cells.push({
      x: next.x,
      y: next.y,
      index: idx(next.x, next.y),
      distance: n + 1,
      wrapped,
    });
    x = next.x;
    y = next.y;
  }
  return cells;
}

/** Create a fresh game: token at center, 5 numbers seeded, 2 arrows previewed. */
export function createGame(seed: number): GameState {
  const used = new Array<boolean>(WIDTH * HEIGHT).fill(false);
  const cx = Math.floor(WIDTH / 2);
  const cy = Math.floor(HEIGHT / 2);
  used[idx(cx, cy)] = true;

  let state: GameState = {
    width: WIDTH,
    height: HEIGHT,
    token: { x: cx, y: cy },
    heading: null,
    used,
    numbers: [],
    arrows: [],
    score: 0,
    steps: 0,
    collected: 0,
    rng: seedRng(seed),
    nextNumberId: 0,
    status: "choosing",
    seed,
  };

  for (let i = 0; i < VISIBLE_NUMBERS; i++) state = spawnNumber(state);

  const a0 = dealTurn(state.rng);
  const a1 = dealTurn(a0.state);
  return { ...state, rng: a1.state, arrows: [a0.turn, a1.turn] };
}

/** Lock in the player's initial heading and begin play. */
export function setHeading(state: GameState, heading: Dir): GameState {
  if (state.status !== "choosing") return state;
  return { ...state, heading, status: "playing" };
}

/**
 * Place the current arrow `distance` cells ahead and resolve the turn: slide the
 * token there (marking trail, collecting + respawning numbers), turn to the dealt
 * direction, then shift the preview and deal a new arrow. Illegal distances are
 * ignored (returns the input state unchanged). If the token is boxed in afterwards,
 * the game ends.
 */
export function placeArrow(state: GameState, distance: number): GameState {
  if (state.status !== "playing" || state.heading == null) return state;
  const run = clearRun(state);
  if (distance < 1 || distance > run.length) return state;

  let s: GameState = {
    ...state,
    used: state.used.slice(),
    numbers: state.numbers.slice(),
  };
  let { x, y } = s.token;

  for (let d = 1; d <= distance; d++) {
    const next = step(x, y, s.heading as Dir);
    x = next.x;
    y = next.y;
    s.used[idx(x, y)] = true;
    s.steps += 1;

    const ni = s.numbers.findIndex((n) => n.x === x && n.y === y);
    if (ni >= 0) {
      s.collected += s.numbers[ni].value;
      s.numbers = s.numbers.filter((_, i) => i !== ni);
      s = spawnNumber({ ...s, token: { x, y } });
    }
  }

  s.token = { x, y };
  s.heading = turnDir(s.heading as Dir, s.arrows[0]);

  const dealt = dealTurn(s.rng);
  s = { ...s, rng: dealt.state, arrows: [s.arrows[1], dealt.turn] };
  s.score = s.collected;

  if (clearRun(s).length === 0) s.status = "over";
  return s;
}
