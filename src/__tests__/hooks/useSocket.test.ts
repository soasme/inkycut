import { act, renderHook } from "@testing-library/react"
import { useCanvasStore } from "@/hooks/useCanvas"
import { usePresenceStore } from "@/hooks/usePresence"
import { useSocket } from "@/hooks/useSocket"

const handlers = new Map<string, (data?: never) => void>()
const socket = {
  on: jest.fn((event: string, handler: (data?: never) => void) => {
    handlers.set(event, handler)
  }),
  emit: jest.fn(),
  disconnect: jest.fn(),
}
const io = jest.fn((_options?: unknown) => socket)

jest.mock("socket.io-client", () => ({ io: (options: unknown) => io(options) }))

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

describe("useSocket", () => {
  beforeEach(() => {
    handlers.clear()
    jest.clearAllMocks()
    useCanvasStore.getState().reset()
    usePresenceStore.getState().reset()
  })

  it("wires inbound events, emits cursors, and cleans up", () => {
    const changed = jest.fn()
    window.addEventListener("inkycut:connections-changed", changed)
    const { result, unmount } = renderHook(() => useSocket({ projectId: "p1" }))
    expect(io).toHaveBeenCalledWith({ path: "/api/socket", auth: { projectId: "p1" } })

    act(() => handlers.get("element:created")!(element as never))
    expect(useCanvasStore.getState().elements).toEqual([element])
    act(() => handlers.get("element:updated")!({ elementId: "e1", patch: { x: 42 } } as never))
    expect(useCanvasStore.getState().elements[0].x).toBe(42)
    act(() => handlers.get("element:deleted")!({ elementId: "e1" } as never))
    expect(useCanvasStore.getState().elements).toHaveLength(0)

    act(() => handlers.get("presence:join")!({ userId: "u1", name: "Alice" } as never))
    act(() => handlers.get("viewport:cursor")!({ userId: "u1", x: 4, y: 5 } as never))
    expect(usePresenceStore.getState().collaborators[0].cursor).toEqual({ x: 4, y: 5 })
    act(() => handlers.get("presence:leave")!({ userId: "u1" } as never))
    expect(usePresenceStore.getState().collaborators).toHaveLength(0)

    act(() => handlers.get("element:connected")!())
    expect(changed).toHaveBeenCalled()
    act(() => result.current.emitCursor(10, 20))
    expect(socket.emit).toHaveBeenCalledWith("viewport:cursor", { x: 10, y: 20 })

    act(() => usePresenceStore.getState().addCollaborator({ userId: "u2", name: "Bob" }))
    unmount()
    expect(socket.disconnect).toHaveBeenCalled()
    expect(usePresenceStore.getState().collaborators).toHaveLength(0)
    window.removeEventListener("inkycut:connections-changed", changed)
  })
})
