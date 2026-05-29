import { eq } from "drizzle-orm"
import { redirect } from "next/navigation"
import { BrowserGate } from "@/components/ui/BrowserGate"
import { Canvas } from "@/components/canvas/Canvas"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { conversations } from "@/lib/db/schema"
import { getElementsByProject } from "@/lib/db/queries/elements"
import { getProjectById } from "@/lib/db/queries/projects"
import "@/../styles/app.css"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const { id } = await params
  const project = await getProjectById(id, session.user.id)
  if (!project) redirect("/dashboard")

  const [elements, convRows] = await Promise.all([
    getElementsByProject(id),
    db.select().from(conversations).where(eq(conversations.projectId, id)).limit(1),
  ])

  return (
    <BrowserGate>
      <Canvas
        project={project}
        initialElements={elements as never}
        conversationId={convRows[0]?.id ?? null}
        userId={session.user.id}
        userName={session.user.name ?? ""}
        userImage={session.user.image ?? ""}
      />
    </BrowserGate>
  )
}
