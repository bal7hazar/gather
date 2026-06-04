import { useMemo } from "react";
import { type GameState, clearRun, idx } from "../game";
import { type MoveAnim, cellAtStep, isWrapHop } from "../anim";
import { dirGlyph } from "../ui";
import "./Board.css";

interface BoardProps {
  state: GameState;
  anim: MoveAnim | null;
  onPlace: (distance: number) => void;
}

export function Board({ state, anim, onPlace }: BoardProps) {
  const { width, height } = state;
  const animating = anim !== null;

  // index → placement, only when idle and playing (hidden mid-animation).
  const placements = useMemo(() => {
    const map = new Map<number, { distance: number; wrapped: boolean }>();
    if (!animating && state.status === "playing") {
      for (const c of clearRun(state)) map.set(c.index, { distance: c.distance, wrapped: c.wrapped });
    }
    return map;
  }, [state, animating]);

  const numberAt = useMemo(() => {
    const map = new Map<number, number>();
    for (const n of state.numbers) map.set(idx(n.x, n.y), n.value);
    return map;
  }, [state.numbers]);

  const cells = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = idx(x, y);
      const value = numberAt.get(i);
      const place = placements.get(i);

      const classes = ["cell"];
      if (state.used[i]) classes.push("trail");
      if (value) classes.push(`num num-${value}`);
      if (place) classes.push(place.wrapped ? "place place-wrap" : "place");

      cells.push(
        <button
          key={i}
          type="button"
          className={classes.join(" ")}
          disabled={!place}
          onClick={place ? () => onPlace(place.distance) : undefined}
          title={place ? `Place arrow • ${place.distance} ahead${place.wrapped ? " (wraps)" : ""}` : undefined}
        >
          {value ? (
            <span className="value">{value}</span>
          ) : place ? (
            <span className="dist">{place.distance}</span>
          ) : null}
        </button>,
      );
    }
  }

  return (
    <div className="board">
      <div
        className="field"
        style={{ gridTemplateColumns: `repeat(${width}, 1fr)`, ["--n" as string]: String(width) }}
        role="grid"
        aria-label="Gather board"
      >
        {cells}
        <Overlay state={state} anim={anim} width={width} />
      </div>
    </div>
  );
}

/** Absolutely-positioned animation layer: trail growth, number pops, the placed
 * arrow, and the moving token. Decorative — hidden from assistive tech. */
function Overlay({ state, anim, width }: { state: GameState; anim: MoveAnim | null; width: number }) {
  const pos = (x: number, y: number) => ({ transform: `translate(${x * 100}%, ${y * 100}%)` });

  const tokenCell = anim ? cellAtStep(anim, anim.stepIndex) : state.token;
  const hop = anim && anim.stepIndex > 0 ? isWrapHop(cellAtStep(anim, anim.stepIndex - 1), tokenCell) : false;
  const tokenGlyph = anim
    ? dirGlyph(anim.phase === "sliding" ? anim.headingBefore : anim.headingAfter)
    : dirGlyph(state.heading);

  // Cells already entered this slide (token covers the last one).
  const traveled = anim ? anim.path.slice(0, anim.stepIndex) : [];
  const pops = traveled.filter((c) => anim?.collected.has(c.index));

  return (
    <div className="overlay-layer" aria-hidden="true" style={{ ["--n" as string]: String(width) }}>
      {traveled.map((c) => (
        <div key={`t${c.index}`} className="ov ov-trail" style={pos(c.x, c.y)} />
      ))}
      {anim && (
        <div className="ov ov-arrow" style={pos(anim.arrowCell.x, anim.arrowCell.y)}>
          <span className={`ov-arrow-glyph${anim.phase === "consume" ? " consumed" : ""}`}>{anim.arrowGlyph}</span>
        </div>
      )}
      {pops.map((c) => (
        <div key={`p${c.index}`} className="ov ov-pop" style={pos(c.x, c.y)}>
          <span className="ov-pop-text">+{anim?.collected.get(c.index)}</span>
        </div>
      ))}
      <div
        className="ov ov-token"
        style={{
          transform: `translate(${tokenCell.x * 100}%, ${tokenCell.y * 100}%)`,
          transition: anim && !hop ? `transform ${anim.stepDur}ms linear` : "none",
        }}
      >
        <span className="ov-glyph">{tokenGlyph}</span>
      </div>
    </div>
  );
}
