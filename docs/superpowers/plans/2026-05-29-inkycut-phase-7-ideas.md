# Phase 7 — Ideas Gallery

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Public `/ideas` gallery page (port of reference `ideas.html`). Users can publish a project to the gallery from the dashboard. Published projects appear in the gallery sorted by most-recently published.

**Depends on:** Phase 6 complete.

**Next phase:** [phase-8-video.md](./2026-05-29-inkycut-phase-8-video.md)

---

## Task 29: Ideas DB query helpers

**Files:**
- Create: `src/lib/db/queries/ideas.ts`
- Test: `src/__tests__/lib/queries/ideas.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/__tests__/lib/queries/ideas.test.ts
jest.mock("@/lib/db", () => ({ db: {} }))
import { isPublished } from "@/lib/db/queries/ideas"

describe("isPublished", () => {
  it("returns true when publishedAt is set", () => {
    expect(isPublished({ publishedAt: new Date() } as any)).toBe(true)
  })
  it("returns false when publishedAt is null", () => {
    expect(isPublished({ publishedAt: null } as any)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/__tests__/lib/queries/ideas.test.ts
```

Expected: FAIL

- [ ] **Step 3: Write `src/lib/db/queries/ideas.ts`**

```ts
import { db } from "@/lib/db"
import { ideas, projects, users, elements } from "@/lib/db/schema"
import { eq, desc, isNotNull } from "drizzle-orm"

export function isPublished(idea: { publishedAt: Date | null }): boolean {
  return idea.publishedAt !== null
}

export async function getPublishedIdeas(limit = 60) {
  return db
    .select({
      id: ideas.id,
      title: ideas.title,
      description: ideas.description,
      genre: ideas.genre,
      tags: ideas.tags,
      publishedAt: ideas.publishedAt,
      projectId: ideas.projectId,
      userName: users.name,
      userImage: users.image,
      coverElementId: ideas.coverElementId,
    })
    .from(ideas)
    .innerJoin(users, eq(ideas.userId, users.id))
    .where(isNotNull(ideas.publishedAt))
    .orderBy(desc(ideas.publishedAt))
    .limit(limit)
}

export async function getIdeaByProject(projectId: string) {
  const rows = await db.select().from(ideas).where(eq(ideas.projectId, projectId)).limit(1)
  return rows[0] ?? null
}

export async function publishProject(input: {
  projectId: string
  userId: string
  title: string
  description?: string
  genre?: string
  tags?: string[]
  coverElementId?: string
}) {
  // Upsert: if idea already exists for this project, update it; otherwise insert
  const existing = await getIdeaByProject(input.projectId)
  if (existing) {
    const [updated] = await db
      .update(ideas)
      .set({ title: input.title, description: input.description, genre: input.genre, tags: input.tags, coverElementId: input.coverElementId, publishedAt: new Date() })
      .where(eq(ideas.id, existing.id))
      .returning()
    return updated
  }
  const [idea] = await db
    .insert(ideas)
    .values({ ...input, publishedAt: new Date() })
    .returning()
  return idea
}

export async function unpublishProject(projectId: string, userId: string) {
  const existing = await getIdeaByProject(projectId)
  if (!existing || existing.userId !== userId) throw new Error("Not found")
  await db.delete(ideas).where(eq(ideas.id, existing.id))
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest src/__tests__/lib/queries/ideas.test.ts
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/queries/ideas.ts src/__tests__/lib/queries/ideas.test.ts
git commit -m "feat: add ideas DB query helpers with publish/unpublish"
```

---

## Task 30: Ideas API routes

**Files:**
- Create: `src/app/api/ideas/route.ts`
- Create: `src/app/api/ideas/[id]/route.ts`

- [ ] **Step 1: Write `src/app/api/ideas/route.ts`**

```ts
import { NextResponse } from "next/server"
import { getPublishedIdeas } from "@/lib/db/queries/ideas"

export async function GET() {
  const ideas = await getPublishedIdeas()
  return NextResponse.json(ideas)
}
```

- [ ] **Step 2: Write `src/app/api/ideas/[id]/route.ts`**

```ts
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { publishProject, unpublishProject, getIdeaByProject } from "@/lib/db/queries/ideas"
import { getProjectById } from "@/lib/db/queries/projects"

// POST /api/ideas/:projectId — publish a project to the gallery
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const project = await getProjectById(params.id, session.user.id)
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const { title, description, genre, tags, coverElementId } = body
  if (!title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 })

  const idea = await publishProject({
    projectId: params.id,
    userId: session.user.id,
    title: title.trim(),
    description,
    genre,
    tags,
    coverElementId,
  })
  return NextResponse.json(idea, { status: 201 })
}

// DELETE /api/ideas/:projectId — unpublish
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    await unpublishProject(params.id, session.user.id)
    return new NextResponse(null, { status: 204 })
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}

// GET /api/ideas/:projectId — check if published
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const project = await getProjectById(params.id, session.user.id)
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const idea = await getIdeaByProject(params.id)
  return NextResponse.json(idea ?? null)
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/ideas/
git commit -m "feat: add ideas gallery API routes (publish/unpublish/list)"
```

---

## Task 31: Ideas gallery page

**Files:**
- Create: `src/app/ideas/page.tsx`
- Create: `src/app/ideas/page.module.css`
- Create: `src/components/ideas/IdeaCard.tsx`
- Create: `src/components/ideas/FilterBar.tsx`

- [ ] **Step 1: Extract ideas page CSS**

```bash
# Extract the <style> block from docs/superpowers/designs/ideas.html
sed -n '11,78p' docs/superpowers/designs/ideas.html | sed 's/^  //' > src/app/ideas/page.module.css
```

- [ ] **Step 2: Write `src/components/ideas/FilterBar.tsx`**

```tsx
"use client"
import { useState } from "react"

const GENRES = ["All", "Action", "Drama", "Comedy", "Sci-Fi", "Horror", "Documentary", "Animation"]

interface FilterBarProps {
  total: number
  onFilter: (genre: string) => void
}

export function FilterBar({ total, onFilter }: FilterBarProps) {
  const [active, setActive] = useState("All")

  function select(genre: string) {
    setActive(genre)
    onFilter(genre)
  }

  return (
    <div className="filters">
      {GENRES.map((g) => (
        <button key={g} className={`filt${active === g ? " on" : ""}`} onClick={() => select(g)}>
          {g}
        </button>
      ))}
      <span className="sp">{total} projects</span>
    </div>
  )
}
```

- [ ] **Step 3: Write `src/components/ideas/IdeaCard.tsx`**

```tsx
import { Frame } from "@/components/ui/Frame"

interface Idea {
  id: string
  title: string
  description?: string | null
  genre?: string | null
  tags?: string[] | null
  publishedAt?: Date | null
  userName?: string | null
  userImage?: string | null
  coverElementId?: string | null
}

function timeAgo(date: Date | null | undefined) {
  if (!date) return ""
  const diff = Date.now() - new Date(date).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days < 1) return "today"
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

const CARD_HUES: Array<"slate" | "amber" | "rain" | "crimson" | "forest"> = ["slate", "rain", "amber", "crimson", "forest"]

export function IdeaCard({ idea, index, big = false }: { idea: Idea; index: number; big?: boolean }) {
  const hue = CARD_HUES[index % CARD_HUES.length]
  const initials = (idea.userName ?? "?").slice(0, 2).toUpperCase()

  return (
    <div className={`ucard${big ? " big" : ""}`}>
      <div className="art">
        <Frame hue={hue} className={big ? "wide" : "tall"} />
        {big && (
          <div className="badge-tl">{idea.genre ?? "Video"}</div>
        )}
      </div>
      <div className="body">
        <div className="title-row">
          <h3>{idea.title}</h3>
          {idea.genre && !big && <span className="genre">{idea.genre}</span>}
        </div>
        <div className="by">
          <span className="av">{initials}</span>
          {idea.userName} · {timeAgo(idea.publishedAt)}
        </div>
        {idea.description && (
          <div className="meta-row">
            <span className="mchip">{idea.description.slice(0, 60)}{idea.description.length > 60 ? "…" : ""}</span>
            <span className="remix">Remix →</span>
          </div>
        )}
        {idea.tags && idea.tags.length > 0 && (
          <div className="meta-row">
            {idea.tags.slice(0, 3).map((t) => <span key={t} className="mchip">{t}</span>)}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Write `src/app/ideas/page.tsx`**

```tsx
import { Nav } from "@/components/layout/Nav"
import { FilterBar } from "@/components/ideas/FilterBar"
import { IdeaCard } from "@/components/ideas/IdeaCard"
import { getPublishedIdeas } from "@/lib/db/queries/ideas"
import Link from "next/link"

export const revalidate = 60 // ISR: re-fetch every 60s

export default async function IdeasPage() {
  const ideas = await getPublishedIdeas(60)

  const featured = ideas.slice(0, 2)
  const rest = ideas.slice(2)

  return (
    <>
      <Nav activeHref="/ideas" />

      <section className="section gallery-head">
        <div className="wrap">
          <span className="eyebrow">Community canvas</span>
          <h1>What people are <span className="em">making.</span></h1>
          <p className="lead">Every project starts with a single idea. Here&apos;s where they end up.</p>

          <FilterBar total={ideas.length} onFilter={() => {}} />
        </div>
      </section>

      <div className="wrap">
        {/* Featured row */}
        {featured.length > 0 && (
          <div className="feature">
            {featured.map((idea, i) => (
              <IdeaCard key={idea.id} idea={idea as any} index={i} big={i === 0} />
            ))}
          </div>
        )}

        {/* Masonry grid */}
        {rest.length > 0 && (
          <div className="masonry" style={{ marginTop: featured.length > 0 ? 18 : 30 }}>
            {rest.map((idea, i) => (
              <IdeaCard key={idea.id} idea={idea as any} index={i + 2} />
            ))}
          </div>
        )}

        {ideas.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--ink-soft)" }}>
            <p style={{ fontSize: 18, marginBottom: 20 }}>No ideas published yet.</p>
            <Link className="btn btn-accent" href="/login">Start creating →</Link>
          </div>
        )}

        {/* CTA strip */}
        <div className="ideas-cta" style={{ marginTop: 70 }}>
          <div>
            <h2>Start your own.</h2>
            <p>Open a canvas and let an idea run.</p>
          </div>
          <Link className="btn btn-accent" href="/login">Open Inkycut →</Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="foot" style={{ marginTop: 80 }}>
        <div className="wrap" style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-faint)" }}>
          <span>© 2026 Inkycut</span>
          <span>Made on an infinite canvas</span>
        </div>
      </footer>
    </>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/ideas/ src/components/ideas/
git commit -m "feat: add public ideas gallery page with ISR"
```

---

## Task 32: Publish to gallery flow in dashboard

**Files:**
- Create: `src/components/dashboard/PublishModal.tsx`
- Modify: `src/components/dashboard/ProjectCard.tsx`

- [ ] **Step 1: Write `src/components/dashboard/PublishModal.tsx`**

```tsx
"use client"
import { useState } from "react"

interface PublishModalProps {
  projectId: string
  projectName: string
  isPublished: boolean
  onClose: () => void
  onPublish: (data: { title: string; description: string; genre: string }) => Promise<void>
  onUnpublish: () => Promise<void>
}

const GENRES = ["Action", "Drama", "Comedy", "Sci-Fi", "Horror", "Documentary", "Animation", "Other"]

export function PublishModal({ projectId, projectName, isPublished, onClose, onPublish, onUnpublish }: PublishModalProps) {
  const [title, setTitle] = useState(projectName)
  const [description, setDescription] = useState("")
  const [genre, setGenre] = useState("Drama")
  const [loading, setLoading] = useState(false)

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || loading) return
    setLoading(true)
    await onPublish({ title: title.trim(), description, genre })
    setLoading(false)
    onClose()
  }

  async function handleUnpublish() {
    setLoading(true)
    await onUnpublish()
    setLoading(false)
    onClose()
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(20,20,26,.45)", backdropFilter: "blur(4px)", display: "grid", placeItems: "center", zIndex: 100 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", boxShadow: "var(--shadow-3)", padding: "28px 24px", width: 400 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Publish to Ideas gallery</h2>
        <p style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 20 }}>
          Your project will appear publicly in the Ideas gallery. You can unpublish it at any time.
        </p>

        {isPublished && (
          <div style={{ marginBottom: 16, padding: "10px 14px", background: "var(--accent-tint)", borderRadius: "var(--r-sm)", fontSize: 13, color: "var(--accent-700)" }}>
            Currently published. Update or unpublish below.
          </div>
        )}

        <form onSubmit={handlePublish} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-faint)", letterSpacing: ".08em", textTransform: "uppercase" }}>Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              style={{ display: "block", width: "100%", marginTop: 6, border: "1px solid var(--line)", borderRadius: "var(--r-sm)", padding: "9px 12px", fontSize: 14, fontFamily: "var(--sans)" }}
            />
          </div>
          <div>
            <label style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-faint)", letterSpacing: ".08em", textTransform: "uppercase" }}>Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={200}
              style={{ display: "block", width: "100%", marginTop: 6, border: "1px solid var(--line)", borderRadius: "var(--r-sm)", padding: "9px 12px", fontSize: 13, fontFamily: "var(--sans)", resize: "none" }}
            />
          </div>
          <div>
            <label style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-faint)", letterSpacing: ".08em", textTransform: "uppercase" }}>Genre</label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              style={{ display: "block", width: "100%", marginTop: 6, border: "1px solid var(--line)", borderRadius: "var(--r-sm)", padding: "9px 12px", fontSize: 14, fontFamily: "var(--sans)" }}
            >
              {GENRES.map((g) => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 6, justifyContent: "space-between" }}>
            {isPublished && (
              <button type="button" onClick={handleUnpublish} disabled={loading}
                style={{ background: "transparent", border: "1px solid var(--line)", borderRadius: 999, padding: "8px 16px", fontSize: 13, color: "var(--ink-soft)", cursor: "pointer" }}>
                Unpublish
              </button>
            )}
            <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
              <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
              <button type="submit" disabled={!title.trim() || loading} className="btn btn-accent">
                {loading ? "Publishing…" : isPublished ? "Update" : "Publish →"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add "Publish" option to `ProjectCard.tsx`**

Add a `"Publish to gallery"` action in the three-dot dropdown of `ProjectCard`. Replace the card's bottom section with:

```tsx
// In ProjectCard, add state:
const [showPublish, setShowPublish] = useState(false)
const [isPublished, setIsPublished] = useState(false)

// Add publish modal trigger button alongside delete:
<button
  onClick={() => setShowPublish(true)}
  style={{
    position: "absolute", top: 8, left: 8,
    background: "rgba(255,255,255,.9)", backdropFilter: "blur(4px)",
    border: "none", borderRadius: 8, padding: "3px 8px",
    fontFamily: "var(--mono)", fontSize: 9, color: "var(--accent-700)",
    cursor: "pointer", opacity: 0, transition: "opacity .15s",
  }}
  className="publish-btn"
>
  Publish
</button>

{showPublish && (
  <PublishModal
    projectId={project.id}
    projectName={project.name}
    isPublished={isPublished}
    onClose={() => setShowPublish(false)}
    onPublish={async (data) => {
      await fetch(`/api/ideas/${project.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      setIsPublished(true)
    }}
    onUnpublish={async () => {
      await fetch(`/api/ideas/${project.id}`, { method: "DELETE" })
      setIsPublished(false)
    }}
  />
)}
```

Add import: `import { PublishModal } from "./PublishModal"`

- [ ] **Step 3: Verify publish flow in browser**

1. Open dashboard, hover a project card
2. Click "Publish" button
3. Fill in title, description, genre → click "Publish →"
4. Open http://localhost:3000/ideas — project appears in gallery
5. Return to dashboard → click "Publish" again → "Update" and "Unpublish" options available
6. Click "Unpublish" → project disappears from /ideas

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/PublishModal.tsx src/components/dashboard/ProjectCard.tsx src/components/ideas/
git commit -m "feat: add publish-to-gallery flow from dashboard project cards"
```

---

**Phase 7 complete.** Verify before proceeding:

```bash
npm run test:coverage
```

- [ ] All tests pass with 100% coverage
- [ ] `/ideas` shows published projects in masonry grid
- [ ] Publishing a project from dashboard makes it appear in `/ideas`
- [ ] Unpublishing removes it from `/ideas`
- [ ] Empty gallery shows a "Start creating" CTA

Proceed to [Phase 8 — Video Export](./2026-05-29-inkycut-phase-8-video.md).
