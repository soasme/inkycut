import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { broadcastToProject } from "@/lib/socket"
import { db } from "@/lib/db"
import { elements } from "@/lib/db/schema"
import { buildElementPatch, deleteElement, updateElement } from "@/lib/db/queries/elements"
import { getProjectById } from "@/lib/db/queries/projects"

export const runtime = "nodejs"

async function getElementProject(elementId: string, userId: string) {
  const rows = await db.select().from(elements).where(eq(elements.id, elementId)).limit(1)
  if (!rows[0]) return null
  return getProjectById(rows[0].projectId, userId)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const project = await getElementProject(id, session.user.id)
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const patch = buildElementPatch(await req.json())
  const updated = await updateElement(id, project.id, patch)
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 })

  try {
    broadcastToProject(project.id, "element:updated", { elementId: id, patch })
  } catch {}

  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const project = await getElementProject(id, session.user.id)
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await deleteElement(id, project.id)
  try {
    broadcastToProject(project.id, "element:deleted", { elementId: id })
  } catch {}

  return new NextResponse(null, { status: 204 })
}
