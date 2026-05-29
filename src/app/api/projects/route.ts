import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createProject, getProjectWithFirstElement } from "@/lib/db/queries/projects"

export const runtime = "nodejs"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const projects = await getProjectWithFirstElement(session.user.id)
  return NextResponse.json(projects)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name } = await req.json()
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 })
  }

  const project = await createProject(session.user.id, name.trim())
  return NextResponse.json(project, { status: 201 })
}
