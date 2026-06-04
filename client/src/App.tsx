import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import {
  type Dir,
  type GameState,
  type Turn,
  clearRun,
  createGame,
  idx,
  placeArrow,
  setHeading,
} from "./game";
import { type MoveAnim } from "./anim";
import { Board } from "./components/Board";
import { dirGlyph, previewGlyphs, turnLabel } from "./ui";
import "./App.css";

const randomSeed = () => Math.floor(Math.random() * 1_000_000_000);

// Animation timings (ms).
const PLACE_PAUSE = 170; // beat so the placed arrow registers before the token moves
const CONSUME_MS = 200; // arrow-consume + token turn before committing

export function App() {
  const [state, setState] = useState<GameState>(() => createGame(randomSeed()));
  const [anim, setAnim] = useState<MoveAnim | null>(null);
  // Increments on each committed move — stable identity for the preview queue.
  const [turnIndex, setTurnIndex] = useState(0);

  const newGame = useCallback(() => {
    setAnim(null);
    setTurnIndex(0);
    setState(createGame(randomSeed()));
  }, []);

  const choose = useCallback((dir: Dir) => setState((s) => setHeading(s, dir)), []);

  const place = useCallback(
    (distance: number) => {
      if (anim || state.status !== "playing" || state.heading == null) return;
      const run = clearRun(state);
      if (distance < 1 || distance > run.length) return;

      const path = run.slice(0, distance);
      const toState = placeArrow(state, distance);
      const collected = new Map<number, number>();
      for (const n of state.numbers) {
        const i = idx(n.x, n.y);
        if (path.some((c) => c.index === i)) collected.set(i, n.value);
      }
      const headingAfter = toState.heading as Dir;
      const last = path[path.length - 1];

      setAnim({
        path,
        startCell: { ...state.token },
        arrowCell: { x: last.x, y: last.y },
        arrowGlyph: dirGlyph(headingAfter),
        headingBefore: state.heading,
        headingAfter,
        collected,
        toState,
        stepDur: Math.max(45, Math.min(100, Math.round(700 / path.length))),
        stepIndex: 0,
        phase: "sliding",
      });
    },
    [anim, state],
  );

  // Drives the animation: slide cell by cell, consume the arrow, then commit.
  useEffect(() => {
    if (!anim) return;
    let timer: number;
    if (anim.stepIndex < anim.path.length) {
      const delay = anim.stepIndex === 0 ? PLACE_PAUSE : anim.stepDur;
      timer = window.setTimeout(() => setAnim((a) => (a ? { ...a, stepIndex: a.stepIndex + 1 } : a)), delay);
    } else if (anim.phase === "sliding") {
      timer = window.setTimeout(() => setAnim((a) => (a ? { ...a, phase: "consume" } : a)), anim.stepDur);
    } else {
      timer = window.setTimeout(() => {
        setState(anim.toState);
        setTurnIndex((i) => i + 1);
        setAnim(null);
      }, CONSUME_MS);
    }
    return () => window.clearTimeout(timer);
  }, [anim]);

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
          <Board state={state} anim={anim} onPlace={place} />
          {state.status === "choosing" && <HeadingChooser onChoose={choose} />}
          {state.status === "over" && !anim && <GameOver state={state} onNewGame={newGame} />}
        </div>

        <aside className="side">
          {state.heading != null && <Preview state={state} turnIndex={turnIndex} />}
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
          {state.collected} gathered over {state.steps} steps
        </p>
        <button type="button" onClick={onNewGame}>
          New game
        </button>
      </div>
    </div>
  );
}

interface ArrowItem {
  id: number;
  glyph: string;
  turn: Turn;
}

function Preview({ state, turnIndex }: { state: GameState; turnIndex: number }) {
  const heading = state.heading as Dir;
  const { current, next } = previewGlyphs(heading, state.arrows);
  const items: ArrowItem[] = [
    { id: turnIndex, glyph: current, turn: state.arrows[0] },
    { id: turnIndex + 1, glyph: next, turn: state.arrows[1] },
  ];
  return (
    <div className="preview">
      <h3>Arrows</h3>
      <PreviewQueue items={items} />
      <p className="preview-hint">
        Click a highlighted cell ahead to place the <em>now</em> arrow — the token slides
        there, then turns.
      </p>
    </div>
  );
}

type QueuedArrow = ArrowItem & { slot: number; leaving: boolean };

/** Animates the two-arrow preview: on each move the "now" arrow slides out (consumed),
 * "next" slides into the "now" slot, and a freshly dealt arrow fades in. */
function PreviewQueue({ items }: { items: ArrowItem[] }) {
  const [shown, setShown] = useState<QueuedArrow[]>(() =>
    items.map((it, i) => ({ ...it, slot: i, leaving: false })),
  );
  const lastIds = useRef(items.map((i) => i.id).join(","));

  useEffect(() => {
    const ids = items.map((i) => i.id).join(",");
    if (ids === lastIds.current) return;
    lastIds.current = ids;
    const present = new Set(items.map((i) => i.id));
    setShown((curr) => {
      const leaving = curr
        .filter((c) => !present.has(c.id) && !c.leaving)
        .map((c) => ({ ...c, slot: -1, leaving: true }));
      const stillLeaving = curr.filter((c) => c.leaving && !present.has(c.id));
      const incoming = items.map((it, i) => ({ ...it, slot: i, leaving: false }));
      return [...stillLeaving, ...leaving, ...incoming];
    });
  }, [items]);

  const prune = (id: number) =>
    setShown((curr) => curr.filter((c) => !(c.leaving && c.id === id)));

  return (
    <div className="pv-track">
      {shown.map((it) => (
        <div
          key={it.id}
          className={`pv-card${it.slot === 0 ? " now" : ""}${it.leaving ? " out" : ""}`}
          style={{ "--slot": it.slot } as CSSProperties}
          onTransitionEnd={it.leaving ? () => prune(it.id) : undefined}
          aria-hidden={it.leaving}
        >
          <span className="pv-glyph">{it.glyph}</span>
          <span className="pv-meta">
            <span className="pv-tag">{it.slot === 0 ? "now" : it.slot === 1 ? "next" : ""}</span>
            <span className="pv-turn">{turnLabel(it.turn)}</span>
          </span>
        </div>
      ))}
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
        <li>Each number adds its value to your score — gather as many as you can.</li>
        <li>Dashed cells are reachable only by wrapping across an edge.</li>
        <li>You lose when you trap yourself with no free cell ahead.</li>
      </ul>
    </details>
  );
}
