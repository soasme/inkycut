import { fireEvent, render, screen } from "@testing-library/react"
import { ExportModal } from "@/components/canvas/export/ExportModal"

const mockUseVideoExport = jest.fn()
jest.mock("@/components/canvas/export/useVideoExport", () => ({
  useVideoExport: () => mockUseVideoExport(),
}))

const chain = { index: 0, frames: [{ id: "f1" }, { id: "f2" }], totalDuration: 4 }

function setup(state = "idle", chains: typeof chain[] = [chain]) {
  const renderChain = jest.fn()
  const reset = jest.fn()
  mockUseVideoExport.mockReturnValue({ state, progress: 45, errorMsg: "codec failed", buildChains: () => chains, renderChain, reset })
  const onClose = jest.fn()
  const view = render(<ExportModal elements={[]} connections={[]} onClose={onClose} />)
  return { ...view, renderChain, reset, onClose }
}

describe("ExportModal", () => {
  it("shows empty state and closes", () => {
    const { reset, onClose } = setup("idle", [])
    expect(screen.getByText("No connected frame sequences found.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Render" })).toBeDisabled()
    fireEvent.click(screen.getByRole("button", { name: "Close" }))
    expect(reset).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it("selects and renders a chain", () => {
    const { renderChain } = setup()
    const sequence = screen.getByRole("button", { name: "Sequence 1: 2 frames · 4.0s" })
    expect(sequence).toHaveClass("chain")
    fireEvent.click(sequence)
    expect(sequence).toHaveClass("on")
    fireEvent.click(screen.getByRole("button", { name: "Render" }))
    expect(renderChain).toHaveBeenCalledWith(chain)
  })

  it.each([
    ["rendering", "Rendering... 45%"],
    ["done", "Export complete. Download started."],
    ["error", "Export failed: codec failed"],
  ])("shows %s state", (state, message) => {
    setup(state)
    expect(screen.getByText(message)).toBeInTheDocument()
    if (state === "rendering") {
      expect(screen.getByRole("button", { name: "Close" })).toBeDisabled()
      expect(screen.getByRole("button", { name: "Render" })).toBeDisabled()
    }
  })
})
