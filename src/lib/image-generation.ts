import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { elements } from "@/lib/db/schema"
import { updateElement } from "@/lib/db/queries/elements"
import { getProjectById } from "@/lib/db/queries/projects"
import { IMAGE_MODEL, openai } from "@/lib/openai"
import { uploadFile } from "@/lib/storage"

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
