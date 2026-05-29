import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { generateImageForElement } from "@/lib/image-generation"
import { broadcastToProject } from "@/lib/socket"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { projectId, elementId, prompt } = await req.json()
  if (!projectId || !elementId || typeof prompt !== "string" || !prompt.trim()) {
    return NextResponse.json({ error: "projectId, elementId, and prompt required" }, { status: 400 })
  }

  try {
    const result = await generateImageForElement({ userId: session.user.id, projectId, elementId, prompt })
    try {
      broadcastToProject(projectId, "element:updated", { elementId, patch: { data: result.element?.data } })
    } catch {}
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Image generation failed" }, { status: 400 })
  }
}
