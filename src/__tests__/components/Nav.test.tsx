import { render, screen } from "@testing-library/react"
import { Nav } from "@/components/layout/Nav"

describe("Nav", () => {
  it("renders primary navigation links", () => {
    render(<Nav activeHref="/ideas" />)
    expect(screen.getByRole("link", { name: "Product" })).toHaveAttribute("href", "/")
    expect(screen.getByRole("link", { name: "Ideas" })).toHaveClass("active")
    expect(screen.getByRole("link", { name: "Open Inkycut →" })).toHaveAttribute("href", "/login")
  })

  it("marks the product link active on the home page", () => {
    render(<Nav activeHref="/" />)
    expect(screen.getByRole("link", { name: "Product" })).toHaveClass("active")
    expect(screen.getByRole("link", { name: "Ideas" })).not.toHaveClass("active")
  })
})
