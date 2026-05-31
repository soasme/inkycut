import { act, renderHook } from "@testing-library/react"
import { useCanvasStore } from "@/hooks/useCanvas"

const element = {
  id: "e1",
  projectId: "p1",
  type: "note" as const,
  x: 0,
  y: 0,
  w: 200,
  h: null,
  data: { text: "hello" },
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe("useCanvasStore", () => {
  beforeEach(() => useCanvasStore.getState().reset())

  it("starts with no elements", () => {
    expect(renderHook(() => useCanvasStore()).result.current.elements).toHaveLength(0)
  })

  it("adds, updates, and removes elements", () => {
    const { result } = renderHook(() => useCanvasStore())
    act(() => result.current.addElement(element))
    expect(result.current.elements[0].id).toBe("e1")
    act(() => result.current.addElement(element))
    expect(result.current.elements).toHaveLength(1)
    act(() => result.current.updateElement("e1", { x: 50 }))
    expect(result.current.elements[0].x).toBe(50)
    act(() => result.current.updateElement("missing", { x: 100 }))
    expect(result.current.elements[0].x).toBe(50)
    act(() => result.current.removeElement("e1"))
    expect(result.current.elements).toHaveLength(0)
  })

  it("sets store state and creates every draft type", () => {
    const { result } = renderHook(() => useCanvasStore())
    act(() => {
      result.current.setElements([element])
      result.current.setViewport({ x: 1, y: 2, scale: 1.5 })
      result.current.setSelectedId("e1")
      result.current.setDraggingId("e1")
    })
    expect(result.current.viewport).toEqual({ x: 1, y: 2, scale: 1.5 })
    expect(result.current.selectedId).toBe("e1")
    expect(result.current.draggingId).toBe("e1")
    expect(["frame", "character", "storyboard", "shotlist", "doc", "note"].map((type) => result.current.createDraftElement(type as never).type)).toEqual([
      "frame",
      "character",
      "storyboard",
      "shotlist",
      "doc",
      "note",
    ])
  })
})
