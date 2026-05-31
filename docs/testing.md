# Testing

Inkycut has two test layers:

| Layer | Runner | Purpose |
|---|---|---|
| Unit and integration | Jest + React Testing Library | Fast coverage for components, hooks, query helpers, and library behavior |
| End-to-end | Playwright | Browser-level verification of user journeys against the real Next.js app and PostgreSQL |

## Quick Start

Install dependencies and the Chromium browser used by Playwright:

```bash
npm install
npx playwright install chromium
```

Start PostgreSQL and apply migrations:

```bash
npm run db:up
npm run db:migrate
```

Run the full verification set:

```bash
npm run lint
npm run test:coverage
npm run test:e2e
```

## Commands

| Command | Description |
|---|---|
| `npm test` | Run Jest once |
| `npm run test:watch` | Run Jest in watch mode |
| `npm run test:coverage` | Run Jest with the enforced 100% coverage threshold |
| `npm run test:e2e` | Run Playwright headlessly |
| `npm run test:e2e:headed` | Run Playwright with visible browsers |
| `npm run test:e2e:ui` | Open Playwright UI mode |
| `npm run e2e:stub` | Start only the external-integration stub server |

The enforced 100% gate includes the reusable canvas interaction layer and its backend helpers: stores, stage pan/zoom/drag behavior, toolbar, topbar, chat primitives, node renderers, frame uploads, export modal, browser-side video export, AI tool dispatch, export-chain discovery, generated-image persistence, OpenAI canvas configuration, and local/S3 storage adapters.

Pass Playwright options after `--`:

```bash
npm run test:e2e -- --list
npm run test:e2e -- --project=chromium e2e/canvas.spec.ts
npm run test:e2e -- --grep "publishes"
```

## E2E Harness

`playwright.config.ts` starts two local processes before the browser tests:

| Process | Default URL | Purpose |
|---|---|---|
| External stub server | `http://127.0.0.1:4010` | Deterministic stand-in for Google OAuth, OpenAI, and future external systems |
| Inkycut app server | `http://127.0.0.1:3000` | The real custom `server.ts` runtime, including Socket.io |

The Playwright config injects these environment variables into the app process:

```bash
E2E_AUTH_BYPASS=1
EXTERNAL_STUB_BASE_URL=http://127.0.0.1:4010
OPENAI_BASE_URL=http://127.0.0.1:4010/openai/v1
OPENAI_API_KEY=e2e-stub-key
STORAGE_TYPE=local
```

When `CI` is unset, Playwright reuses servers already listening on the configured ports. This is useful during local debugging. In CI, Playwright starts fresh processes.

Override ports when the defaults are occupied:

```bash
PORT=3100 E2E_STUB_PORT=4110 npm run test:e2e
```

## Stub Server

The stub server lives at `e2e/stub/server.ts`. Start it independently when developing a new integration:

```bash
npm run e2e:stub
curl http://127.0.0.1:4010/health
```

Current routes:

| Route | Purpose |
|---|---|
| `GET /health` | Playwright startup readiness check |
| `GET /google/.well-known/openid-configuration` | Google-style OpenID discovery |
| `GET /google/o/oauth2/v2/auth` | Google-style OAuth authorization redirect |
| `POST /google/oauth2/v4/token` | Google-style token exchange |
| `GET /google/oauth2/v3/userinfo` | Deterministic Google-style profile |
| `GET /google/oauth2/v3/certs` | Google-style JWKS response |
| `POST /openai/v1/chat/completions` | Deterministic OpenAI-style chat response and prompt-driven canvas tool calls |
| `POST /openai/v1/images/generations` | Deterministic OpenAI-style generated image response |

To add another external system:

1. Add its route behavior to `e2e/stub/server.ts`.
2. Configure the app client with an environment-variable base URL.
3. Inject that variable from `playwright.config.ts`.
4. Add an E2E journey that proves the app uses the stubbed response.

Keep stub responses deterministic. Do not call paid or third-party APIs from E2E tests.

## Authentication

Google OAuth endpoints exist in the stub server for future provider-level tests. The current browser suite uses a narrower test-only auth bypass so each test can create an independent user without completing OAuth.

The bypass is active only when:

```bash
E2E_AUTH_BYPASS=1
```

`e2e/support/auth.ts` writes an `inkycut-e2e-user` cookie. `src/proxy.ts` permits protected routes when that cookie is present, and `src/lib/auth.ts` exposes its user payload as the session.

Do not set `E2E_AUTH_BYPASS` outside local E2E runs or CI test jobs.

## Database Fixtures

E2E tests use the database configured by `DATABASE_URL`. The default local value is:

```bash
postgresql://postgres:postgres@localhost:55432/inkycut
```

Fixture helpers live in `e2e/support/db.ts`. They:

- create uniquely named users and projects
- seed elements, frame connections, and gallery ideas when needed
- delete the test user after each journey
- rely on database cascades to remove owned projects, elements, conversations, and ideas

Tests run in parallel, so fixture names and user IDs must remain unique. A failing test can leave rows behind; use the `E2E` prefix to identify them during cleanup.

## Browser Projects

Configured Playwright projects:

| Project | Purpose |
|---|---|
| `chromium` | Desktop Chrome journeys, including the canvas |
| `mobile-chrome` | Public mobile pages and the expected canvas support gate |

Canvas-editing tests skip the mobile project because the product intentionally blocks canvas use on mobile.

## Current Journey Coverage

| Spec file | Journeys |
|---|---|
| `e2e/public.spec.ts` | Landing page, ideas navigation, login CTA, published gallery fixture |
| `e2e/auth.spec.ts` | Protected-route redirect, authenticated login redirect |
| `e2e/dashboard.spec.ts` | Create/open/delete project, publish project to gallery |
| `e2e/canvas.spec.ts` | Canvas boot, all node types, AI-composer focus actions, project-name editing, note and node persistence, board pan, wheel zoom, empty export state, stubbed upload, mobile gate |
| `e2e/chat.spec.ts` | Real `/api/chat` streaming through the OpenAI stub, AI create/update/delete/connect tool calls, generated-image persistence, AI-connected MP4 export |
| `e2e/export.spec.ts` | Connected frame-chain selection, browser-side MP4 render, download handoff |
| `e2e/collaboration.spec.ts` | Two owner sessions, presence avatar, live cursor, real-time create/update/delete synchronization |

## Artifacts

Playwright retains debugging artifacts only for failed tests:

- trace
- screenshot
- video

Artifacts are written under `test-results/`. Open a trace with:

```bash
npx playwright show-trace test-results/<failed-test>/trace.zip
```

`test-results/` and `playwright-report/` are ignored by ESLint and Git.

## Adding Tests

Use role, label, and text selectors first. Add a `data-testid` only when the element cannot be selected reliably through its accessible surface.

For authenticated journeys:

```ts
const user = createTestUser("Example")
await insertUser(user)
await signInAs(page, user)

try {
  await page.goto("/dashboard")
  // assertions
} finally {
  await cleanupUser(user.id)
}
```

Wait for persisted API writes before reloading or navigating:

```ts
const response = page.waitForResponse(
  (item) => item.url().includes("/api/elements") && item.request().method() === "POST",
)
await page.getByRole("button", { name: "Add Frame" }).click()
expect((await response).status()).toBe(201)
```

This keeps browser tests deterministic and prevents teardown from racing pending requests.
