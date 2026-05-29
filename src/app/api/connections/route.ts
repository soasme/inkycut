import { and, eq, inArray } from "drizzle-orm"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { broadcastToProject } from "@/lib/socket"
import { db } from "@/lib/db"
import { elementConnections, elements } from "@/lib/db/schema"
import { getConnectionsByProject } from "@/lib/db/queries/elements"
import { getProjectById } from "@/lib/db/queries/projects"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const projectId = new URL(req.url).searchParams.get("projectId")
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 })
  const project = await getProjectById(projectId, session.user.id)
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(await getConnectionsByProject(projectId))
}

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
    .where(and(eq(elements.projectId, projectId), eq(elements.type, "frame"), inArray(elements.id, [fromElementId, toElementId])))
  if (endpoints.length !== 2) {
    return NextResponse.json({ error: "Both endpoints must be frame elements in this project" }, { status: 400 })
  }

  const [connection] = await db.insert(elementConnections).values({ projectId, fromElementId, toElementId }).returning()
  try {
    broadcastToProject(projectId, "element:connected", connection)
  } catch {}
  return NextResponse.json(connection, { status: 201 })
}
