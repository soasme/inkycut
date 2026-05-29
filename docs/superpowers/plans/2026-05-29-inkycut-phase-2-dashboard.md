# Phase 2 — Dashboard

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Authenticated dashboard with icon sidebar, project grid, create project modal, and delete project with confirmation.

**Depends on:** Phase 1 complete (schema migrated, auth working).

**Next phase:** [phase-3-canvas.md](./2026-05-29-inkycut-phase-3-canvas.md)

---

## Task 8: Project DB query helpers

**Files:**
- Create: `src/lib/db/queries/projects.ts`
- Test: `src/__tests__/lib/queries/projects.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/__tests__/lib/queries/projects.test.ts
jest.mock("@/lib/db", () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    delete: jest.fn(),
    query: { projects: { findMany: jest.fn() } },
  },
}))

import { getProjectsByUser, createProject, deleteProject } from "@/lib/db/queries/projects"

describe("project queries", () => {
  it("getProjectsByUser is a function", () => {
    expect(typeof getProjectsByUser).toBe("function")
  })
  it("createProject is a function", () => {
    expect(typeof createProject).toBe("function")
  })
  it("deleteProject is a function", () => {
    expect(typeof deleteProject).toBe("function")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/__tests__/lib/queries/projects.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/db/queries/projects'`

- [ ] **Step 3: Create `src/lib/db/queries/projects.ts`**

```ts
import { db } from "@/lib/db"
import { projects, elements, conversations } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"

export async function getProjectsByUser(userId: string) {
  return db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.updatedAt))
}

export async function getProjectById(projectId: string, userId: string) {
  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)
  const project = rows[0]
  if (!project || project.userId !== userId) return null
  return project
}

export async function createProject(userId: string, name: string) {
  const [project] = await db
    .insert(projects)
    .values({ userId, name })
    .returning()

  // Create default conversation
  await db.insert(conversations).values({ projectId: project.id, name: "Main" })

  return project
}

export async function deleteProject(projectId: string, userId: string) {
  const existing = await getProjectById(projectId, userId)
  if (!existing) throw new Error("Project not found or not owned by user")
  await db.delete(projects).where(eq(projects.id, projectId))
}

export async function updateProjectViewport(
  projectId: string,
  viewport: { x: number; y: number; scale: number }
) {
  await db
    .update(projects)
    .set({ viewportX: viewport.x, viewportY: viewport.y, viewportScale: viewport.scale, updatedAt: new Date() })
    .where(eq(projects.id, projectId))
}

export async function getProjectWithFirstElement(userId: string) {
  const userProjects = await getProjectsByUser(userId)
  return Promise.all(
    userProjects.map(async (p) => {
      const firstElements = await db
        .select()
        .from(elements)
        .where(eq(elements.projectId, p.id))
        .limit(1)
      return { ...p, coverElement: firstElements[0] ?? null }
    })
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest src/__tests__/lib/queries/projects.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/queries/ src/__tests__/lib/
git commit -m "feat: add project DB query helpers"
```

---

## Task 9: Project API routes (list, create, delete)

**Files:**
- Create: `src/app/api/projects/route.ts`
- Create: `src/app/api/projects/[id]/route.ts`

- [ ] **Step 1: Write `src/app/api/projects/route.ts`**

```ts
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getProjectWithFirstElement, createProject } from "@/lib/db/queries/projects"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const projects = await getProjectWithFirstElement(session.user.id)
  return NextResponse.json(projects)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 })
  const project = await createProject(session.user.id, name.trim())
  return NextResponse.json(project, { status: 201 })
}
```

- [ ] **Step 2: Write `src/app/api/projects/[id]/route.ts`**

```ts
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { deleteProject } from "@/lib/db/queries/projects"

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    await deleteProject(params.id, session.user.id)
    return new NextResponse(null, { status: 204 })
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}
```

- [ ] **Step 3: Verify routes manually**

```bash
# Start dev server (must be logged in — use a session cookie from browser)
next dev

# List projects (replace cookie value)
curl -s http://localhost:3000/api/projects -H "Cookie: authjs.session-token=..." | python3 -m json.tool

# Create project
curl -s -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -H "Cookie: authjs.session-token=..." \
  -d '{"name":"My First Project"}' | python3 -m json.tool
```

Expected: List returns `[]` initially. POST creates and returns the project object.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/projects/
git commit -m "feat: add project list/create/delete API routes"
```

---

## Task 10: Dashboard page UI

**Files:**
- Create: `src/app/dashboard/page.tsx`
- Create: `src/app/dashboard/page.module.css`
- Create: `src/components/dashboard/DashboardSidebar.tsx`
- Create: `src/components/dashboard/ProjectCard.tsx`
- Create: `src/components/dashboard/ProjectGrid.tsx`
- Create: `src/components/dashboard/NewProjectModal.tsx`
- Test: `src/__tests__/components/dashboard/ProjectCard.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/__tests__/components/dashboard/ProjectCard.test.tsx
import { render, screen } from "@testing-library/react"
import { ProjectCard } from "@/components/dashboard/ProjectCard"

const mockProject = {
  id: "proj-1",
  name: "Rooftop Chase",
  updatedAt: new Date("2026-05-28"),
  createdAt: new Date("2026-05-27"),
  userId: "user-1",
  viewportX: 30,
  viewportY: 24,
  viewportScale: 0.78,
  coverElement: null,
}

describe("ProjectCard", () => {
  it("renders project name", () => {
    render(<ProjectCard project={mockProject} onDelete={jest.fn()} />)
    expect(screen.getByText("Rooftop Chase")).toBeInTheDocument()
  })

  it("shows delete button on hover intent", () => {
    render(<ProjectCard project={mockProject} onDelete={jest.fn()} />)
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/__tests__/components/dashboard/ProjectCard.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/dashboard/ProjectCard'`

- [ ] **Step 3: Write `src/components/dashboard/ProjectCard.tsx`**

```tsx
"use client"
import { useState } from "react"
import Link from "next/link"
import { Frame } from "@/components/ui/Frame"

interface Project {
  id: string
  name: string
  updatedAt: Date
  coverElement: { type: string; data: any } | null
}

interface ProjectCardProps {
  project: Project
  onDelete: (id: string) => void
}

function timeAgo(date: Date) {
  const diff = Date.now() - new Date(date).getTime()
  const hours = Math.floor(diff / 3_600_000)
  if (hours < 1) return "just now"
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(date).toLocaleDateString()
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const [confirming, setConfirming] = useState(false)

  const hue = (project.coverElement?.data as any)?.hue ?? "slate"

  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--line)",
      borderRadius: "var(--r)", overflow: "hidden", position: "relative",
      transition: "box-shadow .18s, transform .18s",
    }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-2)"; e.currentTarget.style.transform = "translateY(-2px)" }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ""; e.currentTarget.style.transform = "" }}
    >
      {/* Thumbnail */}
      <Link href={`/projects/${project.id}`} style={{ display: "block" }}>
        <div style={{ position: "relative" }}>
          <Frame hue={hue} style={{ aspectRatio: "16/9", borderRadius: 0 }} />
        </div>
      </Link>

      {/* Info */}
      <div style={{ padding: "10px 12px 12px" }}>
        <Link href={`/projects/${project.id}`} style={{ display: "block" }}>
          <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: "-0.01em", color: "var(--ink)" }}>
            {project.name}
          </div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-faint)", marginTop: 3 }}>
            {timeAgo(project.updatedAt)}
          </div>
        </Link>
      </div>

      {/* Delete button */}
      {!confirming ? (
        <button
          aria-label="Delete project"
          onClick={() => setConfirming(true)}
          style={{
            position: "absolute", top: 8, right: 8,
            width: 28, height: 28, borderRadius: 8, border: "none",
            background: "rgba(255,255,255,.9)", backdropFilter: "blur(4px)",
            color: "var(--ink-soft)", fontSize: 16, display: "grid", placeItems: "center",
            cursor: "pointer", opacity: 0, transition: "opacity .15s",
          }}
          onFocus={(e) => (e.currentTarget.style.opacity = "1")}
          className="delete-btn"
        >
          ×
        </button>
      ) : (
        <div style={{
          position: "absolute", inset: 0, background: "rgba(22,22,26,.85)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 10, borderRadius: "var(--r)",
        }}>
          <p style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>Delete project?</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => onDelete(project.id)}
              style={{ background: "#e74c3c", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
            >
              Delete
            </button>
            <button
              onClick={() => setConfirming(false)}
              style={{ background: "rgba(255,255,255,.15)", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Write `src/components/dashboard/NewProjectModal.tsx`**

```tsx
"use client"
import { useState, useRef, useEffect } from "react"

interface NewProjectModalProps {
  onClose: () => void
  onCreate: (name: string) => Promise<void>
}

export function NewProjectModal({ onClose, onCreate }: NewProjectModalProps) {
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || loading) return
    setLoading(true)
    await onCreate(name.trim())
    setLoading(false)
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(20,20,26,.45)",
        backdropFilter: "blur(4px)", display: "grid", placeItems: "center", zIndex: 100,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: "var(--card)", border: "1px solid var(--line)",
        borderRadius: "var(--r-lg)", boxShadow: "var(--shadow-3)",
        padding: "28px 24px", width: 360,
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 18 }}>
          New project
        </h2>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name…"
            maxLength={80}
            style={{
              width: "100%", border: "1px solid var(--line)", borderRadius: "var(--r-sm)",
              padding: "10px 12px", fontSize: 15, fontFamily: "var(--sans)",
              outline: "none", background: "var(--paper)",
            }}
            onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; e.target.style.boxShadow = "0 0 0 3px var(--accent-tint)" }}
            onBlur={(e) => { e.target.style.borderColor = "var(--line)"; e.target.style.boxShadow = "" }}
          />
          <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
            <button
              type="submit"
              className="btn btn-accent"
              disabled={!name.trim() || loading}
            >
              {loading ? "Creating…" : "Create project →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Write `src/components/dashboard/ProjectGrid.tsx`**

```tsx
"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ProjectCard } from "./ProjectCard"
import { NewProjectModal } from "./NewProjectModal"

interface Project {
  id: string
  name: string
  updatedAt: Date
  createdAt: Date
  userId: string
  viewportX: number
  viewportY: number
  viewportScale: number
  coverElement: { type: string; data: any } | null
}

export function ProjectGrid({ initialProjects }: { initialProjects: Project[] }) {
  const router = useRouter()
  const [projects, setProjects] = useState(initialProjects)
  const [showModal, setShowModal] = useState(false)

  async function handleCreate(name: string) {
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) return
    const project = await res.json()
    setShowModal(false)
    router.push(`/projects/${project.id}`)
  }

  async function handleDelete(id: string) {
    await fetch(`/api/projects/${id}`, { method: "DELETE" })
    setProjects((ps) => ps.filter((p) => p.id !== id))
  }

  return (
    <>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>My Projects</h1>
        <button className="btn btn-accent" onClick={() => setShowModal(true)}>
          + New project
        </button>
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} onDelete={handleDelete} />
        ))}
        {projects.length === 0 && (
          <div
            onClick={() => setShowModal(true)}
            style={{
              border: "1.5px dashed var(--line)", borderRadius: "var(--r)",
              aspectRatio: "4/3", display: "grid", placeItems: "center",
              cursor: "pointer", color: "var(--ink-faint)", fontSize: 28,
              transition: "border-color .15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
          >
            +
          </div>
        )}
      </div>

      {showModal && (
        <NewProjectModal onClose={() => setShowModal(false)} onCreate={handleCreate} />
      )}
    </>
  )
}
```

- [ ] **Step 6: Write `src/components/dashboard/DashboardSidebar.tsx`**

```tsx
"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"

const ICONS = {
  projects: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <rect x="3" y="3" width="18" height="18" rx="3" /><path d="M3 9h18M9 21V9" />
    </svg>
  ),
  ideas: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20">
      <path d="M12 21s7-6.3 7-11a7 7 0 10-14 0c0 4.7 7 11 7 11zM12 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
    </svg>
  ),
  account: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20">
      <path d="M12 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM5 20c0-3 3-5 7-5s7 2 7 5" />
    </svg>
  ),
  signout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  ),
}

export function DashboardSidebar({ userImage }: { userImage?: string | null }) {
  const pathname = usePathname()

  return (
    <aside style={{
      width: 52, flexShrink: 0, background: "var(--card)",
      borderRight: "1px solid var(--line)", display: "flex",
      flexDirection: "column", alignItems: "center", padding: "12px 0", gap: 4,
    }}>
      {/* Logo */}
      <Link href="/" title="Inkycut home" style={{
        width: 32, height: 32, borderRadius: 9, background: "var(--ink)",
        display: "grid", placeItems: "center", marginBottom: 8,
      }}>
        <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
          <path d="M7 4.6 L18.2 11.4 L7 18.2 Z" fill="#fff" />
          <path d="M4.5 19.5 L19 5.5" stroke="#2f9fe0" strokeWidth="2.1" strokeLinecap="round" />
        </svg>
      </Link>

      <SidebarIcon href="/dashboard" icon={ICONS.projects} label="Projects" active={pathname === "/dashboard"} />
      <SidebarIcon href="/ideas" icon={ICONS.ideas} label="Ideas gallery" active={pathname.startsWith("/ideas")} />

      <div style={{ flex: 1 }} />

      <SidebarIcon href="/dashboard" icon={ICONS.account} label="Account" active={false} />
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        title="Sign out"
        style={{
          width: 36, height: 36, borderRadius: 10, border: "none",
          background: "transparent", color: "var(--ink-soft)",
          display: "grid", placeItems: "center", cursor: "pointer",
        }}
      >
        {ICONS.signout}
      </button>
    </aside>
  )
}

function SidebarIcon({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      title={label}
      style={{
        width: 36, height: 36, borderRadius: 10, display: "grid", placeItems: "center",
        color: active ? "#fff" : "var(--ink-2)",
        background: active ? "var(--accent)" : "transparent",
        boxShadow: active ? "0 4px 12px rgba(47,159,224,.35)" : "none",
        transition: "background .15s, color .15s",
      }}
    >
      {icon}
    </Link>
  )
}
```

- [ ] **Step 7: Write `src/app/dashboard/page.tsx`**

```tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getProjectWithFirstElement } from "@/lib/db/queries/projects"
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar"
import { ProjectGrid } from "@/components/dashboard/ProjectGrid"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const projects = await getProjectWithFirstElement(session.user.id)

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--paper)", overflow: "hidden" }}>
      <DashboardSidebar userImage={session.user.image} />
      <main style={{ flex: 1, overflow: "auto", padding: "28px 32px" }}>
        <ProjectGrid initialProjects={projects} />
      </main>
    </div>
  )
}
```

- [ ] **Step 8: Run tests to verify they pass**

```bash
npx jest src/__tests__/components/dashboard/
```

Expected: PASS (2 tests)

- [ ] **Step 9: Verify dashboard in browser**

```bash
next dev
```

Open http://localhost:3000/dashboard (must be logged in). Verify:
- Icon sidebar on left with logo, Projects (active), Ideas, sign-out
- "My Projects" heading + "New project" button
- Empty state dashed placeholder card
- Click "New project" → modal appears with name input and accent Create button
- Type name → click "Create project →" → navigates to `/projects/<id>` (returns 404 for now)
- Return to dashboard — project card appears with film-frame thumbnail, name, time ago
- Hover project card → "×" delete button appears (styled)
- Click "×" → confirmation overlay with Delete / Cancel
- Confirm → project removed from grid

- [ ] **Step 10: Commit**

```bash
git add src/app/dashboard/ src/components/dashboard/ src/__tests__/components/dashboard/
git commit -m "feat: add dashboard with project grid, create/delete projects"
```

---

**Phase 2 complete.** Verify before proceeding:

```bash
npx jest
```

- [ ] All tests pass
- [ ] Dashboard loads with project grid
- [ ] Create project → navigates to canvas page (404 for now)
- [ ] Delete project works with confirmation
- [ ] Sidebar navigation to /ideas works

Proceed to [Phase 3 — Canvas](./2026-05-29-inkycut-phase-3-canvas.md).
