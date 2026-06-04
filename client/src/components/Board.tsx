import { useMemo } from "react";
import { type GameState, clearRun, idx } from "../game";
import { dirGlyph } from "../ui";
import "./Board.css";

interface BoardProps {
  state: GameState;
  onPlace: (distance: number) => void;
}

export function Board({ state, onPlace }: BoardProps) {
  const { width, height } = state;

  // index → { distance, wrapped } for every legal arrow placement this turn.
  const placements = useMemo(() => {
    const map = new Map<number, { distance: number; wrapped: boolean }>();
    if (state.status === "playing") {
      for (const c of clearRun(state)) map.set(c.index, { distance: c.distance, wrapped: c.wrapped });
    }
    return map;
  }, [state]);

  const numberAt = useMemo(() => {
    const map = new Map<number, number>();
    for (const n of state.numbers) map.set(idx(n.x, n.y), n.value);
    return map;
  }, [state.numbers]);

  const tokenIndex = idx(state.token.x, state.token.y);

  const cells = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = idx(x, y);
      const isToken = i === tokenIndex;
      const isTrail = state.used[i] && !isToken;
      const value = numberAt.get(i);
      const place = placements.get(i);

      const classes = ["cell"];
      if (isTrail) classes.push("trail");
      if (isToken) classes.push("token");
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
          {isToken ? (
            <span className="glyph">{state.heading != null ? dirGlyph(state.heading) : "•"}</span>
          ) : value ? (
            <span className="value">{value}</span>
          ) : place ? (
            <span className="dist">{place.distance}</span>
          ) : null}
        </button>,
      );
    }
  }

  return (
    <div
      className="board"
      style={{ gridTemplateColumns: `repeat(${width}, 1fr)` }}
      role="grid"
      aria-label="Gather board"
    >
      {cells}
    </div>
  );
}
