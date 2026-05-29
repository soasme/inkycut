import { render, screen } from "@testing-library/react"
import { BrowserGate } from "@/components/ui/BrowserGate"

describe("BrowserGate", () => {
  const originalUA = navigator.userAgent

  afterEach(() => {
    Object.defineProperty(navigator, "userAgent", { value: originalUA, configurable: true })
  })

  it("renders children on desktop Chrome", () => {
    Object.defineProperty(navigator, "userAgent", { value: "Mozilla/5.0 Chrome/124.0.0.0 Safari/537.36", configurable: true })
    render(<BrowserGate>Canvas content</BrowserGate>)
    expect(screen.getByText("Canvas content")).toBeInTheDocument()
  })

  it("renders gate on Firefox", () => {
    Object.defineProperty(navigator, "userAgent", { value: "Mozilla/5.0 Firefox/126.0", configurable: true })
    render(<BrowserGate>Canvas content</BrowserGate>)
    expect(screen.queryByText("Canvas content")).not.toBeInTheDocument()
    expect(screen.getByText(/Chrome on desktop/i)).toBeInTheDocument()
  })
})
