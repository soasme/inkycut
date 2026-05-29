# Phase 4 — AI Chat

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Streaming OpenAI GPT-4o chat with function calling. AI can create, update, delete, and connect canvas elements. Chat panel becomes fully interactive.

**Depends on:** Phase 3 complete.

**Next phase:** [phase-5-realtime.md](./2026-05-29-inkycut-phase-5-realtime.md)

---

## Task 18: Message DB query helpers

**Files:**
- Create: `src/lib/db/queries/messages.ts`
- Test: `src/__tests__/lib/queries/messages.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/lib/queries/messages.test.ts
jest.mock("@/lib/db", () => ({ db: {} }))
import { formatMessagesForOpenAI } from "@/lib/db/queries/messages"

describe("formatMessagesForOpenAI", () => {
  it("maps user messages to openai format", () => {
    const msgs = [{ role: "user", content: "hello", agentName: null, toolCalls: null }]
    expect(formatMessagesForOpenAI(msgs as any)).toEqual([{ role: "user", content: "hello" }])
  })

  it("maps agent messages as assistant role", () => {
    const msgs = [{ role: "agent", content: "hi", agentName: "Video Specialist", toolCalls: null }]
    expect(formatMessagesForOpenAI(msgs as any)).toEqual([{ role: "assistant", content: "hi" }])
  })

  it("skips stamp messages", () => {
    const msgs = [{ role: "stamp", content: "May 22", agentName: null, toolCalls: null }]
    expect(formatMessagesForOpenAI(msgs as any)).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/__tests__/lib/queries/messages.test.ts
```

Expected: FAIL

- [ ] **Step 3: Write `src/lib/db/queries/messages.ts`**

```ts
import { db } from "@/lib/db"
import { messages, conversations } from "@/lib/db/schema"
import { eq, asc, desc } from "drizzle-orm"

export async function getMessages(conversationId: string, limit = 20) {
  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(limit)
    .then((rows) => rows.reverse())
}

export async function createMessage(input: {
  conversationId: string
  role: string
  agentName?: string
  content?: string
  toolCalls?: unknown
}) {
  const [msg] = await db.insert(messages).values(input).returning()
  return msg
}

export function formatMessagesForOpenAI(msgs: Array<{ role: string; content: string | null; agentName: string | null; toolCalls: unknown }>) {
  return msgs
    .filter((m) => m.role !== "stamp")
    .map((m) => ({
      role: m.role === "agent" ? ("assistant" as const) : ("user" as const),
      content: m.content ?? "",
    }))
}

export async function getConversationByProject(projectId: string) {
  const rows = await db
    .select()
    .from(conversations)
    .where(eq(conversations.projectId, projectId))
    .limit(1)
  return rows[0] ?? null
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest src/__tests__/lib/queries/messages.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/queries/messages.ts src/__tests__/lib/queries/messages.test.ts
git commit -m "feat: add message DB query helpers with OpenAI format mapper"
```

---

## Task 19: OpenAI client and canvas tool definitions

**Files:**
- Create: `src/lib/openai.ts`
- Create: `src/lib/canvas-tools.ts`
- Test: `src/__tests__/lib/canvas-tools.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/lib/canvas-tools.test.ts
import { parseToolCall } from "@/lib/canvas-tools"

describe("parseToolCall", () => {
  it("parses create_element args", () => {
    const result = parseToolCall("create_element", JSON.stringify({
      type: "frame", x: 100, y: 200, w: 300, data: { slug: "TEST" }
    }))
    expect(result.type).toBe("frame")
    expect(result.x).toBe(100)
  })

  it("returns null for unknown tool", () => {
    const result = parseToolCall("unknown_tool", "{}")
    expect(result).toBeNull()
  })

  it("returns null for invalid JSON", () => {
    const result = parseToolCall("create_element", "not-json")
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/__tests__/lib/canvas-tools.test.ts
```

Expected: FAIL

- [ ] **Step 3: Write `src/lib/openai.ts`**

```ts
import OpenAI from "openai"
import type { ChatCompletionTool } from "openai/resources"

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export const CANVAS_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "create_element",
      description: "Create a new node on the canvas. Use this to add frames, characters, storyboards, shot lists, or notes.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["frame", "character", "doc", "storyboard", "shotlist", "note"] },
          x: { type: "number", description: "Canvas X position in world coordinates" },
          y: { type: "number", description: "Canvas Y position in world coordinates" },
          w: { type: "number", description: "Width in world coordinates" },
          h: { type: "number", description: "Height (optional)" },
          data: { type: "object", description: "Type-specific data fields (slug, hue, name, title, text, etc.)" },
        },
        required: ["type", "x", "y", "w", "data"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_element",
      description: "Update fields on an existing canvas element by its ID.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Element ID to update" },
          patch: { type: "object", description: "Fields to update: x, y, w, h, data (merged), or type" },
        },
        required: ["id", "patch"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_element",
      description: "Remove an element from the canvas by ID.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Element ID to delete" },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "connect_elements",
      description: "Create a directed connection between two frame nodes for video export sequencing.",
      parameters: {
        type: "object",
        properties: {
          fromId: { type: "string", description: "Source frame element ID" },
          toId: { type: "string", description: "Target frame element ID" },
        },
        required: ["fromId", "toId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_elements",
      description: "Return the current list of all elements on the canvas. Use this to understand what's already on the board before creating or modifying elements.",
      parameters: { type: "object", properties: {} },
    },
  },
]

export function buildSystemPrompt(elements: Array<{ id: string; type: string; data: Record<string, unknown> }>) {
  const summary = elements.slice(0, 30).map((e) => `- ${e.id} [${e.type}]: ${JSON.stringify(e.data).slice(0, 120)}`).join("\n")
  return `You are the Video Specialist at Inkycut — an AI assistant that helps creators build video projects on an infinite canvas.

Current canvas elements:
${summary || "(empty canvas)"}

You can create, update, and connect canvas elements using the provided tools. When you create a frame, use descriptive slugs (e.g. EST_SHOT, CHAR_01, INT_NIGHT). Use the hues: slate, rain, amber, crimson, forest. Default frame width is 300, character width is 340, storyboard width is 380.

Be concise and decisive. After using tools, briefly describe what you did. Never ask for confirmation before taking canvas actions — just do it.`
}
```

- [ ] **Step 4: Write `src/lib/canvas-tools.ts`**

```ts
import { createElement, updateElement, deleteElement } from "@/lib/db/queries/elements"
import { db } from "@/lib/db"
import { elementConnections, elements } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

const KNOWN_TOOLS = new Set(["create_element", "update_element", "delete_element", "connect_elements", "list_elements"])

export function parseToolCall(name: string, argsJson: string): Record<string, unknown> | null {
  if (!KNOWN_TOOLS.has(name)) return null
  try {
    return JSON.parse(argsJson)
  } catch {
    return null
  }
}

export async function executeToolCall(
  name: string,
  args: Record<string, unknown>,
  projectId: string
): Promise<{ result: unknown; elementMutation?: { action: string; element?: unknown; id?: string } }> {
  switch (name) {
    case "create_element": {
      const el = await createElement({
        projectId,
        type: args.type as string,
        x: args.x as number,
        y: args.y as number,
        w: args.w as number,
        h: args.h as number | undefined,
        data: (args.data as Record<string, unknown>) ?? {},
      })
      return { result: el, elementMutation: { action: "created", element: el } }
    }

    case "update_element": {
      const updated = await updateElement(args.id as string, projectId, args.patch as Record<string, unknown>)
      return { result: updated, elementMutation: { action: "updated", element: updated } }
    }

    case "delete_element": {
      await deleteElement(args.id as string, projectId)
      return { result: { deleted: args.id }, elementMutation: { action: "deleted", id: args.id as string } }
    }

    case "connect_elements": {
      const [conn] = await db
        .insert(elementConnections)
        .values({ projectId, fromElementId: args.fromId as string, toElementId: args.toId as string })
        .returning()
      return { result: conn }
    }

    case "list_elements": {
      const els = await db.select().from(elements).where(eq(elements.projectId, projectId))
      return { result: els.map((e) => ({ id: e.id, type: e.type, x: e.x, y: e.y, data: e.data })) }
    }

    default:
      return { result: { error: "unknown tool" } }
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx jest src/__tests__/lib/canvas-tools.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add src/lib/openai.ts src/lib/canvas-tools.ts src/__tests__/lib/canvas-tools.test.ts
git commit -m "feat: add OpenAI client, canvas tool definitions, and tool executor"
```

---

## Task 20: Streaming chat API route

**Files:**
- Create: `src/app/api/chat/route.ts`

- [ ] **Step 1: Write `src/app/api/chat/route.ts`**

```ts
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { openai, CANVAS_TOOLS, buildSystemPrompt } from "@/lib/openai"
import { parseToolCall, executeToolCall } from "@/lib/canvas-tools"
import { getProjectById } from "@/lib/db/queries/projects"
import { getElementsByProject } from "@/lib/db/queries/elements"
import { getMessages, createMessage } from "@/lib/db/queries/messages"
import type { ChatCompletionMessageParam } from "openai/resources"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { projectId, conversationId, message } = await req.json()
  if (!projectId || !conversationId || !message?.trim()) {
    return NextResponse.json({ error: "projectId, conversationId, and message required" }, { status: 400 })
  }

  const project = await getProjectById(projectId, session.user.id)
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Save user message
  await createMessage({ conversationId, role: "user", content: message.trim() })

  // Build context
  const elements = await getElementsByProject(projectId)
  const history = await getMessages(conversationId, 20)
  const systemPrompt = buildSystemPrompt(elements as any)

  const openaiMessages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history.slice(0, -1).map((m) => ({
      role: (m.role === "agent" ? "assistant" : "user") as "assistant" | "user",
      content: m.content ?? "",
    })),
    { role: "user", content: message.trim() },
  ]

  // Collect element mutations to broadcast (Phase 5 will add socket broadcast here)
  const mutations: unknown[] = []

  // Stream response
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      function send(data: string) {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`))
      }

      let fullText = ""
      let currentMessages = [...openaiMessages]
      let continueLoop = true

      while (continueLoop) {
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: currentMessages,
          tools: CANVAS_TOOLS,
          tool_choice: "auto",
          stream: true,
        })

        const toolCallAccumulator: Record<number, { id: string; name: string; argsJson: string }> = {}
        let chunkText = ""

        for await (const chunk of response) {
          const delta = chunk.choices[0]?.delta
          if (!delta) continue

          // Stream text
          if (delta.content) {
            chunkText += delta.content
            fullText += delta.content
            send(JSON.stringify({ type: "text", content: delta.content }))
          }

          // Accumulate tool calls
          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index
              if (!toolCallAccumulator[idx]) {
                toolCallAccumulator[idx] = { id: tc.id ?? "", name: tc.function?.name ?? "", argsJson: "" }
              }
              if (tc.function?.arguments) toolCallAccumulator[idx].argsJson += tc.function.arguments
            }
          }

          const finishReason = chunk.choices[0]?.finish_reason
          if (finishReason === "stop") { continueLoop = false }
          if (finishReason === "tool_calls") {
            // Execute tool calls
            const toolCallList = Object.values(toolCallAccumulator)
            currentMessages.push({ role: "assistant", content: chunkText || null, tool_calls: toolCallList.map((tc) => ({ id: tc.id, type: "function" as const, function: { name: tc.name, arguments: tc.argsJson } })) })

            const toolResults: ChatCompletionMessageParam[] = []
            for (const tc of toolCallList) {
              const args = parseToolCall(tc.name, tc.argsJson)
              if (!args) { toolResults.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify({ error: "parse failed" }) }); continue }
              const { result, elementMutation } = await executeToolCall(tc.name, args, projectId)
              if (elementMutation) {
                mutations.push(elementMutation)
                send(JSON.stringify({ type: "mutation", mutation: elementMutation }))
              }
              toolResults.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) })
            }
            currentMessages.push(...toolResults)
            chunkText = ""
          }
        }
      }

      // Save final agent message
      await createMessage({ conversationId, role: "agent", agentName: "Video Specialist", content: fullText })
      send(JSON.stringify({ type: "done" }))
      controller.close()
    },
  })

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/chat/
git commit -m "feat: add streaming OpenAI chat API with canvas tool calls"
```

---

## Task 21: Full ChatPanel implementation

**Files:**
- Replace: `src/components/canvas/chat/ChatPanel.tsx` (stub → full)
- Create: `src/components/canvas/chat/ChatMessage.tsx`
- Create: `src/components/canvas/chat/Composer.tsx`

- [ ] **Step 1: Write `src/components/canvas/chat/ChatMessage.tsx`**

```tsx
import { Frame } from "@/components/ui/Frame"

interface Msg {
  id: string
  role: string
  agentName?: string | null
  content?: string | null
}

export function ChatMessage({ msg, onAction }: { msg: Msg; onAction?: (text: string) => void }) {
  if (msg.role === "stamp") return <div className="stamp">{msg.content}</div>

  if (msg.role === "user") {
    return (
      <div className="msg user">
        <div className="bubble">{msg.content}</div>
      </div>
    )
  }

  return (
    <div className="msg">
      <span className="agent-tag">
        <span className="pi">▷</span> {msg.agentName ?? "Video Specialist"}
      </span>
      <div className="bubble">{msg.content}</div>
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="msg">
      <span className="agent-tag"><span className="pi">▷</span> Video Specialist</span>
      <div className="typing"><i /><i /><i /></div>
    </div>
  )
}
```

- [ ] **Step 2: Write `src/components/canvas/chat/Composer.tsx`**

```tsx
"use client"
import { useRef } from "react"

const PATHS: Record<string, string> = {
  send: "M5 12h14M13 6l6 6-6 6",
  clip: "M21 11l-8.5 8.5a4 4 0 01-6-6L14 5a2.6 2.6 0 014 4l-7.6 7.6a1.2 1.2 0 01-2-1.8L13 8",
}

function Icon({ n, s = 17 }: { n: string; s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[n]} />
    </svg>
  )
}

interface ComposerProps {
  draft: string
  setDraft: (v: string) => void
  onSend: () => void
  thinking: boolean
  taRef: React.RefObject<HTMLTextAreaElement>
}

export function Composer({ draft, setDraft, onSend, thinking, taRef }: ComposerProps) {
  function onInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setDraft(e.target.value)
    e.target.style.height = "auto"
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend() }
  }

  const quickActions = ["Board a scene", "Make a shot list", "New character"]

  return (
    <div className="composer">
      <div className="quick-row">
        {quickActions.map((a) => (
          <button key={a} className="chip-act" onClick={() => { setDraft(a); setTimeout(onSend, 0) }}>{a}</button>
        ))}
      </div>
      <div className="composer-box">
        <textarea
          ref={taRef}
          rows={1}
          value={draft}
          onChange={onInput}
          onKeyDown={onKey}
          placeholder='Start from an idea…  e.g. "board a neon rooftop chase"'
        />
        <div className="composer-foot">
          <span className="comp-icon"><Icon n="clip" /></span>
          <span className="model-pill">Video Specialist</span>
          <button
            className="send-btn"
            disabled={thinking || !draft.trim()}
            onClick={onSend}
          >
            <Icon n="send" />
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Replace the ChatPanel stub with the full implementation**

```tsx
// src/components/canvas/chat/ChatPanel.tsx
"use client"
import { forwardRef, useImperativeHandle, useRef, useState, useEffect } from "react"
import { useCanvasStore } from "@/hooks/useCanvas"
import { ChatMessage, TypingIndicator } from "./ChatMessage"
import { Composer } from "./Composer"
import type { CanvasElement } from "@/types/canvas"

interface Msg {
  id: string
  role: string
  agentName?: string | null
  content?: string | null
}

interface ChatPanelProps {
  projectId: string
  conversationId: string | null
}

export const ChatPanel = forwardRef<{ focus: () => void }, ChatPanelProps>(
  function ChatPanel({ projectId, conversationId }, ref) {
    const store = useCanvasStore()
    const taRef = useRef<HTMLTextAreaElement>(null)
    const scrollRef = useRef<HTMLDivElement>(null)
    const [messages, setMessages] = useState<Msg[]>([])
    const [draft, setDraft] = useState("")
    const [thinking, setThinking] = useState(false)

    useImperativeHandle(ref, () => ({ focus: () => taRef.current?.focus() }))

    // Auto-scroll
    useEffect(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }, [messages, thinking])

    // Load history on mount
    useEffect(() => {
      if (!conversationId) return
      fetch(`/api/messages?conversationId=${conversationId}`)
        .then((r) => r.json())
        .then((data: Msg[]) => setMessages(data))
        .catch(() => {})
    }, [conversationId])

    async function send() {
      if (!draft.trim() || thinking || !conversationId) return
      const text = draft.trim()
      setDraft("")
      setMessages((m) => [...m, { id: Date.now().toString(), role: "user", content: text }])
      setThinking(true)

      let agentText = ""
      const agentMsgId = (Date.now() + 1).toString()
      setMessages((m) => [...m, { id: agentMsgId, role: "agent", agentName: "Video Specialist", content: "" }])

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, conversationId, message: text }),
      })

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const lines = decoder.decode(value).split("\n\n").filter(Boolean)
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const event = JSON.parse(line.slice(6))

          if (event.type === "text") {
            agentText += event.content
            setMessages((m) =>
              m.map((msg) => (msg.id === agentMsgId ? { ...msg, content: agentText } : msg))
            )
          }

          if (event.type === "mutation") {
            const { action, element, id } = event.mutation
            if (action === "created" && element) store.addElement(element as CanvasElement)
            if (action === "updated" && element) store.updateElement((element as CanvasElement).id, element as Partial<CanvasElement>)
            if (action === "deleted" && id) store.removeElement(id)
          }
        }
      }

      setThinking(false)
    }

    return (
      <aside className="chat">
        <div className="chat-head">
          <div className="chat-title">Chat</div>
          <div className="chat-sub">▷ Video Specialist · on this board</div>
        </div>
        <div ref={scrollRef} className="chat-scroll">
          {messages.map((m) => <ChatMessage key={m.id} msg={m} />)}
          {thinking && <TypingIndicator />}
        </div>
        <Composer draft={draft} setDraft={setDraft} onSend={send} thinking={thinking} taRef={taRef} />
      </aside>
    )
  }
)
```

- [ ] **Step 4: Add a messages API route for loading history**

```ts
// src/app/api/messages/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getMessages, getConversationByProject } from "@/lib/db/queries/messages"
import { getProjectById } from "@/lib/db/queries/projects"
import { db } from "@/lib/db"
import { conversations } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const conversationId = searchParams.get("conversationId")
  if (!conversationId) return NextResponse.json({ error: "conversationId required" }, { status: 400 })

  // Verify ownership via conversation → project → user
  const rows = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1)
  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const project = await getProjectById(rows[0].projectId, session.user.id)
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const msgs = await getMessages(conversationId, 50)
  return NextResponse.json(msgs)
}
```

- [ ] **Step 5: Verify AI chat in browser**

With `next dev` and a real `OPENAI_API_KEY` in `.env.local`:

1. Open a project canvas
2. Type "Add a frame with slug ROOFTOP" in the chat
3. Expected: thinking indicator appears, then a frame node is created on the canvas and the chat shows the agent response
4. Type "Add a character called The Warlord"
5. Expected: character node appears on canvas

- [ ] **Step 6: Commit**

```bash
git add src/components/canvas/chat/ src/app/api/chat/ src/app/api/messages/ src/lib/db/queries/messages.ts src/lib/openai.ts src/lib/canvas-tools.ts
git commit -m "feat: implement AI chat with streaming OpenAI tool calls and canvas mutations"
```

---

**Phase 4 complete.** Verify before proceeding:

```bash
npx jest
```

- [ ] All tests pass
- [ ] Chat panel shows history on canvas open
- [ ] Sending a message streams the AI response
- [ ] AI tool calls create/update/delete elements on the canvas
- [ ] Canvas nodes appear immediately from mutations

Proceed to [Phase 5 — Real-time Collaboration](./2026-05-29-inkycut-phase-5-realtime.md).
