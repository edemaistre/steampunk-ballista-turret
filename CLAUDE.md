# Steampunk Ballista Turret

Read `README.md` first. It is the complete human and agent handoff, including history, architecture, mechanics, tests, deployment, preservation, and resume instructions.

Current state: version 0.2.3 is live at https://ballista-production.up.railway.app. The clean public source is on `main` at https://github.com/edemaistre/steampunk-ballista-turret. Historical reconstruction evidence remains outside this repository.

## Choose the correct project

Clean live release:

```text
/Users/emmanuel/Developer/Active-Pro/2026-08-05 Steampunk Ballista Turret
```

Full reconstruction history and `img2threejs` audit:

```text
/Users/emmanuel/Developer/pro/2026-08-05 Steampunk Ballista Turret/.worktrees/ballista-v2-refinement
```

Use the clean release for production maintenance. Use the historical project only for reconstruction evidence, the sculpt spec, v1, refinement history, or source snapshots.

## Product invariants

- Procedural Vite, TypeScript, and Three.js asset. No downloaded 3D model.
- Verified release: 245 meshes, 16,062 faces, 28 semantic nodes, 27 specified components, and 13 selectable systems.
- Yaw: -180° to +180°, centered at `0°`.
- Pitch: -20° to +20°, with `0°` horizontal and positive values raising the bolt.
- Reset restores camera, selection, yaw, pitch, and exploded view.
- Action cycle: `loaded -> firing -> unloaded -> cocking -> loaded`.
- Fire never rotates the crank, rear gear, or winch. Only Crank & Load operates the loading mechanism.
- Preserve the corrected bow sweep, aligned tip clamps, closed pod, floor-cleared chains, bilateral rivets, and no visible brass scope.
- Keep the empty `scope` semantic node unless the component contract is intentionally migrated.
- Preserve the exact cleaned reference card, full-screen modal, mobile controls, and local GLB download.

## Hard rules

- Never delete. Archive superseded material.
- Before overwriting a deliverable, create a dated local `versions/vN .../` snapshot and log it in `README.md`.
- Keep local `versions/` and `archive/` out of the public repository.
- Do not reintroduce historical crops, superseded references, stopped pipeline evidence, or reconstruction scaffolding into this clean repository.
- Preserve the current cleaned reference unless Emmanuel explicitly replaces it.
- In the historical project, preserve `.img2threejs/state.json` as stopped evidence. Authorized overrides did not turn the bounded pipeline into a pass.
- Preserve historical v1 and source snapshots v1 through v69.
- Treat hidden geometry as explicit approximation and keep the model procedural unless Emmanuel changes direction.
- Update README, CHANGELOG, BUGS, ROADMAP, CLAUDE, `llms.txt`, and `llms-full.txt` with behavior changes.
- Save visual evidence only under `/Users/emmanuel/Developer/scratch/playwright-screenshots/` and inspect desktop dark mode plus mobile before delivery.
- Batch work into one push and one Railway deployment per task.
- Never use em dashes in project copy or documentation.

## Required verification

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Expected baseline: 10 Vitest files, 36 unit tests, one production build, and three Playwright journeys. Shared GitHub runners use software WebGL, so preserve the extended Playwright time budgets.

Do not push if any required test fails. For visual changes, inspect the actual screenshots, not only the command result.

## Deployment rules

- GitHub `main` is the public source of truth.
- Railway uses Railpack, `npm run build`, `npm run start`, and healthchecks `/`.
- The app has no database, API key, or runtime secret.
- Railway watch paths include only production-relevant runtime and configuration files.
- Documentation, test, and CI-only commits should be `SKIPPED`, not trigger a production deployment.
- Roll back through Railway deployment history. Never rewrite Git history.

High-value code paths and troubleshooting routes are documented in `README.md`.

CTO handoff: generate `output/pdf/steampunk-ballista-cto-brief.pdf` with `python3 scripts/build_cto_brief.py`. Render and inspect the single page before replacing it.

**Resume this work:** `claude --resume 019fcece-c58b-72b0-8941-5e6524eaaa41` (2026-08-05)
