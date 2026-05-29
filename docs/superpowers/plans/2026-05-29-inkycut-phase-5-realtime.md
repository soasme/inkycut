# Phase 5 — Real-time Collaboration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Custom Next.js server with Socket.io. Canvas element mutations and viewport cursor positions are broadcast to all users in the same project room in real time. Presence indicators appear in the topbar.

**Depends on:** Phase 4 complete.

**Next phase:** [phase-6-upload.md](./2026-05-29-inkycut-phase-6-upload.md)

---

## Task 22: Socket.io server singleton and custom server.ts

**Files:**
- Create: `server.ts`
- Create: `src/lib/socket.ts`
- Test: `src/__tests__/lib/socket.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/lib/socket.test.ts
import { getRoomName } from "@/lib/socket"

describe("getRoomName", () => {
  it("returns formatted room name", () => {
    expect(getRoomName("proj-123")).toBe("project:proj-123")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/__tests__/lib/socket.test.ts
```

Expected: FAIL

- [ ] **Step 3: Write `src/lib/socket.ts`** (server-side singleton)

```ts
import { Server } from "socket.io"
import type { Server as HTTPServer } from "http"

let io: Server | null = null

export function getRoomName(projectId: string) {
  return `project:${projectId}`
}

export function initSocketServer(httpServer: HTTPServer): Server {
  if (io) return io

  io = new Server(httpServer, {
    path: "/api/socket",
    cors: {
      origin: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
      credentials: true,
    },
  })

  io.on("connection", (socket) => {
    const projectId = socket.handshake.auth.projectId as string | undefined
    const userId = socket.handshake.auth.userId as string | undefined
    const userName = socket.handshake.auth.userName as string | undefined
    const userImage = socket.handshake.auth.userImage as string | undefined

    if (!projectId || !userId) { socket.disconnect(); return }

    const room = getRoomName(projectId)
    socket.join(room)

    // Announce presence
    socket.to(room).emit("presence:join", { userId, name: userName, image: userImage })

    // Relay cursor positions (throttle client-side; relay raw here)
    socket.on("viewport:cursor", (data) => {
      socket.to(room).emit("viewport:cursor", { userId, ...data })
    })

    socket.on("disconnect", () => {
      socket.to(room).emit("presence:leave", { userId })
    })
  })

  return io
}

export function getIO(): Server {
  if (!io) throw new Error("Socket.io not initialised — call initSocketServer first")
  return io
}

export function broadcastToProject(projectId: string, event: string, data: unknown) {
  getIO().to(getRoomName(projectId)).emit(event, data)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest src/__tests__/lib/socket.test.ts
```

Expected: PASS (1 test)

- [ ] **Step 5: Write `server.ts`** (project root)

```ts
import { createServer } from "http"
import { parse } from "url"
import next from "next"
import { initSocketServer } from "./src/lib/socket"

const dev = process.env.NODE_ENV !== "production"
const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true)
    handle(req, res, parsedUrl)
  })

  initSocketServer(httpServer)

  const port = parseInt(process.env.PORT ?? "3000", 10)
  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port} [${dev ? "dev" : "prod"}]`)
  })
})
```

- [ ] **Step 6: Commit**

```bash
git add server.ts src/lib/socket.ts src/__tests__/lib/socket.test.ts
git commit -m "feat: add Socket.io server singleton and custom Next.js server"
```

---

## Task 23: Broadcast element mutations from API routes

**Files:**
- Modify: `src/app/api/elements/route.ts`
- Modify: `src/app/api/elements/[id]/route.ts`
- Modify: `src/app/api/chat/route.ts`

- [ ] **Step 1: Update `src/app/api/elements/route.ts` to broadcast on create**

Add import and broadcast after `createElement`:

```ts
// Add to top of file:
import { broadcastToProject } from "@/lib/socket"

// In POST handler, after `const element = await createElement(...)`:
try {
  broadcastToProject(projectId, "element:created", element)
} catch { /* socket not ready in test env */ }
```

- [ ] **Step 2: Update `src/app/api/elements/[id]/route.ts` to broadcast on update and delete**

```ts
// Add import:
import { broadcastToProject } from "@/lib/socket"
import { db } from "@/lib/db"
import { elements as elementsTable } from "@/lib/db/schema"
import { eq as drizzleEq } from "drizzle-orm"

// In PATCH handler, after updateElement succeeds:
try {
  broadcastToProject(project.id, "element:updated", { elementId: params.id, patch: safePatch })
} catch {}

// In DELETE handler, after deleteElement:
try {
  broadcastToProject(project.id, "element:deleted", { elementId: params.id })
} catch {}
```

- [ ] **Step 3: Update `src/app/api/chat/route.ts` to broadcast mutations via socket**

In the tool call execution loop, after `executeToolCall`, replace the mutation SSE send with:

```ts
if (elementMutation) {
  mutations.push(elementMutation)
  // Broadcast to all project collaborators via Socket.io
  try {
    const { action, element, id } = elementMutation as any
    if (action === "created") broadcastToProject(projectId, "element:created", element)
    if (action === "updated") broadcastToProject(projectId, "element:updated", { elementId: (element as any)?.id, patch: element })
    if (action === "deleted") broadcastToProject(projectId, "element:deleted", { elementId: id })
  } catch {}
  // Still send SSE for the requesting client (its Zustand store updates from this)
  send(JSON.stringify({ type: "mutation", mutation: elementMutation }))
}
```

Add import: `import { broadcastToProject } from "@/lib/socket"`

- [ ] **Step 4: Commit**

```bash
git add src/app/api/elements/ src/app/api/chat/
git commit -m "feat: broadcast element mutations via Socket.io from API routes"
```

---

## Task 24: Socket.io client hooks

**Files:**
- Create: `src/hooks/useSocket.ts`
- Create: `src/hooks/usePresence.ts`
- Test: `src/__tests__/hooks/usePresence.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/hooks/usePresence.test.ts
import { act, renderHook } from "@testing-library/react"
import { usePresenceStore } from "@/hooks/usePresence"

describe("usePresenceStore", () => {
  beforeEach(() => usePresenceStore.getState().reset())

  it("starts with empty collaborators", () => {
    const { result } = renderHook(() => usePresenceStore())
    expect(result.current.collaborators).toHaveLength(0)
  })

  it("addCollaborator appends to list", () => {
    const { result } = renderHook(() => usePresenceStore())
    act(() => {
      result.current.addCollaborator({ userId: "u1", name: "Alice", image: "" })
    })
    expect(result.current.collaborators).toHaveLength(1)
  })

  it("removeCollaborator filters by userId", () => {
    const { result } = renderHook(() => usePresenceStore())
    act(() => {
      result.current.addCollaborator({ userId: "u1", name: "Alice", image: "" })
      result.current.removeCollaborator("u1")
    })
    expect(result.current.collaborators).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/__tests__/hooks/usePresence.test.ts
```

Expected: FAIL

- [ ] **Step 3: Write `src/hooks/usePresence.ts`**

```ts
import { create } from "zustand"

interface Collaborator {
  userId: string
  name: string
  image?: string
  cursor?: { x: number; y: number }
}

interface PresenceStore {
  collaborators: Collaborator[]
  addCollaborator: (c: Collaborator) => void
  removeCollaborator: (userId: string) => void
  updateCursor: (userId: string, cursor: { x: number; y: number }) => void
  reset: () => void
}

export const usePresenceStore = create<PresenceStore>((set) => ({
  collaborators: [],
  addCollaborator: (c) =>
    set((s) => ({
      collaborators: s.collaborators.some((x) => x.userId === c.userId)
        ? s.collaborators
        : [...s.collaborators, c],
    })),
  removeCollaborator: (userId) =>
    set((s) => ({ collaborators: s.collaborators.filter((c) => c.userId !== userId) })),
  updateCursor: (userId, cursor) =>
    set((s) => ({
      collaborators: s.collaborators.map((c) => (c.userId === userId ? { ...c, cursor } : c)),
    })),
  reset: () => set({ collaborators: [] }),
}))
```

- [ ] **Step 4: Write `src/hooks/useSocket.ts`**

```ts
"use client"
import { useEffect, useRef } from "react"
import { io, Socket } from "socket.io-client"
import { useCanvasStore } from "./useCanvas"
import { usePresenceStore } from "./usePresence"
import type { CanvasElement } from "@/types/canvas"

interface UseSocketOptions {
  projectId: string
  userId: string
  userName: string
  userImage: string
}

export function useSocket({ projectId, userId, userName, userImage }: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null)
  const canvasStore = useCanvasStore()
  const presenceStore = usePresenceStore()

  useEffect(() => {
    const socket = io({ path: "/api/socket", auth: { projectId, userId, userName, userImage } })
    socketRef.current = socket

    socket.on("element:created", (element: CanvasElement) => {
      canvasStore.addElement(element)
    })

    socket.on("element:updated", ({ elementId, patch }: { elementId: string; patch: Partial<CanvasElement> }) => {
      canvasStore.updateElement(elementId, patch)
    })

    socket.on("element:deleted", ({ elementId }: { elementId: string }) => {
      canvasStore.removeElement(elementId)
    })

    socket.on("presence:join", (data: { userId: string; name: string; image?: string }) => {
      presenceStore.addCollaborator(data)
    })

    socket.on("presence:leave", ({ userId }: { userId: string }) => {
      presenceStore.removeCollaborator(userId)
    })

    socket.on("viewport:cursor", ({ userId: uid, x, y }: { userId: string; x: number; y: number }) => {
      presenceStore.updateCursor(uid, { x, y })
    })

    return () => { socket.disconnect(); presenceStore.reset() }
  }, [projectId]) // eslint-disable-line

  function emitCursor(x: number, y: number) {
    socketRef.current?.emit("viewport:cursor", { x, y })
  }

  return { emitCursor }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx jest src/__tests__/hooks/usePresence.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useSocket.ts src/hooks/usePresence.ts src/__tests__/hooks/usePresence.test.ts
git commit -m "feat: add Socket.io client hooks for element sync and presence"
```

---

## Task 25: Wire Socket.io into Canvas component

**Files:**
- Modify: `src/components/canvas/Canvas.tsx`
- Modify: `src/components/canvas/CanvasTopbar.tsx`
- Modify: `src/components/canvas/Stage.tsx`

- [ ] **Step 1: Add `useSocket` to `Canvas.tsx`**

Add after the existing imports and hooks:

```tsx
// In Canvas.tsx — add import:
import { useSocket } from "@/hooks/useSocket"
import { usePresenceStore } from "@/hooks/usePresence"

// Inside the Canvas component, after existing hooks:
const { emitCursor } = useSocket({ projectId: project.id, userId, userName, userImage })
const collaborators = usePresenceStore((s) => s.collaborators)
```

Pass `collaborators` to `CanvasTopbar`:

```tsx
<CanvasTopbar
  projectName={project.name}
  onProjectNameChange={(name) => { /* patch project name */ }}
  collaborators={collaborators}
  onExport={() => { /* Phase 8 */ }}
/>
```

Pass `emitCursor` to `Stage`:

```tsx
<Stage
  onNodeUpdate={onNodeUpdate}
  busy={false}
  onGenerateShotlist={() => {}}
  onNoteChange={(id, text) => onNodeUpdate(id, { data: { text } })}
  onCursorMove={emitCursor}
/>
```

- [ ] **Step 2: Add `onCursorMove` prop to `Stage.tsx`**

Update the `StageProps` interface:

```tsx
interface StageProps {
  onNodeUpdate: (id: string, patch: Partial<CanvasElement>) => void
  busy: boolean
  onGenerateShotlist: (element: CanvasElement) => void
  onNoteChange: (id: string, text: string) => void
  onCursorMove: (x: number, y: number) => void
}
```

Add throttled cursor emission to the `onPointerMove` on the stage div:

```tsx
// In Stage component, add throttle ref:
const cursorThrottle = useRef<ReturnType<typeof setTimeout> | null>(null)

// Add to the stage div:
onPointerMove={(e) => {
  if (cursorThrottle.current) return
  cursorThrottle.current = setTimeout(() => { cursorThrottle.current = null }, 33) // ~30fps
  const rect = stageRef.current!.getBoundingClientRect()
  const wx = (e.clientX - rect.left - viewport.x) / viewport.scale
  const wy = (e.clientY - rect.top - viewport.y) / viewport.scale
  onCursorMove(wx, wy)
}}
```

- [ ] **Step 3: Verify real-time collaboration in browser**

```bash
tsx server.ts
```

Open http://localhost:3000/projects/<id> in two browser tabs (both logged in as the same or different users).

1. In tab 1, drag a frame node to a new position
2. Verify tab 2 sees the node move in real time (without refresh)
3. In tab 2, type a chat message asking the AI to add an element
4. Verify tab 1 sees the new element appear on the canvas

- [ ] **Step 4: Commit**

```bash
git add src/components/canvas/ src/hooks/
git commit -m "feat: wire Socket.io into Canvas for real-time element sync and presence"
```

---

**Phase 5 complete.** Verify before proceeding:

```bash
npx jest
tsx server.ts
```

- [ ] All tests pass
- [ ] Two browser tabs on the same project sync element mutations in real time
- [ ] Presence indicators (collaborator initials) appear in topbar when multiple users are in the same project
- [ ] Cursor moves are throttled to ~30fps

Proceed to [Phase 6 — File Upload](./2026-05-29-inkycut-phase-6-upload.md).
