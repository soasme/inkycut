import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { elementConnections, elements } from "@/lib/db/schema"

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
  h?: number | null
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
