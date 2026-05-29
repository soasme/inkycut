# Phase 8 — Video Export

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Frame connection UI (directed edges between frame nodes), chain discovery algorithm, export modal, and Mediabunny in-browser render. Only available on Chrome desktop.

**Depends on:** Phase 7 complete.

---

## Task 33: Frame connection API route

**Files:**
- Create: `src/app/api/connections/route.ts`
- Test: `src/__tests__/lib/chains.test.ts`

- [ ] **Step 1: Write the failing test for chain discovery**

```ts
// src/__tests__/lib/chains.test.ts
import { discoverChains } from "@/lib/chains"

describe("discoverChains", () => {
  it("returns empty array for no connections", () => {
    expect(discoverChains([], [])).toEqual([])
  })

  it("finds a single linear chain", () => {
    const elements = [
      { id: "a", type: "frame" }, { id: "b", type: "frame" }, { id: "c", type: "frame" },
    ]
    const connections = [
      { fromElementId: "a", toElementId: "b" },
      { fromElementId: "b", toElementId: "c" },
    ]
    const chains = discoverChains(elements as any, connections as any)
    expect(chains).toHaveLength(1)
    expect(chains[0].map((e) => e.id)).toEqual(["a", "b", "c"])
  })

  it("finds two separate chains", () => {
    const elements = [
      { id: "a", type: "frame" }, { id: "b", type: "frame" },
      { id: "c", type: "frame" }, { id: "d", type: "frame" },
    ]
    const connections = [
      { fromElementId: "a", toElementId: "b" },
      { fromElementId: "c", toElementId: "d" },
    ]
    const chains = discoverChains(elements as any, connections as any)
    expect(chains).toHaveLength(2)
  })

  it("ignores non-frame elements", () => {
    const elements = [
      { id: "a", type: "frame" }, { id: "b", type: "note" }, { id: "c", type: "frame" },
    ]
    const connections = [{ fromElementId: "a", toElementId: "c" }]
    const chains = discoverChains(elements as any, connections as any)
    expect(chains).toHaveLength(1)
    expect(chains[0]).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/__tests__/lib/chains.test.ts
```

Expected: FAIL

- [ ] **Step 3: Write `src/lib/chains.ts`**

```ts
import type { CanvasElement } from "@/types/canvas"

interface Connection { fromElementId: string; toElementId: string }

export function discoverChains(
  elements: CanvasElement[],
  connections: Connection[]
): CanvasElement[][] {
  const frameIds = new Set(elements.filter((e) => e.type === "frame").map((e) => e.id))
  const frameById = new Map(elements.filter((e) => e.type === "frame").map((e) => [e.id, e]))

  // Build adjacency list (only frame→frame edges)
  const outgoing = new Map<string, string[]>()
  const hasIncoming = new Set<string>()

  for (const conn of connections) {
    if (!frameIds.has(conn.fromElementId) || !frameIds.has(conn.toElementId)) continue
    if (!outgoing.has(conn.fromElementId)) outgoing.set(conn.fromElementId, [])
    outgoing.get(conn.fromElementId)!.push(conn.toElementId)
    hasIncoming.add(conn.toElementId)
  }

  // Root nodes: frames with no incoming edges AND at least one outgoing edge
  const roots = [...frameIds].filter((id) => !hasIncoming.has(id) && outgoing.has(id))

  // Walk each chain
  return roots.map((rootId) => {
    const chain: CanvasElement[] = []
    let current: string | undefined = rootId
    const visited = new Set<string>()
    while (current && !visited.has(current)) {
      visited.add(current)
      const el = frameById.get(current)
      if (el) chain.push(el)
      current = outgoing.get(current)?.[0]
    }
    return chain
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest src/__tests__/lib/chains.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 5: Write `src/app/api/connections/route.ts`**

```ts
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getProjectById } from "@/lib/db/queries/projects"
import { db } from "@/lib/db"
import { elementConnections } from "@/lib/db/schema"
import { and, eq, inArray } from "drizzle-orm"
import { broadcastToProject } from "@/lib/socket"
import { elements } from "@/lib/db/schema"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { projectId, fromElementId, toElementId } = await req.json()
  if (!projectId || !fromElementId || !toElementId) {
    return NextResponse.json({ error: "projectId, fromElementId, toElementId required" }, { status: 400 })
  }

  const project = await getProjectById(projectId, session.user.id)
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const endpoints = await db
    .select()
    .from(elements)
    .where(and(
      eq(elements.projectId, projectId),
      eq(elements.type, "frame"),
      inArray(elements.id, [fromElementId, toElementId])
    ))
  if (endpoints.length !== 2) {
    return NextResponse.json({ error: "Both endpoints must be frame elements in this project" }, { status: 400 })
  }

  const [conn] = await db
    .insert(elementConnections)
    .values({ projectId, fromElementId, toElementId })
    .returning()

  try { broadcastToProject(projectId, "element:connected", conn) } catch {}

  return NextResponse.json(conn, { status: 201 })
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/chains.ts src/app/api/connections/ src/__tests__/lib/chains.test.ts
git commit -m "feat: add chain discovery algorithm and connection API route"
```

---

## Task 34: Frame connection UI on canvas

**Files:**
- Modify: `src/components/canvas/Stage.tsx`
- Modify: `src/components/canvas/Canvas.tsx`

- [ ] **Step 1: Add connection drawing to `Stage.tsx`**

Add a connection mode to Stage. When the user shift-clicks a frame node, it becomes the "source". When they shift-click a second frame node, a connection is created.

Add to `StageProps`:

```tsx
onConnectFrames: (fromId: string, toId: string) => void
connections: Array<{ fromElementId: string; toElementId: string }>
```

Add state and handler to Stage:

```tsx
const [connectSource, setConnectSource] = useState<string | null>(null)

function onNodeDown(e: React.PointerEvent, el: CanvasElement) {
  // Shift+click on frame → connection mode
  if (e.shiftKey && el.type === "frame") {
    e.stopPropagation()
    if (!connectSource) {
      setConnectSource(el.id)
    } else if (connectSource !== el.id) {
      onConnectFrames(connectSource, el.id)
      setConnectSource(null)
    } else {
      setConnectSource(null)
    }
    return
  }
  // ... existing drag logic
}
```

Render connection lines as SVG overlay in the canvas-layer:

```tsx
{/* SVG connection arrows — rendered in canvas-layer */}
<svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible" }}>
  {connections.map((conn, i) => {
    const from = elements.find((e) => e.id === conn.fromElementId)
    const to = elements.find((e) => e.id === conn.toElementId)
    if (!from || !to) return null
    const x1 = from.x + from.w / 2, y1 = from.y + (from.h ?? 200) / 2
    const x2 = to.x + to.w / 2, y2 = to.y + (to.h ?? 200) / 2
    return (
      <g key={i}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--accent)" strokeWidth={1.5 / viewport.scale} strokeDasharray={`${6 / viewport.scale},${4 / viewport.scale}`} opacity={0.7} />
        <circle cx={x2} cy={y2} r={5 / viewport.scale} fill="var(--accent)" opacity={0.8} />
      </g>
    )
  })}
  {connectSource && (() => {
    const src = elements.find((e) => e.id === connectSource)
    return src ? <circle cx={src.x + src.w / 2} cy={src.y + (src.h ?? 200) / 2} r={8 / viewport.scale} fill="none" stroke="var(--accent)" strokeWidth={2 / viewport.scale} /> : null
  })()}
</svg>
```

- [ ] **Step 2: Update `Canvas.tsx` to load and provide connections**

```tsx
// In Canvas.tsx, add state:
const [connections, setConnections] = useState<Array<{ fromElementId: string; toElementId: string }>>([])

// Load connections on mount:
useEffect(() => {
  fetch(`/api/connections?projectId=${project.id}`)
    .then((r) => r.json())
    .then(setConnections)
    .catch(() => {})
}, [project.id])

// Handler:
async function handleConnectFrames(fromId: string, toId: string) {
  const res = await fetch("/api/connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId: project.id, fromElementId: fromId, toElementId: toId }),
  })
  if (!res.ok) return
  const conn = await res.json()
  setConnections((c) => [...c, conn])
}

// Pass to Stage:
<Stage
  ...
  connections={connections}
  onConnectFrames={handleConnectFrames}
/>
```

Add a GET handler for connections to `src/app/api/connections/route.ts`:

```ts
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get("projectId")
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 })
  const project = await getProjectById(projectId, session.user.id)
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const conns = await getConnectionsByProject(projectId)
  return NextResponse.json(conns)
}
```

Add import: `import { getConnectionsByProject } from "@/lib/db/queries/elements"`

- [ ] **Step 3: Add hint text for connection mode**

Update the canvas hint at the bottom of Stage:

```tsx
<div className="hint">
  {connectSource
    ? "shift+click another frame to connect · click empty space to cancel"
    : "drag to pan · scroll to zoom · shift+click frames to connect"}
</div>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/canvas/ src/app/api/connections/ src/lib/chains.ts
git commit -m "feat: add frame connection UI with directed edge drawing and SVG overlay"
```

---

## Task 35: Export modal and Mediabunny integration

**Files:**
- Create: `src/components/canvas/export/ExportModal.tsx`
- Create: `src/components/canvas/export/useVideoExport.ts`
- Modify: `src/components/canvas/CanvasTopbar.tsx`
- Modify: `src/components/canvas/Canvas.tsx`

- [ ] **Step 1: Install Mediabunny**

```bash
npm install mediabunny html2canvas
```

Use Mediabunny's typed `Output`, `Mp4OutputFormat`, `BufferTarget`, and `CanvasSource` API. Do not use a non-existent clip/composer API and do not cast the package to `any`; verify against the installed `.d.ts` files if TypeScript reports drift.

- [ ] **Step 2: Write `src/components/canvas/export/useVideoExport.ts`**

```ts
"use client"
import { useState, useCallback } from "react"
import { discoverChains } from "@/lib/chains"
import type { CanvasElement, FrameData } from "@/types/canvas"

export type ExportState = "idle" | "rendering" | "done" | "error"

interface Chain {
  index: number
  frames: CanvasElement[]
  totalDuration: number
}

export function useVideoExport() {
  const [state, setState] = useState<ExportState>("idle")
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState("")

  function buildChains(
    elements: CanvasElement[],
    connections: Array<{ fromElementId: string; toElementId: string }>
  ): Chain[] {
    const raw = discoverChains(elements, connections)
    return raw.map((frames, i) => ({
      index: i,
      frames,
      totalDuration: frames.reduce((sum, f) => sum + ((f.data as FrameData).duration ?? 3), 0),
    }))
  }

  const renderChain = useCallback(async (chain: Chain) => {
    setState("rendering")
    setProgress(0)
    setErrorMsg("")

    try {
      // Dynamic import so Mediabunny only loads on Chrome desktop
      const { Output, Mp4OutputFormat, BufferTarget, CanvasSource, QUALITY_HIGH } = await import("mediabunny")
      const html2canvas = (await import("html2canvas")).default

      const canvas = document.createElement("canvas")
      canvas.width = 1920
      canvas.height = 1080
      const ctx = canvas.getContext("2d")!

      const output = new Output({
        format: new Mp4OutputFormat(),
        target: new BufferTarget(),
      })
      const videoSource = new CanvasSource(canvas, { codec: "avc", bitrate: QUALITY_HIGH })
      output.addVideoTrack(videoSource)
      await output.start()

      async function drawImageUrl(url: string) {
        const img = new Image()
        img.crossOrigin = "anonymous"
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve()
          img.onerror = reject
          img.src = url
        })
        ctx.fillStyle = "#000"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        const scale = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight)
        const w = img.naturalWidth * scale
        const h = img.naturalHeight * scale
        ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h)
      }

      async function drawPlaceholder(data: FrameData) {
        const el = document.createElement("div")
        el.className = `frame f-${data.hue ?? "slate"}`
        el.style.width = "1920px"
        el.style.height = "1080px"
        el.style.position = "fixed"
        el.style.left = "-9999px"
        el.innerHTML = `<span class="fslug">${data.slug ?? "FRAME"}</span><span class="fmeta">${data.meta ?? ""}</span>`
        document.body.appendChild(el)
        try {
          const rendered = await html2canvas(el, { backgroundColor: null, width: 1920, height: 1080, scale: 1 })
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(rendered, 0, 0, canvas.width, canvas.height)
        } finally {
          el.remove()
        }
      }

      let timestamp = 0
      for (let i = 0; i < chain.frames.length; i++) {
        const frame = chain.frames[i]
        const data = frame.data as FrameData
        const duration = data.duration ?? 3

        if (data.imageUrl) {
          await drawImageUrl(data.imageUrl)
        } else {
          await drawPlaceholder(data)
        }

        await videoSource.add(timestamp, duration)
        timestamp += duration
        setProgress(Math.round(((i + 1) / chain.frames.length) * 80))
      }

      setProgress(85)
      await output.finalize()
      const blob = new Blob([output.target.buffer], { type: output.format.mimeType })
      setProgress(100)

      // Trigger download
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `inkycut-sequence-${chain.index + 1}.mp4`
      a.click()
      URL.revokeObjectURL(url)

      setState("done")
    } catch (err) {
      console.error("Export failed:", err)
      setErrorMsg(err instanceof Error ? err.message : "Export failed")
      setState("error")
    }
  }, [])

  function reset() {
    setState("idle")
    setProgress(0)
    setErrorMsg("")
  }

  return { state, progress, errorMsg, buildChains, renderChain, reset }
}
```

- [ ] **Step 3: Write `src/components/canvas/export/ExportModal.tsx`**

```tsx
"use client"
import { useState } from "react"
import { useVideoExport } from "./useVideoExport"
import type { CanvasElement } from "@/types/canvas"

interface ExportModalProps {
  elements: CanvasElement[]
  connections: Array<{ fromElementId: string; toElementId: string }>
  onClose: () => void
}

export function ExportModal({ elements, connections, onClose }: ExportModalProps) {
  const { state, progress, errorMsg, buildChains, renderChain, reset } = useVideoExport()
  const [selectedChain, setSelectedChain] = useState<number | null>(null)

  const chains = buildChains(elements, connections)

  async function handleRender() {
    if (selectedChain === null) return
    await renderChain(chains[selectedChain])
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(20,20,26,.55)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", zIndex: 200 }}
      onClick={(e) => { if (state === "idle" && e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", boxShadow: "var(--shadow-3)", padding: "28px 24px", width: 440, maxWidth: "90vw" }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Export video</h2>
        <p style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 20 }}>
          Select a frame sequence to render. Each connected chain produces one MP4.
        </p>

        {chains.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: "var(--ink-faint)" }}>
            <p style={{ marginBottom: 8 }}>No connected frame sequences found.</p>
            <p style={{ fontSize: 12 }}>Shift+click two frame nodes on the canvas to create a sequence connection.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            {chains.map((chain, i) => (
              <div
                key={i}
                onClick={() => { if (state === "idle") setSelectedChain(i) }}
                style={{
                  border: `1.5px solid ${selectedChain === i ? "var(--accent)" : "var(--line)"}`,
                  borderRadius: "var(--r-sm)", padding: "12px 14px", cursor: state === "idle" ? "pointer" : "default",
                  background: selectedChain === i ? "var(--accent-tint)" : "var(--paper)",
                  transition: "border-color .15s, background .15s",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 14 }}>Sequence {i + 1}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-soft)", marginTop: 4 }}>
                  {chain.frames.length} frames · {chain.totalDuration.toFixed(1)}s
                </div>
              </div>
            ))}
          </div>
        )}

        {state === "rendering" && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--accent-700)", marginBottom: 8 }}>
              Rendering... {progress}%
            </div>
            <div style={{ height: 4, background: "var(--paper-2)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: "var(--accent)", transition: "width .3s ease" }} />
            </div>
          </div>
        )}

        {state === "done" && (
          <div style={{ marginBottom: 16, padding: "10px 14px", background: "var(--accent-tint)", borderRadius: "var(--r-sm)", fontFamily: "var(--mono)", fontSize: 12, color: "var(--accent-700)" }}>
            Export complete. Download started.
          </div>
        )}

        {state === "error" && (
          <div style={{ marginBottom: 16, padding: "10px 14px", background: "#fef2f2", borderRadius: "var(--r-sm)", fontSize: 12, color: "#b91c1c" }}>
            Export failed: {errorMsg}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={() => { reset(); onClose() }}
            disabled={state === "rendering"}
            className="btn btn-ghost"
          >
            {state === "done" ? "Close" : "Cancel"}
          </button>
          {state !== "done" && (
            <button
              onClick={handleRender}
              disabled={selectedChain === null || state === "rendering" || chains.length === 0}
              className="btn btn-accent"
            >
              {state === "rendering" ? "Rendering…" : "Render →"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Wire export button in `Canvas.tsx`**

```tsx
// In Canvas.tsx, add state:
const [showExport, setShowExport] = useState(false)

// Update CanvasTopbar:
<CanvasTopbar
  ...
  onExport={() => setShowExport(true)}
/>

// Add ExportModal at bottom of Canvas return:
{showExport && (
  <ExportModal
    elements={store.elements}
    connections={connections}
    onClose={() => setShowExport(false)}
  />
)}
```

Add import: `import { ExportModal } from "./export/ExportModal"`

- [ ] **Step 5: Verify video export in Chrome desktop**

1. Open a project canvas in Chrome on desktop
2. Add three or more frame nodes
3. Shift+click frame A → it highlights with a ring
4. Shift+click frame B → a dashed line appears connecting them
5. Shift+click frame B → shift+click frame C → another connection appears
6. Click "Export video" button in topbar
7. Export modal shows "Sequence 1: 3 frames · 9.0s"
8. Select sequence 1 → click "Render →"
9. Progress bar fills → "Export complete — download started"
10. MP4 file downloads to browser

- [ ] **Step 6: Commit**

```bash
git add src/components/canvas/export/ src/components/canvas/Canvas.tsx src/components/canvas/CanvasTopbar.tsx src/components/canvas/Stage.tsx src/lib/chains.ts
git commit -m "feat: implement video export with Mediabunny, chain picker, and frame connection UI"
```

---

## Task 36: Final self-check and end-to-end verification

- [ ] **Step 1: Run full test suite**

```bash
npm run test:coverage
```

Expected: All tests pass and coverage is 100% for branches, functions, lines, and statements.

- [ ] **Step 2: Run the app and verify the full user journey**

```bash
tsx server.ts
```

Walk through the complete golden path:

1. Open http://localhost:3000 → landing page renders with all sections
2. Click "Open Inkycut →" → redirects to `/login`
3. Click "Continue with Google" → Google OAuth → redirects to `/dashboard`
4. Dashboard shows empty project grid with "New project" button
5. Click "New project" → type name → "Create project →" → navigates to canvas
6. Canvas loads: dot grid, left toolbar, zoom controls, right chat panel
7. Non-Chrome or mobile URL → shows "Canvas requires Chrome on desktop" gate
8. Add frame (toolbar) → frame node appears, drag to reposition
9. Refresh → node is in same position (autosave)
10. Type in chat: "Add a character called The Warlord" → AI creates character node
11. Shift+click two frame nodes → dashed connection line appears
12. Click "Export video" → export modal shows the sequence
13. Click "Render →" → MP4 downloads
14. Go to `/dashboard`, hover project card → click "Publish"
15. Fill in title, genre → click "Publish →"
16. Open http://localhost:3000/ideas → project card appears in gallery
17. Click sign-out in sidebar → redirects to `/`

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: phase 8 complete — full golden path verified"
```

---

**All phases complete.**

```
Phase 1 — Foundation    complete
Phase 2 — Dashboard     complete
Phase 3 — Canvas        complete
Phase 4 — AI Chat       complete
Phase 5 — Real-time     complete
Phase 6 — File Upload   complete
Phase 7 — Ideas Gallery complete
Phase 8 — Video Export  complete
```
