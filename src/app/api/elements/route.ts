import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { broadcastToProject } from "@/lib/socket"
import { createElement, getElementsByProject } from "@/lib/db/queries/elements"
import { getProjectById } from "@/lib/db/queries/projects"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const projectId = new URL(req.url).searchParams.get("projectId")
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 })

  const project = await getProjectById(projectId, session.user.id)
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json(await getElementsByProject(projectId))
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const project = await getProjectById(body.projectId, session.user.id)
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const element = await createElement({
    projectId: body.projectId,
    type: body.type,
    x: body.x,
    y: body.y,
    w: body.w,
    h: body.h,
    data: body.data ?? {},
  })
  try {
    broadcastToProject(body.projectId, "element:created", element)
  } catch {}

  return NextResponse.json(element, { status: 201 })
}
