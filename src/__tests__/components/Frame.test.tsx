import { render, screen } from "@testing-library/react"
import { Frame } from "@/components/ui/Frame"

describe("Frame", () => {
  it("renders film-frame with slug and meta", () => {
    render(<Frame hue="slate" slug="EST_SHOT" meta="16:9" />)
    expect(screen.getByText("EST_SHOT")).toBeInTheDocument()
    expect(screen.getByText("16:9")).toBeInTheDocument()
  })

  it("renders rec dot when rec=true", () => {
    const { container } = render(<Frame hue="rain" slug="CHAR_01" rec />)
    expect(container.querySelector(".rec")).toBeInTheDocument()
  })

  it("applies hue and extra class names", () => {
    const { container } = render(<Frame hue="amber" className="extra" />)
    expect(container.querySelector(".f-amber")).toBeInTheDocument()
    expect(container.querySelector(".extra")).toBeInTheDocument()
  })

  it("renders children without optional labels", () => {
    render(
      <Frame hue="slate">
        <span>Custom preview</span>
      </Frame>,
    )

    expect(screen.getByText("Custom preview")).toBeInTheDocument()
    expect(screen.queryByText("16:9")).not.toBeInTheDocument()
  })

  it("uses slate as the default hue", () => {
    const { container } = render(<Frame />)
    expect(container.querySelector(".f-slate")).toBeInTheDocument()
  })
})
