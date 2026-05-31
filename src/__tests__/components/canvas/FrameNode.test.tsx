import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { FrameNode } from "@/components/canvas/nodes/FrameNode"
import type { CanvasElement } from "@/types/canvas"

const element: CanvasElement = {
  id: "f1",
  projectId: "p1",
  type: "frame",
  x: 0,
  y: 0,
  w: 360,
  h: 225,
  data: { slug: "ONE", meta: "16:9", rec: true, ar: "4 / 3", hue: "rain" },
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe("FrameNode", () => {
  afterEach(() => {
    jest.restoreAllMocks()
    delete (global as { fetch?: typeof fetch }).fetch
  })

  it("renders metadata and opens its file chooser", () => {
    const click = jest.spyOn(HTMLInputElement.prototype, "click")
    render(<FrameNode element={element} onImageUpload={jest.fn()} />)
    expect(screen.getByText("ONE")).toBeInTheDocument()
    expect(screen.getByText("16:9")).toBeInTheDocument()
    expect(document.querySelector(".rec")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "image" }))
    expect(click).toHaveBeenCalled()
  })

  it("uploads a selected image", async () => {
    const onImageUpload = jest.fn()
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ url: "/uploads/frame.png" }) } as Response)
    render(<FrameNode element={{ ...element, data: {} }} onImageUpload={onImageUpload} />)
    const input = screen.getByLabelText("Upload frame image")
    Object.defineProperty(input, "files", { value: null, configurable: true })
    fireEvent.change(input)
    Object.defineProperty(input, "files", { value: [], configurable: true })
    fireEvent.change(input, { target: { files: [] } })
    expect(global.fetch).not.toHaveBeenCalled()
    fireEvent.change(input, { target: { files: [new File(["image"], "frame.png", { type: "image/png" })] } })
    await waitFor(() => expect(onImageUpload).toHaveBeenCalledWith("f1", "/uploads/frame.png"))
  })

  it("does not attach an image after a rejected upload", async () => {
    const onImageUpload = jest.fn()
    global.fetch = jest.fn().mockResolvedValue({ ok: false } as Response)
    render(<FrameNode element={element} onImageUpload={onImageUpload} />)
    fireEvent.change(screen.getByLabelText("Upload frame image"), { target: { files: [new File(["image"], "frame.png", { type: "image/png" })] } })
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(onImageUpload).not.toHaveBeenCalled()
  })
})
