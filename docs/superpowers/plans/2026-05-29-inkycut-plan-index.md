# Inkycut Implementation Plan — Index

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Inkycut — an AI-native infinite-canvas video-creation web app with real-time collaboration, OpenAI tool-call-driven canvas editing, and in-browser video export via Mediabunny.

**Architecture:** Next.js 14 App Router with a custom `server.ts` that attaches Socket.io to the same HTTP port. Drizzle ORM + PostgreSQL for persistence. NextAuth v5 for Google OAuth. Canvas state lives in Zustand on the client; all mutations flow through REST API routes then broadcast via Socket.io.

**Tech Stack:** Next.js 14, TypeScript, Drizzle ORM, PostgreSQL, NextAuth v5, OpenAI SDK (GPT-4o + function calling, `gpt-image-2` image generation), Socket.io 4, Zustand, Mediabunny, AWS SDK v3 (S3), Jest + React Testing Library, Playwright

**Spec:** `docs/superpowers/specs/2026-05-29-inkycut-design.md`

---

## Phase Files

| Phase | File | What it builds |
|---|---|---|
| 1 | [phase-1-foundation.md](./2026-05-29-inkycut-phase-1-foundation.md) | Project scaffold, design system CSS, Drizzle schema, NextAuth, landing page, login page |
| 2 | [phase-2-dashboard.md](./2026-05-29-inkycut-phase-2-dashboard.md) | Dashboard with icon sidebar, project grid, create/delete projects |
| 3 | [phase-3-canvas.md](./2026-05-29-inkycut-phase-3-canvas.md) | Infinite canvas, all node types, toolbar, canvas persistence (autosave) |
| 4 | [phase-4-ai-chat.md](./2026-05-29-inkycut-phase-4-ai-chat.md) | Chat panel UI, OpenAI streaming + tool calls, canvas tool executor |
| 5 | [phase-5-realtime.md](./2026-05-29-inkycut-phase-5-realtime.md) | Custom server.ts + Socket.io, real-time element sync, presence + live cursors |
| 6 | [phase-6-upload.md](./2026-05-29-inkycut-phase-6-upload.md) | File upload API, local/S3 storage adapter, ImageSlot component, GPT image generation |
| 7 | [phase-7-ideas.md](./2026-05-29-inkycut-phase-7-ideas.md) | Ideas gallery page, publish-to-gallery flow |
| 8 | [phase-8-video.md](./2026-05-29-inkycut-phase-8-video.md) | Frame connection edges, chain discovery, Mediabunny export modal |
| 9 | [phase-9-e2e-testing.md](./2026-05-30-inkycut-phase-9-e2e-testing.md) | Playwright setup and full user-journey E2E coverage |

Complete phases in order — each phase depends on the previous.

---

## Full File Structure

```
inkycut/
├── server.ts                          # Custom HTTP server + Socket.io (Phase 5)
├── next.config.ts                     # Next.js config (Phase 1)
├── tsconfig.json                      # TypeScript config (Phase 1)
├── jest.config.ts                     # Jest config (Phase 1)
├── jest.setup.ts                      # Jest setup (Phase 1)
├── playwright.config.ts               # Playwright config (Phase 9)
├── package.json                       # Dependencies (Phase 1)
├── drizzle.config.ts                  # Drizzle Kit config (Phase 1)
├── .env.local                         # Env vars (Phase 1, never committed)
├── public/
│   └── uploads/                       # Local file storage dev (Phase 6)
├── e2e/
│   ├── public.spec.ts                 # Public landing + ideas journeys (Phase 9)
│   ├── auth.spec.ts                   # Auth redirects and sessions (Phase 9)
│   ├── dashboard.spec.ts              # Project management journeys (Phase 9)
│   ├── canvas.spec.ts                 # Canvas creation/editing journeys (Phase 9)
│   ├── chat.spec.ts                   # AI chat and generated image journeys (Phase 9)
│   ├── publish.spec.ts                # Publish/gallery journeys (Phase 9)
│   ├── collaboration.spec.ts          # Real-time collaboration journeys (Phase 9)
│   ├── browser-gate.spec.ts           # Chrome desktop gate journeys (Phase 9)
│   ├── export.spec.ts                 # Video export journeys (Phase 9)
│   └── support/                       # E2E fixtures, auth, DB, service mocks (Phase 9)
├── styles/
│   ├── inky.css                       # Copied verbatim from docs/superpowers/designs (Phase 1)
│   └── app.css                        # Canvas styles, copied from docs/superpowers/designs (Phase 1)
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # Root layout: fonts, global CSS, providers (Phase 1)
│   │   ├── page.tsx                   # Landing page / (Phase 1)
│   │   ├── page.module.css            # Landing page styles (Phase 1)
│   │   ├── login/
│   │   │   └── page.tsx               # Login page /login (Phase 1)
│   │   ├── ideas/
│   │   │   └── page.tsx               # Ideas gallery /ideas (Phase 7)
│   │   │   └── page.module.css        # Ideas gallery styles (Phase 7)
│   │   ├── dashboard/
│   │   │   └── page.tsx               # Dashboard /dashboard (Phase 2)
│   │   │   └── page.module.css        # Dashboard styles (Phase 2)
│   │   └── projects/
│   │       └── [id]/
│   │           └── page.tsx           # Canvas page /projects/[id] (Phase 3)
│   │   └── api/
│   │       ├── auth/
│   │       │   └── [...nextauth]/
│   │       │       └── route.ts       # NextAuth handler (Phase 1)
│   │       ├── projects/
│   │       │   ├── route.ts           # GET list, POST create (Phase 2)
│   │       │   └── [id]/
│   │       │       └── route.ts       # DELETE project (Phase 2)
│   │       ├── elements/
│   │       │   ├── route.ts           # POST create element (Phase 3)
│   │       │   └── [id]/
│   │       │       └── route.ts       # PATCH update, DELETE element (Phase 3)
│   │       ├── connections/
│   │       │   └── route.ts           # POST create connection (Phase 8)
│   │       ├── chat/
│   │       │   └── route.ts           # POST streaming chat + tool calls (Phase 4)
│   │       ├── upload/
│   │       │   └── route.ts           # POST file upload (Phase 6)
│   │       ├── generate-image/
│   │       │   └── route.ts           # POST gpt-image-2 generation (Phase 6)
│   │       └── ideas/
│   │           ├── route.ts           # GET published ideas (Phase 7)
│   │           └── [id]/
│   │               └── route.ts       # POST publish, DELETE unpublish (Phase 7)
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Logo.tsx               # Logo mark + wordmark (Phase 1)
│   │   │   ├── Frame.tsx              # Film-frame placeholder (Phase 1)
│   │   │   ├── ImageSlot.tsx          # React image-slot component (Phase 6)
│   │   │   └── BrowserGate.tsx        # Chrome/desktop gate overlay (Phase 3)
│   │   ├── layout/
│   │   │   └── Nav.tsx                # Sticky nav for landing/ideas (Phase 1)
│   │   ├── dashboard/
│   │   │   ├── DashboardSidebar.tsx   # Icon sidebar (Phase 2)
│   │   │   ├── ProjectGrid.tsx        # Project card grid (Phase 2)
│   │   │   ├── ProjectCard.tsx        # Single project card (Phase 2)
│   │   │   └── NewProjectModal.tsx    # Create project modal (Phase 2)
│   │   ├── canvas/
│   │   │   ├── Canvas.tsx             # Top-level canvas orchestrator (Phase 3)
│   │   │   ├── CanvasTopbar.tsx       # Project name, avatars, export btn (Phase 3)
│   │   │   ├── Stage.tsx              # Infinite pan/zoom stage (Phase 3)
│   │   │   ├── Toolbar.tsx            # Left toolbar (Phase 3)
│   │   │   ├── ZoomControls.tsx       # Bottom-left zoom (Phase 3)
│   │   │   ├── nodes/
│   │   │   │   ├── NodeWrapper.tsx    # Shared drag/select/head wrapper (Phase 3)
│   │   │   │   ├── FrameNode.tsx      # frame type node (Phase 3)
│   │   │   │   ├── CharacterNode.tsx  # character type node (Phase 3)
│   │   │   │   ├── DocNode.tsx        # doc type node (Phase 3)
│   │   │   │   ├── StoryboardNode.tsx # storyboard type node (Phase 3)
│   │   │   │   ├── ShotlistNode.tsx   # shotlist type node (Phase 3)
│   │   │   │   └── NoteNode.tsx       # note type node (Phase 3)
│   │   │   ├── chat/
│   │   │   │   ├── ChatPanel.tsx      # Right chat panel (Phase 4)
│   │   │   │   ├── ChatMessage.tsx    # Single message (Phase 4)
│   │   │   │   └── Composer.tsx       # Input + quick actions (Phase 4)
│   │   │   └── export/
│   │   │       ├── ExportModal.tsx    # Chain picker + render UI (Phase 8)
│   │   │       └── useVideoExport.ts  # Mediabunny hook (Phase 8)
│   │   └── ideas/
│   │       ├── IdeaCard.tsx           # Gallery card (Phase 7)
│   │       └── FilterBar.tsx          # Genre filter chips (Phase 7)
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts              # All Drizzle table definitions (Phase 1)
│   │   │   ├── index.ts               # Drizzle client (Phase 1)
│   │   │   └── queries/
│   │   │       ├── projects.ts        # Project DB helpers (Phase 2)
│   │   │       ├── elements.ts        # Element DB helpers (Phase 3)
│   │   │       ├── messages.ts        # Message DB helpers (Phase 4)
│   │   │       └── ideas.ts           # Idea DB helpers (Phase 7)
│   │   ├── auth.ts                    # NextAuth config (Phase 1)
│   │   ├── openai.ts                  # OpenAI client + tool schemas (Phase 4)
│   │   ├── canvas-tools.ts            # Tool call executor (Phase 4)
│   │   ├── image-generation.ts        # GPT image generation helper (Phase 6)
│   │   ├── socket.ts                  # Socket.io server singleton (Phase 5)
│   │   └── storage.ts                 # File storage adapter (Phase 6)
│   ├── hooks/
│   │   ├── useCanvas.ts               # Zustand canvas store (Phase 3)
│   │   ├── useSocket.ts               # Socket.io client hook (Phase 5)
│   │   ├── useAutosave.ts             # Debounced element save (Phase 3)
│   │   └── usePresence.ts             # Online collaborators (Phase 5)
│   └── types/
│       └── canvas.ts                  # Shared TS types (Phase 1)
```

---

## Environment Variables (all phases)

```bash
# .env.local
DATABASE_URL=postgresql://user:pass@localhost:5432/inkycut
NEXTAUTH_SECRET=<random-32-char-string>
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=<from-google-console>
GOOGLE_CLIENT_SECRET=<from-google-console>
OPENAI_API_KEY=<openai-key>
STORAGE_TYPE=local
# Production only:
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=nyc3
S3_BUCKET_NAME=inkycut-uploads
S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
```
