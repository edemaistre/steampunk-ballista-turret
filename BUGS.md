# Bugs

## Open

- The production JavaScript bundle is about 668 kB before gzip and triggers Vite's 500 kB advisory. It remains acceptable for this standalone WebGL demo but could be split before higher-traffic distribution.
- Hidden geometry is inferred from one supplied reference image.

## Resolved

- The final reference viewer now uses the cleaned source without the removed scope and upper-left black part.
- Bow direction, pod closure, chain clearance, bilateral fasteners, aiming ranges, reset behavior, and the explicit loading cycle are covered by regression tests and browser journeys.
- Railway receives an explicit start command, listens on `$PORT`, and checks `/` before promoting a deployment.
