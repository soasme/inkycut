import { and, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import { elementConnections, elements } from "@/lib/db/schema"
import { createElement, deleteElement, updateElement } from "@/lib/db/queries/elements"
import { generateImageForElement } from "@/lib/image-generation"

const KNOWN_TOOLS = new Set([
  "create_element",
  "update_element",
  "delete_element",
  "connect_elements",
  "list_elements",
  "generate_image",
])

export function parseToolCall(name: string, argsJson: string): Record<string, unknown> | null {
  if (!KNOWN_TOOLS.has(name)) return null
  try {
    return JSON.parse(argsJson)
  } catch {
    return null
  }
}

export async function executeToolCall(
  name: string,
  args: Record<string, unknown>,
  projectId: string,
  userId: string,
): Promise<{ result: unknown; elementMutation?: { action: string; element?: unknown; id?: string } }> {
  switch (name) {
    case "create_element": {
      const element = await createElement({
        projectId,
        type: args.type as string,
        x: args.x as number,
        y: args.y as number,
        w: args.w as number,
        h: args.h as number | undefined,
        data: (args.data as Record<string, unknown>) ?? {},
      })
      return { result: element, elementMutation: { action: "created", element } }
    }
    case "update_element": {
      const updated = await updateElement(args.id as string, projectId, args.patch as Record<string, unknown>)
      return { result: updated, elementMutation: { action: "updated", element: updated } }
    }
    case "delete_element": {
      await deleteElement(args.id as string, projectId)
      return { result: { deleted: args.id }, elementMutation: { action: "deleted", id: args.id as string } }
    }
    case "connect_elements": {
      const endpoints = await db
        .select()
        .from(elements)
        .where(and(eq(elements.projectId, projectId), inArray(elements.id, [args.fromId as string, args.toId as string])))
      if (endpoints.length !== 2 || endpoints.some((e) => e.type !== "frame")) {
        return { result: { error: "Both endpoints must be frame elements in this project" } }
      }
      const [connection] = await db
        .insert(elementConnections)
        .values({ projectId, fromElementId: args.fromId as string, toElementId: args.toId as string })
        .returning()
      return { result: connection, elementMutation: { action: "connected" } }
    }
    case "list_elements": {
      const rows = await db.select().from(elements).where(eq(elements.projectId, projectId))
      return { result: rows.map((element) => ({ id: element.id, type: element.type, x: element.x, y: element.y, data: element.data })) }
    }
    case "generate_image": {
      const generated = await generateImageForElement({
        userId,
        projectId,
        elementId: args.elementId as string,
        prompt: args.prompt as string,
      })
      return { result: { url: generated.url }, elementMutation: { action: "updated", element: generated.element } }
    }
    default:
      return { result: { error: "unknown tool" } }
  }
}
