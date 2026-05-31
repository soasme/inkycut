import { act, fireEvent, render, screen } from "@testing-library/react"
import { Stage } from "@/components/canvas/Stage"
import { useCanvasStore } from "@/hooks/useCanvas"
import type { CanvasElement, ElementType } from "@/types/canvas"

function element(type: ElementType, id: string, data: Record<string, unknown> = {}, h: number | null = null): CanvasElement {
  return { id, projectId: "p1", type, x: 10, y: 20, w: 300, h, data, createdAt: new Date(), updatedAt: new Date() }
}

const elements = [
  element("frame", "f1", { slug: "ONE" }, 225),
  element("frame", "f2", { slug: "TWO" }),
  element("character", "c1", { name: "Ari", role: "lead" }),
  element("doc", "d1", { title: "Bible", content: "<p>Story</p>" }),
  element("storyboard", "s1", { title: "Board" }),
  element("shotlist", "sl1", { title: "Shots", shots: [] }),
  element("note", "n1", { text: "Draft" }),
]

function renderStage(overrides: Partial<React.ComponentProps<typeof Stage>> = {}) {
  const props: React.ComponentProps<typeof Stage> = {
    onNodeUpdate: jest.fn(),
    onGenerateShotlist: jest.fn(),
    onNoteChange: jest.fn(),
    onImageUpload: jest.fn(),
    onCursorMove: jest.fn(),
    onConnectFrames: jest.fn(),
    onViewportChange: jest.fn(),
    connections: [
      { fromElementId: "f1", toElementId: "f2" },
      { fromElementId: "f2", toElementId: "f1" },
      { fromElementId: "f1", toElementId: "missing" },
    ],
    collaborators: [
      { userId: "u1", name: "Alice", cursor: { x: 5, y: 6 } },
      { userId: "u2", name: "No cursor" },
      { userId: "fallback", name: "", cursor: { x: 7, y: 8 } },
    ],
    busy: false,
    ...overrides,
  }
  return { ...render(<Stage {...props} />), props }
}

describe("Stage", () => {
  beforeAll(() => {
    Object.defineProperty(window, "PointerEvent", { value: MouseEvent, configurable: true })
    Object.defineProperty(HTMLElement.prototype, "setPointerCapture", { value: jest.fn(), configurable: true })
  })

  beforeEach(() => {
    jest.useFakeTimers()
    useCanvasStore.getState().reset()
    useCanvasStore.getState().setElements(elements)
  })

  afterEach(() => jest.useRealTimers())

  it("renders nodes, connections, and collaborator cursors", () => {
    const { container } = renderStage()
    expect(screen.getAllByTestId("canvas-node-frame")).toHaveLength(2)
    expect(screen.getByTestId("canvas-node-character")).toBeInTheDocument()
    expect(screen.getByTestId("canvas-node-doc")).toBeInTheDocument()
    expect(screen.getByTestId("canvas-node-storyboard")).toBeInTheDocument()
    expect(screen.getByTestId("canvas-node-shotlist")).toBeInTheDocument()
    expect(screen.getByTestId("canvas-node-note")).toBeInTheDocument()
    expect(container.querySelectorAll("line")).toHaveLength(2)
    expect(screen.getAllByTestId("collaborator-cursor")).toHaveLength(2)
    expect(screen.getByText("fallback")).toBeInTheDocument()
  })

  it("throttles cursor movement and drags a node", () => {
    const { props } = renderStage()
    const stage = screen.getByTestId("canvas-stage")
    jest.spyOn(stage, "getBoundingClientRect").mockReturnValue({ left: 10, top: 20, right: 1010, bottom: 820, width: 1000, height: 800, x: 10, y: 20, toJSON: () => ({}) })
    const note = screen.getByTestId("canvas-node-note")
    fireEvent.pointerDown(note, { pointerId: 1, clientX: 100, clientY: 100 })
    fireEvent.pointerMove(stage, { clientX: 178, clientY: 178 })
    fireEvent.pointerMove(stage, { clientX: 200, clientY: 200 })
    expect(props.onCursorMove).toHaveBeenCalledTimes(1)
    expect(props.onNodeUpdate).toHaveBeenCalledTimes(2)
    fireEvent.pointerUp(stage)
    act(() => jest.advanceTimersByTime(33))
    fireEvent.pointerMove(stage, { clientX: 210, clientY: 220 })
    expect(props.onCursorMove).toHaveBeenCalledTimes(2)
  })

  it("ignores no-drag controls and connects shift-clicked frames", () => {
    const { props } = renderStage()
    fireEvent.pointerDown(screen.getByLabelText("Note text"), { pointerId: 1 })
    fireEvent.pointerMove(screen.getByTestId("canvas-stage"), { clientX: 50, clientY: 50 })
    expect(props.onNodeUpdate).not.toHaveBeenCalled()
    const [first, second] = screen.getAllByTestId("canvas-node-frame")
    fireEvent.pointerDown(first, { shiftKey: true })
    expect(screen.getByText("shift+click another frame to connect")).toBeInTheDocument()
    fireEvent.pointerDown(first, { shiftKey: true })
    expect(screen.getByText("drag nodes · scroll to zoom · shift+click frames to connect")).toBeInTheDocument()
    fireEvent.pointerDown(first, { shiftKey: true })
    fireEvent.pointerDown(second, { shiftKey: true })
    expect(props.onConnectFrames).toHaveBeenCalledWith("f1", "f2")
  })

  it("pans on background drag and zooms in both wheel directions", () => {
    const { props } = renderStage()
    const stage = screen.getByTestId("canvas-stage")
    fireEvent.pointerDown(stage, { pointerId: 1, clientX: 50, clientY: 60 })
    fireEvent.pointerMove(stage, { clientX: 100, clientY: 120 })
    expect(props.onViewportChange).toHaveBeenCalledWith({ x: 80, y: 84, scale: 0.78 })
    fireEvent.pointerUp(stage)
    fireEvent.wheel(stage, { deltaY: 100 })
    expect(props.onViewportChange).toHaveBeenLastCalledWith({ x: 80, y: 84, scale: 0.7332 })
    fireEvent.wheel(stage, { deltaY: -100 })
    expect(props.onViewportChange).toHaveBeenLastCalledWith({ x: 80, y: 84, scale: 0.777192 })
    fireEvent.pointerDown(screen.getByTestId("canvas-layer"), { pointerId: 1 })
  })
})
