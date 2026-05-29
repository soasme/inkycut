import { buildImagePrompt, decodeGeneratedImage } from "@/lib/image-generation"

jest.mock("@/lib/openai", () => ({ openai: {}, IMAGE_MODEL: "gpt-image-2" }))
jest.mock("@/lib/storage", () => ({ uploadFile: jest.fn() }))
jest.mock("@/lib/db", () => ({ db: {} }))

describe("image generation helpers", () => {
  it("includes user prompt and visual constraints", () => {
    const prompt = buildImagePrompt("wide shot of a rainy alley")
    expect(prompt).toContain("wide shot of a rainy alley")
    expect(prompt).toContain("cinematic")
  })

  it("decodes base64 bytes", () => {
    expect(decodeGeneratedImage(Buffer.from("png-bytes").toString("base64")).toString()).toBe("png-bytes")
  })
})
