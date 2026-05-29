import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { conversations } from "@/lib/db/schema"
import { getMessages } from "@/lib/db/queries/messages"
import { getProjectById } from "@/lib/db/queries/projects"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const conversationId = new URL(req.url).searchParams.get("conversationId")
  if (!conversationId) return NextResponse.json({ error: "conversationId required" }, { status: 400 })

  const rows = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1)
  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const project = await getProjectById(rows[0].projectId, session.user.id)
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json(await getMessages(conversationId, 50))
}
