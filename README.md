# Gather

A solo, score-chasing **spatial number game** on a wrap-around grid. A token snakes
across a 15×15 torus, leaving a trail it can never re-cross. Each turn you're dealt a
forced turn-direction and choose *where* to apply it — routing through numbers to
collect them while avoiding trapping yourself.

Full-client prototype: no backend, no smart contract. All randomness comes from a
seedable RNG so runs are reproducible. See [`CONTEXT.md`](./CONTEXT.md) for the full
design spec.

## Stack

- **React + Vite + TypeScript** (`client/`)
- **pnpm** workspaces + **Turbo** task orchestration (repo root)
- **Vitest** for the pure game-logic unit tests
- Deployed to **GitHub Pages** via GitHub Actions

## Develop

```bash
pnpm install        # install workspace deps
pnpm dev            # run the client (Vite dev server)
pnpm test           # run unit tests
pnpm typecheck      # type-check
pnpm lint           # lint
pnpm build          # production build → client/dist
```

All commands run through Turbo from the repo root.

## Architecture

The game logic in [`client/src/game`](./client/src/game) is **pure and isolated** — a
seedable RNG plus a reducer (`createGame` → `setHeading` → `placeArrow`) handling
placement legality, slide-until-arrow advance with torus wrap, collection + respawn,
self-collision, and scoring. It has no DOM/React dependency, so it is straightforward
to unit-test and to port to an on-chain/Dojo context later. The React UI is a thin
view over that state.

## Deployment

Pushing to `main` triggers [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml),
which builds the client and publishes `client/dist` to GitHub Pages. The workflow
enables Pages automatically (source: *GitHub Actions*) on first run — no manual repo
configuration or `gh` CLI needed.

The site is served at `https://<user>.github.io/gather/`; Vite's `base` is set to
`/gather/` for production builds accordingly.
