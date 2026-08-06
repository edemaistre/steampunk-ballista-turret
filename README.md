# Steampunk Ballista Turret

| Item | Value |
|---|---|
| Live site | https://ballista-production.up.railway.app |
| Public repository | https://github.com/edemaistre/steampunk-ballista-turret |
| Release | 0.2.3 |
| Status | Live, verified, and maintained from `main` |

**Resume this work:** `claude --resume 019fcece-c58b-72b0-8941-5e6524eaaa41` (2026-08-05)

## Read this first

This is the clean public release of Emmanuel de Maistre's interactive steampunk ballista. It turns one supplied concept image into a procedural, animation-ready Three.js asset that runs entirely in the browser.

The object is built from TypeScript geometry and materials. It is not a downloaded 3D model, photogrammetry result, or exact recovery of hidden geometry. The reference image defines the visible art direction. Rear, underside, occluded, and internal structures are informed approximations.

The public repository contains only the final release. The complete reconstruction history, `img2threejs` evidence, v1 implementation, refinement branches, and 69 source snapshots remain preserved in the original local project.

## Why this exists

Emmanuel supplied a stylized low-poly render of a steampunk ballista turret and explicitly asked to use the `img2threejs` workflow to turn it into a standalone Vite and Three.js browser demo.

The product goal expanded beyond a static reconstruction. The final experience needed to feel like a real game-asset inspection tool:

- A volumetric model that can be orbited and inspected from any side.
- Semantically selectable mechanical systems.
- Correct aiming controls and a complete camera reset.
- A firing action that does not incorrectly turn the loading crank.
- A separate, explicit crank-and-load cycle.
- An exploded view for reading the assembly.
- A cleaned reference viewer and full-screen modal.
- A local binary GLB download.
- A polished desktop and mobile interface.
- A public GitHub repository and live Railway deployment.

## What was delivered

### Interactive experience

- Drag to orbit and scroll to zoom.
- Click a visible component to inspect one of 13 semantic systems.
- Aim from -180° to +180° yaw.
- Adjust pitch from -20° to +20°, with `0°` meaning a horizontal bolt.
- Separate the assembly with exploded view.
- Fire a loaded bolt with string release, limb flex, projectile travel, trail, and carriage recoil.
- Leave the machine visibly unloaded after firing.
- Operate **Crank & Load** to rotate the crank, rear gear, and winch, draw the string, and seat a replacement bolt.
- Reset camera, selection, yaw, pitch, and exploded view to zero.
- Switch between dark and light modes.
- Reveal the exact cleaned reference image and open it full screen.
- Download `steampunk-ballista-turret.glb` directly in the browser.
- Use the complete control surface on desktop and at 390 px mobile width.

### Procedural model

- 245 physical mesh instances.
- 16,062 triangle faces.
- 28 semantic runtime nodes.
- 27 specified component nodes plus the root.
- 13 selectable systems.
- Four named sockets: yaw bearing, weapon trunnion, bolt rail, and winch axle.
- Collider descriptors and destruction-group metadata for every component.
- Deterministic code-built geometry and materials.
- No third-party model asset and no runtime API dependency.

### Public delivery

- Clean release folder under `Developer/Active-Pro/`.
- Public GitHub repository on `main`.
- Railway production deployment with healthcheck and restart policy.
- GitHub Actions typecheck, unit tests, production build, Playwright, and retained browser evidence.
- Railway watch paths that skip deployments for documentation, tests, and CI-only commits.

## How the project evolved

| Phase | Work completed |
|---|---|
| Reference intake | Analyzed the supplied image, authored a 27-component sculpt specification, recorded material evidence, and created quality gates. |
| Bounded `img2threejs` loop | Ran three blockout correction loops. The skill correctly stopped at its correction limit. Emmanuel explicitly authorized `override`, and the stopped state was preserved as honest evidence. |
| Manual production pass | Rebuilt the model as modular procedural TypeScript geometry with materials, hierarchy, sockets, colliders, and selection metadata. |
| V2 mechanics | Preserved all v1 files, corrected the inverted bow sweep, aligned the black end clamps, closed the pod underside, rebuilt chains, improved the rear drive, and separated firing from loading. |
| Control polish | Replaced ambiguous elevation wording with pitch, centered pitch at horizontal, set symmetric pitch and full yaw ranges, and made Reset restore every view control. |
| Detail cleanup | Added bilateral exterior rivets, cleared chains from the pod floor, removed the incompatible visible brass scope, and retained its empty semantic node for contract compatibility. |
| Product interface | Unified utility buttons, added icons, model statistics, source-image card, full-screen modal, responsive layout, and browser GLB export. |
| Final source | Replaced the displayed reference with Emmanuel's cleaned 1254 by 1254 PNG while retaining the earlier source and its evidence in the historical project. |
| Publication | Created a clean public repository, deployed once to Railway, fixed CI validation and software-WebGL time budgets, then verified production on desktop and mobile. |

## Mechanical behavior

The action controller deliberately models firing and loading as two different user decisions:

```text
loaded
  -> Fire
firing
  -> animation completes
unloaded
  -> Crank & Load
cocking
  -> animation completes
loaded
```

During **Fire**, the crank, rear gear, and winch remain stationary. During **Crank & Load**, those mechanisms rotate and pull the string before a replacement bolt becomes available. This separation was a core mechanical correction requested by Emmanuel.

The model hierarchy uses real yaw and pitch pivots. Positive pitch raises the bolt. Reset returns both pivots, exploded view, camera, and selection to their initial values.

## Visual and structural corrections

The final release incorporates the specific review feedback from the iteration thread:

- The white bow limbs sweep rearward from their mechanical roots.
- Black bow-tip clamps are centered on the white endpoints and follow the terminal limb direction.
- The armored pod overlaps the turntable collar and has a skirt, floor, closures, and internal support.
- Hanging chain links remain visibly separate and clear the pod floor.
- Black exterior rivets appear on both armor faces.
- The incompatible brass scope is no longer visible or intersecting the bow.
- The cleaned source image matches the final no-scope presentation.
- Model statistics sit inside the field-unit identity plate.
- The identity plate and image card share a complete outlined contour.
- Utility actions use a consistent icon-plus-label format: Reset, Light, Image, and GLB.

## Runtime architecture

```text
src/main.ts
  -> creates the procedural model
  -> creates the Three.js scene and responsive camera
  -> creates the controller and control panel
  -> exposes the runtime as window.__BALLISTA__ for tests and inspection

src/model/
  -> geometry primitives and materials
  -> base, turret, and weapon component builders
  -> semantic spec, runtime types, and live statistics

src/interaction/
  -> yaw, pitch, exploded view
  -> loaded, firing, unloaded, and cocking state machine

src/scene/
  -> renderer, camera, lights, shadows, OrbitControls
  -> raycast selection and responsive framing

src/ui/
  -> accessible controls, readouts, identity plate
  -> reference card, modal, theme, and utility actions

src/export/
  -> metadata-safe binary GLB export
```

### Key paths

- `src/model/createSteampunkBallistaModel.ts`: top-level assembly builder.
- `src/model/components/`: base, turret, weapon, and shared procedural parts.
- `src/model/spec.ts`: semantic component and selection contract.
- `src/model/statistics.ts`: authored mesh and face counts shown in the UI.
- `src/interaction/BallistaController.ts`: aiming, explode, firing, loading, and reset behavior.
- `src/scene/createScene.ts`: renderer, camera, lighting, selection, and mobile framing.
- `src/ui/createControlPanel.ts`: interface, reference viewer, and action wiring.
- `src/export/exportBallistaGlb.ts`: local GLB generation.
- `reference/ballista-reference.png`: exact cleaned image shown by the app.
- `tests/`: 36 Vitest regression tests across 10 files.
- `e2e/ballista.spec.ts`: three Playwright interaction and visual journeys.
- `.github/workflows/ci.yml`: public CI pipeline.
- `railway.toml`: Railpack build, start, healthcheck, and restart configuration.
- `scripts/build_cto_brief.py`: reproducible ReportLab generator for the CTO one-pager.
- `output/pdf/steampunk-ballista-cto-brief.pdf`: shareable one-page executive and technical summary.
- `docs/interface-design.md`: interface design direction and responsive decisions.
- `docs/DEPLOYMENT.md`: production and rollback procedure.

## Run locally

Requirements:

- Node.js 22 through 24.
- npm 10 or newer.
- A browser with WebGL support.

```bash
npm install
npm run dev
```

Vite prints the local URL. The project needs no database, API key, external model service, or runtime secret.

## Verification

Run the complete local gate before every push:

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Current verified baseline:

- TypeScript typecheck passes.
- 36 of 36 Vitest tests pass across 10 files.
- Vite production build passes.
- Three of three local Playwright journeys pass.
- GitHub Actions passes typecheck, tests, build, Chromium installation, three Playwright journeys, and evidence upload.
- Two additional production journeys pass against the Railway URL on desktop and mobile.
- Production returns HTTP 200.
- The exact displayed PNG is 1254 by 1254 with SHA-256 `9681482ed5ee3f17ad31a5439bb5fe89064b96eb79806d3d3c90a2edf66b322d`.
- The downloaded binary GLB has a valid `glTF` header and was approximately 2.4 MB during verification.
- Historical strict sculpt validation passes.
- Historical component coverage is 27 specified, 27 built, 0 errors, and 0 warnings.

Playwright saves evidence under:

```text
/Users/emmanuel/Developer/scratch/playwright-screenshots/
```

Other environments can set `BALLISTA_SCREENSHOT_ROOT`. Never save browser evidence in the repository root.

Important production evidence includes:

- `steampunk-ballista-production-dark.png`
- `steampunk-ballista-production-reference.png`
- `steampunk-ballista-production-mobile.png`
- `steampunk-ballista-v2-tip-alignment.png`
- `steampunk-ballista-v2-chain-clearance.png`
- `steampunk-ballista-v2-fasteners-left.png`
- `steampunk-ballista-v2-fasteners-right.png`
- `steampunk-ballista-v2-no-scope.png`

## CTO one-page brief

The shareable CTO briefing is:

```text
output/pdf/steampunk-ballista-cto-brief.pdf
```

It is a single A4 landscape case study centered on the `img2threejs` plugin. It shows the five-stage bounded pipeline, the concrete evidence it produced, the honest hard stop after three blockout correction loops, the two explicit human overrides, and the boundary between plugin output and manual V2 production work. The page closes with structural coverage, automated QA, public delivery, and the reason this auditability matters to a CTO. The live site and public repository are clickable, and the QR code opens the production URL.

Regenerate it with:

```bash
python3 scripts/build_cto_brief.py
```

The generator uses the verified production screenshot from the external screenshot folder when available and falls back to the committed reference image. Images are cropped and downsampled during generation, keeping the final PDF near 75 KB without reducing page-level legibility.

## Deployment and operations

### GitHub

- Repository: https://github.com/edemaistre/steampunk-ballista-turret
- Visibility: public.
- Default branch: `main`.
- CI: standard GitHub-hosted Ubuntu runner.
- Public-repository GitHub Actions usage is free on standard runners.

### Railway

- Project: `Steampunk Ballista Turret`.
- Service: `ballista`.
- Environment: `production`.
- Domain: https://ballista-production.up.railway.app
- Plan at publication: Hobby.
- Builder: Railpack.
- Build command: `npm run build`.
- Start command: `npm run start`.
- Static server: `serve --single --listen $PORT dist`.
- Healthcheck: `/`, 300 second timeout.
- Restart: on failure, maximum three retries.
- Database: none.
- Runtime secrets: none.

Railway watches only production-relevant files: `src/`, `reference/`, `index.html`, package manifests, `railway.toml`, `tsconfig.json`, and `vite.config.ts`. Changes limited to documentation, tests, or GitHub workflow files are recorded as skipped deployments.

The first publication produced one successful production deployment. Later CI and documentation fixes were intentionally skipped by Railway, avoiding unnecessary builds.

Rollback is non-destructive. Use Railway deployment history to redeploy the last healthy image. Do not rewrite Git history.

### Cost snapshot

Measured on 2026-08-06, the Railway project had consumed about $0.02 and was projecting about $0.30 for the billing period. This fits inside the existing Hobby plan's included usage, assuming other workspace projects do not already consume the full allowance. This is a dated snapshot, not a spending guarantee.

## Historical preservation

There are two intentionally different local projects:

### Full reconstruction history

```text
/Users/emmanuel/Developer/pro/2026-08-05 Steampunk Ballista Turret/.worktrees/ballista-v2-refinement
```

This is the audit-rich source project. It contains:

- The original `img2threejs` intake and evidence.
- The authored sculpt specification and manifests.
- The stopped `.img2threejs/state.json` record.
- The complete v1 implementation.
- The v2 refinement branch.
- Historical images and diagnostics.
- Source snapshots v1 through v69.

The skill stopped after three blockout correction loops. Emmanuel authorized manual overrides, but the stopped state was never rewritten as a false pass. Preserve that evidence.

### Clean live release

```text
/Users/emmanuel/Developer/Active-Pro/2026-08-05 Steampunk Ballista Turret
```

This is the public repository and operational source of truth. It intentionally excludes historical reconstruction files, superseded images, intake crops, and the stopped skill state.

Local `archive/` and `versions/` folders preserve pre-edit snapshots and live-verification helpers. They are excluded locally and must not be added to the public repository.

## How to resume safely

For a human or coding agent:

1. Read `README.md`, then `CLAUDE.md`, `BUGS.md`, `ROADMAP.md`, and `CHANGELOG.md`.
2. Confirm `git status --short` before editing. Preserve unrelated user changes.
3. Decide whether the work belongs in the clean live release or the full historical reconstruction project.
4. Before overwriting a deliverable, copy it to a dated local `versions/vN .../` snapshot and log that snapshot below.
5. Never delete. Move superseded material to a local archive.
6. Preserve the core mechanical and runtime contracts unless Emmanuel explicitly changes them.
7. Update documentation in the same commit as behavior changes.
8. Run typecheck, all 36 unit tests, production build, and all three Playwright journeys.
9. For visual changes, inspect real desktop dark-mode and mobile screenshots, not only test output.
10. Push only after every required test passes.
11. Batch changes into one push and one production deployment per task.

## Contracts that must not regress

- Pitch starts at `0°`, where the bolt is horizontal.
- Pitch remains symmetric from -20° to +20°.
- Yaw remains centered at `0°` with a -180° to +180° range.
- Reset restores camera, selection, yaw, pitch, and exploded view.
- Fire never turns the loading crank, rear gear, or winch.
- Firing leaves the machine unloaded until Crank & Load completes.
- Bow limbs sweep in the corrected direction.
- Bow-tip clamps remain centered and tangent-aligned.
- Chains do not intersect or melt into the pod floor.
- Exterior fasteners remain bilateral.
- No visible brass scope intersects the weapon.
- The empty `scope` semantic node remains unless the component contract is intentionally migrated.
- Parts and faces remain computed from the live authored asset.
- Reference card and full-screen modal use the exact cleaned source.
- GLB download remains local and requires no server upload.

## Truth boundary and known limitations

Verified:

- The visible silhouette, materials, mechanisms, controls, and requested details are procedurally represented.
- The model is volumetric and inspectable from arbitrary orbit views.
- Runtime pivots, sockets, semantic nodes, selection groups, colliders, and destruction metadata are real objects or descriptors.
- Tested desktop and mobile interactions work locally and in production.

Assumed or limited:

- One image cannot prove hidden geometry or exact dimensions.
- Surface wear is procedural, not a pixel-exact texture transfer.
- Projectile travel is deterministic animation, not rigid-body physics with impact collision.
- No audio system or target collision system is included.
- The production JavaScript bundle is about 668 kB before gzip and about 172 kB gzip. Vite reports its normal 500 kB advisory.
- The GLB retains generated color maps and scalar material response but omits procedural roughness `DataTexture` maps that Three.js cannot merge during export.
- Collider and destruction data are integration-ready metadata. No physics or fracture engine is installed.

## Possible next work

- Add authored animation clips to the exported GLB.
- Add mechanical audio and a mute control.
- Add projectile targets, impacts, and collision effects.
- Split or lazily load Three.js if real traffic warrants bundle optimization.
- Replace primitive collider metadata when a specific physics engine is chosen.

## Version history

- `2026-08-05`: initial clean public release. Historical reconstruction iterations remain preserved in the original local project.
- `2026-08-05 Pre CI Fix`: local-only snapshot before correcting the GitHub Actions temporary screenshot path.
- `2026-08-05 Pre CI Timeout Fix`: local-only snapshot before adapting screenshot-heavy tests for software WebGL on shared runners.
- `v1 2026-08-06 Pre Documentation Handoff`: local-only snapshot of the original short README and CLAUDE files before this comprehensive human and agent handoff.
- `v2 2026-08-06 Pre CTO Brief`: local-only documentation snapshot before adding the one-page CTO deliverable.
- `v3 2026-08-06 Pre PDF Optimization`: local-only first PDF and generator snapshot before reducing the PDF from about 4.0 MB to about 115 KB.
- `v4 2026-08-06 Pre Img2threejs CTO Refocus`: local-only snapshot of the first result-centered CTO brief before rebuilding it as an `img2threejs` workflow case study.
