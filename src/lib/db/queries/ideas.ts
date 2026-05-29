import { desc, eq, isNotNull } from "drizzle-orm"
import { db } from "@/lib/db"
import { ideas, users } from "@/lib/db/schema"

export function isPublished(idea: { publishedAt: Date | null }) {
  return idea.publishedAt !== null
}

export async function getPublishedIdeas(limit = 60) {
  return db
    .select({
      id: ideas.id,
      title: ideas.title,
      description: ideas.description,
      genre: ideas.genre,
      tags: ideas.tags,
      publishedAt: ideas.publishedAt,
      projectId: ideas.projectId,
      userName: users.name,
      userImage: users.image,
      coverElementId: ideas.coverElementId,
    })
    .from(ideas)
    .innerJoin(users, eq(ideas.userId, users.id))
    .where(isNotNull(ideas.publishedAt))
    .orderBy(desc(ideas.publishedAt))
    .limit(limit)
}

export async function getIdeaByProject(projectId: string) {
  const rows = await db.select().from(ideas).where(eq(ideas.projectId, projectId)).limit(1)
  return rows[0] ?? null
}

export async function publishProject(input: {
  projectId: string
  userId: string
  title: string
  description?: string
  genre?: string
  tags?: string[]
  coverElementId?: string
}) {
  const existing = await getIdeaByProject(input.projectId)
  if (existing) {
    const [updated] = await db
      .update(ideas)
      .set({
        title: input.title,
        description: input.description,
        genre: input.genre,
        tags: input.tags,
        coverElementId: input.coverElementId,
        publishedAt: new Date(),
      })
      .where(eq(ideas.id, existing.id))
      .returning()
    return updated
  }

  const [idea] = await db.insert(ideas).values({ ...input, publishedAt: new Date() }).returning()
  return idea
}

export async function unpublishProject(projectId: string, userId: string) {
  const existing = await getIdeaByProject(projectId)
  if (!existing || existing.userId !== userId) throw new Error("Not found")
  await db.delete(ideas).where(eq(ideas.id, existing.id))
}
