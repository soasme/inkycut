# Phase 6 — File Upload

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** File upload API with local disk (dev) / S3-compatible (prod) adapter. `ImageSlot` React component replaces the `.frame` placeholder when a real image is attached to a frame node. Users can drag-and-drop or click to upload an image on any frame node. AI-generated images use OpenAI `gpt-image-2`, then persist through the same storage adapter.

**Depends on:** Phase 5 complete.

**Next phase:** [phase-7-ideas.md](./2026-05-29-inkycut-phase-7-ideas.md)

---

## Task 26: Storage adapter

**Files:**
- Create: `src/lib/storage.ts`
- Test: `src/__tests__/lib/storage.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/__tests__/lib/storage.test.ts
import { getStorageType, buildLocalUrl, validateFile } from "@/lib/storage"

describe("getStorageType", () => {
  it("returns local when STORAGE_TYPE=local", () => {
    process.env.STORAGE_TYPE = "local"
    expect(getStorageType()).toBe("local")
  })
  it("returns s3 when STORAGE_TYPE=s3", () => {
    process.env.STORAGE_TYPE = "s3"
    expect(getStorageType()).toBe("s3")
    process.env.STORAGE_TYPE = "local"
  })
})

describe("buildLocalUrl", () => {
  it("returns /uploads/<filename>", () => {
    expect(buildLocalUrl("abc123.jpg")).toBe("/uploads/abc123.jpg")
  })
})

describe("validateFile", () => {
  it("accepts jpeg", () => {
    expect(validateFile("image/jpeg", 1024)).toBe(null)
  })
  it("rejects pdf", () => {
    expect(validateFile("application/pdf", 1024)).toContain("type")
  })
  it("rejects files over 20MB", () => {
    expect(validateFile("image/jpeg", 21 * 1024 * 1024)).toContain("20MB")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/__tests__/lib/storage.test.ts
```

Expected: FAIL

- [ ] **Step 3: Write `src/lib/storage.ts`**

```ts
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { randomUUID } from "crypto"

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"])
const MAX_BYTES = 20 * 1024 * 1024

export function getStorageType(): "local" | "s3" {
  return process.env.STORAGE_TYPE === "s3" ? "s3" : "local"
}

export function buildLocalUrl(filename: string) {
  return `/uploads/${filename}`
}

export function validateFile(mimeType: string, bytes: number): string | null {
  if (!ALLOWED_TYPES.has(mimeType)) return `Unsupported file type: ${mimeType}. Allowed: JPEG, PNG, WebP, GIF`
  if (bytes > MAX_BYTES) return "File exceeds 20MB limit"
  return null
}

function extFromMime(mime: string) {
  const map: Record<string, string> = {
    "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
  }
  return map[mime] ?? "bin"
}

export async function saveLocalFile(buffer: Buffer, mimeType: string): Promise<string> {
  const filename = `${randomUUID()}.${extFromMime(mimeType)}`
  const dir = path.join(process.cwd(), "public", "uploads")
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, filename), buffer)
  return buildLocalUrl(filename)
}

export async function saveS3File(buffer: Buffer, mimeType: string): Promise<string> {
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3")
  const client = new S3Client({
    region: process.env.AWS_REGION!,
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  })
  const key = `uploads/${randomUUID()}.${extFromMime(mimeType)}`
  await client.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    ACL: "public-read",
  }))
  return `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET_NAME}/${key}`
}

export async function uploadFile(buffer: Buffer, mimeType: string): Promise<string> {
  return getStorageType() === "s3"
    ? saveS3File(buffer, mimeType)
    : saveLocalFile(buffer, mimeType)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest src/__tests__/lib/storage.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage.ts src/__tests__/lib/storage.test.ts
git commit -m "feat: add file storage adapter (local/S3) with validation"
```

---

## Task 27: Upload API route

**Files:**
- Create: `src/app/api/upload/route.ts`

- [ ] **Step 1: Write `src/app/api/upload/route.ts`**

```ts
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { validateFile, uploadFile } from "@/lib/storage"

export const config = { api: { bodyParser: false } }

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

  const error = validateFile(file.type, file.size)
  if (error) return NextResponse.json({ error }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const url = await uploadFile(buffer, file.type)

  return NextResponse.json({ url })
}
```

- [ ] **Step 2: Verify upload endpoint manually**

```bash
tsx server.ts

# Upload a test image (requires auth cookie)
curl -s -X POST http://localhost:3000/api/upload \
  -H "Cookie: authjs.session-token=..." \
  -F "file=@docs/superpowers/designs/screenshots/app1.png" | python3 -m json.tool
```

Expected: `{"url":"/uploads/some-uuid.png"}` (local mode)

- [ ] **Step 3: Commit**

```bash
git add src/app/api/upload/
git commit -m "feat: add file upload API route with local/S3 storage"
```

---

## Task 28: ImageSlot component and frame node image support

**Files:**
- Create: `src/components/ui/ImageSlot.tsx`
- Modify: `src/components/canvas/nodes/FrameNode.tsx`
- Test: `src/__tests__/components/ImageSlot.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/__tests__/components/ImageSlot.test.tsx
import { render, screen } from "@testing-library/react"
import { ImageSlot } from "@/components/ui/ImageSlot"

describe("ImageSlot", () => {
  it("renders img when url is provided", () => {
    render(<ImageSlot url="/uploads/test.jpg" alt="Test" />)
    expect(screen.getByRole("img")).toHaveAttribute("src", "/uploads/test.jpg")
  })

  it("renders Frame placeholder when url is null", () => {
    const { container } = render(<ImageSlot url={null} hue="rain" />)
    expect(container.querySelector(".frame")).toBeInTheDocument()
    expect(container.querySelector(".f-rain")).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/__tests__/components/ImageSlot.test.tsx
```

Expected: FAIL

- [ ] **Step 3: Write `src/components/ui/ImageSlot.tsx`**

```tsx
import Image from "next/image"
import { Frame } from "./Frame"

interface ImageSlotProps {
  url: string | null | undefined
  hue?: "slate" | "amber" | "rain" | "crimson" | "forest"
  alt?: string
  className?: string
  style?: React.CSSProperties
}

export function ImageSlot({ url, hue = "slate", alt = "", className, style }: ImageSlotProps) {
  if (url) {
    return (
      <Image
        src={url}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, 420px"
        className={className}
        style={{ objectFit: "cover", display: "block", ...style }}
        unoptimized={url.startsWith("/uploads/")}
      />
    )
  }
  return <Frame hue={hue} className={className} style={style} />
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest src/__tests__/components/ImageSlot.test.tsx
```

Expected: PASS (2 tests)

- [ ] **Step 5: Update `FrameNode.tsx` to support image upload**

Replace the existing `FrameNode` with:

```tsx
"use client"
import { useRef } from "react"
import { ImageSlot } from "@/components/ui/ImageSlot"
import type { CanvasElement, FrameData } from "@/types/canvas"

interface FrameNodeProps {
  element: CanvasElement
  onImageUpload: (elementId: string, url: string) => void
}

export function FrameNode({ element, onImageUpload }: FrameNodeProps) {
  const data = element.data as FrameData
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const form = new FormData()
    form.append("file", file)
    const res = await fetch("/api/upload", { method: "POST", body: form })
    if (!res.ok) return
    const { url } = await res.json()
    onImageUpload(element.id, url)
  }

  return (
    <div className="fwrap" style={{ aspectRatio: data.ar ?? "16 / 10" }}>
      <div className="fhandle nh-drag" />
      <ImageSlot url={data.imageUrl} hue={data.hue as any ?? "slate"} style={{ position: "absolute", inset: 0 }} />
      <span className="fslug">
        {data.rec && <span className="rec" />}
        {data.slug}
      </span>
      <span className="fmeta">{data.meta}</span>
      {/* Upload trigger */}
      <button
        title="Upload image"
        data-no-drag
        onClick={() => inputRef.current?.click()}
        style={{
          position: "absolute", bottom: 8, left: 8, zIndex: 8,
          background: "rgba(0,0,0,.4)", border: "none", borderRadius: 6,
          color: "rgba(255,255,255,.8)", fontFamily: "var(--mono)", fontSize: 9,
          padding: "3px 7px", cursor: "pointer", letterSpacing: ".04em",
        }}
      >
        ↑ image
      </button>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: "none" }} onChange={handleFile} />
    </div>
  )
}
```

- [ ] **Step 6: Update `Stage.tsx` to pass `onImageUpload` to `FrameNode`**

In `Stage.tsx`, add an `onImageUpload` prop to `StageProps` and thread it through:

```tsx
// StageProps addition:
onImageUpload: (elementId: string, url: string) => void

// FrameNode render line (replace existing):
{el.type === "frame" && <FrameNode element={el} onImageUpload={onImageUpload} />}
```

- [ ] **Step 7: Update `Canvas.tsx` to provide `onImageUpload` to `Stage`**

```tsx
// In Canvas.tsx, add onImageUpload handler:
async function handleImageUpload(elementId: string, url: string) {
  const el = store.elements.find((e) => e.id === elementId)
  if (!el) return
  const newData = { ...(el.data as object), imageUrl: url }
  store.updateElement(elementId, { data: newData as any })
  await fetch(`/api/elements/${elementId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: newData }),
  })
}

// Pass to Stage:
<Stage
  onNodeUpdate={onNodeUpdate}
  busy={false}
  onGenerateShotlist={() => {}}
  onNoteChange={(id, text) => onNodeUpdate(id, { data: { ...(store.elements.find(e=>e.id===id)?.data as object), text } as any })}
  onCursorMove={emitCursor}
  onImageUpload={handleImageUpload}
/>
```

- [ ] **Step 8: Verify image upload in browser**

1. Open a project canvas, add a frame node
2. Hover the frame node and click "↑ image"
3. Select a local image file
4. Verify the image fills the frame node (replacing the film-placeholder gradient)
5. Refresh the page — image persists (stored in `elements.data.imageUrl`)

- [ ] **Step 9: Commit**

```bash
git add src/components/ui/ImageSlot.tsx src/components/canvas/nodes/FrameNode.tsx src/components/canvas/ src/__tests__/components/ImageSlot.test.tsx
git commit -m "feat: add ImageSlot component and image upload for frame nodes"
```

---

## Task 29: GPT image generation for new-image requests

**Files:**
- Create: `src/lib/image-generation.ts`
- Create: `src/app/api/generate-image/route.ts`
- Modify: `src/lib/openai.ts`
- Modify: `src/lib/canvas-tools.ts`
- Test: `src/__tests__/lib/image-generation.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/__tests__/lib/image-generation.test.ts
import { buildImagePrompt, decodeGeneratedImage } from "@/lib/image-generation"

describe("image generation helpers", () => {
  it("buildImagePrompt includes user prompt and visual constraints", () => {
    const prompt = buildImagePrompt("wide shot of a rainy alley")
    expect(prompt).toContain("wide shot of a rainy alley")
    expect(prompt).toContain("cinematic")
  })

  it("decodeGeneratedImage decodes base64 PNG bytes", () => {
    const buffer = decodeGeneratedImage(Buffer.from("png-bytes").toString("base64"))
    expect(buffer.toString()).toBe("png-bytes")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/__tests__/lib/image-generation.test.ts
```

Expected: FAIL

- [ ] **Step 3: Add the image model constant to `src/lib/openai.ts`**

```ts
export const IMAGE_MODEL = "gpt-image-2"
```

- [ ] **Step 4: Write `src/lib/image-generation.ts`**

```ts
import { openai, IMAGE_MODEL } from "@/lib/openai"
import { uploadFile } from "@/lib/storage"
import { getProjectById } from "@/lib/db/queries/projects"
import { updateElement } from "@/lib/db/queries/elements"
import { db } from "@/lib/db"
import { elements } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export function buildImagePrompt(prompt: string) {
  return [
    "Create a cinematic production image for an Inkycut video canvas.",
    "Avoid text, watermarks, UI chrome, logos, or captions.",
    prompt.trim(),
  ].join("\n")
}

export function decodeGeneratedImage(b64: string) {
  return Buffer.from(b64, "base64")
}

export async function generateImageForElement(input: {
  userId: string
  projectId: string
  elementId: string
  prompt: string
}) {
  const project = await getProjectById(input.projectId, input.userId)
  if (!project) throw new Error("Project not found")

  const [element] = await db.select().from(elements).where(eq(elements.id, input.elementId)).limit(1)
  if (!element || element.projectId !== input.projectId) throw new Error("Element not found")
  if (!["frame", "character"].includes(element.type)) throw new Error("Images can only attach to frame or character elements")

  const response = await openai.images.generate({
    model: IMAGE_MODEL,
    prompt: buildImagePrompt(input.prompt),
    size: "1536x1024",
  })
  const b64 = response.data?.[0]?.b64_json
  if (!b64) throw new Error("Image generation returned no image data")

  const url = await uploadFile(decodeGeneratedImage(b64), "image/png")
  const data = { ...(element.data as Record<string, unknown>), imageUrl: url }
  const updated = await updateElement(input.elementId, input.projectId, { data })
  return { url, element: updated }
}
```

- [ ] **Step 5: Add `src/app/api/generate-image/route.ts`**

```ts
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { generateImageForElement } from "@/lib/image-generation"
import { broadcastToProject } from "@/lib/socket"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { projectId, elementId, prompt } = await req.json()
  if (!projectId || !elementId || !prompt?.trim()) {
    return NextResponse.json({ error: "projectId, elementId, and prompt required" }, { status: 400 })
  }

  try {
    const result = await generateImageForElement({
      userId: session.user.id,
      projectId,
      elementId,
      prompt,
    })
    try {
      broadcastToProject(projectId, "element:updated", { elementId, patch: { data: result.element?.data } })
    } catch {}
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Image generation failed" }, { status: 400 })
  }
}
```

- [ ] **Step 6: Add a `generate_image` tool to `src/lib/openai.ts`**

Add this to `CANVAS_TOOLS`:

```ts
{
  type: "function",
  function: {
    name: "generate_image",
    description: "Generate a new image with gpt-image-2 and attach it to a frame or character element. Use this whenever the user asks for a new image.",
    parameters: {
      type: "object",
      properties: {
        elementId: { type: "string", description: "Frame or character element ID that should receive the image" },
        prompt: { type: "string", description: "Detailed visual prompt for the new image" },
      },
      required: ["elementId", "prompt"],
    },
  },
}
```

Update `buildSystemPrompt` with:

```ts
If the user asks for a new image, use generate_image with gpt-image-2. Attach the result to the relevant frame or character. Do not invent image URLs.
```

- [ ] **Step 7: Update `src/lib/canvas-tools.ts` to execute `generate_image`**

Add import:

```ts
import { generateImageForElement } from "@/lib/image-generation"
```

Add `generate_image` to `KNOWN_TOOLS`:

```ts
const KNOWN_TOOLS = new Set(["create_element", "update_element", "delete_element", "connect_elements", "list_elements", "generate_image"])
```

Add `userId` to the `executeToolCall` signature:

```ts
export async function executeToolCall(
  name: string,
  args: Record<string, unknown>,
  projectId: string,
  userId: string
): Promise<{ result: unknown; elementMutation?: { action: string; element?: unknown; id?: string } }> {
```

Add this case inside the existing `switch`:

```ts
case "generate_image": {
  const generated = await generateImageForElement({
    userId,
    projectId,
    elementId: args.elementId as string,
    prompt: args.prompt as string,
  })
  return { result: { url: generated.url }, elementMutation: { action: "updated", element: generated.element } }
}
```

Update `src/app/api/chat/route.ts` so tool execution passes the authenticated user id:

```ts
const { result, elementMutation } = await executeToolCall(tc.name, args, projectId, session.user.id)
```

- [ ] **Step 8: Run tests to verify they pass**

```bash
npx jest src/__tests__/lib/image-generation.test.ts src/__tests__/lib/canvas-tools.test.ts
```

Expected: PASS

- [ ] **Step 9: Verify image generation manually**

With `tsx server.ts` and a real `OPENAI_API_KEY`:

1. Open a project canvas and add a frame node
2. Ask the chat: "Generate a new image for this frame: rainy neon alley, wide establishing shot"
3. Verify the chat calls `generate_image`, the frame's `imageUrl` is updated, and the generated image persists after refresh

- [ ] **Step 10: Commit**

```bash
git add src/lib/openai.ts src/lib/canvas-tools.ts src/lib/image-generation.ts src/app/api/generate-image/ src/__tests__/lib/image-generation.test.ts
git commit -m "feat: add gpt-image-2 image generation for canvas nodes"
```

---

**Phase 6 complete.** Verify before proceeding:

```bash
npm run test:coverage
```

- [ ] All tests pass with 100% coverage
- [ ] Uploading an image to a frame node replaces the film-placeholder
- [ ] Images persist across page refresh
- [ ] Asking for a new image uses `gpt-image-2` and attaches the result to the target frame or character
- [ ] `STORAGE_TYPE=local` saves to `public/uploads/`
- [ ] `STORAGE_TYPE=s3` would upload to S3 bucket (test with DO Spaces credentials)

Proceed to [Phase 7 — Ideas Gallery](./2026-05-29-inkycut-phase-7-ideas.md).
