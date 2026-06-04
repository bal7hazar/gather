import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { clearRun, createGame } from "../game";
import type { MoveAnim } from "../anim";
import { Board } from "./Board";

const noop = () => {};

describe("Board", () => {
  it("renders the idle board with the token at its heading", () => {
    const state = createGame(1, 1); // heading East
    const html = renderToStaticMarkup(<Board state={state} anim={null} onPlace={noop} />);
    expect(html).toContain("ov-token");
    expect(html).toContain("→"); // East glyph
  });

  it("renders the move overlay: trail behind the token and the placed arrow", () => {
    const state = createGame(1, 1);
    const path = clearRun(state).slice(0, 3);
    const anim: MoveAnim = {
      path,
      startCell: { ...state.token },
      arrowCell: { x: path[2].x, y: path[2].y },
      arrowGlyph: "↑",
      headingBefore: 1,
      headingAfter: 0,
      collected: new Map(),
      toState: state,
      stepDur: 80,
      stepIndex: 2, // two cells already traveled
      phase: "sliding",
    };
    const html = renderToStaticMarkup(<Board state={state} anim={anim} onPlace={noop} />);
    expect(html).toContain("ov-arrow");
    expect(html).toContain("↑");
    // Two traveled cells → two trail overlays.
    expect((html.match(/ov-trail/g) ?? []).length).toBe(2);
  });
});
