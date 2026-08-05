# Deployment

## Production path

1. GitHub stores the clean final source on `main`.
2. GitHub Actions runs typecheck, unit tests, production build, and Playwright.
3. Railway watches the GitHub repository and builds with Railpack.
4. `npm run build` creates `dist/`.
5. `npm run start` serves the single-page application on Railway's injected `$PORT`.
6. Railway requests `/` until it returns HTTP 200, then promotes the deployment.

## Local verification

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run test:e2e
```

## Rollback

Use Railway's deployment history to redeploy the last healthy build. This preserves Git history and avoids destructive source changes.

## Secrets

The application needs no API key, database, or runtime secret. All behavior executes in the browser.
