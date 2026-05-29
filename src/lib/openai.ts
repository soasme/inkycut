import OpenAI from "openai"
import type { ChatCompletionTool } from "openai/resources/chat/completions"

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
export const IMAGE_MODEL = "gpt-image-2"

export const CANVAS_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "create_element",
      description: "Create a new node on the canvas.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["frame", "character", "doc", "storyboard", "shotlist", "note"] },
          x: { type: "number" },
          y: { type: "number" },
          w: { type: "number" },
          h: { type: "number" },
          data: { type: "object" },
        },
        required: ["type", "x", "y", "w", "data"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_element",
      description: "Update an existing canvas element.",
      parameters: {
        type: "object",
        properties: { id: { type: "string" }, patch: { type: "object" } },
        required: ["id", "patch"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_element",
      description: "Delete a canvas element.",
      parameters: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "connect_elements",
      description: "Create a directed connection between two frame nodes.",
      parameters: {
        type: "object",
        properties: { fromId: { type: "string" }, toId: { type: "string" } },
        required: ["fromId", "toId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_elements",
      description: "List current canvas elements.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_image",
      description: "Generate a new image with gpt-image-2 and attach it to a frame or character element.",
      parameters: {
        type: "object",
        properties: { elementId: { type: "string" }, prompt: { type: "string" } },
        required: ["elementId", "prompt"],
      },
    },
  },
]

export function buildSystemPrompt(elements: Array<{ id: string; type: string; data: Record<string, unknown> }>) {
  const summary = elements
    .slice(0, 30)
    .map((element) => `- ${element.id} [${element.type}]: ${JSON.stringify(element.data).slice(0, 120)}`)
    .join("\n")

  return `You are the Video Specialist at Inkycut, an AI assistant that helps creators build video projects on an infinite canvas.

Current canvas elements:
${summary || "(empty canvas)"}

Use tools to create, update, delete, connect, and inspect elements. If the user asks for a new image, use generate_image with gpt-image-2 and attach the result to the relevant frame or character. Do not invent image URLs.`
}
