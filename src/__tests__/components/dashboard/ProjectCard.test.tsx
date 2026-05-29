import { render, screen } from "@testing-library/react"
import { ProjectCard } from "@/components/dashboard/ProjectCard"

describe("ProjectCard", () => {
  it("renders project name and actions", () => {
    render(
      <ProjectCard
        project={{ id: "p1", name: "Rooftop Chase", updatedAt: new Date(), coverElement: null }}
        onDelete={jest.fn()}
      />,
    )
    expect(screen.getByText("Rooftop Chase")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /publish/i })).toBeInTheDocument()
  })
})
