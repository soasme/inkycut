# Phase 3 — Canvas

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fully functional infinite canvas page with all node types, pan/zoom, toolbar, and real-time autosave (no AI or Socket.io yet — those come in Phases 4 & 5).

**Depends on:** Phase 2 complete.

**Next phase:** [phase-4-ai-chat.md](./2026-05-29-inkycut-phase-4-ai-chat.md)

---

## Task 11: Element DB query helpers

**Files:**
- Create: `src/lib/db/queries/elements.ts`
- Test: `src/__tests__/lib/queries/elements.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/__tests__/lib/queries/elements.test.ts
jest.mock("@/lib/db", () => ({ db: {} }))
import { buildElementPatch } from "@/lib/db/queries/elements"

describe("buildElementPatch", () => {
  it("allows position fields", () => {
    const patch = buildElementPatch({ x: 10, y: 20 })
    expect(patch).toEqual({ x: 10, y: 20, updatedAt: expect.any(Date) })
  })

  it("allows data merge", () => {
    const patch = buildElementPatch({ data: { slug: "NEW" } })
    expect(patch.data).toEqual({ slug: "NEW" })
  })

  it("strips unknown fields", () => {
    const patch = buildElementPatch({ id: "hack", projectId: "hack" } as any)
    expect(patch).not.toHaveProperty("id")
    expect(patch).not.toHaveProperty("projectId")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/__tests__/lib/queries/elements.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/db/queries/elements'`

- [ ] **Step 3: Write `src/lib/db/queries/elements.ts`**

```ts
import { db } from "@/lib/db"
import { elements, elementConnections } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

const ALLOWED_PATCH_FIELDS = new Set(["x", "y", "w", "h", "type", "data"])

export function buildElementPatch(raw: Record<string, unknown>) {
  const patch: Record<string, unknown> = { updatedAt: new Date() }
  for (const key of ALLOWED_PATCH_FIELDS) {
    if (key in raw) patch[key] = raw[key]
  }
  return patch
}

export async function getElementsByProject(projectId: string) {
  return db.select().from(elements).where(eq(elements.projectId, projectId))
}

export async function createElement(input: {
  projectId: string
  type: string
  x: number
  y: number
  w: number
  h?: number
  data: Record<string, unknown>
}) {
  const [element] = await db.insert(elements).values(input).returning()
  return element
}

export async function updateElement(id: string, projectId: string, patch: Record<string, unknown>) {
  const safePatch = buildElementPatch(patch)
  const [updated] = await db
    .update(elements)
    .set(safePatch)
    .where(and(eq(elements.id, id), eq(elements.projectId, projectId)))
    .returning()
  return updated ?? null
}

export async function deleteElement(id: string, projectId: string) {
  await db.delete(elements).where(and(eq(elements.id, id), eq(elements.projectId, projectId)))
}

export async function getConnectionsByProject(projectId: string) {
  return db.select().from(elementConnections).where(eq(elementConnections.projectId, projectId))
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest src/__tests__/lib/queries/elements.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/queries/elements.ts src/__tests__/lib/queries/elements.test.ts
git commit -m "feat: add element DB query helpers with safe patch builder"
```

---

## Task 12: Element API routes

**Files:**
- Create: `src/app/api/elements/route.ts`
- Create: `src/app/api/elements/[id]/route.ts`

- [ ] **Step 1: Write `src/app/api/elements/route.ts`**

```ts
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createElement, getElementsByProject } from "@/lib/db/queries/elements"
import { getProjectById } from "@/lib/db/queries/projects"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get("projectId")
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 })

  const project = await getProjectById(projectId, session.user.id)
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const els = await getElementsByProject(projectId)
  return NextResponse.json(els)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { projectId, type, x, y, w, h, data } = body

  const project = await getProjectById(projectId, session.user.id)
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const element = await createElement({ projectId, type, x, y, w, h, data: data ?? {} })
  return NextResponse.json(element, { status: 201 })
}
```

- [ ] **Step 2: Write `src/app/api/elements/[id]/route.ts`**

```ts
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { updateElement, deleteElement } from "@/lib/db/queries/elements"
import { getProjectById } from "@/lib/db/queries/projects"
import { db } from "@/lib/db"
import { elements } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

async function getElementProject(elementId: string, userId: string) {
  const rows = await db.select().from(elements).where(eq(elements.id, elementId)).limit(1)
  if (!rows[0]) return null
  return getProjectById(rows[0].projectId, userId)
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const project = await getElementProject(params.id, session.user.id)
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const patch = await req.json()
  const updated = await updateElement(params.id, project.id, patch)
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const project = await getElementProject(params.id, session.user.id)
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await deleteElement(params.id, project.id)
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/elements/
git commit -m "feat: add element create/update/delete API routes"
```

---

## Task 13: Canvas Zustand store

**Files:**
- Create: `src/hooks/useCanvas.ts`
- Test: `src/__tests__/hooks/useCanvas.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/hooks/useCanvas.test.ts
import { act, renderHook } from "@testing-library/react"
import { useCanvasStore } from "@/hooks/useCanvas"

describe("useCanvasStore", () => {
  beforeEach(() => useCanvasStore.getState().reset())

  it("starts with no elements", () => {
    const { result } = renderHook(() => useCanvasStore())
    expect(result.current.elements).toHaveLength(0)
  })

  it("addElement appends to elements", () => {
    const { result } = renderHook(() => useCanvasStore())
    act(() => {
      result.current.addElement({
        id: "e1", projectId: "p1", type: "note",
        x: 0, y: 0, w: 200, h: null,
        data: { text: "hello" }, createdAt: new Date(), updatedAt: new Date(),
      })
    })
    expect(result.current.elements).toHaveLength(1)
    expect(result.current.elements[0].id).toBe("e1")
  })

  it("updateElement patches an existing element", () => {
    const { result } = renderHook(() => useCanvasStore())
    act(() => {
      result.current.addElement({
        id: "e1", projectId: "p1", type: "note",
        x: 0, y: 0, w: 200, h: null,
        data: { text: "hello" }, createdAt: new Date(), updatedAt: new Date(),
      })
      result.current.updateElement("e1", { x: 50 })
    })
    expect(result.current.elements[0].x).toBe(50)
  })

  it("removeElement deletes element by id", () => {
    const { result } = renderHook(() => useCanvasStore())
    act(() => {
      result.current.addElement({
        id: "e1", projectId: "p1", type: "note",
        x: 0, y: 0, w: 200, h: null,
        data: { text: "hello" }, createdAt: new Date(), updatedAt: new Date(),
      })
      result.current.removeElement("e1")
    })
    expect(result.current.elements).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/__tests__/hooks/useCanvas.test.ts
```

Expected: FAIL

- [ ] **Step 3: Write `src/hooks/useCanvas.ts`**

```ts
import { create } from "zustand"
import type { CanvasElement, CanvasViewport, ElementType } from "@/types/canvas"

interface CanvasStore {
  elements: CanvasElement[]
  viewport: CanvasViewport
  selectedId: string | null
  draggingId: string | null

  // Element operations
  setElements: (elements: CanvasElement[]) => void
  addElement: (element: CanvasElement) => void
  updateElement: (id: string, patch: Partial<CanvasElement>) => void
  removeElement: (id: string) => void

  // Viewport
  setViewport: (viewport: CanvasViewport) => void
  setSelectedId: (id: string | null) => void
  setDraggingId: (id: string | null) => void

  reset: () => void
}

const DEFAULT_VIEWPORT: CanvasViewport = { x: 30, y: 24, scale: 0.78 }

export const useCanvasStore = create<CanvasStore>((set) => ({
  elements: [],
  viewport: DEFAULT_VIEWPORT,
  selectedId: null,
  draggingId: null,

  setElements: (elements) => set({ elements }),
  addElement: (element) => set((s) => ({ elements: [...s.elements, element] })),
  updateElement: (id, patch) =>
    set((s) => ({
      elements: s.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    })),
  removeElement: (id) =>
    set((s) => ({ elements: s.elements.filter((e) => e.id !== id) })),

  setViewport: (viewport) => set({ viewport }),
  setSelectedId: (selectedId) => set({ selectedId }),
  setDraggingId: (draggingId) => set({ draggingId }),

  reset: () => set({ elements: [], viewport: DEFAULT_VIEWPORT, selectedId: null, draggingId: null }),
}))
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest src/__tests__/hooks/useCanvas.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCanvas.ts src/__tests__/hooks/
git commit -m "feat: add Zustand canvas store with element CRUD and viewport"
```

---

## Task 14: Autosave hook

**Files:**
- Create: `src/hooks/useAutosave.ts`
- Test: `src/__tests__/hooks/useAutosave.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/hooks/useAutosave.test.ts
import { renderHook, act } from "@testing-library/react"
import { useAutosave } from "@/hooks/useAutosave"

jest.useFakeTimers()

describe("useAutosave", () => {
  it("calls saveFn after debounce delay", async () => {
    const saveFn = jest.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useAutosave(saveFn, 800))

    act(() => { result.current.trigger({ x: 100 }) })
    expect(saveFn).not.toHaveBeenCalled()

    act(() => { jest.advanceTimersByTime(800) })
    expect(saveFn).toHaveBeenCalledWith({ x: 100 })
  })

  it("debounces multiple rapid calls", () => {
    const saveFn = jest.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useAutosave(saveFn, 800))

    act(() => {
      result.current.trigger({ x: 1 })
      result.current.trigger({ x: 2 })
      result.current.trigger({ x: 3 })
    })
    act(() => { jest.advanceTimersByTime(800) })
    expect(saveFn).toHaveBeenCalledTimes(1)
    expect(saveFn).toHaveBeenCalledWith({ x: 3 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/__tests__/hooks/useAutosave.test.ts
```

Expected: FAIL

- [ ] **Step 3: Write `src/hooks/useAutosave.ts`**

```ts
import { useRef, useCallback } from "react"

export function useAutosave<T>(saveFn: (data: T) => Promise<void>, delayMs: number) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestData = useRef<T | null>(null)

  const trigger = useCallback((data: T) => {
    latestData.current = data
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      if (latestData.current !== null) saveFn(latestData.current)
    }, delayMs)
  }, [saveFn, delayMs])

  return { trigger }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest src/__tests__/hooks/useAutosave.test.ts
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useAutosave.ts src/__tests__/hooks/useAutosave.test.ts
git commit -m "feat: add debounced autosave hook"
```

---

## Task 15: BrowserGate and canvas page scaffold

**Files:**
- Create: `src/components/ui/BrowserGate.tsx`
- Create: `src/app/projects/[id]/page.tsx`
- Test: `src/__tests__/components/BrowserGate.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/__tests__/components/BrowserGate.test.tsx
import { render, screen } from "@testing-library/react"
import { BrowserGate } from "@/components/ui/BrowserGate"

describe("BrowserGate", () => {
  const originalUA = navigator.userAgent

  afterEach(() => {
    Object.defineProperty(navigator, "userAgent", { value: originalUA, configurable: true })
  })

  it("renders children on Chrome desktop", () => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      configurable: true,
    })
    render(<BrowserGate><div>Canvas content</div></BrowserGate>)
    expect(screen.getByText("Canvas content")).toBeInTheDocument()
  })

  it("renders gate overlay on Firefox", () => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (X11; Linux x86_64; rv:126.0) Gecko/20100101 Firefox/126.0",
      configurable: true,
    })
    render(<BrowserGate><div>Canvas content</div></BrowserGate>)
    expect(screen.queryByText("Canvas content")).not.toBeInTheDocument()
    expect(screen.getByText(/Chrome on desktop/i)).toBeInTheDocument()
  })

  it("renders gate overlay on mobile Chrome", () => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36",
      configurable: true,
    })
    render(<BrowserGate><div>Canvas content</div></BrowserGate>)
    expect(screen.queryByText("Canvas content")).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/__tests__/components/BrowserGate.test.tsx
```

Expected: FAIL

- [ ] **Step 3: Write `src/components/ui/BrowserGate.tsx`**

```tsx
"use client"
import { useEffect, useState } from "react"
import Link from "next/link"

function isSupported() {
  if (typeof navigator === "undefined") return false
  const ua = navigator.userAgent
  return /Chrome/.test(ua) && !/Mobile|Android|iPhone|iPad/.test(ua)
}

export function BrowserGate({ children }: { children: React.ReactNode }) {
  const [supported, setSupported] = useState<boolean | null>(null)

  useEffect(() => { setSupported(isSupported()) }, [])

  if (supported === null) return null // SSR — render nothing until client

  if (!supported) {
    return (
      <div style={{
        minHeight: "100vh", display: "grid", placeItems: "center",
        background: "var(--ink)", color: "#fff",
      }}>
        <div style={{ textAlign: "center", maxWidth: 420, padding: "0 24px" }}>
          <div style={{
            width: 48, height: 48, borderRadius: 13, background: "rgba(255,255,255,.08)",
            display: "grid", placeItems: "center", margin: "0 auto 20px",
          }}>
            <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
              <path d="M7 4.6 L18.2 11.4 L7 18.2 Z" fill="#fff" />
              <path d="M4.5 19.5 L19 5.5" stroke="#2f9fe0" strokeWidth="2.1" strokeLinecap="round" />
            </svg>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 12 }}>
            Canvas requires Chrome on desktop
          </h1>
          <p style={{ color: "rgba(255,255,255,.6)", fontSize: 15, lineHeight: 1.55, marginBottom: 24 }}>
            Inkycut uses browser APIs for video rendering that are only available in Chrome on a desktop or laptop computer.
            Please open this link in Chrome to continue.
          </p>
          <Link href="/dashboard" className="btn btn-accent">← Back to dashboard</Link>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest src/__tests__/components/BrowserGate.test.tsx
```

Expected: PASS (3 tests)

- [ ] **Step 5: Write `src/app/projects/[id]/page.tsx`**

```tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getProjectById } from "@/lib/db/queries/projects"
import { getElementsByProject } from "@/lib/db/queries/elements"
import { db } from "@/lib/db"
import { conversations } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { BrowserGate } from "@/components/ui/BrowserGate"
import { Canvas } from "@/components/canvas/Canvas"
import "@/../styles/app.css"

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const project = await getProjectById(params.id, session.user.id)
  if (!project) redirect("/dashboard")

  const elements = await getElementsByProject(params.id)

  const convRows = await db.select().from(conversations).where(eq(conversations.projectId, params.id)).limit(1)
  const conversationId = convRows[0]?.id ?? null

  return (
    <BrowserGate>
      <Canvas
        project={project}
        initialElements={elements}
        conversationId={conversationId}
        userId={session.user.id}
        userName={session.user.name ?? ""}
        userImage={session.user.image ?? ""}
      />
    </BrowserGate>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/BrowserGate.tsx src/app/projects/ src/__tests__/components/BrowserGate.test.tsx
git commit -m "feat: add BrowserGate (Chrome/desktop only) and canvas page scaffold"
```

---

## Task 16: Canvas node components

**Files:**
- Create: `src/components/canvas/nodes/NodeWrapper.tsx`
- Create: `src/components/canvas/nodes/FrameNode.tsx`
- Create: `src/components/canvas/nodes/CharacterNode.tsx`
- Create: `src/components/canvas/nodes/DocNode.tsx`
- Create: `src/components/canvas/nodes/StoryboardNode.tsx`
- Create: `src/components/canvas/nodes/ShotlistNode.tsx`
- Create: `src/components/canvas/nodes/NoteNode.tsx`

All node components are ports of the reference `app-cards.jsx` to typed React components.

- [ ] **Step 1: Write `src/components/canvas/nodes/NodeWrapper.tsx`**

```tsx
"use client"
import type { CanvasElement } from "@/types/canvas"

interface NodeWrapperProps {
  element: CanvasElement
  selected: boolean
  dragging: boolean
  onPointerDown: (e: React.PointerEvent) => void
  children: React.ReactNode
}

export function NodeWrapper({ element, selected, dragging, onPointerDown, children }: NodeWrapperProps) {
  let cls = "node"
  if (element.type === "frame") cls += " frame-node"
  if (element.type === "note") cls += " note-node"
  if (selected) cls += " sel"
  if (dragging) cls += " dragging"

  return (
    <div
      className={cls}
      style={{ left: element.x, top: element.y, width: element.w, height: element.h ?? undefined }}
      onPointerDown={onPointerDown}
    >
      {children}
    </div>
  )
}

export function NHead({ label, type }: { label: string; type: string }) {
  return (
    <div className="nhead nh-drag">
      <span className="nh-dot" />{label}
      <span className="nh-type">{type}</span>
    </div>
  )
}
```

- [ ] **Step 2: Write `src/components/canvas/nodes/FrameNode.tsx`**

```tsx
import type { CanvasElement, FrameData } from "@/types/canvas"

export function FrameNode({ element }: { element: CanvasElement }) {
  const data = element.data as FrameData
  return (
    <div className="fwrap" style={{ aspectRatio: data.ar ?? "16 / 10" }}>
      <div className="fhandle nh-drag" />
      <div className={`frame f-${data.hue ?? "slate"}`} />
      <span className="fslug">
        {data.rec && <span className="rec" />}
        {data.slug}
      </span>
      <span className="fmeta">{data.meta}</span>
    </div>
  )
}
```

- [ ] **Step 3: Write `src/components/canvas/nodes/CharacterNode.tsx`**

```tsx
import { NHead } from "./NodeWrapper"
import { Frame } from "@/components/ui/Frame"
import type { CanvasElement, CharacterData } from "@/types/canvas"

export function CharacterNode({ element }: { element: CanvasElement }) {
  const data = element.data as CharacterData
  const hues = data.hues ?? ["slate", "slate", "slate"]
  const palette = data.palette ?? []
  return (
    <>
      <NHead label="Character" type="universe" />
      <div className="char-body">
        <div className="char-meta">
          <span className="cn">{data.name}</span>
          <span className="cr">{data.role}</span>
        </div>
        <div className="char-row">
          <Frame hue={hues[0] as any} slug="FRONT" />
          <Frame hue={hues[1] as any} slug="3/4" />
          <Frame hue={hues[2] as any} slug="BACK" />
        </div>
        <div className="char-sw">
          {palette.map((c, i) => <i key={i} style={{ background: c }} />)}
          <span className="lk">palette · locked</span>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 4: Write `src/components/canvas/nodes/DocNode.tsx`**

```tsx
import { NHead } from "./NodeWrapper"
import type { CanvasElement, DocData } from "@/types/canvas"

export function DocNode({ element }: { element: CanvasElement }) {
  const data = element.data as DocData
  return (
    <>
      <NHead label={data.title ?? "Document"} type="doc" />
      <div className="doc-body" data-no-drag>
        <div dangerouslySetInnerHTML={{ __html: data.content ?? "" }} />
      </div>
    </>
  )
}
```

- [ ] **Step 5: Write `src/components/canvas/nodes/StoryboardNode.tsx`**

```tsx
"use client"
import { NHead } from "./NodeWrapper"
import { Frame } from "@/components/ui/Frame"
import type { CanvasElement, StoryboardData } from "@/types/canvas"

interface StoryboardNodeProps {
  element: CanvasElement
  onGenerateShotlist: (element: CanvasElement) => void
  busy: boolean
}

export function StoryboardNode({ element, onGenerateShotlist, busy }: StoryboardNodeProps) {
  const data = element.data as StoryboardData
  const hues = data.hues ?? ["slate", "slate", "slate", "slate"]
  return (
    <>
      <NHead label={data.title} type="board" />
      <div className="sb-body">
        <div className="sb-strip">
          {hues.map((h, i) => (
            <Frame key={i} hue={h as any} slug={String(i + 1).padStart(2, "0")} />
          ))}
        </div>
        <div className="sb-foot">
          <span className="lbl">{hues.length} shots boarded</span>
          <button
            className="btn-mini"
            data-no-drag
            disabled={data.hasShotList || busy}
            onClick={(e) => { e.stopPropagation(); onGenerateShotlist(element) }}
          >
            {data.hasShotList ? "✓ shot list created" : busy ? "✦ working…" : "Generate shot list →"}
          </button>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 6: Write `src/components/canvas/nodes/ShotlistNode.tsx`**

```tsx
import { NHead } from "./NodeWrapper"
import type { CanvasElement, ShotlistData } from "@/types/canvas"

export function ShotlistNode({ element }: { element: CanvasElement }) {
  const data = element.data as ShotlistData
  const shots = data.shots ?? []
  return (
    <>
      <NHead label={data.title} type="shot list" />
      <div className="sl-body" data-no-drag style={{ maxHeight: (element.h ?? 290) - 31 }}>
        <div className="sl-h"><span>#</span><span>Shot</span><span>Lens</span><span>Move</span><span>Dur</span></div>
        {shots.map((s, i) => (
          <div key={s.n} className="sl-r" style={{ animationDelay: `${i * 60}ms` }}>
            <span className="n">{s.n}</span>
            <span className="d">{s.d}</span>
            <span className="l">{s.l}</span>
            <span className="m">{s.m}</span>
            <span className="t">{s.t}</span>
          </div>
        ))}
      </div>
    </>
  )
}
```

- [ ] **Step 7: Write `src/components/canvas/nodes/NoteNode.tsx`**

```tsx
"use client"
import { NHead } from "./NodeWrapper"
import type { CanvasElement, NoteData } from "@/types/canvas"

interface NoteNodeProps {
  element: CanvasElement
  onTextChange: (id: string, text: string) => void
}

export function NoteNode({ element, onTextChange }: NoteNodeProps) {
  const data = element.data as NoteData
  return (
    <>
      <NHead label="Note" type="" />
      <div
        className="note-body"
        data-no-drag
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => onTextChange(element.id, e.currentTarget.textContent ?? "")}
      >
        {data.text}
      </div>
    </>
  )
}
```

- [ ] **Step 8: Commit**

```bash
git add src/components/canvas/nodes/
git commit -m "feat: port all canvas node components from reference implementation"
```

---

## Task 17: Stage, Toolbar, ZoomControls, CanvasTopbar, and Canvas orchestrator

**Files:**
- Create: `src/components/canvas/Stage.tsx`
- Create: `src/components/canvas/Toolbar.tsx`
- Create: `src/components/canvas/ZoomControls.tsx`
- Create: `src/components/canvas/CanvasTopbar.tsx`
- Create: `src/components/canvas/Canvas.tsx`

- [ ] **Step 1: Write `src/components/canvas/Stage.tsx`**

```tsx
"use client"
import { useRef, useEffect, useCallback } from "react"
import { useCanvasStore } from "@/hooks/useCanvas"
import { NodeWrapper } from "./nodes/NodeWrapper"
import { FrameNode } from "./nodes/FrameNode"
import { CharacterNode } from "./nodes/CharacterNode"
import { DocNode } from "./nodes/DocNode"
import { StoryboardNode } from "./nodes/StoryboardNode"
import { ShotlistNode } from "./nodes/ShotlistNode"
import { NoteNode } from "./nodes/NoteNode"
import type { CanvasElement } from "@/types/canvas"

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

interface StageProps {
  onNodeUpdate: (id: string, patch: Partial<CanvasElement>) => void
  busy: boolean
  onGenerateShotlist: (element: CanvasElement) => void
  onNoteChange: (id: string, text: string) => void
}

export function Stage({ onNodeUpdate, busy, onGenerateShotlist, onNoteChange }: StageProps) {
  const { elements, viewport, selectedId, draggingId, setViewport, setSelectedId, setDraggingId } = useCanvasStore()
  const stageRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ mode: "pan" | "node"; id?: string; sx: number; sy: number; ox: number; oy: number; scale?: number } | null>(null)

  // Pointer move + up handlers
  useEffect(() => {
    function move(e: PointerEvent) {
      const d = drag.current
      if (!d) return
      if (d.mode === "pan") {
        setViewport({ ...viewport, x: d.ox + (e.clientX - d.sx), y: d.oy + (e.clientY - d.sy) })
      } else if (d.mode === "node" && d.id) {
        const scale = d.scale ?? 1
        onNodeUpdate(d.id, {
          x: d.ox + (e.clientX - d.sx) / scale,
          y: d.oy + (e.clientY - d.sy) / scale,
        })
      }
    }
    function up() {
      drag.current = null
      setDraggingId(null)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up) }
  }, [viewport, onNodeUpdate, setDraggingId, setViewport])

  // Wheel zoom
  useEffect(() => {
    const el = stageRef.current!
    function wheel(e: WheelEvent) {
      const sc = (e.target as HTMLElement).closest?.("[data-no-drag]")
      if (sc) return
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const sx = e.clientX - rect.left, sy = e.clientY - rect.top
      const factor = e.deltaY < 0 ? 1.12 : 0.89
      setViewport((v: any) => {
        const scale = clamp(v.scale * factor, 0.25, 2.4)
        const k = scale / v.scale
        return { x: sx - (sx - v.x) * k, y: sy - (sy - v.y) * k, scale }
      })
    }
    el.addEventListener("wheel", wheel, { passive: false })
    return () => el.removeEventListener("wheel", wheel)
  }, [setViewport])

  function onStageDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest(".node")) return
    drag.current = { mode: "pan", sx: e.clientX, sy: e.clientY, ox: viewport.x, oy: viewport.y }
    setSelectedId(null)
  }

  function onNodeDown(e: React.PointerEvent, el: CanvasElement) {
    if ((e.target as HTMLElement).closest("[data-no-drag]")) { setSelectedId(el.id); return }
    e.stopPropagation()
    setSelectedId(el.id)
    setDraggingId(el.id)
    drag.current = { mode: "node", id: el.id, sx: e.clientX, sy: e.clientY, ox: el.x, oy: el.y, scale: viewport.scale }
  }

  return (
    <div
      ref={stageRef}
      className={`stage${draggingId ? " panning" : ""}`}
      onPointerDown={onStageDown}
    >
      <div
        className="stage-dots"
        style={{
          backgroundImage: "radial-gradient(rgba(20,20,26,.13) 1px, transparent 1.4px)",
          backgroundSize: `${24 * viewport.scale}px ${24 * viewport.scale}px`,
          backgroundPosition: `${viewport.x}px ${viewport.y}px`,
        }}
      />
      <div
        className="canvas-layer"
        style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})` }}
      >
        {elements.map((el) => (
          <NodeWrapper
            key={el.id}
            element={el}
            selected={selectedId === el.id}
            dragging={draggingId === el.id}
            onPointerDown={(e) => onNodeDown(e, el)}
          >
            {el.type === "frame" && <FrameNode element={el} />}
            {el.type === "character" && <CharacterNode element={el} />}
            {el.type === "doc" && <DocNode element={el} />}
            {el.type === "storyboard" && <StoryboardNode element={el} onGenerateShotlist={onGenerateShotlist} busy={busy} />}
            {el.type === "shotlist" && <ShotlistNode element={el} />}
            {el.type === "note" && <NoteNode element={el} onTextChange={onNoteChange} />}
          </NodeWrapper>
        ))}
      </div>
      <div className="hint">drag canvas to pan · scroll to zoom · drag cards to move</div>
    </div>
  )
}
```

- [ ] **Step 2: Write `src/components/canvas/Toolbar.tsx`**

```tsx
"use client"
import { useCanvasStore } from "@/hooks/useCanvas"

const PATHS: Record<string, string> = {
  cursor: "M6 3l13 8-6 1.5 3.5 6-2.5 1.5-3.5-6L6 18z",
  plus: "M12 5v14M5 12h14",
  text: "M5 6h14M12 6v13M9 19h6",
  user: "M12 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM5 20c0-3 3-5 7-5s7 2 7 5",
  board: "M4 5h16v14H4zM4 10h16M10 10v9",
  bolt: "M13 3L5 13h6l-1 8 8-11h-6z",
}

function Icon({ n, s = 20 }: { n: string; s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={n === "cursor" ? "currentColor" : "none"}
      stroke={n === "cursor" ? "none" : "currentColor"} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[n]} />
    </svg>
  )
}

interface ToolbarProps {
  onAddFrame: () => void
  onAddNote: () => void
  onAddCharacter: () => void
  onAddStoryboard: () => void
  onFocusChat: () => void
}

export function Toolbar({ onAddFrame, onAddNote, onAddCharacter, onAddStoryboard, onFocusChat }: ToolbarProps) {
  const { selectedId, setSelectedId } = useCanvasStore()

  const tools = [
    { id: "select", icon: "cursor", tip: "Select / pan", k: "V", act: () => setSelectedId(null) },
    { id: "frame", icon: "plus", tip: "Add frame", k: "F", act: onAddFrame },
    { id: "text", icon: "text", tip: "Add note", k: "T", act: onAddNote },
    { id: "char", icon: "user", tip: "New character", k: "C", act: onAddCharacter },
    { id: "board", icon: "board", tip: "New storyboard", k: "B", act: onAddStoryboard },
    null, // separator
    { id: "ai", icon: "bolt", tip: "Ask a specialist", k: "/", act: onFocusChat },
  ]

  return (
    <div className="toolbar" onPointerDown={(e) => e.stopPropagation()}>
      {tools.map((t, i) =>
        t === null ? <div key={i} className="tool-sep" /> : (
          <div key={t.id} className={`tool${!selectedId && t.id === "select" ? " active" : ""}`} onClick={t.act}>
            <Icon n={t.icon} />
            <span className="tip">{t.tip}</span>
            <span className="kbd">{t.k}</span>
          </div>
        )
      )}
    </div>
  )
}
```

- [ ] **Step 3: Write `src/components/canvas/ZoomControls.tsx`**

```tsx
"use client"
import { useCanvasStore } from "@/hooks/useCanvas"

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

const PATHS: Record<string, string> = {
  zout: "M5 12h14", zin: "M12 5v14M5 12h14",
  fit: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
}

function Icon({ n, s = 16 }: { n: string; s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <path d={PATHS[n]} />
    </svg>
  )
}

export function ZoomControls() {
  const { viewport, setViewport } = useCanvasStore()

  function zoom(factor: number) {
    setViewport((v: any) => {
      const scale = clamp(v.scale * factor, 0.25, 2.4)
      return { ...v, scale }
    })
  }

  return (
    <div className="zoomctl" onPointerDown={(e) => e.stopPropagation()}>
      <button onClick={() => zoom(0.85)} title="Zoom out"><Icon n="zout" /></button>
      <span className="pct" onClick={() => setViewport({ x: 30, y: 24, scale: 0.78 })}>
        {Math.round(viewport.scale * 100)}%
      </span>
      <button onClick={() => zoom(1.15)} title="Zoom in"><Icon n="zin" /></button>
      <button onClick={() => setViewport({ x: 30, y: 24, scale: 0.78 })} title="Fit"><Icon n="fit" s={15} /></button>
    </div>
  )
}
```

- [ ] **Step 4: Write `src/components/canvas/CanvasTopbar.tsx`**

```tsx
"use client"
import Link from "next/link"

interface CanvasTopbarProps {
  projectName: string
  onProjectNameChange: (name: string) => void
  collaborators: Array<{ userId: string; name: string; image?: string }>
  onExport: () => void
}

export function CanvasTopbar({ projectName, onProjectNameChange, collaborators, onExport }: CanvasTopbarProps) {
  return (
    <div className="topbar">
      <div className="tb-group">
        <Link className="logo-mark" href="/dashboard" title="Inkycut home" style={{ width: 28, height: 28, borderRadius: 8 }}>
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M7 4.6 L18.2 11.4 L7 18.2 Z" fill="#fff" />
            <path d="M4.5 19.5 L19 5.5" stroke="#2f9fe0" strokeWidth="2.1" strokeLinecap="round" />
          </svg>
        </Link>
        <span
          className="tb-name"
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onProjectNameChange(e.currentTarget.textContent ?? projectName)}
        >
          {projectName}
        </span>
      </div>
      <div className="tb-right">
        {collaborators.length > 0 && (
          <div className="avatars">
            {collaborators.slice(0, 3).map((c) => (
              <span key={c.userId} className="av" title={c.name}
                style={{ background: "#5b7a9a" }}>
                {c.name.slice(0, 2).toUpperCase()}
              </span>
            ))}
          </div>
        )}
        <button className="btn btn-primary" style={{ padding: "10px 18px" }} onClick={onExport}>
          Export video
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Write `src/components/canvas/Canvas.tsx`** — the full orchestrator

```tsx
"use client"
import { useEffect, useRef, useCallback } from "react"
import { useCanvasStore } from "@/hooks/useCanvas"
import { useAutosave } from "@/hooks/useAutosave"
import { Stage } from "./Stage"
import { Toolbar } from "./Toolbar"
import { ZoomControls } from "./ZoomControls"
import { CanvasTopbar } from "./CanvasTopbar"
import { ChatPanel } from "./chat/ChatPanel"
import type { CanvasElement } from "@/types/canvas"

interface CanvasProps {
  project: { id: string; name: string; viewportX: number; viewportY: number; viewportScale: number }
  initialElements: CanvasElement[]
  conversationId: string | null
  userId: string
  userName: string
  userImage: string
}

const HUES = ["slate", "rain", "amber", "crimson", "forest"] as const
const SLUGS = ["EST_SHOT", "HERO_LOOK", "INT_NIGHT", "EXT_DAY", "CHASE_01", "CU_FACE"]

export function Canvas({ project, initialElements, conversationId, userId, userName, userImage }: CanvasProps) {
  const store = useCanvasStore()
  const chatRef = useRef<{ focus: () => void }>(null)
  const genCount = useRef(0)

  // Initialise store from server data
  useEffect(() => {
    store.setElements(initialElements)
    store.setViewport({ x: project.viewportX, y: project.viewportY, scale: project.viewportScale })
    return () => store.reset()
  }, [project.id]) // eslint-disable-line

  // Autosave viewport
  const saveViewport = useCallback(async (viewport: { x: number; y: number; scale: number }) => {
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(viewport),
    })
  }, [project.id])
  const viewportSave = useAutosave(saveViewport, 1000)
  useEffect(() => { viewportSave.trigger(store.viewport) }, [store.viewport]) // eslint-disable-line

  // Autosave element position/size
  const saveElement = useCallback(async ({ id, patch }: { id: string; patch: Partial<CanvasElement> }) => {
    await fetch(`/api/elements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
  }, [])
  const elementSave = useAutosave(saveElement, 800)

  function centerWorld() {
    return { x: (window.innerWidth / 2 - store.viewport.x) / store.viewport.scale, y: (window.innerHeight / 2 - store.viewport.y) / store.viewport.scale }
  }

  async function spawnElement(input: { type: string; x: number; y: number; w: number; h?: number; data: Record<string, unknown> }) {
    const res = await fetch("/api/elements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: project.id, ...input }),
    })
    if (!res.ok) return
    const el: CanvasElement = await res.json()
    store.addElement(el)
    store.setSelectedId(el.id)
    return el
  }

  function onNodeUpdate(id: string, patch: Partial<CanvasElement>) {
    store.updateElement(id, patch)
    elementSave.trigger({ id, patch })
  }

  async function handleDelete(id: string) {
    await fetch(`/api/elements/${id}`, { method: "DELETE" })
    store.removeElement(id)
  }

  function addFrame() {
    const c = centerWorld()
    const hue = HUES[genCount.current % HUES.length]
    const slug = SLUGS[genCount.current % SLUGS.length]
    genCount.current++
    spawnElement({ type: "frame", x: c.x - 150, y: c.y - 100, w: 300, data: { slug, hue, meta: "16:10", ar: "16 / 10", rec: true } })
  }

  function addNote() {
    const c = centerWorld()
    spawnElement({ type: "note", x: c.x - 115, y: c.y - 60, w: 230, data: { text: "New note…" } })
  }

  function addCharacter() {
    const c = centerWorld()
    spawnElement({ type: "character", x: c.x - 170, y: c.y - 120, w: 340, data: { name: "New Character", role: "UNIVERSE · DRAFT", hues: ["slate", "crimson", "slate"], palette: ["#1a1a1f","#4a3b38","#9a8f7a","#c9a227","#e8743b"] } })
  }

  function addStoryboard() {
    const c = centerWorld()
    spawnElement({ type: "storyboard", x: c.x - 190, y: c.y - 100, w: 380, data: { title: "New Sequence", hues: ["slate","rain","amber","forest"], hasShotList: false } })
  }

  return (
    <div className="app">
      <CanvasTopbar
        projectName={project.name}
        onProjectNameChange={async (name) => {
          await fetch(`/api/projects/${project.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name }),
          })
        }}
        collaborators={[]}
        onExport={() => { /* wired in Phase 8 — ExportModal */ }}
      />
      <div className="body">
        <Stage
          onNodeUpdate={onNodeUpdate}
          busy={false}
          onGenerateShotlist={() => {}}
          onNoteChange={(id, text) => onNodeUpdate(id, { data: { text } })}
        />
        <Toolbar
          onAddFrame={addFrame}
          onAddNote={addNote}
          onAddCharacter={addCharacter}
          onAddStoryboard={addStoryboard}
          onFocusChat={() => chatRef.current?.focus()}
        />
        <ZoomControls />
        <ChatPanel ref={chatRef} projectId={project.id} conversationId={conversationId} />
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Add PATCH route for project name and viewport**

```ts
// src/app/api/projects/[id]/route.ts — add PATCH handler:
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const project = await getProjectById(params.id, session.user.id)
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const patch = await req.json()
  const allowed = ["name", "viewportX", "viewportY", "viewportScale"]
  const safe: Record<string, unknown> = { updatedAt: new Date() }
  for (const k of allowed) { if (k in patch) safe[k] = patch[k] }
  const [updated] = await db.update(projects).set(safe).where(eq(projects.id, params.id)).returning()
  return NextResponse.json(updated)
}
```

Add imports to that file: `import { db } from "@/lib/db"; import { projects } from "@/lib/db/schema"; import { eq } from "drizzle-orm"; import { getProjectById } from "@/lib/db/queries/projects"; import { updateProjectViewport } from "@/lib/db/queries/projects"`

- [ ] **Step 7: Create a minimal ChatPanel stub** (full implementation in Phase 4)

```tsx
// src/components/canvas/chat/ChatPanel.tsx
"use client"
import { forwardRef, useImperativeHandle, useRef } from "react"

interface ChatPanelProps {
  projectId: string
  conversationId: string | null
}

export const ChatPanel = forwardRef<{ focus: () => void }, ChatPanelProps>(
  function ChatPanel({ projectId, conversationId }, ref) {
    const taRef = useRef<HTMLTextAreaElement>(null)
    useImperativeHandle(ref, () => ({ focus: () => taRef.current?.focus() }))

    return (
      <aside className="chat">
        <div className="chat-head">
          <div className="chat-title">Chat</div>
          <div className="chat-sub">▷ Video Specialist · on this board</div>
        </div>
        <div className="chat-scroll" style={{ flex: 1 }}>
          <div className="stamp">AI chat coming in Phase 4</div>
        </div>
        <div className="composer">
          <div className="composer-box">
            <textarea ref={taRef} rows={1} placeholder="Start from an idea…" />
          </div>
        </div>
      </aside>
    )
  }
)
```

- [ ] **Step 8: Verify canvas in browser**

```bash
next dev
```

1. Log in, create a project, open it
2. Verify: dot-grid background, left toolbar, zoom controls, chat panel on right
3. Click "Add frame" toolbar button → frame node appears on canvas
4. Drag frame node to new position → node moves
5. Refresh page → node is in same position (autosave working)
6. Click "Add note" → note node appears, text is editable
7. Click "New character" → character node with film-frame turnarounds
8. Click "New storyboard" → storyboard with strip and "Generate shot list" button

- [ ] **Step 9: Commit**

```bash
git add src/components/canvas/ src/app/projects/ src/app/api/projects/ src/__tests__/
git commit -m "feat: implement full infinite canvas with all node types and autosave"
```

---

**Phase 3 complete.** Verify before proceeding:

```bash
npx jest
```

- [ ] All tests pass
- [ ] Canvas loads for a project
- [ ] All 6 node types can be spawned from toolbar
- [ ] Drag-to-move works and persists across refresh
- [ ] Viewport (pan/zoom) persists across refresh
- [ ] BrowserGate blocks non-Chrome/non-desktop

Proceed to [Phase 4 — AI Chat](./2026-05-29-inkycut-phase-4-ai-chat.md).
