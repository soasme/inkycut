const mockOpenAI = jest.fn(() => ({ client: "stub" }))

jest.mock("openai", () => ({ __esModule: true, default: mockOpenAI }))

import { buildSystemPrompt, CANVAS_TOOLS, IMAGE_MODEL, openai } from "@/lib/openai"

describe("OpenAI canvas configuration", () => {
  it("constructs the client from environment configuration", () => {
    expect(openai).toEqual({ client: "stub" })
    expect(mockOpenAI).toHaveBeenCalledWith({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL })
    expect(IMAGE_MODEL).toBe("gpt-image-2")
  })

  it("declares every canvas tool", () => {
    expect(CANVAS_TOOLS.map((tool) => (tool.type === "function" ? tool.function.name : ""))).toEqual([
      "create_element",
      "update_element",
      "delete_element",
      "connect_elements",
      "list_elements",
      "generate_image",
    ])
  })

  it("describes empty and populated canvases", () => {
    expect(buildSystemPrompt([])).toContain("(empty canvas)")
    const prompt = buildSystemPrompt([{ id: "f1", type: "frame", data: { slug: "A".repeat(150) } }])
    expect(prompt).toContain("- f1 [frame]")
    expect(prompt).not.toContain("A".repeat(150))
  })
})
