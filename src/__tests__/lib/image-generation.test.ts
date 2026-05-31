const mockGenerate = jest.fn()
const mockUploadFile = jest.fn()
const mockGetProjectById = jest.fn()
const mockUpdateElement = jest.fn()
const mockLimit = jest.fn()
const mockDb = {
  select: jest.fn(() => ({ from: () => ({ where: () => ({ limit: mockLimit }) }) })),
}

jest.mock("@/lib/openai", () => ({ openai: { images: { generate: mockGenerate } }, IMAGE_MODEL: "gpt-image-2" }))
jest.mock("@/lib/storage", () => ({ uploadFile: mockUploadFile }))
jest.mock("@/lib/db", () => ({ db: mockDb }))
jest.mock("@/lib/db/queries/projects", () => ({ getProjectById: mockGetProjectById }))
jest.mock("@/lib/db/queries/elements", () => ({ updateElement: mockUpdateElement }))

import { buildImagePrompt, decodeGeneratedImage, generateImageForElement } from "@/lib/image-generation"

const input = { userId: "u1", projectId: "p1", elementId: "f1", prompt: "  wide shot of a rainy alley  " }

describe("image generation", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetProjectById.mockResolvedValue({ id: "p1" })
    mockLimit.mockResolvedValue([{ id: "f1", projectId: "p1", type: "frame", data: { slug: "ONE" } }])
    mockGenerate.mockResolvedValue({ data: [{ b64_json: Buffer.from("png-bytes").toString("base64") }] })
    mockUploadFile.mockResolvedValue("/uploads/generated.png")
    mockUpdateElement.mockResolvedValue({ id: "f1", data: { slug: "ONE", imageUrl: "/uploads/generated.png" } })
  })

  it("builds a constrained trimmed prompt and decodes base64 bytes", () => {
    const prompt = buildImagePrompt(input.prompt)
    expect(prompt).toContain("wide shot of a rainy alley")
    expect(prompt).not.toContain("  wide")
    expect(prompt).toContain("cinematic")
    expect(decodeGeneratedImage(Buffer.from("png-bytes").toString("base64")).toString()).toBe("png-bytes")
  })

  it("generates, uploads, and persists an image", async () => {
    await expect(generateImageForElement(input)).resolves.toEqual({
      url: "/uploads/generated.png",
      element: { id: "f1", data: { slug: "ONE", imageUrl: "/uploads/generated.png" } },
    })
    expect(mockGenerate).toHaveBeenCalledWith({
      model: "gpt-image-2",
      prompt: expect.stringContaining("wide shot of a rainy alley"),
      size: "1536x1024",
      response_format: "b64_json",
    })
    expect(mockUploadFile).toHaveBeenCalledWith(Buffer.from("png-bytes"), "image/png")
    expect(mockUpdateElement).toHaveBeenCalledWith("f1", "p1", { data: { slug: "ONE", imageUrl: "/uploads/generated.png" } })
  })

  it("rejects missing projects", async () => {
    mockGetProjectById.mockResolvedValue(null)
    await expect(generateImageForElement(input)).rejects.toThrow("Project not found")
  })

  it("rejects missing or cross-project elements", async () => {
    mockLimit.mockResolvedValue([])
    await expect(generateImageForElement(input)).rejects.toThrow("Element not found")
    mockLimit.mockResolvedValue([{ id: "f1", projectId: "p2", type: "frame", data: {} }])
    await expect(generateImageForElement(input)).rejects.toThrow("Element not found")
  })

  it("rejects unsupported element types", async () => {
    mockLimit.mockResolvedValue([{ id: "f1", projectId: "p1", type: "note", data: {} }])
    await expect(generateImageForElement(input)).rejects.toThrow("Images can only attach to frame or character elements")
  })

  it("rejects image responses without base64 data", async () => {
    mockGenerate.mockResolvedValue({})
    await expect(generateImageForElement(input)).rejects.toThrow("Image generation returned no image data")
    mockGenerate.mockResolvedValue({ data: [] })
    await expect(generateImageForElement(input)).rejects.toThrow("Image generation returned no image data")
    mockGenerate.mockResolvedValue({ data: [{}] })
    await expect(generateImageForElement(input)).rejects.toThrow("Image generation returned no image data")
  })
})
