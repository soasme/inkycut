import { and, desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { conversations, elements, projects } from "@/lib/db/schema"

export async function getProjectsByUser(userId: string) {
  return db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.updatedAt))
}

export async function getProjectById(projectId: string, userId: string) {
  const rows = await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.userId, userId))).limit(1)
  return rows[0] ?? null
}

export async function createProject(userId: string, name: string) {
  const [project] = await db.insert(projects).values({ userId, name }).returning()
  await db.insert(conversations).values({ projectId: project.id, name: "Main" })
  return project
}

export async function deleteProject(projectId: string, userId: string) {
  const existing = await getProjectById(projectId, userId)
  if (!existing) throw new Error("Project not found")
  await db.delete(projects).where(eq(projects.id, projectId))
}

export async function updateProjectViewport(
  projectId: string,
  viewport: { x: number; y: number; scale: number },
) {
  await db
    .update(projects)
    .set({ viewportX: viewport.x, viewportY: viewport.y, viewportScale: viewport.scale, updatedAt: new Date() })
    .where(eq(projects.id, projectId))
}

export async function getProjectWithFirstElement(userId: string) {
  const userProjects = await getProjectsByUser(userId)
  return Promise.all(
    userProjects.map(async (project) => {
      const firstElements = await db.select().from(elements).where(eq(elements.projectId, project.id)).limit(1)
      return { ...project, coverElement: firstElements[0] ?? null }
    }),
  )
}
