# E2E Tests

Playwright tests run against the custom `server.ts` entry so Socket.io behavior matches the app runtime.

Prerequisites:
- `DATABASE_URL` points at a migrated test database.
- `npm run db:up && npm run db:migrate` has been run locally.
- External integrations are stubbed through `npm run e2e:stub`.

Commands:

```bash
npm run test:e2e
npm run test:e2e:ui
npm run test:e2e:headed
```

The Playwright config starts both the app server and the E2E stub server automatically.
