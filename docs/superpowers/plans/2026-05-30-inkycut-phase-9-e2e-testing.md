# Phase 9 — E2E Testing

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Playwright end-to-end coverage for every user journey in the product: public browsing, auth redirects, project management, canvas creation/editing, AI-assisted workflows, uploads, publishing, collaboration, browser gating, and video export.

**Depends on:** Phase 8 complete.

**Assumptions:**
- Use Playwright because the journeys require real browser behavior, network interception, multi-tab collaboration, file upload, and Chrome/non-Chrome coverage.
- E2E tests run against the custom `server.ts` entry, not `next dev`, so Socket.io behavior matches local development and production.
- Tests use seeded database fixtures and mocked external services for Google OAuth, OpenAI, and S3-compatible storage. No E2E test calls paid or third-party APIs.
- Unit and integration tests continue to own function-level coverage. E2E tests prove user-visible flows work end to end.

---

## Task 34: Install and configure Playwright

**Files:**
- Update: `package.json`
- Update: `package-lock.json`
- Create: `playwright.config.ts`
- Create: `e2e/.gitkeep`
- Create: `e2e/README.md`

- [ ] **Step 1: Add Playwright dependencies and scripts**

Install:

```bash
npm install -D @playwright/test
npx playwright install chromium firefox webkit
```

Add scripts:

```json
{
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:e2e:headed": "playwright test --headed"
}
```

- [ ] **Step 2: Configure Playwright to use the custom server**

Create `playwright.config.ts` with:
- `testDir: "./e2e"`
- `baseURL: "http://127.0.0.1:3000"`
- `webServer.command: "npm run dev"`
- `webServer.url: "http://127.0.0.1:3000"`
- `webServer.reuseExistingServer: !process.env.CI`
- projects for `chromium`, `firefox`, `webkit`, and `mobile-chrome`
- trace/video/screenshot retained on failure

- [ ] **Step 3: Document local E2E prerequisites**

In `e2e/README.md`, document:
- database must be available through `DATABASE_URL`
- migrations must be applied before E2E runs
- tests seed and clean their own project/user records
- external providers are mocked

- [ ] **Step 4: Verify the empty suite boots**

```bash
npm run test:e2e -- --list
```

Expected: PASS with no tests or only placeholder tests listed.

---

## Task 35: Build E2E fixtures, auth helpers, and service mocks

**Files:**
- Create: `e2e/support/db.ts`
- Create: `e2e/support/auth.ts`
- Create: `e2e/support/fixtures.ts`
- Create: `e2e/support/mock-api.ts`
- Create: `e2e/support/selectors.ts`
- Update: `src/lib/auth.ts` only if a test-only auth seam is needed

- [ ] **Step 1: Add deterministic test data helpers**

Create helpers for:
- creating a test user
- creating owned projects
- creating elements for each canvas node type
- creating frame connections
- creating published ideas
- deleting all rows created by a test

Verification:

```bash
npm run test:e2e -- --list
```

Expected: PASS.

- [ ] **Step 2: Add authenticated browser context helper**

Create a `signInAsTestUser(page, user)` helper. Prefer setting a valid NextAuth session cookie through local test-only credentials over clicking the Google OAuth flow.

If production auth code must change, keep the seam explicit:
- enabled only when `NODE_ENV === "test"` or `E2E_AUTH_BYPASS === "1"`
- never available in production
- covered by a unit test proving it is disabled by default

Verification:

```bash
npm run test:e2e -- --grep "@auth"
```

Expected: authenticated context reaches `/dashboard`.

- [ ] **Step 3: Mock external service calls at the browser or route layer**

Mock:
- `/api/chat` streaming chunks and tool-call side effects
- `/api/generate-image` returning a deterministic `/uploads/e2e-generated.png`
- `/api/upload` returning a deterministic upload URL, unless local disk upload is intentionally covered
- clipboard permissions for share flow

Verification:

```bash
npm run test:e2e -- --grep "@mocks"
```

Expected: mocked responses are visible in the UI and no external network calls are made.

---

## Task 36: Public and auth journeys

**Files:**
- Create: `e2e/public.spec.ts`
- Create: `e2e/auth.spec.ts`

- [ ] **Step 1: Cover public landing navigation**

Scenarios:
- `/` renders the landing hero and primary calls to action
- "Start a board" navigates to `/login`
- "See what people make" navigates to `/ideas`
- top nav links route between `/`, `/ideas`, and `/login`

Verification:

```bash
npm run test:e2e -- e2e/public.spec.ts
```

Expected: PASS in Chromium.

- [ ] **Step 2: Cover public ideas gallery**

Scenarios:
- empty state renders when no ideas exist
- seeded ideas render newest first
- idea cards show title, description, author, and genre/tag metadata
- CTA routes unauthenticated users to `/login`

Verification:

```bash
npm run test:e2e -- e2e/public.spec.ts --grep "ideas"
```

Expected: PASS.

- [ ] **Step 3: Cover auth redirects**

Scenarios:
- unauthenticated `/dashboard` redirects to `/login`
- unauthenticated `/projects/:id` redirects to `/login`
- authenticated `/login` redirects to `/dashboard`
- authenticated `/dashboard` renders the project grid

Verification:

```bash
npm run test:e2e -- e2e/auth.spec.ts
```

Expected: PASS.

---

## Task 37: Dashboard project journeys

**Files:**
- Create: `e2e/dashboard.spec.ts`

- [ ] **Step 1: Cover project list and empty dashboard**

Scenarios:
- first-time user sees an empty project grid and new project affordance
- seeded projects show name, thumbnail/placeholder, element count, and updated time
- sidebar links navigate to home, projects, and ideas

Verification:

```bash
npm run test:e2e -- e2e/dashboard.spec.ts --grep "list"
```

Expected: PASS.

- [ ] **Step 2: Cover create and open project**

Scenarios:
- click "New project"
- modal opens with name input
- submit creates the project through `/api/projects`
- new card appears without a full reload
- opening the card navigates to `/projects/:id`

Verification:

```bash
npm run test:e2e -- e2e/dashboard.spec.ts --grep "create"
```

Expected: PASS.

- [ ] **Step 3: Cover delete project**

Scenarios:
- delete control appears for a project card
- confirmation is required
- confirming removes the project from the grid
- deleted project route redirects back to `/dashboard`

Verification:

```bash
npm run test:e2e -- e2e/dashboard.spec.ts --grep "delete"
```

Expected: PASS.

---

## Task 38: Canvas creation and editing journeys

**Files:**
- Create: `e2e/canvas.spec.ts`
- Add stable `data-testid` attributes only where role/name selectors cannot express the user action reliably

- [ ] **Step 1: Cover canvas boot**

Scenarios:
- authenticated user opens an owned project
- topbar shows project name and export action
- stage, toolbar, zoom controls, and chat panel are visible
- opening a missing or unowned project redirects to `/dashboard`

Verification:

```bash
npm run test:e2e -- e2e/canvas.spec.ts --grep "boot"
```

Expected: PASS.

- [ ] **Step 2: Cover toolbar node creation for every node type**

Scenarios:
- add frame
- add note
- add character
- add storyboard
- trigger AI from toolbar and focus the composer
- verify created nodes persist after reload

Verification:

```bash
npm run test:e2e -- e2e/canvas.spec.ts --grep "toolbar"
```

Expected: PASS.

- [ ] **Step 3: Cover node editing and persistence**

Scenarios:
- edit note text and reload
- drag a node and reload
- zoom in/out/fit and reload viewport
- select a frame and edit duration if the duration input is available

Verification:

```bash
npm run test:e2e -- e2e/canvas.spec.ts --grep "editing"
```

Expected: PASS.

- [ ] **Step 4: Cover image upload journey**

Scenarios:
- upload an image to a frame node
- uploaded image appears in the frame
- image URL persists after reload
- invalid file type/size shows a user-visible failure state if implemented

Verification:

```bash
npm run test:e2e -- e2e/canvas.spec.ts --grep "upload"
```

Expected: PASS.

---

## Task 39: AI chat and generated image journeys

**Files:**
- Create: `e2e/chat.spec.ts`

- [ ] **Step 1: Cover chat send and streaming response**

Scenarios:
- quick action fills or submits a prompt
- user message appears immediately
- mocked streaming agent response appears incrementally or reaches final text
- conversation persists after reload

Verification:

```bash
npm run test:e2e -- e2e/chat.spec.ts --grep "streaming"
```

Expected: PASS.

- [ ] **Step 2: Cover tool-call side effects**

Scenarios:
- mocked chat creates a frame
- mocked chat updates an existing element
- mocked chat deletes an element
- mocked chat creates a frame connection
- UI updates after each side effect

Verification:

```bash
npm run test:e2e -- e2e/chat.spec.ts --grep "tool"
```

Expected: PASS.

- [ ] **Step 3: Cover generated image flow**

Scenarios:
- user asks for an image
- mocked `generate_image` result attaches an image URL to a frame or character
- generated image persists after reload

Verification:

```bash
npm run test:e2e -- e2e/chat.spec.ts --grep "generated image"
```

Expected: PASS.

---

## Task 40: Publish, gallery, and unpublish journeys

**Files:**
- Create: `e2e/publish.spec.ts`

- [ ] **Step 1: Cover publish from dashboard**

Scenarios:
- open publish modal from a project card
- enter title, description, genre, and tags
- submit creates an idea
- project appears on `/ideas`

Verification:

```bash
npm run test:e2e -- e2e/publish.spec.ts --grep "publish"
```

Expected: PASS.

- [ ] **Step 2: Cover update and unpublish**

Scenarios:
- published project opens modal with current values
- updating metadata changes the public idea card
- unpublish removes the card from `/ideas`

Verification:

```bash
npm run test:e2e -- e2e/publish.spec.ts --grep "unpublish"
```

Expected: PASS.

---

## Task 41: Collaboration and real-time journeys

**Files:**
- Create: `e2e/collaboration.spec.ts`

- [ ] **Step 1: Cover presence across two browser contexts**

Scenarios:
- two authenticated users open the same owned or shared test project fixture
- collaborator avatar appears in the topbar
- closing one context removes its presence

Verification:

```bash
npm run test:e2e -- e2e/collaboration.spec.ts --grep "presence"
```

Expected: PASS.

- [ ] **Step 2: Cover real-time element sync**

Scenarios:
- user A creates a node
- user B sees the node without reload
- user A edits or moves the node
- user B sees the update without reload
- user A deletes the node
- user B sees it removed without reload

Verification:

```bash
npm run test:e2e -- e2e/collaboration.spec.ts --grep "element sync"
```

Expected: PASS.

- [ ] **Step 3: Cover cursor broadcast**

Scenarios:
- user A moves pointer over the stage
- user B sees a live cursor or collaborator marker
- cursor updates are throttled but not dropped completely

Verification:

```bash
npm run test:e2e -- e2e/collaboration.spec.ts --grep "cursor"
```

Expected: PASS.

---

## Task 42: Browser gate and video export journeys

**Files:**
- Create: `e2e/browser-gate.spec.ts`
- Create: `e2e/export.spec.ts`

- [ ] **Step 1: Cover Chrome desktop support**

Scenarios:
- Chromium desktop opens `/projects/:id` and mounts the canvas
- export button is visible only when the browser is supported

Verification:

```bash
npm run test:e2e -- e2e/browser-gate.spec.ts --project=chromium
```

Expected: PASS.

- [ ] **Step 2: Cover unsupported browsers and mobile**

Scenarios:
- Firefox shows the unsupported overlay
- WebKit shows the unsupported overlay
- mobile Chrome project shows the unsupported overlay
- overlay "Back to dashboard" link works

Verification:

```bash
npm run test:e2e -- e2e/browser-gate.spec.ts --project=firefox --project=webkit --project=mobile-chrome
```

Expected: PASS.

- [ ] **Step 3: Cover export modal and chain selection**

Scenarios:
- seeded connected frames produce an ordered chain
- export modal lists the chain
- disconnected or empty projects show a useful empty state
- starting render reaches a mocked or real browser-side completion state

Verification:

```bash
npm run test:e2e -- e2e/export.spec.ts --project=chromium
```

Expected: PASS.

- [ ] **Step 4: Cover video download handoff**

Scenarios:
- completed render exposes a download action
- download has an `.mp4` filename
- render failure shows a user-visible error state

Verification:

```bash
npm run test:e2e -- e2e/export.spec.ts --grep "download" --project=chromium
```

Expected: PASS.

---

## Task 43: CI integration and coverage gate

**Files:**
- Create or update: `.github/workflows/test.yml`
- Update: `README.md`

- [ ] **Step 1: Add E2E test job**

The CI job must:
- install dependencies with `npm ci`
- install Playwright browsers
- start PostgreSQL service
- apply migrations
- run `npm run lint`
- run `npm run test:coverage`
- run `npm run test:e2e`

Verification:

```bash
npm run lint
npm run test:coverage
npm run test:e2e
```

Expected: all PASS locally before opening a PR.

- [ ] **Step 2: Keep unit coverage at 100%**

E2E tests do not replace Jest coverage. Maintain the existing 100% unit/integration coverage requirement and add focused unit tests for any production code introduced to support E2E.

Verification:

```bash
npm run test:coverage
```

Expected: PASS with 100% coverage thresholds.

- [ ] **Step 3: Document the complete verification command set**

Update `README.md` with:
- local E2E setup
- `npm run test:e2e`
- `npm run test:e2e:ui`
- full pre-commit/pre-PR verification commands

Verification:

```bash
npm run lint
npm run test:coverage
npm run test:e2e
```

Expected: all PASS.

---

## Journey Coverage Matrix

| User journey | Spec area | E2E file |
|---|---|---|
| Visitor lands on marketing page and navigates CTAs | `/`, nav | `e2e/public.spec.ts` |
| Visitor browses empty and populated ideas gallery | `/ideas` | `e2e/public.spec.ts` |
| Unauthenticated visitor is redirected from protected routes | auth | `e2e/auth.spec.ts` |
| Signed-in user reaches dashboard | auth, `/dashboard` | `e2e/auth.spec.ts` |
| User creates, opens, and deletes projects | dashboard | `e2e/dashboard.spec.ts` |
| User publishes, updates, and unpublishes an idea | dashboard, `/ideas` | `e2e/publish.spec.ts` |
| User opens canvas and sees app shell | canvas | `e2e/canvas.spec.ts` |
| User creates every supported node type | canvas toolbar | `e2e/canvas.spec.ts` |
| User edits notes, drags nodes, and changes viewport | canvas persistence | `e2e/canvas.spec.ts` |
| User uploads images to visual nodes | upload | `e2e/canvas.spec.ts` |
| User sends chat prompt and receives streamed response | AI chat | `e2e/chat.spec.ts` |
| AI tool calls mutate canvas state | AI tool calls | `e2e/chat.spec.ts` |
| User generates an image through AI | image generation | `e2e/chat.spec.ts` |
| Two users see presence and live element updates | Socket.io | `e2e/collaboration.spec.ts` |
| Unsupported browser/mobile sees canvas gate | browser gate | `e2e/browser-gate.spec.ts` |
| User selects frame chain and exports video | video export | `e2e/export.spec.ts` |

---

## Final Verification

Run the full project verification:

```bash
npm run lint
npm run test:coverage
npm run test:e2e
```

Expected: all commands pass. E2E test artifacts should only be retained for failures.
