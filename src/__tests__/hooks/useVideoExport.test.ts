import { act, renderHook } from "@testing-library/react"
import { useVideoExport } from "@/components/canvas/export/useVideoExport"
import type { CanvasElement } from "@/types/canvas"

const mockStart = jest.fn()
const mockFinalize = jest.fn()
const mockAddVideoTrack = jest.fn()
const mockAdd = jest.fn()
let mockBuffer: Uint8Array | null = new Uint8Array([1, 2, 3])

jest.mock("mediabunny", () => ({
  QUALITY_HIGH: 1,
  Mp4OutputFormat: class {
    mimeType = "video/mp4"
  },
  BufferTarget: class {
    get buffer() {
      return mockBuffer
    }
  },
  CanvasSource: class {
    add = mockAdd
  },
  Output: class {
    format: { mimeType: string }
    target: { buffer: Uint8Array | null }
    constructor({ format, target }: { format: { mimeType: string }; target: { buffer: Uint8Array | null } }) {
      this.format = format
      this.target = target
    }
    addVideoTrack = mockAddVideoTrack
    start = mockStart
    finalize = mockFinalize
  },
}))

function frame(id: string, data: Record<string, unknown>): CanvasElement {
  return { id, projectId: "p1", type: "frame", x: 0, y: 0, w: 1, h: 1, data, createdAt: new Date(), updatedAt: new Date() }
}

describe("useVideoExport", () => {
  const context = {
    fillStyle: "",
    font: "",
    fillRect: jest.fn(),
    fillText: jest.fn(),
    drawImage: jest.fn(),
  }
  let createElement: jest.SpyInstance

  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    mockBuffer = new Uint8Array([1, 2, 3])
    mockStart.mockResolvedValue(undefined)
    mockFinalize.mockResolvedValue(undefined)
    mockAdd.mockResolvedValue(undefined)
    URL.createObjectURL = jest.fn(() => "blob:mp4")
    URL.revokeObjectURL = jest.fn()
    jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined)
    const original = document.createElement.bind(document)
    createElement = jest.spyOn(document, "createElement").mockImplementation(((tagName: string) => {
      const element = original(tagName)
      if (tagName === "canvas") Object.defineProperty(element, "getContext", { value: () => context })
      return element
    }) as typeof document.createElement)
  })

  afterEach(() => {
    createElement.mockRestore()
    jest.restoreAllMocks()
    jest.useRealTimers()
  })

  it("builds chains with explicit and default durations and resets state", () => {
    const { result } = renderHook(() => useVideoExport())
    expect(result.current.buildChains([frame("f1", { duration: 2 }), frame("f2", {})], [{ fromElementId: "f1", toElementId: "f2" }])).toEqual([
      { index: 0, frames: [expect.objectContaining({ id: "f1" }), expect.objectContaining({ id: "f2" })], totalDuration: 5 },
    ])
    act(() => result.current.reset())
    expect(result.current.state).toBe("idle")
    expect(result.current.progress).toBe(0)
    expect(result.current.errorMsg).toBe("")
  })

  it("renders text and generated images into an MP4 download", async () => {
    class LoadedImage {
      crossOrigin = ""
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_value: string) {
        this.onload?.()
      }
    }
    Object.defineProperty(global, "Image", { value: LoadedImage, configurable: true })
    const { result } = renderHook(() => useVideoExport())
    await act(async () => {
      await result.current.renderChain({ index: 0, frames: [frame("f1", {}), frame("f2", { imageUrl: "/generated.png", duration: 1 })], totalDuration: 4 })
    })
    expect(context.fillText).toHaveBeenCalledWith("Frame 1", 120, 160)
    expect(context.drawImage).toHaveBeenCalled()
    expect(mockAdd).toHaveBeenNthCalledWith(1, 0, 3)
    expect(mockAdd).toHaveBeenNthCalledWith(2, 3, 1)
    expect(result.current.state).toBe("done")
    expect(result.current.progress).toBe(100)
    expect(URL.createObjectURL).toHaveBeenCalled()
    act(() => jest.advanceTimersByTime(60_000))
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mp4")
  })

  it("reports canvas, output, and unknown failures", async () => {
    createElement.mockRestore()
    const original = document.createElement.bind(document)
    createElement = jest.spyOn(document, "createElement").mockImplementation(((tagName: string) => {
      const element = original(tagName)
      if (tagName === "canvas") Object.defineProperty(element, "getContext", { value: () => null })
      return element
    }) as typeof document.createElement)
    const { result } = renderHook(() => useVideoExport())
    await act(async () => result.current.renderChain({ index: 0, frames: [], totalDuration: 0 }))
    expect(result.current.errorMsg).toBe("Canvas unavailable")

    createElement.mockRestore()
    createElement = jest.spyOn(document, "createElement").mockImplementation(((tagName: string) => {
      const element = original(tagName)
      if (tagName === "canvas") Object.defineProperty(element, "getContext", { value: () => context })
      return element
    }) as typeof document.createElement)
    mockBuffer = null
    await act(async () => result.current.renderChain({ index: 0, frames: [], totalDuration: 0 }))
    expect(result.current.errorMsg).toBe("Export produced no bytes")

    mockBuffer = new Uint8Array([1])
    mockAdd.mockRejectedValueOnce("failed")
    await act(async () => result.current.renderChain({ index: 0, frames: [frame("f1", { slug: "ONE" })], totalDuration: 3 }))
    expect(result.current.errorMsg).toBe("Export failed")
    expect(result.current.state).toBe("error")
  })
})
