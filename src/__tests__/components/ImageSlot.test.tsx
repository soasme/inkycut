import { render, screen } from "@testing-library/react"
import { ImageSlot } from "@/components/ui/ImageSlot"

describe("ImageSlot", () => {
  it("renders an image when url is provided", () => {
    render(<ImageSlot url="/uploads/test.jpg" alt="Test" />)
    expect(screen.getByRole("img")).toHaveAttribute("src", "/uploads/test.jpg")
  })

  it("renders a frame placeholder without a url", () => {
    const { container } = render(<ImageSlot url={null} hue="rain" />)
    expect(container.querySelector(".frame")).toBeInTheDocument()
    expect(container.querySelector(".f-rain")).toBeInTheDocument()
  })
})
