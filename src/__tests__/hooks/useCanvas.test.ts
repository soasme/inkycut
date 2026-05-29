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
    act(() => result.current.updateElement("e1", { x: 50 }))
    expect(result.current.elements[0].x).toBe(50)
    act(() => result.current.removeElement("e1"))
    expect(result.current.elements).toHaveLength(0)
  })
})
