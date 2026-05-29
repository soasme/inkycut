import { redirect } from "next/navigation"
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar"
import { ProjectGrid } from "@/components/dashboard/ProjectGrid"
import { auth } from "@/lib/auth"
import { getProjectWithFirstElement } from "@/lib/db/queries/projects"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const projects = await getProjectWithFirstElement(session.user.id)
  return (
    <main className="dashboard-shell">
      <DashboardSidebar />
      <section className="dashboard-main">
        <ProjectGrid initialProjects={projects} />
      </section>
    </main>
  )
}
