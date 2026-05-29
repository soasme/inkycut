jest.mock("@/lib/db", () => ({ db: {} }))

import { createProject, deleteProject, getProjectsByUser } from "@/lib/db/queries/projects"

describe("project queries", () => {
  it("exports project helper functions", () => {
    expect(typeof getProjectsByUser).toBe("function")
    expect(typeof createProject).toBe("function")
    expect(typeof deleteProject).toBe("function")
  })
})
