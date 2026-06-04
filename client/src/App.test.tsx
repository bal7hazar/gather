import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { App } from "./App";

// Smoke test: the full component tree must render without throwing, and the
// initial "choosing" overlay must be present. Server rendering needs no DOM,
// so this runs in the same node environment as the logic tests.
describe("App", () => {
  it("renders the initial choosing state without crashing", () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain("Gather");
    expect(html).toContain("Pick a starting heading");
  });
});
