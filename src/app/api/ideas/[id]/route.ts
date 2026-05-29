import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getIdeaByProject, publishProject, unpublishProject } from "@/lib/db/queries/ideas"
import { getProjectById } from "@/lib/db/queries/projects"

export const runtime = "nodejs"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const project = await getProjectById(id, session.user.id)
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json((await getIdeaByProject(id)) ?? null)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const project = await getProjectById(id, session.user.id)
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  if (typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "title required" }, { status: 400 })
  }

  const idea = await publishProject({
    projectId: id,
    userId: session.user.id,
    title: body.title.trim(),
    description: body.description,
    genre: body.genre,
    tags: body.tags,
    coverElementId: body.coverElementId,
  })
  return NextResponse.json(idea, { status: 201 })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  try {
    await unpublishProject(id, session.user.id)
    return new NextResponse(null, { status: 204 })
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}
