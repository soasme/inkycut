import { render, screen } from "@testing-library/react"
import { Logo, LogoMark } from "@/components/ui/Logo"

describe("Logo", () => {
  it("renders a linked wordmark by default", () => {
    render(<Logo />)
    expect(screen.getByRole("link", { name: /inkycut/i })).toHaveAttribute("href", "/")
  })

  it("can hide the wordmark", () => {
    const { container } = render(<Logo href="/dashboard" showName={false} />)
    expect(container.querySelector("a")).toHaveAttribute("href", "/dashboard")
    expect(container).not.toHaveTextContent("Inkycut")
  })

  it("renders the mark", () => {
    const { container } = render(<LogoMark size={24} />)
    expect(container.querySelector(".logo-mark")).toBeInTheDocument()
  })
})
