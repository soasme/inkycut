import { asc, desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { conversations, messages } from "@/lib/db/schema"

export async function getMessages(conversationId: string, limit = 20) {
  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(limit)
    .then((rows) => rows.reverse())
}

export async function createMessage(input: {
  conversationId: string
  role: string
  agentName?: string
  content?: string
  toolCalls?: unknown
}) {
  const [message] = await db.insert(messages).values(input).returning()
  return message
}

export function formatMessagesForOpenAI(
  msgs: Array<{ role: string; content: string | null; agentName: string | null; toolCalls: unknown }>,
) {
  return msgs
    .filter((message) => message.role !== "stamp")
    .map((message) => ({
      role: message.role === "agent" ? ("assistant" as const) : ("user" as const),
      content: message.content ?? "",
    }))
}

export async function getConversationByProject(projectId: string) {
  const rows = await db.select().from(conversations).where(eq(conversations.projectId, projectId)).orderBy(asc(conversations.createdAt)).limit(1)
  return rows[0] ?? null
}
