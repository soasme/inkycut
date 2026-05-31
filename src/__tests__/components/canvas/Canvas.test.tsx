import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { Canvas } from "@/components/canvas/Canvas"
import { useCanvasStore } from "@/hooks/useCanvas"
import { usePresenceStore } from "@/hooks/usePresence"
import type { CanvasElement, ElementType } from "@/types/canvas"

type Viewport = { x: number; y: number; scale: number }
type Connection = { fromElementId: string; toElementId: string }

interface TopbarProps {
  onExport: () => void
  onProjectNameChange: (name: string) => Promise<void>
}

interface StageProps {
  connections: Connection[]
  onConnectFrames: (fromElementId: string, toElementId: string) => Promise<void>
  onCursorMove: (x: number, y: number) => void
  onGenerateShotlist: () => void
  onImageUpload: (id: string, imageUrl: string) => Promise<void>
  onNodeUpdate: (id: string, patch: Partial<CanvasElement>) => Promise<void>
  onNoteChange: (id: string, text: string) => Promise<void>
  onViewportChange: (viewport: Viewport) => void
}

interface ToolbarProps {
  onAdd: (type: ElementType) => Promise<void>
  onFocusChat: () => void
}

interface ZoomProps {
  onViewportChange: (viewport: Viewport) => void
}

interface ExportProps {
  connections: Connection[]
  onClose: () => void
}

let topbarProps: TopbarProps
let stageProps: StageProps
let toolbarProps: ToolbarProps
let zoomProps: ZoomProps
let exportProps: ExportProps
let saveViewport: (viewport: { x: number; y: number; scale: number }) => Promise<void>
const triggerViewport = jest.fn()
const emitCursor = jest.fn()
const mockFocusChat = jest.fn()

jest.mock("@/components/canvas/CanvasTopbar", () => ({
  CanvasTopbar: (props: TopbarProps) => {
    topbarProps = props
    return <button onClick={props.onExport}>mock export</button>
  },
}))
jest.mock("@/components/canvas/Stage", () => ({
  Stage: (props: StageProps) => {
    stageProps = props
    return <div>mock stage</div>
  },
}))
jest.mock("@/components/canvas/Toolbar", () => ({
  Toolbar: (props: ToolbarProps) => {
    toolbarProps = props
    return <div>mock toolbar</div>
  },
}))
jest.mock("@/components/canvas/ZoomControls", () => ({
  ZoomControls: (props: ZoomProps) => {
    zoomProps = props
    return <div>mock zoom</div>
  },
}))
jest.mock("@/components/canvas/chat/ChatPanel", () => ({
  ChatPanel: jest.requireActual<typeof import("react")>("react").forwardRef((_props, ref) => {
    jest.requireActual<typeof import("react")>("react").useImperativeHandle(ref, () => ({ focus: mockFocusChat }))
    return <div>mock chat</div>
  }),
}))
jest.mock("@/components/canvas/export/ExportModal", () => ({
  ExportModal: (props: ExportProps) => {
    exportProps = props
    return <button onClick={props.onClose}>mock close export</button>
  },
}))
jest.mock("@/hooks/useAutosave", () => ({
  useAutosave: (save: typeof saveViewport) => {
    saveViewport = save
    return { trigger: triggerViewport }
  },
}))
jest.mock("@/hooks/useSocket", () => ({
  useSocket: () => ({ emitCursor }),
}))

const note: CanvasElement = {
  id: "n1",
  projectId: "p1",
  type: "note",
  x: 0,
  y: 0,
  w: 200,
  h: null,
  data: { text: "draft" },
  createdAt: new Date(),
  updatedAt: new Date(),
}
const created: CanvasElement = { ...note, id: "created", type: "frame", data: { slug: "NEW" } }
const connection = { fromElementId: "f1", toElementId: "f2" }

function response(body: Partial<Response> = {}) {
  return { ok: true, json: async () => ({}), ...body } as Response
}

function project(id = "p1") {
  return { id, name: "Project", viewportX: 10, viewportY: 20, viewportScale: 0.8 }
}

describe("Canvas", () => {
  let createOk = true
  let connectOk = true

  beforeEach(() => {
    jest.clearAllMocks()
    createOk = true
    connectOk = true
    useCanvasStore.getState().reset()
    usePresenceStore.getState().reset()
    global.fetch = jest.fn(async (input, init) => {
      const url = String(input)
      if (url.includes("/api/connections?")) {
        if (url.includes("p-error")) throw new Error("offline")
        return url.includes("p-empty") ? response({ ok: false }) : response({ json: async () => [connection] })
      }
      if (url === "/api/elements" && init?.method === "POST") return response({ ok: createOk, json: async () => created })
      if (url === "/api/connections" && init?.method === "POST") return response({ ok: connectOk, json: async () => connection })
      return response()
    })
  })

  afterEach(() => {
    delete (global as { fetch?: typeof fetch }).fetch
  })

  it("orchestrates canvas APIs and child callbacks", async () => {
    const { rerender, unmount } = render(<Canvas project={project()} initialElements={[note]} conversationId="c1" userId="u1" userName="User" userImage="" />)
    await waitFor(() => expect(stageProps.connections).toEqual([connection]))
    expect(useCanvasStore.getState().viewport).toEqual({ x: 10, y: 20, scale: 0.8 })
    expect(stageProps.onCursorMove).toBe(emitCursor)
    expect(stageProps.onViewportChange).toBe(triggerViewport)
    expect(zoomProps.onViewportChange).toBe(triggerViewport)
    expect(stageProps.connections).toEqual([connection])

    await act(async () => stageProps.onNodeUpdate("n1", { x: 42 }))
    expect(useCanvasStore.getState().elements[0].x).toBe(42)
    await act(async () => stageProps.onNoteChange("n1", "revised"))
    expect(useCanvasStore.getState().elements[0].data).toEqual({ text: "revised" })
    await act(async () => stageProps.onNoteChange("missing", "ignored"))
    await act(async () => stageProps.onImageUpload("n1", "/uploads/image.png"))
    expect(useCanvasStore.getState().elements[0].data).toEqual({ text: "revised", imageUrl: "/uploads/image.png" })
    await act(async () => stageProps.onImageUpload("missing", "/uploads/ignored.png"))

    await act(async () => toolbarProps.onAdd("frame"))
    expect(useCanvasStore.getState().elements.some((item) => item.id === "created")).toBe(true)
    createOk = false
    await act(async () => toolbarProps.onAdd("note"))
    expect(useCanvasStore.getState().elements.filter((item) => item.id === "created")).toHaveLength(1)

    await act(async () => stageProps.onConnectFrames("f2", "f3"))
    connectOk = false
    await act(async () => stageProps.onConnectFrames("f3", "f4"))
    act(() => stageProps.onGenerateShotlist())
    act(() => toolbarProps.onFocusChat())
    expect(mockFocusChat).toHaveBeenCalledTimes(2)
    await act(async () => topbarProps.onProjectNameChange("Renamed"))
    await act(async () => saveViewport({ x: 1, y: 2, scale: 1.2 }))

    fireEvent.click(screen.getByRole("button", { name: "mock export" }))
    expect(exportProps.connections).toEqual([connection, connection])
    fireEvent.click(screen.getByRole("button", { name: "mock close export" }))
    expect(screen.queryByRole("button", { name: "mock close export" })).not.toBeInTheDocument()

    const fetchCount = jest.mocked(global.fetch).mock.calls.length
    window.dispatchEvent(new Event("inkycut:connections-changed"))
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(fetchCount + 1))
    rerender(<Canvas project={project("p-empty")} initialElements={[]} conversationId={null} userId="u1" userName="User" userImage="" />)
    await waitFor(() => expect(stageProps.connections).toEqual([]))
    rerender(<Canvas project={project("p-error")} initialElements={[]} conversationId={null} userId="u1" userName="User" userImage="" />)
    await waitFor(() => expect(stageProps.connections).toEqual([]))
    unmount()
    act(() => stageProps.onGenerateShotlist())
    act(() => toolbarProps.onFocusChat())
  })
})
