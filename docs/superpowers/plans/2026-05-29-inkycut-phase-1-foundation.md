# Phase 1 — Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Working Next.js project with design system CSS, Drizzle schema + migrations, NextAuth Google OAuth, landing page, and login page.

**Depends on:** Nothing — this is the base.

**Next phase:** [phase-2-dashboard.md](./2026-05-29-inkycut-phase-2-dashboard.md)

---

## Task 1: Scaffold the Next.js project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `drizzle.config.ts`
- Create: `jest.config.ts`
- Create: `jest.setup.ts`
- Create: `.env.local` (gitignored)
- Create: `.gitignore`

- [ ] **Step 1: Create the Next.js app**

```bash
cd /Users/soasme/github.com/soasme/inkycut
npx create-next-app@latest . --typescript --tailwind=false --eslint --app --src-dir --import-alias "@/*" --no-git
```

When prompted, accept all defaults. This creates the App Router scaffold.

- [ ] **Step 2: Install all project dependencies**

```bash
npm install drizzle-orm pg @auth/drizzle-adapter next-auth@beta openai socket.io socket.io-client zustand @aws-sdk/client-s3 @aws-sdk/lib-storage multer
npm install -D drizzle-kit @types/pg @types/multer tsx jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event ts-jest
```

- [ ] **Step 3: Write `next.config.ts`**

```ts
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  experimental: { serverComponentsExternalPackages: ["pg"] },
}

export default nextConfig
```

- [ ] **Step 4: Write `drizzle.config.ts`**

```ts
import type { Config } from "drizzle-kit"

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./src/lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
} satisfies Config
```

- [ ] **Step 5: Write `jest.config.ts`**

```ts
import type { Config } from "jest"

const config: Config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  transform: { "^.+\\.tsx?$": ["ts-jest", { tsconfig: { jsx: "react-jsx" } }] },
  testPathPattern: ["**/__tests__/**/*.test.ts?(x)"],
}

export default config
```

- [ ] **Step 6: Write `jest.setup.ts`**

```ts
import "@testing-library/jest-dom"
```

- [ ] **Step 7: Update `package.json` scripts**

Replace the `scripts` section:

```json
"scripts": {
  "dev": "tsx server.ts",
  "build": "next build",
  "start": "NODE_ENV=production tsx server.ts",
  "lint": "next lint",
  "test": "jest",
  "test:watch": "jest --watch",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:studio": "drizzle-kit studio"
}
```

Note: `dev` and `start` use `server.ts` (created in Phase 5). For phases 1-4, you can run `next dev` directly.

- [ ] **Step 8: Add `.env.local`**

```bash
cat > .env.local << 'EOF'
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/inkycut
NEXTAUTH_SECRET=changeme_generate_with_openssl_rand_base64_32
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
OPENAI_API_KEY=your_openai_key
STORAGE_TYPE=local
EOF
```

- [ ] **Step 9: Update `.gitignore`** — ensure these are present:

```
.env.local
.env*.local
public/uploads/
.superpowers/
```

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js project with all dependencies"
```

---

## Task 2: Copy design system files

**Files:**
- Create: `styles/inky.css`
- Create: `styles/app.css`

- [ ] **Step 1: Copy design system files verbatim**

```bash
cp /tmp/inkycut/inky.css styles/inky.css
cp /tmp/inkycut/app.css styles/app.css
mkdir -p public/uploads
```

- [ ] **Step 2: Verify no edits were made**

```bash
diff /tmp/inkycut/inky.css styles/inky.css
diff /tmp/inkycut/app.css styles/app.css
```

Expected: no output (files are identical).

- [ ] **Step 3: Commit**

```bash
git add styles/
git commit -m "chore: copy Inkycut design system CSS verbatim"
```

---

## Task 3: Define the Drizzle schema

**Files:**
- Create: `src/lib/db/schema.ts`
- Create: `src/lib/db/index.ts`
- Create: `src/types/canvas.ts`
- Test: `src/__tests__/lib/schema.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/lib/schema.test.ts
import { users, projects, elements, elementConnections, conversations, messages, ideas } from "@/lib/db/schema"

describe("schema tables", () => {
  it("users table has required columns", () => {
    expect(users).toBeDefined()
    expect(Object.keys(users)).toContain("id")
  })
  it("projects table has viewport columns", () => {
    expect(projects).toBeDefined()
  })
  it("elements table has data jsonb column", () => {
    expect(elements).toBeDefined()
  })
  it("all 7 tables are exported", () => {
    expect(users).toBeDefined()
    expect(projects).toBeDefined()
    expect(elements).toBeDefined()
    expect(elementConnections).toBeDefined()
    expect(conversations).toBeDefined()
    expect(messages).toBeDefined()
    expect(ideas).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/__tests__/lib/schema.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/db/schema'`

- [ ] **Step 3: Write `src/types/canvas.ts`**

```ts
export type ElementType = "frame" | "character" | "doc" | "storyboard" | "shotlist" | "note"
export type MessageRole = "user" | "agent" | "stamp"

export interface FrameData {
  slug?: string
  hue?: string
  meta?: string
  ar?: string
  rec?: boolean
  duration?: number
  imageUrl?: string
}

export interface CharacterData {
  name: string
  role?: string
  hues?: string[]
  palette?: string[]
  imageUrl?: string
}

export interface DocData {
  title?: string
  content?: string
}

export interface StoryboardData {
  title: string
  hues?: string[]
  hasShotList?: boolean
}

export interface Shot {
  n: string
  d: string
  l: string
  m: string
  t: string
}

export interface ShotlistData {
  title: string
  shots?: Shot[]
}

export interface NoteData {
  text: string
}

export type ElementData = FrameData | CharacterData | DocData | StoryboardData | ShotlistData | NoteData

export interface CanvasElement {
  id: string
  projectId: string
  type: ElementType
  x: number
  y: number
  w: number
  h: number | null
  data: ElementData
  createdAt: Date
  updatedAt: Date
}

export interface CanvasViewport {
  x: number
  y: number
  scale: number
}
```

- [ ] **Step 4: Write `src/lib/db/schema.ts`**

```ts
import {
  pgTable, text, timestamp, real, jsonb, uuid, primaryKey, integer, boolean, index
} from "drizzle-orm/pg-core"

// ── NextAuth required tables ──────────────────────────────────────────────────

export const users = pgTable("users", {
  id: text("id").notNull().primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const accounts = pgTable("accounts", {
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
}, (t) => ({ pk: primaryKey({ columns: [t.provider, t.providerAccountId] }) }))

export const sessions = pgTable("sessions", {
  sessionToken: text("sessionToken").notNull().primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
})

export const verificationTokens = pgTable("verificationTokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
}, (t) => ({ pk: primaryKey({ columns: [t.identifier, t.token] }) }))

// ── App tables ────────────────────────────────────────────────────────────────

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  viewportX: real("viewport_x").default(30).notNull(),
  viewportY: real("viewport_y").default(24).notNull(),
  viewportScale: real("viewport_scale").default(0.78).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({ userIdx: index("projects_user_idx").on(t.userId) }))

export const elements = pgTable("elements", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  x: real("x").notNull(),
  y: real("y").notNull(),
  w: real("w").notNull(),
  h: real("h"),
  data: jsonb("data").notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({ projectIdx: index("elements_project_idx").on(t.projectId) }))

export const elementConnections = pgTable("element_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  fromElementId: uuid("from_element_id").notNull().references(() => elements.id, { onDelete: "cascade" }),
  toElementId: uuid("to_element_id").notNull().references(() => elements.id, { onDelete: "cascade" }),
})

export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull().default("Main"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  agentName: text("agent_name"),
  content: text("content"),
  toolCalls: jsonb("tool_calls"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({ convIdx: index("messages_conv_idx").on(t.conversationId) }))

export const ideas = pgTable("ideas", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  genre: text("genre"),
  tags: text("tags").array(),
  coverElementId: uuid("cover_element_id").references(() => elements.id, { onDelete: "set null" }),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})
```

- [ ] **Step 5: Write `src/lib/db/index.ts`**

```ts
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export const db = drizzle(pool, { schema })
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx jest src/__tests__/lib/schema.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 7: Create and run the migration**

```bash
# Ensure postgres is running and DATABASE_URL is set correctly
npx drizzle-kit generate
npx drizzle-kit migrate
```

Expected: Migration files created in `src/lib/db/migrations/`, tables created in DB.

- [ ] **Step 8: Commit**

```bash
git add src/lib/db/ src/types/ src/__tests__/ drizzle.config.ts
git commit -m "feat: add Drizzle schema (7 tables) and run initial migration"
```

---

## Task 4: Configure NextAuth v5 with Google OAuth

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Write `src/lib/auth.ts`**

```ts
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "./db"
import { users, accounts, sessions, verificationTokens } from "./db/schema"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    session({ session, user }) {
      if (session.user) session.user.id = user.id
      return session
    },
  },
  pages: { signIn: "/login" },
})
```

- [ ] **Step 2: Write the NextAuth route handler**

```ts
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/lib/auth"
export const { GET, POST } = handlers
```

- [ ] **Step 3: Create a session provider wrapper**

```ts
// src/components/SessionProvider.tsx
"use client"
import { SessionProvider as NextAuthProvider } from "next-auth/react"

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <NextAuthProvider>{children}</NextAuthProvider>
}
```

- [ ] **Step 4: Write `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next"
import { SessionProvider } from "@/components/SessionProvider"
import "@/../../styles/inky.css"
import "./globals.css"

export const metadata: Metadata = {
  title: "Inkycut — idea to finished video, on one canvas",
  description: "The infinite canvas for video. From a single idea to a finished, edited cut.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 5: Delete `src/app/globals.css` default content and replace**

```css
/* src/app/globals.css — minimal resets only, design tokens live in inky.css */
*, *::before, *::after { box-sizing: border-box; }
a { color: inherit; text-decoration: none; }
button { font-family: inherit; cursor: pointer; }
```

- [ ] **Step 6: Write a middleware to protect routes**

```ts
// src/middleware.ts
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isProtected = req.nextUrl.pathname.startsWith("/dashboard") ||
    req.nextUrl.pathname.startsWith("/projects")

  if (isProtected && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl))
  }
})

export const config = { matcher: ["/dashboard/:path*", "/projects/:path*"] }
```

- [ ] **Step 7: Verify auth route responds**

```bash
next dev &
curl -s http://localhost:3000/api/auth/providers | python3 -m json.tool
```

Expected: JSON with `google` provider listed.

- [ ] **Step 8: Commit**

```bash
git add src/lib/auth.ts src/app/api/auth/ src/components/SessionProvider.tsx src/app/layout.tsx src/app/globals.css src/middleware.ts
git commit -m "feat: configure NextAuth v5 Google OAuth with Drizzle adapter"
```

---

## Task 5: Shared UI primitives — Logo and Frame components

**Files:**
- Create: `src/components/ui/Logo.tsx`
- Create: `src/components/ui/Frame.tsx`
- Create: `src/components/layout/Nav.tsx`
- Test: `src/__tests__/components/Frame.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/__tests__/components/Frame.test.tsx
import { render, screen } from "@testing-library/react"
import { Frame } from "@/components/ui/Frame"

describe("Frame", () => {
  it("renders film-frame with slug and meta", () => {
    render(<Frame hue="slate" slug="EST_SHOT" meta="16:9" />)
    expect(screen.getByText("EST_SHOT")).toBeInTheDocument()
    expect(screen.getByText("16:9")).toBeInTheDocument()
  })

  it("renders rec dot when rec=true", () => {
    const { container } = render(<Frame hue="rain" slug="CHAR_01" rec />)
    expect(container.querySelector(".rec")).toBeInTheDocument()
  })

  it("applies hue class", () => {
    const { container } = render(<Frame hue="amber" />)
    expect(container.querySelector(".f-amber")).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/__tests__/components/Frame.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/ui/Frame'`

- [ ] **Step 3: Write `src/components/ui/Frame.tsx`**

```tsx
interface FrameProps {
  hue?: "slate" | "amber" | "rain" | "crimson" | "forest"
  slug?: string
  meta?: string
  rec?: boolean
  children?: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export function Frame({ hue = "slate", slug, meta, rec, children, className, style }: FrameProps) {
  return (
    <div className={`frame f-${hue}${className ? " " + className : ""}`} style={style}>
      {slug && (
        <span className="slug">
          {rec && <span className="rec" />}
          {slug}
        </span>
      )}
      <div className="ticks" />
      {meta && <span className="meta">{meta}</span>}
      {children}
    </div>
  )
}
```

- [ ] **Step 4: Write `src/components/ui/Logo.tsx`**

```tsx
interface LogoProps {
  href?: string
  showName?: boolean
}

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <span className="logo-mark" aria-hidden="true" style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M7 4.6 L18.2 11.4 L7 18.2 Z" fill="#fff" />
        <path d="M4.5 19.5 L19 5.5" stroke="#2f9fe0" strokeWidth="2.1" strokeLinecap="round" />
      </svg>
    </span>
  )
}

export function Logo({ href = "/", showName = true }: LogoProps) {
  return (
    <a className="logo" href={href}>
      <LogoMark />
      {showName && "Inkycut"}
    </a>
  )
}
```

- [ ] **Step 5: Write `src/components/layout/Nav.tsx`**

```tsx
import { Logo } from "@/components/ui/Logo"
import Link from "next/link"

interface NavProps {
  activeHref?: string
}

export function Nav({ activeHref }: NavProps) {
  return (
    <header className="nav">
      <div className="wrap nav-in">
        <Logo />
        <nav className="nav-links">
          <Link href="/" className={activeHref === "/" ? "active" : ""}>Product</Link>
          <Link href="/ideas" className={activeHref === "/ideas" ? "active" : ""}>Ideas</Link>
          <a href="#how">How it works</a>
        </nav>
        <div className="nav-cta">
          <Link className="signin" href="/login">Sign in</Link>
          <Link className="btn btn-accent" href="/login">Open Inkycut →</Link>
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx jest src/__tests__/components/Frame.test.tsx
```

Expected: PASS (3 tests)

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/ src/components/layout/
git commit -m "feat: add Logo, Frame, and Nav shared UI components"
```

---

## Task 6: Landing page (/)

**Files:**
- Create: `src/app/page.tsx`
- Create: `src/app/page.module.css`

- [ ] **Step 1: Extract landing page CSS from reference**

Copy the `<style>` block from `/tmp/inkycut/index.html` (lines 12–193) into `src/app/page.module.css`, prefixing every class selector with `:global(.)` is unnecessary here — use CSS Modules with `:global` for the classes that come from `inky.css`, and define landing-specific classes locally.

```css
/* src/app/page.module.css — landing-specific styles only */
/* Paste the <style> block from /tmp/inkycut/index.html verbatim here */
/* (nav, hero, board, marquee, feat, spec, steps, cta-band, foot-grid) */
```

```bash
# Extract the style block (lines 12-193)
sed -n '12,193p' /tmp/inkycut/index.html | sed 's/^  //' > src/app/page.module.css
```

- [ ] **Step 2: Write `src/app/page.tsx`** — port `index.html` body to JSX, replacing class= with className= and href="app.html" with href="/login" (or "/dashboard" for logged-in users)

```tsx
import styles from "./page.module.css"
import { Nav } from "@/components/layout/Nav"
import { Frame } from "@/components/ui/Frame"
import Link from "next/link"

export default function LandingPage() {
  return (
    <>
      <Nav activeHref="/" />

      {/* HERO */}
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <span className="chip reveal"><span className="dot" /> The creative canvas for video</span>
            <h1 className="reveal" style={{ marginTop: 20 }}>
              Idea to finished&nbsp;video, <span className="em">before the coffee&apos;s cold.</span>
            </h1>
            <p className="lead reveal">
              Inkycut is the infinite canvas where creators turn a one-line concept into characters,
              scenes, and a finished, edited video — with a crew of AI specialists doing the busywork.
            </p>
            <div className="hero-cta reveal">
              <Link className="btn btn-accent" href="/login">Start a board — it&apos;s free</Link>
              <Link className="btn btn-ghost" href="/ideas">See what people make →</Link>
            </div>
            <p className="hero-note reveal">No card. Export in 4K, ProRes &amp; MP4.</p>
          </div>

          {/* Mini canvas mockup */}
          <div className="board reveal" aria-hidden="true">
            <div className="toprail">
              <span className="tdot a" /><span className="tdot" /><span className="tdot" />
              <span style={{ marginLeft: 6 }}>&quot;Rooftop chase — neon city&quot; · Page 1</span>
            </div>
            <div className="card-float nf1">
              <Frame hue="rain" slug="CHAR_01" meta="3:4 · v2" rec />
            </div>
            <div className="card-float nf2">
              <Frame hue="amber" slug="HERO_LOOK" meta="4:5" />
            </div>
            <div className="card-float nf3">
              <Frame hue="slate" slug="EST_SHOT" meta="16:9" />
            </div>
            <div className="chatcard">
              <div className="who">
                <span className="badge">▷ VIDEO</span> Video Specialist
              </div>
              <p>Generated 4 shots for the rooftop chase. Want me to cut these into a finished sequence?</p>
              <span className="pill">✦ rendering the cut…</span>
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div className="marq" aria-hidden="true">
        <div className="marq-track">
          {["Character universes","Storyboards","Finished videos","Moodboards","Concept art","Lookdev",
            "Character universes","Storyboards","Finished videos","Moodboards","Concept art","Lookdev"
          ].map((item, i) => (
            <span key={i} className="marq-item">{item}</span>
          ))}
        </div>
      </div>

      {/* FEATURE 1 — CANVAS */}
      <section className="section">
        <div className="wrap feat">
          <div className="feat-text reveal">
            <span className="eyebrow">Infinite canvas</span>
            <h2>Your whole production, on one surface.</h2>
            <p>Pan, zoom, and sprawl. References, character sheets, boards, and notes live side by side — no folders, no tab-juggling.</p>
            <div className="feat-list">
              <div className="li"><span className="mk">↳</span><span><b>Drop anything</b> — images, prompts, docs, links. It all becomes a card.</span></div>
              <div className="li"><span className="mk">↳</span><span><b>Spatial thinking</b> — cluster a scene, group a character, draw the throughline.</span></div>
              <div className="li"><span className="mk">↳</span><span><b>Live with your team</b> — cursors, comments shared in real time.</span></div>
            </div>
          </div>
          <div className="visual reveal">
            <div className="board" style={{ aspectRatio: "1/0.78", boxShadow: "var(--shadow-2)" }}>
              <div className="toprail">
                <span className="tdot a" /><span className="tdot" /><span className="tdot" />
                <span style={{ marginLeft: 6 }}>Untitled board</span>
              </div>
              <div className="card-float frame f-slate" style={{ width: "34%", top: 60, left: 24, aspectRatio: "3/4" }}>
                <span className="slug"><span className="rec" />REF_A</span><div className="ticks" />
              </div>
              <div className="card-float frame f-crimson" style={{ width: "30%", top: 54, right: 26, aspectRatio: "4/5", transform: "rotate(3deg)" }}>
                <span className="slug">INT_NIGHT</span><span className="meta">4:5</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SPECIALISTS */}
      <section className="section" style={{ background: "var(--paper-2)", borderBlock: "1px solid var(--line-2)" }}>
        <div className="wrap">
          <div className="spec-head reveal">
            <span className="eyebrow">A crew on tap</span>
            <h2>Direct a team of AI specialists.</h2>
            <p>You set the vision. They handle the grind.</p>
          </div>
          <div className="spec-grid">
            {[
              { title: "Video Specialist", desc: "Boards scenes, generates shots, renders into a finished cut.", tag: "@video" },
              { title: "Concept Artist", desc: "Designs characters and environments — on-model across the universe.", tag: "@concept" },
              { title: "Look Director", desc: "Grades the palette, light, and mood so every frame feels from one film.", tag: "@look" },
              { title: "Story Editor", desc: "Writes the bible, beats, and scene breakdowns.", tag: "@story" },
            ].map((s) => (
              <div key={s.tag} className="spec reveal">
                <div className="ic">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <rect x="4" y="4" width="16" height="16" rx="2" stroke="#fff" strokeWidth="1.6" />
                  </svg>
                </div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
                <div className="tg">{s.tag}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section" id="how">
        <div className="wrap">
          <div className="spec-head reveal" style={{ marginBottom: 52 }}>
            <span className="eyebrow">Three moves</span>
            <h2>Concept to a finished cut in minutes.</h2>
          </div>
          <div className="steps">
            {[
              { n: "STEP 01", h: "Drop your idea", p: "A logline, a moodboard, a single image. Anything is a valid start." },
              { n: "STEP 02", h: "Build the universe", p: "Cast characters, set the look, sprawl your references." },
              { n: "STEP 03", h: "Ship the cut", p: "One click turns your board into an edited video sequence." },
            ].map((s) => (
              <div key={s.n} className="step reveal">
                <div className="n">{s.n}</div>
                <h3>{s.h}</h3>
                <p>{s.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="cta-band reveal">
            <h2>Make something this&nbsp;weekend.</h2>
            <p>Open a blank canvas and see how far a single idea travels.</p>
            <div className="hero-cta">
              <Link className="btn btn-accent" href="/login">Open Inkycut →</Link>
              <Link className="btn btn-ghost" href="/ideas" style={{ background: "rgba(255,255,255,.08)", color: "#fff", borderColor: "rgba(255,255,255,.2)" }}>Browse the gallery</Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="foot">
        <div className="wrap foot-grid">
          <div>
            <a className="logo" href="/"><span className="logo-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M7 4.6 L18.2 11.4 L7 18.2 Z" fill="#fff"/><path d="M4.5 19.5 L19 5.5" stroke="#2f9fe0" strokeWidth="2.1" strokeLinecap="round"/></svg></span>Inkycut</a>
            <p style={{ marginTop: 14, fontSize: 13.5, maxWidth: "22em" }}>The infinite canvas for video.</p>
          </div>
        </div>
        <div className="wrap" style={{ marginTop: 40, display: "flex", justifyContent: "space-between", fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-faint)" }}>
          <span>© 2026 Inkycut</span>
          <span>Made on an infinite canvas ✦</span>
        </div>
      </footer>

      <script dangerouslySetInnerHTML={{ __html: `
        (function(){var els=document.querySelectorAll('.reveal');els.forEach(function(el,i){el.style.animationDelay=(Math.min(i%5,4)*70)+'ms';});})();
      `}} />
    </>
  )
}
```

- [ ] **Step 3: Start dev server and verify the landing page renders correctly**

```bash
next dev
```

Open http://localhost:3000. Verify:
- Nav with logo, links, "Sign in" and "Open Inkycut →" buttons
- Hero section with canvas mockup
- Marquee scrolling
- Specialists grid
- "Three moves" steps
- Dark CTA band
- Footer

Compare visually against `/tmp/inkycut/index.html` opened in a browser. They should be near-identical.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/app/page.module.css
git commit -m "feat: add landing page matching reference design"
```

---

## Task 7: Login page (/login)

**Files:**
- Create: `src/app/login/page.tsx`

- [ ] **Step 1: Write `src/app/login/page.tsx`**

```tsx
import { signIn } from "@/lib/auth"
import { Logo } from "@/components/ui/Logo"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

export default async function LoginPage() {
  const session = await auth()
  if (session) redirect("/dashboard")

  return (
    <div style={{
      minHeight: "100vh", display: "grid", placeItems: "center",
      background: "var(--paper)",
    }}>
      <div style={{
        background: "var(--card)", border: "1px solid var(--line)",
        borderRadius: "var(--r)", boxShadow: "var(--shadow-3)",
        padding: "32px 28px", width: 320, textAlign: "center",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 20 }}>
          <span className="logo-mark" style={{ width: 32, height: 32 }} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M7 4.6 L18.2 11.4 L7 18.2 Z" fill="#fff" />
              <path d="M4.5 19.5 L19 5.5" stroke="#2f9fe0" strokeWidth="2.1" strokeLinecap="round" />
            </svg>
          </span>
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em" }}>Inkycut</span>
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 6 }}>
          Sign in to continue
        </h1>
        <p style={{ fontSize: 14, color: "var(--ink-soft)", marginBottom: 22, lineHeight: 1.45 }}>
          Your canvas is waiting.
        </p>

        {/* Google sign-in button — server action */}
        <form action={async () => {
          "use server"
          await signIn("google", { redirectTo: "/dashboard" })
        }}>
          <button type="submit" style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            width: "100%", padding: "11px 16px", borderRadius: 999,
            border: "1.5px solid var(--line)", background: "#fff",
            fontFamily: "var(--sans)", fontSize: 14, fontWeight: 600, color: "var(--ink)",
            cursor: "pointer", transition: "border-color .15s, box-shadow .15s",
          }}>
            <GoogleIcon />
            Continue with Google
          </button>
        </form>

        <p style={{
          marginTop: 16, fontFamily: "var(--mono)", fontSize: 11,
          color: "var(--ink-faint)", lineHeight: 1.5,
        }}>
          By signing in you agree to our terms of service.
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}
```

- [ ] **Step 2: Verify login page renders and Google OAuth redirects correctly**

```bash
next dev
```

Open http://localhost:3000/login. Verify:
- Centered card on `--paper` background
- Inkycut logo and wordmark
- "Sign in to continue" heading
- "Continue with Google" button with Google colour icon
- Clicking the button redirects to Google OAuth (requires real credentials in `.env.local`)
- After auth, redirects to `/dashboard` (returns 404 for now — that's expected)

- [ ] **Step 3: Commit**

```bash
git add src/app/login/
git commit -m "feat: add login page with Google OAuth sign-in"
```

---

**Phase 1 complete.** Verify the full phase before moving on:

```bash
npx jest
next dev
```

- [ ] All tests pass
- [ ] Landing page at http://localhost:3000 matches reference design
- [ ] http://localhost:3000/login shows centered card
- [ ] http://localhost:3000/dashboard redirects to /login (middleware working)
- [ ] Google OAuth flow completes and redirects to /dashboard (needs real Google credentials)

Proceed to [Phase 2 — Dashboard](./2026-05-29-inkycut-phase-2-dashboard.md).
