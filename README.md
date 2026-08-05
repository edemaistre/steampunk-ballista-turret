# Steampunk Ballista Turret

**Public site:** https://ballista-production.up.railway.app

**Resume this work:** `claude --resume 019fcece-c58b-72b0-8941-5e6524eaaa41` (2026-08-05)

## Purpose

This is the clean public edition of Emmanuel de Maistre's interactive steampunk ballista. It turns one supplied reference image into a procedural, animation-ready Three.js asset that runs entirely in the browser.

The earlier reconstruction iterations remain archived locally. This repository intentionally contains only the final edition, its current reference, source code, tests, deployment configuration, and useful documentation.

## Experience

- Orbit, zoom, and inspect 13 selectable mechanical systems.
- Aim across -180° to +180° yaw and -20° to +20° pitch.
- Fire the loaded bolt, then operate the separate crank-and-load cycle.
- Reset camera, selection, yaw, pitch, and exploded view.
- Switch between dark and light presentation modes.
- Open the cleaned original reference in a full-screen modal.
- Download the procedural assembly as a binary GLB.
- Use the complete control surface on desktop and mobile.

## Model

- 245 physical mesh instances.
- 16,062 triangle faces.
- 28 semantic sculpt nodes and 13 selectable systems.
- Four named sockets plus collider and destruction metadata.
- Procedural geometry and materials, with no downloaded 3D model.

Hidden rear, underside, and internal geometry are informed approximations because the source provides one three-quarter view.

## Run locally

Requirements: Node.js 22 or newer and npm 10 or newer.

```bash
npm install
npm run dev
```

## Verify

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

The browser suite saves visual evidence under `/Users/emmanuel/Developer/scratch/playwright-screenshots/` by default. Other environments can set `BALLISTA_SCREENSHOT_ROOT`.

## Deployment

The public repository is `https://github.com/edemaistre/steampunk-ballista-turret`.

Railway builds the Vite application with `npm run build`, serves `dist/` through `serve`, checks `/` before switching traffic, and redeploys from `main`. GitHub Actions independently runs typecheck, 36 unit tests, the production build, and three Playwright journeys.

Railway watch paths limit production builds to runtime, asset, package, TypeScript, Vite, and Railway configuration changes. Documentation and CI-only commits therefore do not consume a production deployment.

Rollback uses Railway's deployment history. Select the last healthy deployment and redeploy it without rewriting Git history.

## Key files

- `src/model/`: procedural geometry, materials, components, statistics, and runtime metadata.
- `src/interaction/`: firing, loading, aiming, and exploded-view state.
- `src/scene/`: Three.js scene, camera, lighting, selection, and responsive framing.
- `src/ui/`: the accessible control surface, source viewer, and GLB action.
- `src/export/`: metadata-safe GLB export.
- `reference/`: the final cleaned source image.
- `tests/`: Vitest regression suite.
- `e2e/`: Playwright desktop, mobile, interaction, and visual journeys.
- `.github/workflows/ci.yml`: GitHub verification pipeline.
- `railway.toml`: Railway build, start, health, and restart policy.

## Version history

- `2026-08-05`: initial clean public release. Historical reconstruction iterations remain preserved in the original local source project.
- `2026-08-05 Pre CI Fix`: local-only snapshot created before correcting the GitHub Actions temporary screenshot path.
- `2026-08-05 Pre CI Timeout Fix`: local-only snapshot created before adapting screenshot-heavy test time budgets for shared runners.

## Truth boundary

This is a stylized procedural reconstruction, not photogrammetry or exact hidden-geometry recovery. Projectile travel is a deterministic visual animation, not a rigid-body simulation. The downloaded GLB omits unsupported generated roughness textures but retains generated color maps and scalar material response.
