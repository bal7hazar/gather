# Gather — Project Context

> Context document for coding agents. Read this fully before working on the repo.
> Written in English to match agent-tooling conventions; the product owner (bal7hazar) communicates in French — ask if a French version is preferred.

## 1. What we are building

A **full-client** (no backend, no smart contract) **solo, score-chasing** spatial number game called **Gather**, as a playable web prototype.

- **Scope of this phase:** single-player, client-only. All randomness (forced turn directions + number spawns) is generated client-side with a seedable RNG. No on-chain logic, server, or persistence yet.
- **One-line pitch:** a token snakes across a wrap-around grid, leaving a trail it can never cross again; each turn you're dealt a forced turn-direction and you choose *where* to apply it, routing through numbers to collect them. You lose when you trap yourself in your own trail.
- **Part of a wider suite:** Gather belongs to a planned family of small, hypercasual, fully-on-chain number-themed games (alongside Nums, Rumm, and the Gauge / Skyjo Solo prototypes). This phase is a client-first prototype; logic is kept pure so it can later be ported to an on-chain/Dojo context.
- **Eventual competitive frame** (out of scope here): a run's score is meant to be compared against the **average** of all runs. For now we only produce a single-run score.

## 2. Why this design (filters it satisfies)

The suite is designed against three filters. Gather is a **reframe of an earlier failed idea** (a static "collect numbers on a grid" puzzle, which was a full-information routing/TSP problem → trivially solver-friendly → bot-food). Three changes fixed it; keep them, they are load-bearing:

| Mechanic | What it fixes |
|---|---|
| Numbers spawn online (5 on board, respawn on pickup) | removes the static map → **online uncertainty** |
| Each turn's turn-direction is dealt by RNG | you can't precompute the path → **kills the solver edge**, injects **luck** |
| Trail can't be re-crossed; loss = self-collision | the loss becomes **self-inflicted** → fair, and brings the "paint yourself into a corner" dynamic |

Filter profile (honest):
1. **Fair** ✓ — loss is **self-inflicted** (you box yourself). Guaranteed by: torus (no edge deaths), **no 180° reversal**, and the player choosing segment length + a 2-move preview. No "dead on arrival" generation.
2. **Luck-dominated** ~ — the dealt turn-directions and spawn positions inject luck; tune how much.
3. **Anti-bot** ~+ — avoiding self-entrapment has **no reliable greedy** (heading straight for the nearest number traps you); it rewards **spatial gestalt** foresight, a human strength. The forced turns specifically deny the classic Snake "safe Hamiltonian cycle" exploit. **Not bot-proof** (Snake-style AIs are strong) — accepted.

**Accepted tradeoffs:**
- This is more a **spatial** game than a pure number game (numbers are pickups), like the suite's "Trail" idea — slightly looser suite-coherence, in exchange for the best anti-bot profile of the bunch.
- The **torus** geometry was chosen for clean fairness (all deaths are self-collisions). Note the downside: toroidal space disorients humans while a bot does the modular wrap trivially — it mildly favors the bot. Accepted by the product owner.

## 3. Core mechanic

- **Grid:** **15×15** with **wrap-around (torus)**: there are no walls. A token leaving the top re-enters the bottom on the same column with the same heading; likewise left/right. Exiting one side = entering the opposite side.
- **Token:** starts at the **center** cell, score 0, with a **fixed initial heading (North)**.
- **Trail:** every cell the token enters becomes **used** (blocked) forever. The token may **never enter a used cell** — doing so (or being unable to make any legal move) ends the game. This self-collision is the **only** loss condition (the torus removes wall deaths).
- **Numbers (pickups):** **5** are visible at any time, on free (unused, unoccupied) cells. Collecting one (the token enters its cell) immediately **spawns a new one** on a random free cell. Values follow a weighted distribution preserving the original 20:10:5 ratio → **P(1)=4/7, P(2)=2/7, P(3)=1/7** (v1, tunable).
- **Arrows (the dealt resource):** each turn the RNG deals a **turn-direction** for an arrow. Allowed directions = the current heading's **straight, left, or right** — the **180° reversal is forbidden**. The player places this arrow on a free cell ahead of the token (see Turn structure).
- **Preview:** the player always sees **2 arrows** — the one to place **this** turn and the one coming **next** turn — to plan two segments ahead.

## 4. Turn structure

Start: token at center, score 0, heading fixed to North. 5 numbers are seeded. The first 2 arrows are revealed.

Each turn:
1. The current arrow's forced direction `D` is known (and the next one is previewed).
2. The player **places the arrow** on a free cell that lies on the token's current heading line, within the **clear run ahead** (the contiguous unused cells in front of the token before it would hit its own trail). Placement distance = the player's main lever.
3. The token **advances** from its position along its current heading, cell by cell — marking each as used and **collecting any number** it enters (which respawns elsewhere) — **until it reaches the placed arrow**, where it **turns to `D`**. That becomes the new heading; the turn ends with the token on the arrow cell.
   - Wrap applies during the advance: the heading line continues across the grid edge.
   - If, before reaching the arrow, the next cell in the heading is already **used** → **game over** (self-collision).
   - If the token cannot legally advance/turn at all (boxed in) → **game over**.
4. The previewed arrow becomes the current arrow; a new arrow is dealt into the preview slot.

There is **no win state**: endless survival until self-collision.

## 5. Scoring

- **Score = sum of collected number values.** Cells traveled are **not** deducted (the step count is tracked for info only).
- Every pickup is pure upside: a `1` adds 1, a `2` adds 2, a `3` adds 3; empty steps are free. There is no "break-even" penalty for routing through low numbers.
- The core skill is **surviving as long as possible while sweeping up numbers** without trapping yourself in your own trail. (The earlier value-per-distance "skip the low numbers" framing was dropped — see decision in Section 7.)
- The run ends at self-collision; the final score is the running total at that point. Higher is better. (Later: a run "wins" if it beats the average — not implemented here.)

## 6. Concrete v1 parameters (difficulty / tuning knobs — set by playtest)

| Parameter | v1 value | Effect |
|---|---|---|
| Grid | 15×15 torus | smaller = traps you faster |
| Visible numbers | 5 | fewer = scarcer targets |
| Value distribution | 4:2:1 → P(1,2,3)=4/7,2/7,1/7 | richer = higher ceiling |
| Arrow directions dealt | {straight, left, right} (no 180°) | excluding "straight" too would force constant turns = harder |
| Preview | 2 arrows (current + next) | longer preview = easier but **leaks future to the bot** — keep short |
| Step cost in score | none (score = collected values only) | re-add a per-cell cost to punish wandering |

## 7. Rules decisions & open questions

### Decided (v1)
- **Torus / wrap-around** (no walls); self-collision is the only loss.
- **No 180° reversal** in dealt directions (prevents instant unavoidable death → keeps loss self-inflicted).
- **2-move preview** (current + next).
- **Slide-until-arrow** movement: the token advances along its heading until the placed arrow, then turns.
- **Numbers respawn** indefinitely (no fixed pool); self-collision, not number exhaustion, ends the game.
- **Score = collected values only** (no step deduction). Cells traveled are tracked but do not subtract from the score.
- **Initial heading is fixed to North** (no start-of-run heading choice).

### Open (confirm)
1. **Dealt direction set:** assumed `{straight, left, right}`. Alternative: only `{left, right}` (a turn is mandatory every move → tighter, harder). Confirm.
2. **Value distribution** exact weights (4:2:1 assumed) and whether it should drift over a run.
3. **Spawn rule:** new numbers appear only on free (unused, unoccupied) cells, uniformly. Confirm; consider avoiding spawning right in the token's immediate path.

## 8. Tech direction (proposed — confirm)

- **Full client**, web. Proposed stack: **React + Vite + TypeScript** (consistent with the owner's other repos), client-side **seedable** RNG (for reproducible runs/tests). No backend/contract.
- Keep game logic **pure and isolated** (an RNG/deal module + a game-state reducer handling placement legality, advance/wrap, collection, respawn, self-collision, scoring) so it is easy to unit-test and portable to an on-chain/Dojo context.
- Suggested first slices: (1) seedable deal + spawn module with tests; (2) pure reducer (advance with wrap, trail/used-set, collection+respawn, self-collision, scoring) with tests; (3) minimal React UI.

### Visual direction (hard requirement)
- **Pure number / clean-grid aesthetic**, consistent with the suite. **No card metaphor.**
- Show: the **15×15 grid**, the token, its **trail** (used cells clearly marked), the **5 numbers** as plain numeric tiles, the **current + next arrow** (the preview), and the running **score**.
- Make the **wrap** legible (the hardest UX part): the player must be able to anticipate a segment that crosses an edge and reappears opposite — e.g. edge indicators / ghosting of the wrapped continuation.
- Make the **clear run ahead** and the **placement choice** obvious (highlight valid arrow cells along the heading line).
- The player only ever sees **numbers, a grid, a trail, arrows, and the score** — nothing card-like.

## 9. Status

- Initial spec. **No code yet.** Core rules are **locked** (Section 7 → "Decided"); only the Section 7 "Open" points and v1 tuning remain.
- Next step: confirm the proposed tech stack (Section 8) and the open points, then scaffold (deal/spawn module → pure reducer → minimal React UI), each slice with tests, and playtest to tune the ~50% difficulty.
