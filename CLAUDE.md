# Steampunk Ballista Turret

Read `README.md` first.

Current state: this folder is the clean public release. It contains only the final interactive ballista, current reference, tests, GitHub CI, and Railway configuration. Historical iterations remain in the local source archive outside this repository.

Hard rules:

- Do not reintroduce `versions/`, historical crops, stopped pipeline evidence, or superseded source images into this public repository.
- Preserve the current cleaned reference image unless Emmanuel explicitly supplies a replacement.
- Run typecheck, all 36 unit tests, production build, and all three Playwright journeys before pushing.
- Update README, CHANGELOG, BUGS, ROADMAP, CLAUDE, `llms.txt`, and `llms-full.txt` with every behavior change.
- Push once and deploy once per task.
- Save browser screenshots under `/Users/emmanuel/Developer/scratch/playwright-screenshots/`, never in the repository.
- Never use em dashes in project copy.

**Resume this work:** `claude --resume 019fcece-c58b-72b0-8941-5e6524eaaa41` (2026-08-05)
