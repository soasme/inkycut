import { act, renderHook } from "@testing-library/react"
import { usePresenceStore } from "@/hooks/usePresence"

describe("usePresenceStore", () => {
  beforeEach(() => usePresenceStore.getState().reset())

  it("starts empty", () => {
    expect(renderHook(() => usePresenceStore()).result.current.collaborators).toHaveLength(0)
  })

  it("adds, updates, and removes collaborators", () => {
    const { result } = renderHook(() => usePresenceStore())
    act(() => result.current.addCollaborator({ userId: "u1", name: "Alice" }))
    expect(result.current.collaborators).toHaveLength(1)
    act(() => result.current.addCollaborator({ userId: "u1", name: "Duplicate" }))
    expect(result.current.collaborators).toHaveLength(1)
    act(() => result.current.updateCursor("u1", { x: 10, y: 20 }))
    expect(result.current.collaborators[0].cursor).toEqual({ x: 10, y: 20 })
    act(() => result.current.updateCursor("missing", { x: 1, y: 2 }))
    act(() => result.current.removeCollaborator("u1"))
    expect(result.current.collaborators).toHaveLength(0)
  })
})
