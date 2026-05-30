import type { ChatCompletionMessageParam } from "openai/resources/chat/completions"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { broadcastToProject } from "@/lib/socket"
import { executeToolCall, parseToolCall } from "@/lib/canvas-tools"
import { buildSystemPrompt, CANVAS_TOOLS, openai } from "@/lib/openai"
import { getElementsByProject } from "@/lib/db/queries/elements"
import { createMessage, getConversationByProject, getMessages } from "@/lib/db/queries/messages"
import { getProjectById } from "@/lib/db/queries/projects"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { projectId, conversationId, message } = await req.json()
  if (!projectId || !conversationId || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "projectId, conversationId, and message required" }, { status: 400 })
  }

  const project = await getProjectById(projectId, session.user.id)
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const conversation = await getConversationByProject(projectId)
  if (!conversation || conversation.id !== conversationId) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
  }

  const elements = await getElementsByProject(projectId)
  const history = await getMessages(conversationId, 20)
  await createMessage({ conversationId, role: "user", content: message.trim() })
  const openaiMessages: ChatCompletionMessageParam[] = [
    { role: "system", content: buildSystemPrompt(elements as never) },
    ...history.map((item) => ({
      role: item.role === "agent" ? ("assistant" as const) : ("user" as const),
      content: item.content ?? "",
    })),
    { role: "user", content: message.trim() },
  ]

  const MAX_TOOL_ITERATIONS = 10
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      let fullText = ""
      let currentMessages = [...openaiMessages]
      let shouldContinue = true
      let iterations = 0

      try {
      while (shouldContinue) {
        if (++iterations > MAX_TOOL_ITERATIONS) {
          send({ type: "error", message: "Too many tool call iterations" })
          break
        }
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: currentMessages,
          tools: CANVAS_TOOLS,
          tool_choice: "auto",
          stream: true,
        })
        const toolCalls: Record<number, { id: string; name: string; argsJson: string }> = {}
        let chunkText = ""

        for await (const chunk of response) {
          const choice = chunk.choices[0]
          const delta = choice?.delta
          if (!delta) continue

          if (delta.content) {
            chunkText += delta.content
            fullText += delta.content
            send({ type: "text", content: delta.content })
          }

          for (const toolCall of delta.tool_calls ?? []) {
            const index = toolCall.index
            toolCalls[index] ??= { id: toolCall.id ?? "", name: toolCall.function?.name ?? "", argsJson: "" }
            if (toolCall.function?.arguments) toolCalls[index].argsJson += toolCall.function.arguments
          }

          if (choice.finish_reason === "stop") shouldContinue = false
          if (choice.finish_reason === "tool_calls") {
            const list = Object.values(toolCalls)
            currentMessages.push({
              role: "assistant",
              content: chunkText || null,
              tool_calls: list.map((toolCall) => ({
                id: toolCall.id,
                type: "function" as const,
                function: { name: toolCall.name, arguments: toolCall.argsJson },
              })),
            })

            const toolResults: ChatCompletionMessageParam[] = []
            for (const toolCall of list) {
              const args = parseToolCall(toolCall.name, toolCall.argsJson)
              if (!args) {
                toolResults.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ error: "parse failed" }) })
                continue
              }
              const { result, elementMutation } = await executeToolCall(toolCall.name, args, projectId, session.user.id)
              if (elementMutation) {
                const mutation = elementMutation as { action: string; element?: { id?: string }; id?: string }
                try {
                  if (mutation.action === "created") broadcastToProject(projectId, "element:created", mutation.element)
                  if (mutation.action === "updated") {
                    broadcastToProject(projectId, "element:updated", { elementId: mutation.element?.id, patch: mutation.element })
                  }
                  if (mutation.action === "deleted") broadcastToProject(projectId, "element:deleted", { elementId: mutation.id })
                } catch {}
                send({ type: "mutation", mutation: elementMutation })
              }
              toolResults.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) })
            }
            currentMessages.push(...toolResults)
            chunkText = ""
          }
        }
      }

      await createMessage({ conversationId, role: "agent", agentName: "Video Specialist", content: fullText })
      send({ type: "done" })
      controller.close()
      } catch (err) {
        try { send({ type: "error", message: err instanceof Error ? err.message : "Internal error" }) } catch {}
        controller.error(err)
      }
    },
  })

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  })
}
