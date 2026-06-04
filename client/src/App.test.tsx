import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { App } from "./App";

// Smoke test: the full component tree must render without throwing, starting
// directly in the playing state (token heading North). Server rendering needs no
// DOM, so this runs in the same node environment as the logic tests.
describe("App", () => {
  it("renders the initial playing state without crashing", () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain("Gather");
    expect(html).toContain("ov-token"); // the token is on the board
    expect(html).toContain("↑"); // heading North
  });
});
