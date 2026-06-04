import { useCallback, useState } from "react";
import {
  type Dir,
  type GameState,
  createGame,
  placeArrow,
  setHeading,
} from "./game";
import { Board } from "./components/Board";
import { dirGlyph, previewGlyphs, turnLabel } from "./ui";
import "./App.css";

const randomSeed = () => Math.floor(Math.random() * 1_000_000_000);

export function App() {
  const [state, setState] = useState<GameState>(() => createGame(randomSeed()));

  const newGame = useCallback(() => setState(createGame(randomSeed())), []);
  const choose = useCallback((dir: Dir) => setState((s) => setHeading(s, dir)), []);
  const place = useCallback((distance: number) => setState((s) => placeArrow(s, distance)), []);

  return (
    <main className="app">
      <header className="app-header">
        <div className="title">
          <h1>Gather</h1>
          <p className="subtitle">route through numbers · don&apos;t cross your trail</p>
        </div>
        <Hud state={state} onNewGame={newGame} />
      </header>

      <section className="stage">
        <div className="board-wrap">
          <Board state={state} onPlace={place} />
          {state.status === "choosing" && <HeadingChooser onChoose={choose} />}
          {state.status === "over" && <GameOver state={state} onNewGame={newGame} />}
        </div>

        <aside className="side">
          {state.heading != null && <Preview state={state} />}
          <Rules />
        </aside>
      </section>
    </main>
  );
}

function Hud({ state, onNewGame }: { state: GameState; onNewGame: () => void }) {
  return (
    <div className="hud">
      <Stat label="score" value={state.score} primary />
      <Stat label="collected" value={state.collected} />
      <Stat label="steps" value={state.steps} />
      <div className="hud-actions">
        <span className="seed">seed {state.seed}</span>
        <button type="button" onClick={onNewGame}>
          New game
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, primary }: { label: string; value: number; primary?: boolean }) {
  return (
    <div className={`stat${primary ? " primary" : ""}`}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function HeadingChooser({ onChoose }: { onChoose: (dir: Dir) => void }) {
  const dirs: { dir: Dir; pos: string }[] = [
    { dir: 0, pos: "n" },
    { dir: 1, pos: "e" },
    { dir: 2, pos: "s" },
    { dir: 3, pos: "w" },
  ];
  return (
    <div className="overlay">
      <div className="overlay-card">
        <h2>Pick a starting heading</h2>
        <div className="dpad">
          {dirs.map(({ dir, pos }) => (
            <button key={dir} type="button" className={`dpad-btn ${pos}`} onClick={() => onChoose(dir)}>
              {dirGlyph(dir)}
            </button>
          ))}
          <span className="dpad-center">•</span>
        </div>
      </div>
    </div>
  );
}

function GameOver({ state, onNewGame }: { state: GameState; onNewGame: () => void }) {
  return (
    <div className="overlay">
      <div className="overlay-card">
        <h2>Boxed in</h2>
        <p className="final">
          final score <strong>{state.score}</strong>
        </p>
        <p className="final-detail">
          {state.collected} collected − {state.steps} steps
        </p>
        <button type="button" onClick={onNewGame}>
          New game
        </button>
      </div>
    </div>
  );
}

function Preview({ state }: { state: GameState }) {
  const heading = state.heading as Dir;
  const { current, next } = previewGlyphs(heading, state.arrows);
  return (
    <div className="preview">
      <h3>Arrows</h3>
      <div className="arrows">
        <div className="arrow current">
          <span className="arrow-glyph">{current}</span>
          <span className="arrow-meta">
            <span className="arrow-tag">now</span>
            <span className="arrow-turn">{turnLabel(state.arrows[0])}</span>
          </span>
        </div>
        <div className="arrow next">
          <span className="arrow-glyph">{next}</span>
          <span className="arrow-meta">
            <span className="arrow-tag">next</span>
            <span className="arrow-turn">{turnLabel(state.arrows[1])}</span>
          </span>
        </div>
      </div>
      <p className="preview-hint">
        Click a highlighted cell ahead to place the <em>now</em> arrow — the token slides
        there, then turns.
      </p>
    </div>
  );
}

function Rules() {
  return (
    <details className="rules">
      <summary>How to play</summary>
      <ul>
        <li>The grid wraps: leaving one edge re-enters the opposite side.</li>
        <li>Every cell you enter becomes trail you can never re-cross.</li>
        <li>Each turn you&apos;re dealt a forced turn — you choose how far ahead to place it.</li>
        <li>
          Numbers add their value; each step costs 1. Skip the 1s, route onto 2s and 3s.
        </li>
        <li>Dashed cells are reachable only by wrapping across an edge.</li>
        <li>You lose when you trap yourself with no free cell ahead.</li>
      </ul>
    </details>
  );
}
