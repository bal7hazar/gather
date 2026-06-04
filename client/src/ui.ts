import type { Dir, Turn } from "./game";
import { turnDir } from "./game";

/** Unicode arrow for an absolute heading. */
export function dirGlyph(dir: Dir): string {
  return ["↑", "→", "↓", "←"][dir];
}

export function turnLabel(turn: Turn): string {
  return turn === "S" ? "straight" : turn === "L" ? "left" : "right";
}

/**
 * Resolve the two previewed arrows to absolute glyphs. The current arrow turns the
 * present heading; the next one turns the heading the token will have after it.
 */
export function previewGlyphs(
  heading: Dir,
  arrows: Turn[],
): { current: string; next: string } {
  const afterCurrent = turnDir(heading, arrows[0]);
  return {
    current: dirGlyph(afterCurrent),
    next: dirGlyph(turnDir(afterCurrent, arrows[1])),
  };
}
