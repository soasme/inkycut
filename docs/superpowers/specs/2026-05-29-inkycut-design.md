# Inkycut — Design Spec
**Date:** 2026-05-29

## Overview

Inkycut is an AI-native video-creation web app built around an infinite canvas. Users turn a one-line concept into characters, scenes, storyboards, and a finished edited video — with an AI specialist chat driving most of the canvas work via tool calls.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14+ App Router, custom `server.ts` entry |
| Database ORM | Drizzle ORM |
| Database | PostgreSQL (hosted on DigitalOcean) |
| Auth | NextAuth.js v5 — Google OAuth only, no passwords |
| Real-time | Socket.io attached to the custom server |
| AI | OpenAI GPT-4o with function calling, streaming |
| Video export | Mediabunny (browser-side, Chrome desktop only) |
| File storage | Local disk (dev) / S3-compatible e.g. DO Spaces (prod) |
| Deployment | DigitalOcean VPS (persistent process, not serverless) |

---

## Design System

Strictly follows `docs/superpowers/designs`, especially `docs/superpowers/designs/DESIGN.md`. Key constraints:

- **Fonts:** Archivo (sans) + IBM Plex Mono (mono). No others.
- **Accent:** Sky blue `#2f9fe0` only. No second accent hue.
- **Background:** `--paper` `#f5f8fb`. Cards `#ffffff`.
- **CSS tokens:** Only use `:root` variables from `inky.css`. Never invent new values.
- **Components:** Use `.btn`, `.chip`, `.frame`, `.node`, `.chat`, `.composer`, `.logo` exactly as defined.
- **No:** gradient hero backgrounds, emoji as UI, Inter/Roboto, hand-drawn SVGs.
- **Film-frame placeholder** (`.frame f-*`) is the only sanctioned imagery slot when no real image is present.

Both `inky.css` (shared system) and page-specific CSS are always linked in that order.

---

## Pages & Routing

| Route | Auth | Description |
|---|---|---|
| `/` | Public | Landing page — mirrors `index.html` exactly |
| `/ideas` | Public | Ideas gallery — mirrors `ideas.html`, UGC published projects |
| `/login` | Public | Centered card on paper bg, Google OAuth button |
| `/dashboard` | Required | Icon sidebar + project grid. Create/delete projects. |
| `/projects/[id]` | Required | Canvas app — mirrors `app.html`. Chrome desktop only. |
| `/api/auth/[...nextauth]` | — | NextAuth Google OAuth handler |
| `/api/chat` | Required | Streaming OpenAI endpoint with tool calls |
| `/api/upload` | Required | File upload (multipart, local or S3) |
| `/api/socket` | — | Socket.io HTTP upgrade endpoint |

Unauthenticated requests to auth-required routes redirect to `/login`. After login, redirect to `/dashboard`.

---

## Database Schema

### users
```
id          uuid PK default gen_random_uuid()
name        text
email       text unique not null
image       text
created_at  timestamp default now()
updated_at  timestamp default now()
```
Populated/updated by NextAuth on every sign-in.

### projects
```
id               uuid PK
user_id          uuid FK → users.id on delete cascade
name             text not null
viewport_x       real default 30
viewport_y       real default 24
viewport_scale   real default 0.78
created_at       timestamp default now()
updated_at       timestamp default now()
```

### elements
```
id          uuid PK
project_id  uuid FK → projects.id on delete cascade
type        text not null   -- frame | character | doc | storyboard | shotlist | note
x           real not null
y           real not null
w           real not null
h           real
data        jsonb not null default '{}'
created_at  timestamp default now()
updated_at  timestamp default now()
```
`data` holds type-specific fields:
- **frame:** `{ slug, hue, meta, ar, rec, imageUrl? }`
- **character:** `{ name, role, hues[], palette[], imageUrl? }`
- **doc:** `{ title, content }`
- **storyboard:** `{ title, hues[], hasShotList }`
- **shotlist:** `{ title, shots[] }` where shot = `{ n, d, l, m, t }`
- **note:** `{ text }`

### element_connections
```
id               uuid PK
project_id       uuid FK → projects.id on delete cascade
from_element_id  uuid FK → elements.id on delete cascade
to_element_id    uuid FK → elements.id on delete cascade
```
Directed edges between frame nodes. Used to build video export chains.

### conversations
```
id          uuid PK
project_id  uuid FK → projects.id on delete cascade
name        text not null default 'Main'
created_at  timestamp default now()
```
One conversation per project initially; schema supports multiples.

### messages
```
id               uuid PK
conversation_id  uuid FK → conversations.id on delete cascade
role             text not null   -- user | agent | stamp
agent_name       text
content          text
tool_calls       jsonb
created_at       timestamp default now()
```

### ideas
```
id                uuid PK
project_id        uuid FK → projects.id on delete cascade
user_id           uuid FK → users.id on delete cascade
title             text not null
description       text
genre             text
tags              text[]
cover_element_id  uuid FK → elements.id on delete set null
published_at      timestamp
created_at        timestamp default now()
```
A row exists only when the user publishes a project to the gallery. `published_at` being non-null means it appears in `/ideas`. The gallery is sorted by `published_at` descending (most recently published first).

---

## Dashboard

**Layout:** Full-height, icon sidebar on the left (48px wide) + main content area.

**Sidebar icons (top to bottom):**
1. Logo mark (links to `/`)
2. Projects (active state = sky blue bg)
3. Ideas gallery (links to `/ideas`)
4. Account / sign out

**Main area:**
- Header: "My Projects" + "New project" button (`.btn-accent`)
- Project grid: 3 columns, each card shows film-frame thumbnail (first frame element or placeholder), project name, element count, last updated time
- Hover: card lifts with `--shadow-2`, shows "Open →" link
- New project card: dashed border placeholder, click opens a modal with a single name input
- Delete: three-dot menu on card hover → "Delete project" with a confirmation dialog

---

## Canvas (`/projects/[id]`)

### Chrome/desktop gate
On mount, check:
```js
const isSupported = /Chrome/.test(navigator.userAgent) && !/Mobile/.test(navigator.userAgent)
```
If false, render a full-page "not supported" overlay (dark background, logo, message, link to `/dashboard`). The canvas never mounts.

### Canvas layout (matches `app.html`)
- **Topbar:** logo mark → `/dashboard`, editable project name, page pill, layout icon, avatar stack (online collaborators), export button. Share button copies the project URL to clipboard (no public sharing for now — the canvas is always auth-gated). Credits display is omitted (skipped per spec).
- **Stage:** dot-grid background, infinite pan/zoom, canvas-layer with absolutely positioned nodes
- **Left toolbar:** select, add frame, add note, add character, add storyboard, separator, ask AI
- **Zoom controls:** bottom-left, zoom in/out/fit/percentage
- **Chat panel:** 384px right panel, chat-head, scrollable messages, composer with quick-action chips

### Node types on canvas
All node types from the reference implementation: `frame`, `character`, `doc`, `storyboard`, `shotlist`, `note`. Nodes are draggable, selectable, spawn with `pop` animation.

The `image-slot` web component from the reference is ported to a React `<ImageSlot>` component. It accepts a `url` prop; when `url` is null it renders the `.frame` film-placeholder, when set it renders the image filling the slot.

### Persistence
- **Viewport** (pan/zoom): debounced 1s, saved to `projects.viewport_x/y/scale`
- **Node position/size:** debounced 800ms after drag, saved to `elements.x/y/w/h`
- **Node data changes:** saved immediately on change (e.g. note text blur, character name edit)
- All saves go through Socket.io so collaborators receive updates in real time

---

## Real-time Collaboration

**Server:** `server.ts` creates a Node HTTP server, attaches Socket.io, then passes requests to the Next.js handler.

**Rooms:** `project:<id>` — users join on canvas mount, leave on unmount/disconnect.

**Events:**

| Event | Direction | Payload |
|---|---|---|
| `element:created` | server → room | `{ element }` |
| `element:updated` | server → room | `{ elementId, patch }` |
| `element:deleted` | server → room | `{ elementId }` |
| `element:connected` | server → room | `{ connection }` |
| `viewport:cursor` | client → room (throttled 30fps) | `{ userId, x, y }` |
| `presence:join` | server → room | `{ userId, name, image }` |
| `presence:leave` | server → room | `{ userId }` |

**Conflict resolution:** Last-write-wins per element field. Sufficient for MVP.

---

## AI Chat & Tool Calls

**Endpoint:** `POST /api/chat` — streaming response using OpenAI Node SDK.

**Context sent to OpenAI:**
- System prompt describing the AI specialist persona and canvas state
- Current elements list (id, type, position, key data fields) — summarised, not full JSON
- Last 20 messages from the conversation

**Tools available to the AI:**

```ts
create_element(type, x, y, w, h?, data)  // spawns a new node
update_element(id, patch)                // updates fields on an existing node
delete_element(id)                       // removes a node
connect_elements(fromId, toId)           // creates a directed edge between frames
list_elements()                          // returns current canvas element summary
```

**Execution flow:**
1. Stream starts → text chunks sent to client via SSE
2. Tool call detected → server executes synchronously (DB write + Socket.io broadcast to room)
3. Tool result fed back to OpenAI for continuation
4. Final text message saved to `messages` table with `role: agent`

---

## Video Export (Mediabunny)

**Trigger:** "Export video" button in canvas topbar — only rendered on Chrome desktop.

**Chain discovery:**
1. Load all `element_connections` for the project
2. Find root frame nodes: frames with no incoming edges
3. Walk each root's outgoing edges to build an ordered chain
4. Present chains as selectable sequences in an export modal

**Render flow:**
1. User selects a chain and clicks "Render"
2. For each frame in chain: read `data.imageUrl` (real image) or render the `.frame` film-placeholder HTML to canvas using html2canvas, pass to Mediabunny
3. Mediabunny stitches clips using `data.duration` (default 3s per frame if not set) into an MP4. The user can edit `duration` directly on a frame node via a small inline input that appears when the node is selected.
4. On completion, trigger browser download

**Unsupported browser overlay:**  
`/projects/[id]` shows a full-page gate for non-Chrome/non-desktop — canvas never loads. The export button itself is only rendered when `isSupported === true`.

---

## File Upload

**Endpoint:** `POST /api/upload` — multipart/form-data

**Validation:** JPEG, PNG, WebP, GIF only. Max 20MB.

**Storage adapter** (switched via `STORAGE_TYPE` env var):
- `local` → write to `public/uploads/<uuid>.<ext>`, return `/uploads/<uuid>.<ext>`
- `s3` → stream to S3-compatible bucket using AWS SDK v3, return `https://<bucket>/<key>`

**Usage:** Returned URL stored in `elements.data.imageUrl`. Displayed via the React `<ImageSlot>` component inside frame nodes.

---

## Auth Flow

1. Unauthenticated user visits any protected route → redirect to `/login`
2. `/login` renders centered card with "Continue with Google" button
3. NextAuth handles `/api/auth/signin/google` → Google OAuth consent → `/api/auth/callback/google`
4. On first sign-in: NextAuth creates a `users` row; on subsequent sign-ins it updates `name` and `image`
5. Session stored as a JWT cookie (NextAuth default)
6. After sign-in: redirect to `/dashboard`
7. Sign-out: NextAuth clears session cookie, redirect to `/`

---

## Environment Variables

```
DATABASE_URL              PostgreSQL connection string
NEXTAUTH_SECRET           Random secret for JWT signing
NEXTAUTH_URL              Public base URL (e.g. https://inkycut.com)
GOOGLE_CLIENT_ID          Google OAuth client ID
GOOGLE_CLIENT_SECRET      Google OAuth client secret
OPENAI_API_KEY            OpenAI API key
STORAGE_TYPE              local | s3
AWS_ACCESS_KEY_ID         S3 key (prod only)
AWS_SECRET_ACCESS_KEY     S3 secret (prod only)
AWS_REGION                S3 region
S3_BUCKET_NAME            S3 bucket name
S3_ENDPOINT               S3-compatible endpoint URL (DO Spaces etc.)
```

---

## Key Constraints & Decisions

- **No credits system** — skipped entirely for now
- **No mobile canvas** — entire `/projects/[id]` route blocked on non-Chrome/non-desktop
- **Real-time last-write-wins** — no OT/CRDT, acceptable for MVP
- **One conversation per project** — schema supports multiples but UI exposes only one
- **Ideas are opt-in** — projects are private by default; publishing creates an `ideas` row
- **Video export is client-side only** — no backend render service; Mediabunny runs in-browser
