jest.mock("@/lib/db", () => ({ db: {} }))
jest.mock("@/lib/db/queries/elements", () => ({ createElement: jest.fn(), updateElement: jest.fn(), deleteElement: jest.fn() }))
jest.mock("@/lib/image-generation", () => ({ generateImageForElement: jest.fn() }))

import { parseToolCall } from "@/lib/canvas-tools"

describe("parseToolCall", () => {
  it("parses create_element args", () => {
    const result = parseToolCall("create_element", JSON.stringify({ type: "frame", x: 100 }))
    expect(result?.type).toBe("frame")
    expect(result?.x).toBe(100)
  })

  it("returns null for unknown tools", () => {
    expect(parseToolCall("unknown_tool", "{}")).toBeNull()
  })

  it("returns null for invalid JSON", () => {
    expect(parseToolCall("create_element", "not-json")).toBeNull()
  })
})
