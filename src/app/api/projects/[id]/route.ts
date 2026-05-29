import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { deleteProject, updateProjectViewport } from "@/lib/db/queries/projects"

export const runtime = "nodejs"

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  try {
    await deleteProject(id, session.user.id)
    return new NextResponse(null, { status: 204 })
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  if (body.viewport) {
    await updateProjectViewport(id, body.viewport)
  }
  return NextResponse.json({ ok: true })
}
