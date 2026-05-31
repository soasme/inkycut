const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
}
const mockCreateElement = jest.fn()
const mockUpdateElement = jest.fn()
const mockDeleteElement = jest.fn()
const mockGenerateImageForElement = jest.fn()

jest.mock("@/lib/db", () => ({ db: mockDb }))
jest.mock("@/lib/db/queries/elements", () => ({
  createElement: mockCreateElement,
  updateElement: mockUpdateElement,
  deleteElement: mockDeleteElement,
}))
jest.mock("@/lib/image-generation", () => ({ generateImageForElement: mockGenerateImageForElement }))

import { executeToolCall, parseToolCall } from "@/lib/canvas-tools"

function selectRows(rows: unknown[]) {
  mockDb.select.mockReturnValue({ from: () => ({ where: jest.fn().mockResolvedValue(rows) }) })
}

describe("canvas tool calls", () => {
  beforeEach(() => jest.clearAllMocks())

  it("parses known args and rejects unknown tools or invalid JSON", () => {
    expect(parseToolCall("create_element", JSON.stringify({ type: "frame", x: 100 }))).toEqual({ type: "frame", x: 100 })
    expect(parseToolCall("unknown_tool", "{}")).toBeNull()
    expect(parseToolCall("create_element", "not-json")).toBeNull()
  })

  it("creates elements with supplied or default data", async () => {
    const element = { id: "created" }
    mockCreateElement.mockResolvedValue(element)

    await expect(executeToolCall("create_element", { type: "frame", x: 1, y: 2, w: 3, h: 4, data: { slug: "ONE" } }, "p1", "u1")).resolves.toEqual({
      result: element,
      elementMutation: { action: "created", element },
    })
    expect(mockCreateElement).toHaveBeenLastCalledWith({ projectId: "p1", type: "frame", x: 1, y: 2, w: 3, h: 4, data: { slug: "ONE" } })

    await executeToolCall("create_element", { type: "note", x: 1, y: 2, w: 3 }, "p1", "u1")
    expect(mockCreateElement).toHaveBeenLastCalledWith({ projectId: "p1", type: "note", x: 1, y: 2, w: 3, h: undefined, data: {} })
  })

  it("updates and deletes elements", async () => {
    const updated = { id: "n1", x: 42 }
    mockUpdateElement.mockResolvedValue(updated)

    await expect(executeToolCall("update_element", { id: "n1", patch: { x: 42 } }, "p1", "u1")).resolves.toEqual({
      result: updated,
      elementMutation: { action: "updated", element: updated },
    })
    expect(mockUpdateElement).toHaveBeenCalledWith("n1", "p1", { x: 42 })

    await expect(executeToolCall("delete_element", { id: "n1" }, "p1", "u1")).resolves.toEqual({
      result: { deleted: "n1" },
      elementMutation: { action: "deleted", id: "n1" },
    })
    expect(mockDeleteElement).toHaveBeenCalledWith("n1", "p1")
  })

  it("rejects invalid connection endpoints and creates valid frame connections", async () => {
    selectRows([{ id: "f1", type: "frame" }])
    await expect(executeToolCall("connect_elements", { fromId: "f1", toId: "missing" }, "p1", "u1")).resolves.toEqual({
      result: { error: "Both endpoints must be frame elements in this project" },
    })

    selectRows([{ id: "f1", type: "frame" }, { id: "n1", type: "note" }])
    await expect(executeToolCall("connect_elements", { fromId: "f1", toId: "n1" }, "p1", "u1")).resolves.toEqual({
      result: { error: "Both endpoints must be frame elements in this project" },
    })

    const connection = { id: "c1", fromElementId: "f1", toElementId: "f2" }
    selectRows([{ id: "f1", type: "frame" }, { id: "f2", type: "frame" }])
    const returning = jest.fn().mockResolvedValue([connection])
    const values = jest.fn(() => ({ returning }))
    mockDb.insert.mockReturnValue({ values })
    await expect(executeToolCall("connect_elements", { fromId: "f1", toId: "f2" }, "p1", "u1")).resolves.toEqual({
      result: connection,
      elementMutation: { action: "connected" },
    })
    expect(values).toHaveBeenCalledWith({ projectId: "p1", fromElementId: "f1", toElementId: "f2" })
  })

  it("lists compact element summaries", async () => {
    selectRows([{ id: "f1", type: "frame", x: 1, y: 2, data: { slug: "ONE" }, w: 300 }])
    await expect(executeToolCall("list_elements", {}, "p1", "u1")).resolves.toEqual({
      result: [{ id: "f1", type: "frame", x: 1, y: 2, data: { slug: "ONE" } }],
    })
  })

  it("generates images and reports direct unknown dispatches", async () => {
    const element = { id: "f1", data: { imageUrl: "/uploads/generated.png" } }
    mockGenerateImageForElement.mockResolvedValue({ url: "/uploads/generated.png", element })
    await expect(executeToolCall("generate_image", { elementId: "f1", prompt: "rain" }, "p1", "u1")).resolves.toEqual({
      result: { url: "/uploads/generated.png" },
      elementMutation: { action: "updated", element },
    })
    expect(mockGenerateImageForElement).toHaveBeenCalledWith({ userId: "u1", projectId: "p1", elementId: "f1", prompt: "rain" })
    await expect(executeToolCall("unknown", {}, "p1", "u1")).resolves.toEqual({ result: { error: "unknown tool" } })
  })
})
